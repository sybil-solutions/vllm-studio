// CRITICAL
import { resolve, sep } from "node:path";
import type { Config } from "../../config/env";

/**
 * Sanitizes a user-supplied path into safe relative path segments.
 * @param value - Raw path (may contain `/` or `\\` separators).
 * @returns Safe segments.
 */
export const sanitizePathSegments = (value: string): string[] => {
  return value
    .split(/[\\/]/)
    .map((segment) => segment.trim())
    .filter((segment) => Boolean(segment) && segment !== "." && segment !== "..");
};

/**
 * Resolves a model download directory under `config.models_dir`, rejecting path traversal.
 * @param config - Controller config.
 * @param modelId - Model id used as default destination.
 * @param destination - Optional destination directory override.
 * @returns Absolute path to download root for the model.
 */
export const resolveDownloadRoot = (config: Config, modelId: string, destination?: string | null): string => {
  const base = resolve(config.models_dir);
  const segments = destination ? sanitizePathSegments(destination) : sanitizePathSegments(modelId);
  const target = resolve(base, ...segments);
  const normalizedBase = base.endsWith(sep) ? base : base + sep;
  if (!target.startsWith(normalizedBase)) {
    throw new Error("Invalid destination path");
  }
  return target;
};

