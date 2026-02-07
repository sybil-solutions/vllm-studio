// CRITICAL
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Config } from "../config/env";
import { resolveBinary, runCommand } from "./command/command-utilities";

const DEFAULT_TIMEOUT_MS = 15_000;

export const getLlamacppConfigHelp = async (
  config: Config,
): Promise<{ config: string | null; error: string | null }> => {
  const configured = config.llama_bin || "llama-server";
  const resolved = resolveBinary(configured) ?? (existsSync(configured) ? resolve(configured) : null);
  const binary = resolved ?? configured;

  const result = runCommand(binary, ["--help"], DEFAULT_TIMEOUT_MS);
  if (result.status !== 0) {
    return {
      config: result.stdout || null,
      error: result.stderr || "Failed to fetch llama.cpp config",
    };
  }
  return { config: result.stdout || null, error: null };
};
