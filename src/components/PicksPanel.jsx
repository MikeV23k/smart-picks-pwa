import { findBestOddsForPick } from "../api/odds.js";
import { nameScore } from "../api/experts.js";

/**
 * Panel de picks de expertos. "Seguir pick" registra una apuesta en el
 * historial capturando la mejor cuota disponible en ese instante.
 */
export default function PicksPanel({ picks, sportKey, events, bets, setBets }) {
  const followedIds = new Set(bets.map((b) => b.pickId));
  const visible = picks.filter((p) => p.sport === sportKey);

  const toggle = (pick) => {
    const existing = bets.find((b) => b.pickId === pick.id);
    if (existing) {
      setBets((bs) => bs.filter((b) => b.id !== existing.id));
      return;
    }
    const match = findBestOddsForPick(pick.event, pick.selection, events, nameScore);
    setBets((bs) => [
      ...bs,
      {
        id: `bet-${pick.id}`,
        pickId: pick.id,
        expert: pick.expert,
        source: pick.source,
        sport: pick.sport,
        event: pick.event,
        selection: pick.selection,
        stake: pick.stake ?? 1,
        oddsUsed: match?.best?.price ?? null,
        status: "open",
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  return (
    <section>
      <h2 className="section-title">Picks de expertos</h2>
      {visible.length === 0 && <p className="muted">No hay picks para este deporte todavía.</p>}
      <div className="picks-grid">
        {visible.map((p) => {
          const isFollowed = followedIds.has(p.id);
          return (
            <article key={p.id} className="pick-card">
              <header>
                <strong>{p.expert}</strong>
                <span className="muted"> · {p.source}</span>
              </header>
              <div className="pick-event">{p.event}</div>
              <div className="pick-selection">{p.selection}</div>
              <div className="pick-stats">
                <span title="Confianza del experto">🎯 {p.confidence}%</span>
                {p.stake != null && <span title="Unidades sugeridas">💰 {p.stake}u</span>}
              </div>
              <p className="pick-reasoning">{p.reasoning}</p>
              <button className="btn" onClick={() => toggle(p)}>
                {isFollowed ? "✓ Siguiendo (quitar)" : "Seguir pick"}
              </button>
            </article>
          );
        })}
      </div>
      {bets.filter((b) => b.sport === sportKey).length > 0 && (
        <p className="muted small">
          Consulta el estado y ROI de tus picks seguidos en la pestaña <strong>Rendimiento</strong>.
        </p>
      )}
    </section>
  );
}
