// CRITICAL
import { getModel } from "@mariozechner/pi-ai";
import type { Model } from "@mariozechner/pi-ai";

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

export const createOpenAiCompatibleModel = (
  modelId: string,
  baseUrl: string,
): Model<"openai-completions"> => {
  const base = getModel("openai", DEFAULT_OPENAI_MODEL);
  return {
    ...base,
    id: modelId,
    name: modelId,
    api: "openai-completions",
    provider: "openai",
    baseUrl,
  };
};
