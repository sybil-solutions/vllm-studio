export const BACKEND_LABELS: Record<string, string> = {
  vllm: "vLLM",
  sglang: "SGLang",
  llamacpp: "llama.cpp",
  transformers: "Transformers",
  tabbyapi: "TabbyAPI",
};

export const formatBackendLabel = (backend?: string | null): string => {
  if (!backend) return BACKEND_LABELS.vllm;
  return BACKEND_LABELS[backend] ?? backend;
};

