import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // base configurable: para GitHub Pages (repo de proyecto) se construye con
  // `vite build --base=/smart-picks-pwa/` para que los assets y el SW resuelvan bien.
  base: "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Smart Picks — Cuotas, picks y arbitraje",
        short_name: "Smart Picks",
        description:
          "Compara cuotas de las principales casas, sigue picks de expertos y detecta arbitraje en fútbol, NBA, NFL, tenis, UFC y más.",
        theme_color: "#070b12",
        background_color: "#070b12",
        display: "standalone",
        // Rutas relativas: funcionan igual en "/" (local) que en
        // "/smart-picks-pwa/" (GitHub Pages de proyecto).
        start_url: "./",
        scope: "./",
        id: "./",
        icons: [
          { src: "favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.the-odds-api\.com\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "odds-api-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
