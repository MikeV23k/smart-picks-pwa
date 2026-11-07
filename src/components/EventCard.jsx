import { SPORTS, buildLineMatrix, bestPrice, arbitrageMargin } from "../api/odds.js";

function fmtKickoff(iso) {
  return new Date(iso).toLocaleString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sportLabel(key) {
  return SPORTS.find((s) => s.key === key)?.label ?? "Evento";
}

/**
 * Tabla de un mercado: una fila por selección, columnas por casa,
 * resaltando la mejor cuota.
 */
function MarketTable({ entriesBySelection }) {
  const rows = Object.entries(entriesBySelection ?? {});
  if (rows.length === 0) {
    return <p className="muted small">Sin líneas disponibles en este mercado.</p>;
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
                  const isBest = best && e.price === best.price;
                  return (
                    <td key={b} className={isBest ? "best" : ""}>
                      {isBest ? (
                        <span className="best-odd">{e.price.toFixed(2)}</span>
                      ) : (
                        e.price.toFixed(2)
                      )}
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
  const hasSpreads = Object.keys(matrix.spreads).length > 0;
  const hasTotals = Object.keys(matrix.totals).length > 0;

  return (
    <article className="event-card">
      <header className="event-head">
        <div className="event-league">
          <span className="league-dot" aria-hidden="true" />
          {sportLabel(event.sport_key)}
        </div>
        <div className="event-meta">
          <span className="meta-pill">🕒 {fmtKickoff(event.commence_time)}</span>
          <span className="meta-pill">🏦 {bookmakers.length} casas</span>
          {arb > 0 && (
            <span className="arb-badge">⚡ Arbitraje {(arb * 100).toFixed(1)}%</span>
          )}
        </div>
      </header>

      <div className="event-teams">
        <div className="team">
          <span className="team-role">Visitante</span>
          <strong>{event.away_team}</strong>
        </div>
        <span className="vs" aria-hidden="true">@</span>
        <div className="team">
          <span className="team-role">Local</span>
          <strong>{event.home_team}</strong>
        </div>
      </div>

      <div className="market">
        <h4>
          Moneyline <span>1X2 / ML</span>
        </h4>
        <MarketTable entriesBySelection={matrix.h2h} />
      </div>

      {(hasSpreads || hasTotals) && (
        <details className="more-markets">
          <summary>Ver spreads y totales</summary>
          <div className="more-markets-body">
            {hasSpreads && (
              <>
                <h4>Spreads</h4>
                <MarketTable entriesBySelection={matrix.spreads} />
              </>
            )}
            {hasTotals && (
              <>
                <h4>Totales</h4>
                <MarketTable entriesBySelection={matrix.totals} />
              </>
            )}
          </div>
        </details>
      )}
    </article>
  );
}
