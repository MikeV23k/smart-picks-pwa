/**
 * Picks reales compilados de dos fuentes vivas:
 *
 * 1) ESPN Analytics (FPI): modelo estadístico oficial de ESPN.
 *    API pública, sin key, CORS abierto (Access-Control-Allow-Origin: *).
 *    Scoreboard: site.api.espn.com/apis/site/v2/sports/{slug}/scoreboard
 *    Summary:    site.web.api.espn.com/apis/site/v2/sports/{slug}/summary?event={id}
 *
 * 2) Consenso del mercado: probabilidad implícita promedio de todas las casas
 *    devueltas por The Odds API (sin coste extra de créditos).
 *
 * Para añadir una tercera fuente (humanos nombrados tipo Pickwatch/Action Network),
 * agrégala en `buildPicks()` con este formato:
 *   { id, expert, source, sport, event, selection, confidence, stake, reasoning, takenAt }
 */

const ESPN_SLUG = {
  americanfootball_nfl: "football/nfl",
  basketball_nba: "basketball/nba",
  baseball_mlb: "baseball/mlb",
  icehockey_nhl: "hockey/nhl",
  soccer_epl: "soccer/eng.1",
  soccer_spain_la_liga: "soccer/esp.1",
  soccer_uefa_champs_league: "soccer/uefa.champions",
};

/** Cache en memoria por sesión para no repetir llamadas a ESPN. */
const cache = new Map();

function norm(s) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Similitud de nombres: coeficiente de Dice sobre bigramas de caracteres.
 *  Tolera variantes como "LA Clippers" vs "Los Angeles Clippers". */
export function nameScore(a, b) {
  const na = norm(a).replace(/ /g, "");
  const nb = norm(b).replace(/ /g, "");
  if (na.length < 3 || nb.length < 3) return 0;
  const grams = new Set();
  for (let i = 0; i < na.length - 1; i++) grams.add(na.slice(i, i + 2));
  const g2 = new Set();
  for (let i = 0; i < nb.length - 1; i++) g2.add(nb.slice(i, i + 2));
  let shared = 0;
  for (const g of grams) if (g2.has(g)) shared++;
  return (2 * shared) / (grams.size + g2.size);
}

async function fetchJson(url) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.t < 10 * 60 * 1000) return hit.data; // TTL 10 min
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ESPN ${res.status}`);
  const data = await res.json();
  cache.set(url, { t: Date.now(), data });
  return data;
}

/** Eventos del deporte según ESPN. */
export async function fetchEspnEvents(sportKey) {
  const slug = ESPN_SLUG[sportKey];
  if (!slug) return [];
  const data = await fetchJson(`https://site.api.espn.com/apis/site/v2/sports/${slug}/scoreboard`);
  return (data.events ?? []).map((e) => {
    const home = (e.competitions?.[0]?.competitors ?? []).find((c) => c.homeAway === "home");
    const away = (e.competitions?.[0]?.competitors ?? []).find((c) => c.homeAway === "away");
    return {
      id: e.id,
      home: home?.team?.displayName ?? "",
      away: away?.team?.displayName ?? "",
      date: e.date,
    };
  });
}

/** Probabilidad de victoria pre-partido (FPI) de un evento ESPN. */
export async function fetchFpiPrediction(sportKey, espnEventId) {
  const slug = ESPN_SLUG[sportKey];
  const data = await fetchJson(
    `https://site.web.api.espn.com/apis/site/v2/sports/${slug}/summary?event=${espnEventId}`
  );
  const wp = data.winprobability?.[0];
  if (!wp || typeof wp.homeWinPercentage !== "number") return null;
  return {
    homePct: wp.homeWinPercentage,
    awayPct: 1 - wp.homeWinPercentage,
  };
}

/** Pick del consenso del mercado para un evento de The Odds API. */
export function marketConsensusPick(oddsEvent, sportKey) {
  const entries = [];
  for (const bm of oddsEvent.bookmakers ?? []) {
    for (const mkt of bm.markets ?? []) {
      if (mkt.key !== "h2h") continue;
      for (const o of mkt.outcomes ?? []) {
        entries.push({ name: o.name, price: o.price });
      }
    }
  }
  if (!entries.length) return null;
  // probabilidad implícita promedio por selección, normalizada para quitar margen
  const avg = new Map();
  for (const e of entries) {
    avg.set(e.name, (avg.get(e.name) ?? [0, 0]));
    const acc = avg.get(e.name);
    acc[0] += 1 / e.price;
    acc[1] += 1;
    avg.set(e.name, acc);
  }
  const probs = [...avg.entries()].map(([name, [sum, n]]) => ({ name, raw: sum / n }));
  const total = probs.reduce((s, p) => s + p.raw, 0);
  for (const p of probs) p.pct = p.raw / total;
  probs.sort((a, b) => b.pct - a.pct);
  const top = probs[0];
  const gap = ((top.pct - probs[1]?.pct) * 100).toFixed(1);
  return {
    id: `mercado-${oddsEvent.id}`,
    expert: "Consenso del mercado",
    source: "The Odds API",
    sport: sportKey,
    event: `${oddsEvent.away_team} @ ${oddsEvent.home_team}`,
    selection: top.name,
    confidence: Math.round(top.pct * 100),
    reasoning: `Apoyado por ${(top.pct * 100).toFixed(1)}% de la probabilidad implícita de ${
      oddsEvent.bookmakers?.length ?? 0
    } casas; ventaja de ${gap} pts sobre la siguiente opción.`,
    takenAt: new Date().toISOString(),
  };
}

/** Compila todas las fuentes para el deporte activo. Nunca lanza: degrada con lo que pueda. */
export async function buildPicks(oddsEvents, sportKey) {
  const picks = [];

  // 1) Consenso del mercado (no cuesta créditos: usa los eventos ya cargados)
  for (const ev of oddsEvents ?? []) {
    const p = marketConsensusPick(ev, sportKey);
    if (p) picks.push(p);
  }

  // 2) FPI de ESPN por evento (cruzando por nombres de equipos)
  try {
    const espnEvents = await fetchEspnEvents(sportKey);
    for (const ev of oddsEvents ?? []) {
      let match = null;
      for (const ee of espnEvents) {
        const sHome = nameScore(ev.home_team, ee.home);
        const sAway = nameScore(ev.away_team, ee.away);
        if (Math.min(sHome, sAway) < 0.55) continue;
        const s = sHome + sAway;
        if (!match || s > match.score) match = { ee, score: s };
      }
      if (!match) continue;
      try {
        const fpi = await fetchFpiPrediction(sportKey, match.ee.id);
        if (!fpi) continue;
        const homeFav = fpi.homePct >= fpi.awayPct;
        picks.push({
          id: `fpi-${match.ee.id}`,
          expert: "ESPN Analytics (FPI)",
          source: "ESPN API",
          sport: sportKey,
          event: `${ev.away_team} @ ${ev.home_team}`,
          selection: homeFav ? ev.home_team : ev.away_team,
          confidence: Math.round((homeFav ? fpi.homePct : fpi.awayPct) * 100),
          reasoning: `El modelo FPI otorga ${Math.round(
            (homeFav ? fpi.homePct : fpi.awayPct) * 100
          )}% de probabilidad de victoria a ${homeFav ? ev.home_team : ev.away_team}.`,
          takenAt: new Date().toISOString(),
        });
      } catch {
        /* evento sin proyección: se omite */
      }
    }
  } catch {
    /* ESPN caído o deporte sin datos: solo consenso */
  }

  return picks;
}
