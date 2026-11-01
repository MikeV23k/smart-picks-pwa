import { useEffect, useRef, useState } from "react";
import SportSelector from "./components/SportSelector.jsx";
import EventCard from "./components/EventCard.jsx";
import PicksPanel from "./components/PicksPanel.jsx";
import PerformancePanel from "./components/PerformancePanel.jsx";
import SettingsModal from "./components/SettingsModal.jsx";
import { useLocalStorage } from "./hooks/useLocalStorage.js";
import { SPORTS, fetchOdds, buildLineMatrix, arbitrageMargin } from "./api/odds.js";
import { buildPicks } from "./api/experts.js";

const DEMO_EVENTS = [
  {
    id: "demo-evt-1",
    sport_key: "basketball_nba",
    commence_time: new Date(Date.now() + 36e5 * 20).toISOString(),
    home_team: "Boston Celtics",
    away_team: "Los Angeles Lakers",
    bookmakers: [
      { title: "DraftKings", markets: [
        { key: "h2h", outcomes: [{ name: "Boston Celtics", price: 1.42 }, { name: "Los Angeles Lakers", price: 2.85 }] },
        { key: "spreads", outcomes: [{ name: "Boston Celtics", price: 1.9, point: -4.5 }, { name: "Los Angeles Lakers", price: 1.95, point: 4.5 }] },
        { key: "totals", outcomes: [{ name: "Over", price: 1.88, point: 224.5 }, { name: "Under", price: 1.95, point: 224.5 }] },
      ]},
      { title: "Bet365", markets: [
        { key: "h2h", outcomes: [{ name: "Boston Celtics", price: 1.38 }, { name: "Los Angeles Lakers", price: 3.0 }] },
        { key: "spreads", outcomes: [{ name: "Boston Celtics", price: 1.87, point: -4.5 }, { name: "Los Angeles Lakers", price: 1.97, point: 4.5 }] },
      ]},
      { title: "BetMGM", markets: [
        { key: "h2h", outcomes: [{ name: "Boston Celtics", price: 1.45 }, { name: "Los Angeles Lakers", price: 2.75 }] },
      ]},
    ],
  },
  {
    id: "demo-evt-2",
    sport_key: "soccer_epl",
    commence_time: new Date(Date.now() + 36e5 * 48).toISOString(),
    home_team: "Arsenal",
    away_team: "Manchester City",
    bookmakers: [
      { title: "William Hill", markets: [
        { key: "h2h", outcomes: [{ name: "Arsenal", price: 2.6 }, { name: "Draw", price: 3.5 }, { name: "Manchester City", price: 2.5 }] },
      ]},
      { title: "Pinnacle", markets: [
        { key: "h2h", outcomes: [{ name: "Arsenal", price: 2.65 }, { name: "Draw", price: 3.45 }, { name: "Manchester City", price: 2.62 }] },
      ]},
    ],
  },
  {
    id: "demo-evt-3",
    sport_key: "americanfootball_nfl",
    commence_time: new Date(Date.now() + 36e5 * 96).toISOString(),
    home_team: "Buffalo Bills",
    away_team: "Kansas City Chiefs",
    bookmakers: [
      { title: "FanDuel", markets: [
        { key: "h2h", outcomes: [{ name: "Buffalo Bills", price: 1.95 }, { name: "Kansas City Chiefs", price: 1.9 }] },
        { key: "totals", outcomes: [{ name: "Over", price: 1.91, point: 47.5 }, { name: "Under", price: 1.91, point: 47.5 }] },
      ]},
      { title: "DraftKings", markets: [
        { key: "h2h", outcomes: [{ name: "Buffalo Bills", price: 1.98 }, { name: "Kansas City Chiefs", price: 1.87 }] },
      ]},
    ],
  },
];

