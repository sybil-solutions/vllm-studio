import type { RuntimeFailureReason } from "../../../../../shared/contracts/runtime-failures";

export interface ClassifyLaunchFailureOptions {
  spawnError?: string | null;
  logTail?: string | null;
}

const normalize = (value: string): string => value.toLowerCase();

const hasSpawnEnoent = (spawn: string): boolean =>
  spawn.includes("enoent") ||
  spawn.includes("no such file or directory") ||
  spawn.includes("command not found");

const hasSpawnEacces = (spawn: string): boolean =>
  spawn.includes("eacces") ||
  spawn.includes("permission denied") ||
  spawn.includes("access denied");

const hasSpawnAddrInUse = (spawn: string): boolean =>
  spawn.includes("eaddrinuse") ||
  spawn.includes("address already in use") ||
  spawn.includes("port is already in use");

const hasPreSpawnValidation = (msg: string): boolean =>
  msg.includes("path traversal") ||
  msg.includes("only llama-server executables are allowed") ||
  msg.includes("invalid launch command");

const hasBinaryMissingMessage = (msg: string): boolean =>
  msg.includes("was not found") ||
  msg.includes("command not found");

const hasAddrInUseHaystack = (haystack: string): boolean =>
  haystack.includes("address already in use") ||
  haystack.includes("port is already in use");

const hasModelFileMissing = (log: string): boolean =>
  log.includes("does not exist") ||
  log.includes("no such file or directory") ||
  log.includes("cannot open") ||
  log.includes("file not found") ||
  log.includes("model weights not found");

const hasModelFileCorrupt = (log: string): boolean =>
  log.includes("corrupt") ||
  log.includes("truncated") ||
  log.includes("invalid safetensors") ||
  log.includes("checksum") ||
  log.includes("failed to load weights");

const hasVramOom = (log: string): boolean =>
  log.includes("cuda out of memory") ||
  log.includes("out of cuda memory") ||
  log.includes("not enough cuda memory") ||
  log.includes("vram");

const hasSystemRamOom = (log: string): boolean =>
  log.includes("out of memory") ||
  log.includes("killed process") ||
  log.includes("signal 9") ||
  log.includes("oom") ||
  log.includes("system ram") ||
  log.includes("ram usage");

const hasContextOverflow = (log: string): boolean =>
  log.includes("context length") ||
  log.includes("max_model_len") ||
  log.includes("max sequence length") ||
  log.includes("context exceeds") ||
  log.includes("too large for model");

const hasKvCacheCapacity = (log: string): boolean =>
  log.includes("kv cache") ||
  log.includes("kv_cache") ||
  log.includes("block size") ||
  log.includes("kv cache capacity");

const hasUnsupportedFlag = (log: string): boolean =>
  log.includes("unsupported") ||
  log.includes("unrecognized") ||
  log.includes("invalid argument") ||
  log.includes("error: argument");

const hasProcessExitedEarly = (msg: string): boolean =>
  msg.includes("process exited early") ||
  msg.includes("crashed during startup");

const hasModelNotServed = (haystack: string): boolean =>
  haystack.includes("model auto-loading is disabled") ||
  haystack.includes("no model is running") ||
  haystack.includes("is not. launch it") ||
  haystack.includes("model not managed");

const hasBackendUnavailable = (haystack: string): boolean =>
  haystack.includes("backend unavailable") ||
  haystack.includes("failed to reach") ||
  haystack.includes("connection refused") ||
  haystack.includes("econnrefused");

export function classifyLaunchFailure(
  message: string,
  options: ClassifyLaunchFailureOptions = {}
): RuntimeFailureReason | undefined {
  const { spawnError, logTail } = options;
  const messageNorm = normalize(message);
  const spawnErrorNorm = normalize(spawnError ?? "");
  const logTailNorm = normalize(logTail ?? "");
  const haystack = [messageNorm, spawnErrorNorm, logTailNorm].join("\n");

  if (hasSpawnEnoent(spawnErrorNorm)) return "binary_missing";
  if (hasSpawnEacces(spawnErrorNorm)) return "binary_not_executable";
  if (hasSpawnAddrInUse(spawnErrorNorm)) return "port_in_use";

  if (hasPreSpawnValidation(messageNorm)) return "unsupported_backend_flag";
  if (hasBinaryMissingMessage(messageNorm)) return "binary_missing";

  if (haystack.includes("permission denied") && !logTailNorm.includes("model"))
    return "binary_not_executable";

  if (hasAddrInUseHaystack(haystack)) return "port_in_use";

  if (hasModelFileMissing(logTailNorm)) return "model_file_missing";

  if (logTailNorm.includes("permission denied") && logTailNorm.includes("model"))
    return "model_file_unreadable";

  if (hasModelFileCorrupt(logTailNorm)) return "model_file_corrupt_or_truncated";
  if (hasVramOom(logTailNorm)) return "vram_oom";
  if (hasSystemRamOom(logTailNorm)) return "system_ram_oom_or_swap";
  if (hasContextOverflow(logTailNorm)) return "context_exceeds_runtime_capacity";
  if (hasKvCacheCapacity(logTailNorm)) return "kv_cache_capacity_too_small";

  if (hasUnsupportedFlag(logTailNorm)) return "unsupported_backend_flag";
  if (hasProcessExitedEarly(messageNorm)) return "process_exited_early";
  if (messageNorm.includes("failed to become ready (timeout)")) return "health_timeout";

  if (hasModelNotServed(haystack)) return "model_not_served";
  if (hasBackendUnavailable(haystack)) return "backend_unreachable";

  return undefined;
}
