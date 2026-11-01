import { useState } from "react";

function mask(key) {
  return key.length > 10 ? `${key.slice(0, 4)}…${key.slice(-4)}` : key;
}

/**
 * Gestor de API keys: guarda varias, muestra créditos restantes por key,
 * permite activar una distinta o borrarlas (p. ej. cuando se agotan los créditos).
 */
export default function SettingsModal({
  keys,
  active,
  arbPct,
  onArbPct,
  notifGranted,
  onRequestNotif,
  onAdd,
  onActivate,
  onDelete,
  onClose,
}) {
  const [draft, setDraft] = useState("");
  const [pctDraft, setPctDraft] = useState(String(arbPct ?? 0.5));

  const submit = () => {
    if (draft) {
      onAdd(draft);
      setDraft("");
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Configuración · API keys</h2>
        <p className="muted small">
          Regístrate gratis en <a href="https://the-odds-api.com" target="_blank" rel="noreferrer">the-odds-api.com</a>{" "}
          para crear keys (500 créditos/mes cada una). Si una se agota, crea otra en el
          dashboard y añádela aquí. Todo se guarda solo en tu dispositivo.
        </p>

        <ul className="key-list">
          {keys.length === 0 && <li className="muted small">Aún no has añadido ninguna key.</li>}
          {keys.map((k) => {
            const isActive = k.key === active;
            const exhausted = k.remaining === 0;
            return (
              <li key={k.key} className={isActive ? "key-item active" : "key-item"}>
                <div className="key-main">
                  <span className="key-mask">{mask(k.key)}</span>
                  <span
                    className={
                      k.remaining == null
                        ? "credits-badge"
                        : exhausted
                          ? "credits-badge out"
                          : "credits-badge ok"
                    }
                    title="Créditos restantes"
                  >
                    {k.remaining == null ? "🎟️ –" : exhausted ? "🎟️ 0 (agotada)" : `🎟️ ${k.remaining}`}
                  </span>
                </div>
                <div className="key-actions">
                  {isActive ? (
                    <span className="key-active-badge">en uso</span>
                  ) : (
                    <button className="btn small" onClick={() => onActivate(k.key)}>Usar</button>
                  )}
                  <button className="btn small ghost" title="Borrar key" onClick={() => onDelete(k.key)}>🗑️</button>
                </div>
              </li>
            );
          })}
        </ul>

        <label className="field">
          <span>Umbral de alerta de arbitraje (%)</span>
          <input
            type="number"
            step="0.1"
            min="0"
            value={pctDraft}
            onChange={(e) => setPctDraft(e.target.value)}
          />
        </label>
        <button
          className="btn small"
          onClick={() => {
            const v = parseFloat(pctDraft);
            if (!Number.isNaN(v)) onArbPct(Math.max(0, v));
          }}
        >
          Guardar umbral ({pctDraft}%)
        </button>
        <p className="muted small">
          Aviso: al abrir o recargar la app, si algún evento alcanza el umbral verás un banner
          {notifGranted ? " y recibirás una notificación." : "."}
        </p>
        <div className="modal-actions">
          {!notifGranted ? (
            <button className="btn small ghost" onClick={onRequestNotif}>
              🔔 Permitir notificaciones
            </button>
          ) : (
            <span className="key-active-badge">🔔 Notificaciones activadas</span>
          )}
        </div>

        <label className="field">
          <span>Añadir nueva key</span>
          <input
            type="text"
            placeholder="Pega aquí tu API key"
            value={draft}
            onChange={(e) => setDraft(e.target.value.trim())}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </label>
        <div className="modal-actions">
          <button className="btn" onClick={submit} disabled={!draft}>Añadir</button>
          <button className="btn ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
