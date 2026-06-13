import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { registerSW } from "virtual:pwa-register";
import App from "./app/App";
import "./styles/global.css";
import "./styles/auth-flow.css";

let refreshingForServiceWorkerUpdate = false;

const standaloneNavigator = navigator as Navigator & { standalone?: boolean };
const isStandalone =
  window.matchMedia("(display-mode: standalone)").matches ||
  standaloneNavigator.standalone === true;

document.documentElement.classList.toggle("kreis-standalone", isStandalone);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshingForServiceWorkerUpdate) return;
    refreshingForServiceWorkerUpdate = true;
    window.location.reload();
  });
}

if ("caches" in window) {
  void Promise.all([
    caches.delete("kreis-api"),
    caches.delete("kreis-images")
  ]);
}

const updateServiceWorker = registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;

    void registration.update();

    const updateInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") void registration.update();
    }, 60 * 60 * 1000);

    window.addEventListener("beforeunload", () => window.clearInterval(updateInterval), { once: true });
  },
  onNeedRefresh() {
    updateServiceWorker(true);
  }
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
