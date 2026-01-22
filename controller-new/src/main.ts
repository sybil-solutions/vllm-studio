import { createServer } from "node:net";
import { createAppContext } from "./app-context";
import { createApp } from "./http/app";
import { startMetricsCollector } from "./metrics-collector";

/**
 * Check if a TCP port is available.
 * @param host - Host interface.
 * @param port - Port number.
 * @returns Promise resolving to availability.
 */
const isPortAvailable = (host: string, port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
};

/**
 * Resolve an available port, scanning forward if needed.
 * @param host - Host interface.
 * @param preferred - Preferred port.
 * @param maxAttempts - Maximum attempts.
 * @returns Available port.
 */
const resolvePort = async (host: string, preferred: number, maxAttempts = 20): Promise<number> => {
  for (let offset = 0; offset <= maxAttempts; offset += 1) {
    const candidate = preferred + offset;
    if (await isPortAvailable(host, candidate)) {
      return candidate;
    }
  }
  return preferred;
};

const context = createAppContext();
const app = createApp(context);
const stopMetrics = startMetricsCollector(context);

/**
 * Start the Bun server.
 * @returns Promise that resolves when started.
 */
const run = async (): Promise<void> => {
  const envPortOverride = Boolean(process.env["VLLM_STUDIO_PORT"]);
  if (!envPortOverride) {
    const available = await resolvePort(context.config.host, context.config.port);
    context.config.port = available;
  }

  const server = Bun.serve({
    port: context.config.port,
    hostname: context.config.host,
    fetch: app.fetch,
    idleTimeout: 120,
  });

  context.logger.info(`Controller-new listening on ${context.config.host}:${server.port}`);

  const shutdown = (): void => {
    stopMetrics();
    if (typeof server.stop === "function") {
      server.stop();
    }
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

void run();
