# Smart Picks 📊

PWA instalable para comparar líneas de casas de apuestas y picks de expertos.

## Funcionalidades

- **Cuotas**: comparación moneyline/spreads/totales entre 40+ casas (The Odds API), mejor precio resaltado y detector de arbitraje.
- **Picks reales**: consenso del mercado (promedio de probabilidad implícita de todas las casas) y modelo ESPN Analytics (FPI) vía API pública de ESPN.
- **Múltiples API keys**: guarda varias keys de The Odds API con sus créditos y alterna entre ellas.
- **Offline**: service worker con cache de la última consulta (Workbox).

## Desarrollo

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # producción en dist/
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
