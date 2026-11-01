import { buildLineMatrix, bestPrice, arbitrageMargin } from "../api/odds.js";

function fmtKickoff(iso) {
  return new Date(iso).toLocaleString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Tabla de un mercado: una fila por selección, columnas por casa,
 * resaltando la mejor cuota.
 */
function MarketTable({ entriesBySelection }) {
  const rows = Object.entries(entriesBySelection ?? {});
  if (rows.length === 0) {
    return <p className="muted">Sin líneas disponibles en este mercado.</p>;
  }
  const books = [...new Set(rows.flatMap(([, es]) => es.map((e) => e.book)))];
  return (
    <div className="table-wrap">
      <table className="odds-table">
        <thead>
          <tr>
            <th>Selección</th>
            {books.map((b) => (
              <th key={b}>{b}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([sel, entries]) => {
            const best = bestPrice(entries);
            return (
              <tr key={sel}>
                <td className="sel">{sel}</td>
                {books.map((b) => {
                  const e = entries.find((x) => x.book === b);
                  if (!e) return <td key={b} className="muted">—</td>;
                  return (
                    <td key={b} className={best && e.price === best.price ? "best" : ""}>
                      {e.price.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function EventCard({ event }) {
  const matrix = buildLineMatrix(event);
  const arb = arbitrageMargin(matrix);
  const bookmakers = (event.bookmakers ?? []).map((b) => b.title);

  return (
    <article className="event-card">
      <header className="event-head">
        <h3>
          {event.away_team} <span className="muted">en</span> {event.home_team}
        </h3>
        <div className="event-meta">
          <span>{fmtKickoff(event.commence_time)}</span>
          <span>{bookmakers.length} casas</span>
          {arb > 0 && <span className="arb-badge">⚡ Arbitraje {(arb * 100).toFixed(1)}%</span>}
        </div>
      </header>

      <h4>Moneyline (1X2 / ML)</h4>
      <MarketTable entriesBySelection={matrix.h2h} />

      <details>
        <summary>Spreads y totales</summary>
        <h4>Spreads</h4>
        <MarketTable entriesBySelection={matrix.spreads} />
        <h4>Totales</h4>
        <MarketTable entriesBySelection={matrix.totals} />
      </details>
    </article>
  );
}
