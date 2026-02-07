import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { tailFileLines } from "./log-files";

describe("log-files > tailFileLines", () => {
  test("returns last N non-empty lines when file ends with newline", () => {
    const directory = mkdtempSync(join(tmpdir(), "vllm-studio-log-files-"));
    try {
      const path = join(directory, "sample.log");
      writeFileSync(path, "a\nb\nc\n", "utf-8");
      expect(tailFileLines(path, 2)).toEqual(["b", "c"]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("returns last N lines when file does not end with newline", () => {
    const directory = mkdtempSync(join(tmpdir(), "vllm-studio-log-files-"));
    try {
      const path = join(directory, "sample.log");
      writeFileSync(path, "a\nb\nc", "utf-8");
      expect(tailFileLines(path, 2)).toEqual(["b", "c"]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
