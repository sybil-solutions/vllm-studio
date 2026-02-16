import type { Config } from "../config/env";
import type { Logger } from "../core/logger";
import type { EventManager } from "../modules/monitoring/event-manager";
import type { LaunchState } from "../modules/lifecycle/launch-state";
import type { ControllerMetrics, MetricsRegistry } from "../modules/monitoring/metrics";
import type { ProcessManager } from "../modules/lifecycle/process-manager";
import type { DownloadManager } from "../modules/downloads/manager";
import type { ChatRunManager } from "../modules/chat/agent/run-manager";
import type { ChatStore } from "../modules/chat/store";
import type { DownloadStore } from "../modules/downloads/store";
import type { LifetimeMetricsStore, PeakMetricsStore } from "../modules/monitoring/metrics-store";
import type { McpStore } from "../modules/mcp/store";
import type { RecipeStore } from "../modules/lifecycle/recipe-store";

/**
 * Application-wide dependency container.
 */
export interface AppContext {
  config: Config;
  logger: Logger;
  eventManager: EventManager;
  launchState: LaunchState;
  metrics: ControllerMetrics;
  metricsRegistry: MetricsRegistry;
  processManager: ProcessManager;
  downloadManager: DownloadManager;
  runManager: ChatRunManager;
  stores: {
    recipeStore: RecipeStore;
    chatStore: ChatStore;
    downloadStore: DownloadStore;
    peakMetricsStore: PeakMetricsStore;
    lifetimeMetricsStore: LifetimeMetricsStore;
    mcpStore: McpStore;
  };
}
