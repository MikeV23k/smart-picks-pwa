/**
 * Adaptador de The Odds API (https://the-odds-api.com).
 * Tier gratuito: 500 créditos/mes. Cada llamada a /odds cuesta ~1 evento × mercados.
 */

const BASE = "https://api.the-odds-api.com/v4";

export const SPORTS = [
  { key: "americanfootball_nfl", label: "NFL 🏈", group: "Fútbol Americano" },
  { key: "basketball_nba", label: "NBA 🏀", group: "Baloncesto" },
  { key: "baseball_mlb", label: "MLB ⚾", group: "Béisbol" },
  { key: "icehockey_nhl", label: "NHL 🏒", group: "Hockey" },
  { key: "soccer_epl", label: "Premier League ⚽", group: "Fútbol" },
  { key: "soccer_spain_la_liga", label: "La Liga ⚽", group: "Fútbol" },
  { key: "soccer_uefa_champs_league", label: "Champions League ⚽", group: "Fútbol" },
];

export const REGIONS = "us,uk,eu";
export const MARKETS = "h2h,spreads,totals";

/** Lista de deportes disponibles según la API. */
export async function fetchSports(apiKey) {
  const res = await fetch(`${BASE}/sports/?apiKey=${encodeURIComponent(apiKey)}`);
  if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);
  return res.json();
}

/**
 * Cuotas de un deporte.
 * Devuelve { events, remaining } donde events es la respuesta estándar de la API.
 */
export async function fetchOdds(apiKey, sportKey) {
  const url =
    `${BASE}/sports/${sportKey}/odds/?apiKey=${encodeURIComponent(apiKey)}` +
    `&regions=${REGIONS}&markets=${MARKETS}&oddsFormat=decimal`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`Error ${res.status}: ${body || res.statusText}`);
    err.status = res.status;
    throw err;
  }
  const events = await res.json();
  const remaining = res.headers.get("x-requests-remaining");
  const used = res.headers.get("x-requests-used");
  return { events, remaining, used };
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
