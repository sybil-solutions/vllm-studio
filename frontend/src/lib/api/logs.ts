import type { LogSession } from "../types";
import type { ApiCore } from "./core";

export function createLogsApi(core: ApiCore) {
  return {
    getLogSessions: (): Promise<{ sessions: LogSession[] }> => core.request("/logs"),

    getLogs: (sessionId: string, limit?: number): Promise<{ logs: string[] }> => {
      const query = limit ? `?limit=${limit}` : "";
      return core.request(`/logs/${sessionId}${query}`);
    },

    deleteLogSession: (sessionId: string): Promise<void> =>
      core.request(`/logs/${sessionId}`, { method: "DELETE" }),
  };
}
