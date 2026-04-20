import { describe, expect, it } from "bun:test";
import { PassThrough } from "node:stream";
import { waitForWriterDrain } from "./stream-backpressure";

describe("waitForWriterDrain", () => {
  it("cleans up listeners after repeated drain cycles", async () => {
    const writer = new PassThrough();

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const pending = waitForWriterDrain(writer);
      expect(writer.listenerCount("drain")).toBe(1);
      expect(writer.listenerCount("error")).toBe(1);

      writer.emit("drain");
      await pending;

      expect(writer.listenerCount("drain")).toBe(0);
      expect(writer.listenerCount("error")).toBe(0);
    }
  });

  it("cleans up drain listeners when the writer errors", async () => {
    const writer = new PassThrough();
    const pending = waitForWriterDrain(writer);
    const error = new Error("writer failed");

    writer.emit("error", error);

    await expect(pending).rejects.toThrow("writer failed");
    expect(writer.listenerCount("drain")).toBe(0);
    expect(writer.listenerCount("error")).toBe(0);
  });
});
