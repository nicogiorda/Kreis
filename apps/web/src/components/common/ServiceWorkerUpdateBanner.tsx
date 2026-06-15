import { useEffect, useState } from "react";
import {
  applyPendingServiceWorkerUpdate,
  dismissPendingServiceWorkerUpdate,
  readServiceWorkerUpdateState,
  subscribeServiceWorkerUpdates
} from "../../pwa/service-worker-updates";

export function ServiceWorkerUpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(() => readServiceWorkerUpdateState().updateAvailable);

  useEffect(() => {
    return subscribeServiceWorkerUpdates(() => {
      setUpdateAvailable(readServiceWorkerUpdateState().updateAvailable);
    });
  }, []);

  if (!updateAvailable) return null;

  return (
    <aside className="fixed left-4 right-4 top-[max(16px,env(safe-area-inset-top))] z-[90] mx-auto flex max-w-[420px] items-center gap-3 rounded-[18px] bg-kreis-forest px-4 py-3 text-kreis-cream shadow-kreis-card">
      <p className="m-0 min-w-0 flex-1 text-[14px] font-medium leading-tight">Hay una nueva version de Kreis.</p>
      <button className="rounded-full bg-kreis-cream px-3 py-2 text-[13px] font-medium text-kreis-forest" type="button" onClick={() => void applyPendingServiceWorkerUpdate()}>
        Actualizar
      </button>
      <button className="rounded-full bg-transparent px-2 py-2 text-[13px] font-medium text-kreis-cream" type="button" onClick={dismissPendingServiceWorkerUpdate}>
        Despues
      </button>
    </aside>
  );
}
