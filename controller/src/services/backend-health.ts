// CRITICAL
import type { Config } from "../config/env";
import type { BackendAvailability, BackendTarget } from "../types/models";

const HEALTH_CHECK_TIMEOUT = 2000;

export const checkBackendHealth = async (
  url: string,
  headers: Record<string, string> = {},
): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);
    const response = await fetch(`${url}/health`, {
      signal: controller.signal,
      headers: { "User-Agent": "vllm-studio/1.0", ...headers },
    });
    clearTimeout(timeoutId);
    return response.status === 200;
  } catch {
    return false;
  }
};

export const detectAvailableBackends = async (config: Config): Promise<BackendAvailability> => {
  const masterKey = process.env["LITELLM_MASTER_KEY"] ?? "sk-master";
  const litellmHeaders = { Authorization: `Bearer ${masterKey}` };
  const [litellmAvailable, inferenceAvailable] = await Promise.all([
    checkBackendHealth(config.litellm_url, litellmHeaders),
    checkBackendHealth(config.inference_url),
  ]);

  return {
    litellm_available: litellmAvailable,
    inference_available: inferenceAvailable,
    selected_mode: "auto",
  };
};

export const selectBackend = (config: Config, availability: BackendAvailability): BackendTarget => {
  if (config.direct_mode) {
    return { mode: "direct", url: config.inference_url, name: "Direct Inference" };
  }
  if (availability.litellm_available) {
    return { mode: "litellm", url: config.litellm_url, name: "LiteLLM Gateway" };
  }
  if (availability.inference_available) {
    return { mode: "direct", url: config.inference_url, name: "Direct Inference (fallback)" };
  }
  throw new Error(
    "No inference backend available. LiteLLM is not running and vLLM/SGLang is not reachable.",
  );
};
