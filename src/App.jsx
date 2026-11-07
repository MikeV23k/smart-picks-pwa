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
  {
    id: "demo-evt-4",
    sport_key: "tennis_atp",
    commence_time: new Date(Date.now() + 36e5 * 26).toISOString(),
    home_team: "Jannik Sinner",
    away_team: "Carlos Alcaraz",
    bookmakers: [
      { title: "Pinnacle", markets: [
        { key: "h2h", outcomes: [{ name: "Carlos Alcaraz", price: 2.1 }, { name: "Jannik Sinner", price: 1.75 }] },
      ]},
      { title: "Bet365", markets: [
        { key: "h2h", outcomes: [{ name: "Carlos Alcaraz", price: 2.02 }, { name: "Jannik Sinner", price: 1.82 }] },
      ]},
    ],
  },
  {
    id: "demo-evt-5",
    sport_key: "tennis_wta",
    commence_time: new Date(Date.now() + 36e5 * 32).toISOString(),
    home_team: "Iga Swiatek",
    away_team: "Aryna Sabalenka",
    bookmakers: [
      { title: "Pinnacle", markets: [
        { key: "h2h", outcomes: [{ name: "Aryna Sabalenka", price: 1.95 }, { name: "Iga Swiatek", price: 1.87 }] },
      ]},
      { title: "Betfair", markets: [
        { key: "h2h", outcomes: [{ name: "Aryna Sabalenka", price: 2.0 }, { name: "Iga Swiatek", price: 1.9 }] },
      ]},
    ],
  },
  {
    id: "demo-evt-6",
    sport_key: "mma_mixed_martial_arts",
    commence_time: new Date(Date.now() + 36e5 * 60).toISOString(),
    home_team: "Charles Oliveira",
    away_team: "Ilia Topuria",
    bookmakers: [
      { title: "DraftKings", markets: [
        { key: "h2h", outcomes: [{ name: "Ilia Topuria", price: 1.65 }, { name: "Charles Oliveira", price: 2.35 }] },
      ]},
      { title: "FanDuel", markets: [
        { key: "h2h", outcomes: [{ name: "Ilia Topuria", price: 1.62 }, { name: "Charles Oliveira", price: 2.4 }] },
      ]},
    ],
  },
  {
    id: "demo-evt-7",
    sport_key: "cricket",
    commence_time: new Date(Date.now() + 36e5 * 44).toISOString(),
    home_team: "Australia",
    away_team: "India",
    bookmakers: [
      { title: "Bet365", markets: [
        { key: "h2h", outcomes: [{ name: "India", price: 1.9 }, { name: "Australia", price: 2.05 }, { name: "Draw", price: 9.0 }] },
      ]},
      { title: "Pinnacle", markets: [
        { key: "h2h", outcomes: [{ name: "India", price: 1.88 }, { name: "Australia", price: 2.1 }, { name: "Draw", price: 8.5 }] },
      ]},
    ],
  },
  {
    id: "demo-evt-8",
    sport_key: "soccer_italy_serie_a",
    commence_time: new Date(Date.now() + 36e5 * 54).toISOString(),
    home_team: "Juventus",
    away_team: "Inter",
    bookmakers: [
      { title: "Bet365", markets: [
        { key: "h2h", outcomes: [{ name: "Inter", price: 2.15 }, { name: "Draw", price: 3.3 }, { name: "Juventus", price: 3.4 }] },
      ]},
      { title: "Pinnacle", markets: [
        { key: "h2h", outcomes: [{ name: "Inter", price: 2.1 }, { name: "Draw", price: 3.35 }, { name: "Juventus", price: 3.5 }] },
      ]},
    ],
  },
];

