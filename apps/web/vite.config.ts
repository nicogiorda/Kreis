import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig({
  root: __dirname,
  envDir: path.resolve(__dirname, "../.."),
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      injectRegister: null,
      registerType: "prompt",
      workbox: {
        cacheId: "kreis-web-app",
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        navigateFallback: "/index.html",
        skipWaiting: false,
        globPatterns: ["**/*.{js,css,html,png,svg,webp,woff,woff2}"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "kreis-api-v1",
              networkTimeoutSeconds: 5,
              expiration: {
                maxAgeSeconds: 60 * 5,
                maxEntries: 80
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: ({ request, url }) => request.destination === "image" && !url.pathname.startsWith("/assets/"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "kreis-public-images-v1",
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 7,
                maxEntries: 80
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      manifest: false,
      includeAssets: [
        "icons/icono-app-180.png",
        "icons/icono-app-192.png",
        "icons/icono-app-512.png"
      ]
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

