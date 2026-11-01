import { useLocalStorage } from "../hooks/useLocalStorage.js";

/**
 * Panel de picks de expertos + registro personal de decisiones.
 * `oddsByEvent` permite cruzar el pick con la mejor cuota disponible.
 */
export default function PicksPanel({ picks, sportKey, oddsCache }) {
  const [followed, setFollowed] = useLocalStorage("followed", {});
  const visible = picks.filter((p) => p.sport === sportKey);

  const toggle = (id) =>
    setFollowed((f) => {
      const next = { ...f };
      if (next[id]) delete next[id];
      else next[id] = { takenAt: new Date().toISOString() };
      return next;
    });

  return (
    <section>
      <h2 className="section-title">Picks de expertos</h2>
      {visible.length === 0 && (
        <p className="muted">No hay picks para este deporte todavía.</p>
      )}
      <div className="picks-grid">
        {visible.map((p) => (
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
            <button className="btn" onClick={() => toggle(p.id)}>
              {followed[p.id] ? "✓ Siguiendo (quitar)" : "Seguir pick"}
            </button>
            {followed[p.id] && (
              <p className="muted small">Tomado el {new Date(followed[p.id].takenAt).toLocaleString("es-ES")}</p>
            )}
          </article>
        ))}
      </div>

      {Object.keys(followed).length > 0 && (
        <>
          <h2 className="section-title">Mi registro ({Object.keys(followed).length})</h2>
          <ul className="registry">
            {Object.entries(followed).map(([id, meta]) => {
              const p = picks.find((x) => x.id === id);
              if (!p) return null;
              return (
                <li key={id}>
                  <strong>{p.expert}</strong> — {p.event}: {p.selection}
                  <span className="muted small"> · {new Date(meta.takenAt).toLocaleDateString("es-ES")}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