function SkeletonStack() {
  return (
    <div className="skeleton-stack" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div className="skeleton-card" key={i}>
          <div className="sk sk-sm" />
          <div className="sk sk-lg" />
          <div className="sk sk-line" />
          <div className="sk sk-line short" />
        </div>
      ))}
    </div>
  );
}

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
  const [theme, setTheme] = useLocalStorage("theme", "dark");
  // Evita duplicar la petición en el doble efecto de React StrictMode (dev),
  // que gastaría créditos de la API dos veces al montar.
  const lastLoad = useRef({ key: "", at: 0 });
  // Descarta respuestas viejas si el usuario cambia de deporte mientras carga.
  const requestSeq = useRef(0);

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

  // Tema claro / oscuro persistido
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#f4f6fa" : "#070b12");
  }, [theme]);

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

  const load = async (force = false) => {
    const requestKey = `${activeKey}:${sport}`;
    const now = Date.now();
    if (!force && lastLoad.current.key === requestKey && now - lastLoad.current.at < 1500) {
      return;
    }
    lastLoad.current = { key: requestKey, at: now };
    const seq = ++requestSeq.current;
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
        if (seq !== requestSeq.current) return;
        loaded = DEMO_EVENTS.filter((e) => e.sport_key === sport);
      }
      if (seq !== requestSeq.current) return;
      setEvents(loaded);
      // los picks usan los eventos ya cargados (consenso) + ESPN FPI
      const nextPicks = await buildPicks(loaded, sport);
      if (seq !== requestSeq.current) return;
      setPicks(nextPicks);
    } catch (e) {
      if (seq !== requestSeq.current) return;
      setError(e.message);
      setEvents([]);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // recargar cuando cambie deporte o clave
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport, activeKey]);

  const visibleEvents = (events ?? []).filter((e) => e.sport_key === sport);
  const bookCount = new Set(
    visibleEvents.flatMap((e) => (e.bookmakers ?? []).map((b) => b.title))
  ).size;
  const openBets = bets.filter((b) => b.status === "open").length;
  const activeSport = SPORTS.find((s) => s.key === sport);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
              <path
                d="M4 16l5-6 4 4 7-9"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="brand-text">
            <strong>Smart Picks</strong>
            <small>Cuotas &amp; picks</small>
          </span>
        </div>

        <nav className="tabs" aria-label="Secciones">
          <button
            className={tab === "cuotas" ? "tab active" : "tab"}
            onClick={() => setTab("cuotas")}
          >
            Cuotas
          </button>
          <button
            className={tab === "picks" ? "tab active" : "tab"}
            onClick={() => setTab("picks")}
          >
            Picks
          </button>
          <button
            className={tab === "rendimiento" ? "tab active" : "tab"}
            onClick={() => setTab("rendimiento")}
          >
            Rendimiento
            {openBets > 0 && <span className="tab-count">{openBets}</span>}
          </button>
        </nav>

        <div className="header-actions">
          {remaining != null && (
            <span className="credits" title="Créditos restantes de tu API">
              🎟️ {remaining}
            </span>
          )}
          <button
            className="icon-btn"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Activar tema claro" : "Activar tema oscuro"}
            title={theme === "dark" ? "Tema claro" : "Tema oscuro"}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button
            className={loading ? "icon-btn spinning" : "icon-btn"}
            onClick={() => load(true)}
            disabled={loading}
            aria-label="Actualizar cuotas"
            title="Actualizar"
          >
            ↻
          </button>
          <button
            className="icon-btn"
            onClick={() => setShowSettings(true)}
            aria-label="Configuración"
            title="Configuración"
          >
            ⚙️
          </button>
        </div>
      </header>

      {tab === "cuotas" && (
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              {activeKey ? "Datos en vivo" : "Modo demostración"}
            </span>
            <h2>Compara. Detecta. Decide.</h2>
            <p>
              Cuotas de las principales casas, consenso de mercado y arbitraje en
              una sola vista. {activeSport ? `Ahora: ${activeSport.label}.` : ""}
            </p>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <strong>{visibleEvents.length}</strong>
              <span>eventos</span>
            </div>
            <div className="hero-stat">
              <strong>{bookCount}</strong>
              <span>casas</span>
            </div>
            <div className="hero-stat">
              <strong>{arbOpportunities.length}</strong>
              <span>arbitrajes</span>
            </div>
          </div>
        </section>
      )}

      {(remaining === 0 || (error ?? "").includes("Créditos agotados")) && (
        <div className="notice warn" role="alert">
          <span>⚠️ Esta API key no tiene créditos. Crea otra gratis en the-odds-api.com.</span>
          <button className="btn small" onClick={() => setShowSettings(true)}>
            Abrir ajustes
          </button>
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
        <div className="notice info">
          Modo demostración — añade tu API key gratuita en ⚙️ para ver cuotas reales de las casas.
        </div>
      )}

      <SportSelector sports={SPORTS} active={sport} onChange={setSport} />

      <main>
        {error && (
          <div className="error" role="alert">
            <strong>No se pudieron cargar las cuotas.</strong>
            <span>{error}</span>
            <button className="btn small ghost" onClick={() => load(true)}>
              Reintentar
            </button>
          </div>
        )}

        {tab === "cuotas" && (
          <section>
            {loading && <SkeletonStack />}

            {!loading && visibleEvents.length === 0 && !error && (
              <div className="empty-state">
                <div className="empty-icon">📉</div>
                <h3>No hay eventos próximos</h3>
                <p>
                  No encontramos líneas para este deporte. Prueba otro o actualiza
                  en unos minutos.
                </p>
                <button className="btn ghost" onClick={() => load(true)}>
                  Actualizar
                </button>
              </div>
            )}

            {!loading &&
              visibleEvents.map((e) => <EventCard key={e.id} event={e} />)}
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
        <div className="footer-brand">
          <strong>Smart Picks</strong>
          <span>Cuotas y picks, sin ruido.</span>
        </div>
        <p className="muted small">
          Las cuotas son informativas y pueden variar; confirma siempre en la casa
          antes de apostar. Juega con responsabilidad. +18
        </p>
      </footer>
    </div>
  );
}
