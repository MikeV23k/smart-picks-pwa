import { useState } from "react";
import { fetchScores } from "../api/odds.js";
import { nameScore } from "../api/experts.js";

/**
 * Panel de rendimiento personal: resumen de ROI, resolución de apuestas
 * con marcadores reales (The Odds API /scores) y desglose por experto.
 */
export default function PerformancePanel({ bets, setBets, activeKey, onCredits }) {
  const [resolving, setResolving] = useState(false);
  const [message, setMessage] = useState(null);

  const open = bets.filter((b) => b.status === "open");
  const resolved = bets.filter((b) => b.status !== "open");

  const stakedResolved = resolved.reduce((s, b) => s + b.stake, 0);
  const net = resolved.reduce((s, b) => s + b.units, 0);
  const roi = stakedResolved > 0 ? (net / stakedResolved) * 100 : 0;
  const wins = resolved.filter((b) => b.result === "win").length;
  const losses = resolved.filter((b) => b.result === "loss").length;
  const winrate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : null;

  const removeBet = (id) => setBets((bs) => bs.filter((b) => b.id !== id));

  /** Resuelve todas las apuestas abiertas con los marcadores de la API. */
  const resolvePending = async () => {
    if (!activeKey) {
      setMessage("Necesitas una API key en ⚙️ para consultar marcadores.");
      return;
    }
    if (!open.length) return;
    setResolving(true);
    setMessage(null);
    const updates = new Map();
    const sports = [...new Set(open.map((b) => b.sport))];
    let budgetFellShort = false;
    try {
      for (const sport of sports) {
        try {
          const { events, remaining } = await fetchScores(activeKey, sport);
          if (remaining != null && onCredits) onCredits(remaining);
          if (remaining === "0") budgetFellShort = true;
          for (const bet of open.filter((b) => b.sport === sport)) {
            if (updates.has(bet.id)) continue;
            const [awayPart, homePart] = bet.event.split(" @ ");
            const done = (events ?? []).find(
              (e) =>
                e.completed &&
                (nameScore(awayPart, e.away_team) + nameScore(homePart, e.home_team)) / 2 >= 0.8
            );
            if (!done) continue; // aún sin resultado
            const scoreBy = new Map(
              (done.scores ?? []).map((s) => [s.name, s.score])
            );
            const awayScore = [...scoreBy.entries()].find(
              ([n]) => nameScore(awayPart, n) >= 0.7
            )?.[1];
            const homeScore = [...scoreBy.entries()].find(
              ([n]) => nameScore(homePart, n) >= 0.7
            )?.[1];
            if (awayScore == null || homeScore == null) continue;
            let result;
            if (awayScore === homeScore) result = "void";
            else if (nameScore(bet.selection, awayPart) >= 0.7) {
              result = awayScore > homeScore ? "win" : "loss";
            } else if (nameScore(bet.selection, homePart) >= 0.7) {
              result = homeScore > awayScore ? "win" : "loss";
            } else continue;
            const odds = bet.oddsUsed;
            const units =
              result === "win"
                ? odds
                  ? bet.stake * (odds - 1)
                  : 0
                : result === "loss"
                  ? -bet.stake
                  : 0;
            updates.set(bet.id, { result, units, resolvedAt: new Date().toISOString() });
          }
        } catch (e) {
          if (e.status === 429) {
            budgetFellShort = true;
            break;
          }
          // deporte sin resultados o error puntual: continúa con el resto
        }
      }
      if (updates.size > 0) {
        setBets((bs) =>
          bs.map((b) =>
            updates.has(b.id) ? { ...b, status: "resolved", ...updates.get(b.id) } : b
          )
        );
        setMessage(`✅ ${updates.size} apuesta(s) resueltas con marcadores reales.`);
      } else {
        setMessage(
          budgetFellShort
            ? "⚠️ Sin créditos o error al consultar marcadores; inténtalo de nuevo con otra key."
            : "Sin resultados disponibles todavía para esas apuestas."
        );
      }
    } finally {
      setResolving(false);
    }
  };

  const fmtDate = (iso) => new Date(iso).toLocaleDateString("es-ES");

  return (
    <section>
      <h2 className="section-title">Mi rendimiento</h2>

      <div className="stat-row">
        <div className="stat-tile">
          <span className="stat-value">{roi >= 0 ? "+" : ""}{roi.toFixed(1)}%</span>
          <span className="stat-label">ROI</span>
        </div>
        <div className="stat-tile">
          <span className={`stat-value ${net >= 0 ? "good" : "bad"}`}>{net >= 0 ? "+" : ""}{net.toFixed(2)}u</span>
          <span className="stat-label">Unidades netas</span>
        </div>
        <div className="stat-tile">
          <span className="stat-value">{winrate == null ? "–" : `${winrate.toFixed(0)}%`}</span>
          <span className="stat-label">Aciertos ({wins}W-{losses}L)</span>
        </div>
        <div className="stat-tile">
          <span className="stat-value">{stakedResolved.toFixed(1)}u</span>
          <span className="stat-label">Total apostado</span>
        </div>
      </div>

      {open.length > 0 && (
        <>
          <h2 className="section-title">Pendientes ({open.length})</h2>
          <button className="btn" onClick={resolvePending} disabled={resolving}>
            {resolving ? "Consultando marcadores…" : `🎯 Resolver con resultados (1 crédito/deporte)`}
          </button>
          <ul className="bets-list">
            {open.map((b) => (
              <li key={b.id} className="bet-item">
                <div>
                  <strong>{b.expert}</strong> · <span className="muted">{b.selection}</span>
                  <div className="muted small">{b.event} · {fmtDate(b.createdAt)} · {b.stake}u @ cuota {b.oddsUsed ?? "–"}</div>
                </div>
                <button className="btn small ghost" title="Eliminar" onClick={() => removeBet(b.id)}>🗑️</button>
              </li>
            ))}
          </ul>
        </>
      )}

      {message && <p className="muted small resolve-msg">{message}</p>}

      {resolved.length > 0 && (
        <>
          <h2 className="section-title">Historial resuelto ({resolved.length})</h2>
          <ul className="bets-list">
            {resolved.map((b) => (
              <li key={b.id} className="bet-item">
                <div>
                  <span className={`chip ${b.result}`}>{b.result === "win" ? "Ganada" : b.result === "loss" ? "Perdida" : "Nula"}</span>
                  <strong> {b.expert}</strong> · <span className="muted">{b.selection}</span>
                  <div className="muted small">{b.event} · {fmtDate(b.resolvedAt)} · {b.stake}u @ {b.oddsUsed ?? "–"} → {b.units >= 0 ? "+" : ""}{b.units.toFixed(2)}u</div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {resolved.length >= 2 && (
        <>
          <h2 className="section-title">Desglose por experto</h2>
          <div className="table-wrap">
            <table className="odds-table">
              <thead>
                <tr><th>Experto / fuente</th><th>W-L</th><th>Neto</th><th>ROI</th></tr>
              </thead>
              <tbody>
                {Object.entries(
                  resolved.reduce((acc, b) => {
                    (acc[b.expert] ??= { w: 0, l: 0, stake: 0, net: 0 });
                    acc[b.expert].w += b.result === "win" ? 1 : 0;
                    acc[b.expert].l += b.result === "loss" ? 1 : 0;
                    acc[b.expert].stake += b.result === "void" ? 0 : b.stake;
                    acc[b.expert].net += b.units;
                    return acc;
                  }, {})
                )
                  .sort((a, b) => b[1].net - a[1].net)
                  .map(([expert, s]) => (
                    <tr key={expert}>
                      <td>{expert}</td>
                      <td>{s.w}-{s.l}</td>
                      <td className={s.net >= 0 ? "best" : ""}>{s.net >= 0 ? "+" : ""}{s.net.toFixed(2)}u</td>
                      <td>{s.stake > 0 ? `${((s.net / s.stake) * 100).toFixed(1)}%` : "–"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {open.length === 0 && resolved.length === 0 && (
        <p className="muted">Sigue picks en la pestaña anterior y aparecerán aquí con su cuota capturada.</p>
      )}
    </section>
  );
}
