import type { EventEmitter } from "node:events";

type DrainAwareWriter = Pick<EventEmitter, "once" | "removeListener">;

/**
 * Wait for a write stream to become writable again without leaking listeners
 * across repeated backpressure cycles.
 * @param writer - Writable stream currently under backpressure.
 * @returns A promise that resolves on `drain` or rejects on `error`.
 */
export const waitForWriterDrain = (writer: DrainAwareWriter): Promise<void> =>
  new Promise((resolve, reject) => {
    const cleanup = (): void => {
      writer.removeListener("drain", onDrain);
      writer.removeListener("error", onError);
    };

    const onDrain = (): void => {
      cleanup();
      resolve();
    };

    const onError = (error: Error): void => {
      cleanup();
      reject(error);
    };

    writer.once("drain", onDrain);
    writer.once("error", onError);
  });
