import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./app/App";
import { AuthProvider } from "./auth/AuthProvider";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { startServiceWorkerRegistration } from "./pwa/service-worker-updates";
import { installGlobalStartupErrorListeners, markStartup } from "./startup/startup-debug";
import "./styles/global.css";
import "./styles/auth-flow.css";
import "./styles/admin.css";

markStartup("app-script-start");
installGlobalStartupErrorListeners();

const standaloneNavigator = navigator as Navigator & { standalone?: boolean };
const isStandalone =
  window.matchMedia("(display-mode: standalone)").matches ||
  standaloneNavigator.standalone === true;

document.documentElement.classList.toggle("kreis-standalone", isStandalone);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

markStartup("react-mounted");

const scheduleIdleTask = window.requestIdleCallback ?? ((callback: IdleRequestCallback) => window.setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 0 }), 0));
scheduleIdleTask(() => startServiceWorkerRegistration());
