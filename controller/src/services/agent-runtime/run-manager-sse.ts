// CRITICAL
import type { AsyncQueue } from "../../core/async";
import type { AppContext } from "../../types/context";

/**
 * Encode a server-sent event payload.
 * @param type - Event type.
 * @param data - Event data.
 * @returns SSE formatted string.
 */
export function encodeSseEvent(type: string, data: Record<string, unknown>): string {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Create an async SSE stream from the queue.
 * @param queue - Outgoing SSE queue.
 * @param abort - Abort controller for stream lifecycle.
 * @param runPromise - Promise that resolves when the run finishes.
 * @returns Async iterable of SSE chunks.
 */
export async function* createSseStream(
  queue: AsyncQueue<string>,
  abort: AbortController,
  runPromise: Promise<void>
): AsyncIterable<string> {
  const KEEPALIVE_INTERVAL_MS = 15_000;

  const sleep = (ms: number, signal: AbortSignal): Promise<void> =>
    new Promise<void>((resolve, reject) => {
      if (signal.aborted) {
        reject(new Error("aborted"));
        return;
      }
      const id = setTimeout(() => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      }, ms);
      const onAbort = (): void => {
        clearTimeout(id);
        reject(new Error("aborted"));
      };
      signal.addEventListener("abort", onAbort, { once: true });
    });

  try {
    // Keep a single pending shift promise to avoid overlapping `queue.shift()` calls.
    let pendingShift = queue.shift(abort.signal);
    while (true) {
      const winner = await Promise.race([
        pendingShift.then((value) => ({ kind: "value" as const, value })),
        sleep(KEEPALIVE_INTERVAL_MS, abort.signal).then(() => ({ kind: "keepalive" as const })),
      ]);

      if (winner.kind === "keepalive") {
        // SSE comment line: keeps connections alive without producing a client-visible event.
        yield `: keepalive\n\n`;
        continue;
      }

      yield winner.value;
      pendingShift = queue.shift(abort.signal);
    }
  } catch {
    // Stream closed or aborted.
  } finally {
    abort.abort();
    await runPromise;
  }
}

/**
 * Create a publisher that both persists run events and pushes SSE chunks.
 * @param context - Application context.
 * @param params - Publisher parameters.
 * @param params.runId - Run identifier.
 * @param params.sessionId - Session identifier.
 * @param params.queue - Outgoing SSE queue.
 * @returns Publisher functions.
 */
export function createRunPublisher(
  context: AppContext,
  params: {
    runId: string;
    sessionId: string;
    queue: AsyncQueue<string>;
  }
): { publish: (type: string, data: Record<string, unknown>) => void } {
  const { runId, sessionId, queue } = params;
  let eventSeq = 0;

  const publish = (type: string, data: Record<string, unknown>): void => {
    eventSeq += 1;
    const payload = { run_id: runId, session_id: sessionId, ...data };
    context.stores.chatStore.addRunEvent(runId, eventSeq, type, payload);
    queue.push(encodeSseEvent(type, payload));
  };

  return { publish };
}
