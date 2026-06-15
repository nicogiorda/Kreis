import { useEffect, useState } from "react";
import {
  isStartupDebugEnabled,
  readStartupDebugSnapshot,
  subscribeStartupDebug,
  type StartupDebugSnapshot
} from "../../startup/startup-debug";

export function StartupDebugPanel() {
  const enabled = isStartupDebugEnabled();
  const [snapshot, setSnapshot] = useState<StartupDebugSnapshot>(() => readStartupDebugSnapshot());

  useEffect(() => {
    if (!enabled) return undefined;

    return subscribeStartupDebug(() => setSnapshot(readStartupDebugSnapshot()));
  }, [enabled]);

  if (!enabled) return null;

  return (
    <pre
      aria-label="Startup debug"
      style={{
        position: "fixed",
        left: 8,
        right: 8,
        top: 8,
        zIndex: 2147483647,
        maxHeight: "42vh",
        overflow: "auto",
        borderRadius: 10,
        margin: 0,
        padding: 10,
        background: "rgba(0, 0, 0, 0.84)",
        color: "#f7edda",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        fontSize: 10,
        lineHeight: 1.35,
        whiteSpace: "pre-wrap"
      }}
    >
      {JSON.stringify(snapshot, null, 2)}
    </pre>
  );
}
