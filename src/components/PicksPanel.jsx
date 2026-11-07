import { findBestOddsForPick } from "../api/odds.js";
import { nameScore } from "../api/experts.js";

function initials(name) {
  return (name ?? "")
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function tone(confidence) {
  if (confidence >= 65) return "high";
  if (confidence >= 50) return "mid";
  return "low";
}

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
        sourceSport: match?.event?.source_sport_key ?? pick.sourceSport ?? pick.sport,
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
      <div className="section-head">
        <div>
          <h2>Picks de expertos</h2>
          <p>Consenso de mercado y modelos estadísticos.</p>
        </div>
        <span className="count-pill">{visible.length}</span>
      </div>

      {visible.length === 0 && (
        <div className="empty-state compact">
          <div className="empty-icon">🎯</div>
          <h3>Aún no hay picks para este deporte</h3>
          <p>
            Los picks se generan con las cuotas cargadas. Prueba otro deporte o
            actualiza las líneas.
          </p>
        </div>
      )}

      <div className="picks-grid">
        {visible.map((p) => {
          const isFollowed = followedIds.has(p.id);
          const confidence = Math.max(0, Math.min(100, p.confidence ?? 0));
          return (
            <article key={p.id} className="pick-card">
              <header className="pick-top">
                <span className="avatar" aria-hidden="true">{initials(p.expert)}</span>
                <div className="pick-source">
                  <strong>{p.expert}</strong>
                  <span className="source-badge">{p.source}</span>
                </div>
                <span className="confidence-num">{confidence}%</span>
              </header>

              <div className="pick-event">{p.event}</div>
              <div className="pick-selection">{p.selection}</div>

              <div className={`confidence-bar ${tone(confidence)}`}>
                <span style={{ width: `${confidence}%` }} />
              </div>

              <p className="pick-reasoning">{p.reasoning}</p>

              <div className="pick-actions">
                <button
                  className={isFollowed ? "btn ghost" : "btn"}
                  onClick={() => toggle(p)}
                  aria-pressed={isFollowed}
                >
                  {isFollowed ? "✓ Siguiendo (quitar)" : "Seguir pick"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {bets.filter((b) => b.sport === sportKey).length > 0 && (
        <p className="muted small" style={{ marginTop: 14 }}>
          Consulta el estado y ROI de tus picks seguidos en la pestaña{" "}
          <strong>Rendimiento</strong>.
        </p>
      )}
    </section>
  );
}
