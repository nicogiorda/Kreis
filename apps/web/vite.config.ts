import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig({
  root: __dirname,
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      injectRegister: "script",
      registerType: "autoUpdate",
      manifest: false,
      includeAssets: [
        "icons/icono-app-180.png",
        "icons/icono-app-192.png",
        "icons/icono-app-512.png"
      ],
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        navigateFallback: "/index.html",
        skipWaiting: true,
        globPatterns: ["**/*.{js,css,html,png,svg,webp,woff,woff2}"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "kreis-api",
              networkTimeoutSeconds: 5,
              expiration: {
                maxAgeSeconds: 60 * 60 * 24,
                maxEntries: 80
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "kreis-images",
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 30,
                maxEntries: 80
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    outDir: "../../dist",
    emptyOutDir: true
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});
