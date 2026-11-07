/**
 * Adaptador de The Odds API (https://the-odds-api.com).
 * Tier gratuito: 500 créditos/mes. Cada llamada a /odds cuesta según
 * mercados × regiones, así que tenis, MMA y cricket piden solo h2h.
 */

const BASE = "https://api.the-odds-api.com/v4";

export const SPORTS = [
  { key: "americanfootball_nfl", label: "NFL", short: "NFL", icon: "🏈", group: "Fútbol Americano" },
  { key: "basketball_nba", label: "NBA", short: "NBA", icon: "🏀", group: "Baloncesto" },
  { key: "baseball_mlb", label: "MLB", short: "MLB", icon: "⚾", group: "Béisbol" },
  { key: "icehockey_nhl", label: "NHL", short: "NHL", icon: "🏒", group: "Hockey" },
  { key: "soccer_epl", label: "Premier League", short: "Premier", icon: "⚽", group: "Fútbol" },
  { key: "soccer_spain_la_liga", label: "La Liga", short: "La Liga", icon: "⚽", group: "Fútbol" },
  { key: "soccer_uefa_champs_league", label: "Champions League", short: "Champions", icon: "⚽", group: "Fútbol" },
  { key: "soccer_italy_serie_a", label: "Serie A", short: "Serie A", icon: "⚽", group: "Fútbol" },
  { key: "soccer_germany_bundesliga", label: "Bundesliga", short: "Bundesliga", icon: "⚽", group: "Fútbol" },
  { key: "soccer_france_ligue_one", label: "Ligue 1", short: "Ligue 1", icon: "⚽", group: "Fútbol" },
  { key: "soccer_usa_mls", label: "MLS", short: "MLS", icon: "⚽", group: "Fútbol" },
  { key: "tennis_atp", label: "Tenis ATP", short: "ATP", icon: "🎾", group: "Tenis" },
  { key: "tennis_wta", label: "Tenis WTA", short: "WTA", icon: "🎾", group: "Tenis" },
  { key: "mma_mixed_martial_arts", label: "UFC / MMA", short: "UFC", icon: "🥊", group: "Combate" },
  { key: "cricket", label: "Cricket", short: "Cricket", icon: "🏏", group: "Cricket" },
];

/**
 * Deportes cuyo torneo activo se resuelve con /sports, porque The Odds API
 * los publica con una key por torneo (tennis_atp_wimbledon, cricket_ipl…).
 */
export const VIRTUAL_SPORTS = {
  tennis_atp: { prefix: "tennis_atp_", label: "Tenis ATP" },
  tennis_wta: { prefix: "tennis_wta_", label: "Tenis WTA" },
  cricket: { prefix: "cricket_", label: "Cricket" },
};

/** Sin spreads/totales: ahorra créditos y evita tablas vacías. */
const LIGHT_MARKETS = new Set([
  "tennis_atp",
  "tennis_wta",
  "cricket",
  "mma_mixed_martial_arts",
]);

export const REGIONS = "us,uk,eu";
export const MARKETS = "h2h,spreads,totals";

let sportsCache = { apiKey: "", at: 0, data: null };

/** Lista de deportes disponibles según la API (gratis, cacheada 10 min). */
export async function fetchSports(apiKey) {
  if (
    sportsCache.data &&
    sportsCache.apiKey === apiKey &&
    Date.now() - sportsCache.at < 10 * 60 * 1000
  ) {
    return sportsCache.data;
  }
  const res = await fetch(`${BASE}/sports/?apiKey=${encodeURIComponent(apiKey)}`);
  if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  sportsCache = { apiKey, at: Date.now(), data };
  return data;
}

/**
 * Traduce un deporte "virtual" (Tenis ATP/WTA, Cricket) al torneo activo.
 * Si no hay torneo en curso, lanza un 404 con un mensaje legible.
 */
export async function resolveSportKey(apiKey, sportKey) {
  const virtual = VIRTUAL_SPORTS[sportKey];
  if (!virtual) return sportKey;
  const sports = await fetchSports(apiKey);
  const active = (sports ?? []).filter(
    (s) => s.active && String(s.key).startsWith(virtual.prefix)
  );
  if (active.length === 0) {
    const err = new Error(
      `No hay torneos de ${virtual.label} activos ahora mismo. Prueba otro deporte.`
    );
    err.status = 404;
    throw err;
  }
  return active[0].key;
}

/**
 * Cuotas de un deporte.
 * Devuelve { events, remaining, used, resolvedKey, markets }.
 * En deportes virtuales cada evento conserva el torneo real en source_sport_key.
 */