export default function App() {
  const [keys, setKeys] = useLocalStorage("apiKeys", []);
  const [activeKey, setActiveKey] = useLocalStorage("activeApiKey", "");
  const [tab, setTab] = useState("cuotas");
  const [sport, setSport] = useState("basketball_nba");
  const [events, setEvents] = useState(null); // null = sin cargar
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Migración: claves del formato antiguo (una sola) → lista
  useEffect(() => {
    if (keys.length === 0) {
      try {
        const legacy = JSON.parse(localStorage.getItem("sp:oddsApiKey") ?? "null");
        if (legacy) {
          setKeys([{ key: legacy, remaining: null }]);
          setActiveKey(legacy);
        }
      } catch {
        /* nada que migrar */
      }
    }
    // solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeMeta = keys.find((k) => k.key === activeKey);
  const remaining = activeMeta?.remaining ?? null;

  // ---- Registro personal de apuestas (compartido entre pestañas) ----
  const [bets, setBets] = useLocalStorage("bets", []);

  // ---- Alertas de arbitraje ----
  const [arbPct, setArbPct] = useLocalStorage("arbPct", 0.5); // umbral en %
  const [arbNotified, setArbNotified] = useLocalStorage("arbNotified", []);
  const [notifGranted, setNotifGranted] = useState(
    typeof Notification !== "undefined" && Notification.permission === "granted"
  );

  const requestNotifPermission = async () => {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifGranted(perm === "granted");
  };

  // Oportunidades de arbitraje >= umbral en los eventos del deporte activo
  const arbOpportunities = [];
  if (events) {
    for (const ev of events) {
      if (ev.sport_key !== sport) continue;
      const m = arbitrageMargin(buildLineMatrix(ev));
      if (m && m * 100 >= arbPct) arbOpportunities.push({ event: ev, margin: m });
    }
    arbOpportunities.sort((a, b) => b.margin - a.margin);
  }

  // Notificar (una sola vez por evento) nuevas oportunidades
  useEffect(() => {
    if (arbOpportunities.length === 0) return;
    const fresh = arbOpportunities.filter((o) => !arbNotified.includes(o.event.id));
    if (fresh.length === 0) return;
    setArbNotified((prev) => [...prev, ...fresh.map((o) => o.event.id)]);
    if (notifGranted) {
      const best = fresh[0];
      const pct = (best.margin * 100).toFixed(1);
      const ev = best.event;
      try {
        new Notification(`⚡ Arbitraje ${pct}%`, {
          body: `Posible arbitraje del ${pct}% en ${ev.away_team} @ ${ev.home_team}. Abre Smart Picks.`,
        });
      } catch {
        /* algunos navegadores exigen el service worker para notificar */
      }
    }
    // recalcula cuando cambian los eventos o el umbral
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arbOpportunities.map((o) => o.event.id).join(",")]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      let loaded = [];
      if (activeKey) {
        try {
          const { events: evts, remaining: rem } = await fetchOdds(activeKey, sport);
          setKeys((ks) =>
            ks.map((k) =>
              k.key === activeKey
                ? { ...k, remaining: rem != null ? Number(rem) : k.remaining }
                : k
            )
          );
          loaded = Array.isArray(evts) ? evts : [];
        } catch (e) {
          if (e.status === 429) {
            // créditos agotados: marcar la key y avisar con acción directa
            setKeys((ks) =>
              ks.map((k) => (k.key === activeKey ? { ...k, remaining: 0 } : k))
            );
            throw new Error("Créditos agotados para esta API key (código 429).");
          }
          throw e;
        }
      } else {
        await new Promise((r) => setTimeout(r, 300));
        loaded = DEMO_EVENTS.filter((e) => e.sport_key === sport);
      }
      setEvents(loaded);
      // los picks usan los eventos ya cargados (consenso) + ESPN FPI
      setPicks(await buildPicks(loaded, sport));
    } catch (e) {
      setError(e.message);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // recargar cuando cambie deporte o clave
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport, activeKey]);

  const visibleEvents = (events ?? []).filter((e) => e.sport_key === sport);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
            <rect width="28" height="28" rx="6" fill="#10b981" />
            <path d="M6 18l5-6 4 4 7-9" stroke="#0b1220" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1>Smart Picks</h1>
        </div>
        <nav className="tabs">
          <button className={tab === "cuotas" ? "tab active" : "tab"} onClick={() => setTab("cuotas")}>
            Cuotas
          </button>
          <button className={tab === "picks" ? "tab active" : "tab"} onClick={() => setTab("picks")}>
            Picks expertos
          </button>
          <button className={tab === "rendimiento" ? "tab active" : "tab"} onClick={() => setTab("rendimiento")}>
            Rendimiento{bets.some((b) => b.status === "open") ? ` (${bets.filter((b) => b.status === "open").length})` : ""}
          </button>
        </nav>
        <div className="header-actions">
          {remaining != null && <span className="credits" title="Créditos restantes de tu API">🎟️ {remaining}</span>}
          <button className="btn ghost" onClick={load} disabled={loading}>
            {loading ? "…" : "↻"}
          </button>
          <button className="btn ghost" onClick={() => setShowSettings(true)} title="Configuración">⚙️</button>
        </div>
      </header>

      {(remaining === 0 || (error ?? "").includes("Créditos agotados")) && (
        <div className="notice warn">
          ⚠️ Esta API key no tiene créditos. Créate otra gratis en the-odds-api.com y añádela en ⚙️,
          o activa otra key guardada.
          <button className="btn small" onClick={() => setShowSettings(true)}>Abrir ajustes</button>
        </div>
      )}
      {arbOpportunities.length > 0 && (
        <div className="notice arb">
          ⚡ {arbOpportunities.length} oportunidad(es) de arbitraje ≥ {arbPct}% —{" "}
          {arbOpportunities[0].event.away_team} @ {arbOpportunities[0].event.home_team}{" "}
          ({(arbOpportunities[0].margin * 100).toFixed(1)}%)
        </div>
      )}

      {!activeKey && (
        <div className="notice">
          Modo demostración — añade tu API key gratuita en ⚙️ para ver cuotas reales de las casas.
        </div>
      )}

      <SportSelector sports={SPORTS} active={sport} onChange={setSport} />

      <main>
        {error && <div className="error">{error}</div>}
        {tab === "cuotas" && (
          <section>
            {loading && <p className="muted">Cargando cuotas…</p>}
            {!loading && visibleEvents.length === 0 && !error && (
              <p className="muted">No hay eventos próximos con líneas disponibles para este deporte.</p>
            )}
            {visibleEvents.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </section>
        )}
        {tab === "picks" && (
          <PicksPanel
            picks={picks}
            sportKey={sport}
            events={events ?? []}
            bets={bets}
            setBets={setBets}
          />
        )}
        {tab === "rendimiento" && (
          <PerformancePanel
            bets={bets}
            setBets={setBets}
            activeKey={activeKey}
            onCredits={(rem) =>
              setKeys((ks) =>
                ks.map((k) =>
                  k.key === activeKey ? { ...k, remaining: Number(rem) } : k
                )
              )
            }
          />
        )}
      </main>

      {showSettings && (
        <SettingsModal
          keys={keys}
          active={activeKey}
          arbPct={arbPct}
          onArbPct={setArbPct}
          notifGranted={notifGranted}
          onRequestNotif={requestNotifPermission}
          onClose={() => setShowSettings(false)}
          onAdd={(newKey) => {
            const k = newKey;
            if (!k || keys.some((x) => x.key === k)) return;
            setKeys((ks) => [...ks, { key: k, remaining: null }]);
            setActiveKey(k);
          }}
          onActivate={(k) => setActiveKey(k)}
          onDelete={(k) =>
            setKeys((ks) => {
              const next = ks.filter((x) => x.key !== k);
              if (k === activeKey) {
                const alt = next.find((x) => x.remaining !== 0) ?? next[0];
                setActiveKey(alt?.key ?? "");
              }
              return next;
            })
          }
        />
      )}

      <footer className="app-footer">
        <p className="muted small">
          Las cuotas son informativas y pueden variar; confirma siempre en la casa antes de apostar.
          Juega con responsabilidad. +18
        </p>
      </footer>
    </div>
  );
}
