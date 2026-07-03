import type { Server } from "node:http";
import { config } from "../core/config";
import { connectRedis, disconnectRedis } from "../core/redis";
import { createApp } from "./app";

const shutdownTimeoutMs = 10_000;

function closeHttpServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function registerShutdownHandlers(server: Server): void {
  let shuttingDown = false;

  async function shutdown(signal: NodeJS.Signals): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;

    console.info(`[shutdown] received ${signal}; closing Kreis API`);

    const timeout = setTimeout(() => {
      console.error("[shutdown] graceful shutdown timed out");
      process.exit(1);
    }, shutdownTimeoutMs);
    timeout.unref();

    try {
      await closeHttpServer(server);
      await disconnectRedis();
      clearTimeout(timeout);
      process.exit(0);
    } catch {
      clearTimeout(timeout);
      console.error("[shutdown] failed to close cleanly");
      await disconnectRedis().catch(() => undefined);
      process.exit(1);
    }
  }

  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });
}

async function startServer(): Promise<void> {
  try {
    await connectRedis();
  } catch {
    if (config.NODE_ENV === "production") {
      console.error("[startup] Redis is unavailable; Kreis API did not start");
      process.exitCode = 1;
      await disconnectRedis().catch(() => undefined);
      return;
    }

    console.warn("[startup] Redis is unavailable; continuing without Redis in this environment");
    await disconnectRedis().catch(() => undefined);
  }

  const app = createApp();
  const server = app.listen(config.API_PORT, () => {
    console.log(`Kreis API listening on http://localhost:${config.API_PORT}`);
  });

  registerShutdownHandlers(server);
}

void startServer();