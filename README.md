# Smart Picks 📊

PWA instalable para comparar líneas de casas de apuestas y picks de expertos.

## Funcionalidades

- **Cuotas**: comparación moneyline/spreads/totales entre 40+ casas (The Odds API), mejor precio resaltado y detector de arbitraje.
- **Deportes**: NFL, NBA, MLB, NHL, Premier League, La Liga, Champions League, Serie A, Bundesliga, Ligue 1, MLS, Tenis ATP, Tenis WTA, UFC/MMA y Cricket.
- **Torneos dinámicos**: tenis y cricket se publican por torneo en The Odds API. La app consulta `/sports` y resuelve automáticamente el torneo activo (Wimbledon, IPL, etc.), así que no hay que cambiar la key cada semana.
- **Picks reales**: consenso del mercado (promedio de probabilidad implícita de todas las casas) y modelo ESPN Analytics (FPI) vía API pública de ESPN. Donde ESPN no tiene modelo, se muestra solo el consenso.
- **Ahorro de créditos**: tenis, UFC y cricket piden únicamente `h2h`, porque spreads/totales no aplican o no existen. El resto usa `h2h,spreads,totals`.
- **Múltiples API keys**: guarda varias keys de The Odds API con sus créditos y alterna entre ellas.
- **Rendimiento**: historial de picks con ROI, resolución con marcadores reales y desglose por fuente.
- **Visual**: tema oscuro/claro persistido, diseño responsive, skeletons de carga y estados vacíos.
- **Offline**: service worker con cache de la última consulta (Workbox).

## Desarrollo

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # producción en dist/
npm run preview # sirve dist/ en http://localhost:4173
```

## Estructura

```text
src/
├── api/
│   ├── odds.js       # The Odds API, deportes, resolución de torneos, análisis
│   └── experts.js    # consenso de mercado + ESPN
├── components/
│   ├── SportSelector.jsx
│   ├── EventCard.jsx
│   ├── PicksPanel.jsx
│   ├── PerformancePanel.jsx
│   └── SettingsModal.jsx
├── hooks/useLocalStorage.js
├── App.jsx
└── styles.css        # tokens, temas y responsive
```

## Despliegue (GitHub Pages)

Automático: cada push a `main` ejecuta `.github/workflows/deploy.yml`, que construye
con `--base=/smart-picks-pwa/` y publica en `https://mikev23k.github.io/smart-picks-pwa/`.

## Instalar en el celular

1. Abre la URL desplegada en el navegador del teléfono.
2. Chrome (Android): menú ⋮ → "Añadir a pantalla de inicio".
3. Safari (iOS): compartir → "Añadir a inicio".
4. En Ajustes ⚙️ pega tu API key de [the-odds-api.com](https://the-odds-api.com) (gratuita, 500 créditos/mes; puedes guardar varias).

## Aviso

Cuotas informativas; confirma en la casa antes de apostar. Juega con responsabilidad. +18