export async function fetchOdds(apiKey, sportKey) {
  const resolvedKey = await resolveSportKey(apiKey, sportKey);
  const isVirtual = resolvedKey !== sportKey;
  const markets = LIGHT_MARKETS.has(sportKey) ? "h2h" : MARKETS;
  const url =
    `${BASE}/sports/${resolvedKey}/odds/?apiKey=${encodeURIComponent(apiKey)}` +
    `&regions=${REGIONS}&markets=${markets}&oddsFormat=decimal`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`Error ${res.status}: ${body || res.statusText}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const events = isVirtual
    ? (Array.isArray(data) ? data : []).map((e) => ({
        ...e,
        sport_key: sportKey,
        source_sport_key: resolvedKey,
      }))
    : data;
  const remaining = res.headers.get("x-requests-remaining");
  const used = res.headers.get("x-requests-used");
  return { events, remaining, used, resolvedKey, markets };
}

/* ---------- Helpers de análisis ---------- */

/**
 * Por cada evento, extrae TODAS las líneas por casa para cada mercado.
 * Devuelve { [eventId]: { h2h: { selection: [{book, price}] }, spreads: {...}, totals: {...} } }
 */
export function buildLineMatrix(event) {
  const matrix = { h2h: {}, spreads: {}, totals: {} };
  for (const bm of event.bookmakers ?? []) {
    for (const mkt of bm.markets ?? []) {
      const bucket = matrix[mkt.key];
      if (!bucket) continue;
      for (const outcome of mkt.outcomes ?? []) {
        let sel;
        if (mkt.key === "h2h") sel = outcome.name;
        else if (mkt.key === "spreads") sel = `${outcome.name} ${outcome.point > 0 ? "+" : ""}${outcome.point}`;
        else sel = `Total ${outcome.point} ${outcome.name}`;
        (bucket[sel] ??= []).push({ book: bm.title, price: outcome.price });
      }
    }
  }
  return matrix;
}

/** Mejor cuota disponible para cada selección. */
export function bestPrice(entries) {
  if (!entries?.length) return null;
  return entries.reduce((best, e) => (e.price > best.price ? e : best), entries[0]);
}

/**
 * Resultados de la API (marcadores de terminados, ~últimas 2 semanas).
 * Coste: 1 crédito por deporte.
 */
export async function fetchScores(apiKey, sportKey) {
  const url = `${BASE}/sports/${sportKey}/scores/?apiKey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`Error ${res.status}: ${body || res.statusText}`);
    err.status = res.status;
    throw err;
  }
  return { events: await res.json(), remaining: res.headers.get("x-requests-remaining") };
}

/** Cuántas casas distintas ofrecen cada selección (liquidez de mercado). */
export function bookCount(entries) {
  return new Set((entries ?? []).map((e) => e.book)).size;
}

/** Detecta arbitraje simple en h2h: si la suma de inversos de las mejores cuotas < 1. */
export function arbitrageMargin(matrix) {
  const selects = Object.entries(matrix.h2h ?? {}).map(([, entries]) => bestPrice(entries));
  if (selects.some((s) => !s) || selects.length < 2) return null;
  const sum = selects.reduce((acc, s) => acc + 1 / s.price, 0);
  return sum < 1 ? 1 - sum : 0;
}

/**
 * Al seguir un pick, localiza el evento correspondiente y la mejor cuota
 * disponible para su selección (h2h). Devuelve { event, entries, best } o null.
 * pick.event viene como "<visitante> @ <local>".
 */
export function findBestOddsForPick(eventName, selection, events, nameScoreFn) {
  const [awayPart, homePart] = (eventName ?? "").split(" @ ");
  if (!awayPart || !homePart) return null;
  let match = null;
  for (const ev of events ?? []) {
    const s = nameScoreFn(awayPart, ev.away_team) + nameScoreFn(homePart, ev.home_team);
    if (!match || s > match.score) match = { ev, score: s };
  }
  if (!match || match.score < 1.0) return null;
  const ev = match.ev;
  let entries = [];
  for (const bm of ev.bookmakers ?? []) {
    for (const mkt of bm.markets ?? []) {
      if (mkt.key !== "h2h") continue;
      for (const o of mkt.outcomes ?? []) {
        if (nameScoreFn(o.name, selection) >= 0.75) entries.push({ book: bm.title, price: o.price });
      }
    }
  }
  if (entries.length === 0) return { event: ev, entries, best: null };
  return { event: ev, entries, best: bestPrice(entries) };
}
