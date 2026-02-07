// CRITICAL
import type { Recipe } from "@/lib/types";
import { LLAMACPP_OPTION_KEYS } from "./llamacpp-options";

type ExtraArgType = "string" | "number" | "boolean";

type ExtraArgField = {
  field: keyof Recipe;
  key: string;
  type: ExtraArgType;
  aliases?: string[];
};

const EXTRA_ARG_FIELDS: ExtraArgField[] = [
  { field: "tokenizer", key: "tokenizer", type: "string" },
  { field: "tokenizer_mode", key: "tokenizer-mode", type: "string" },
  { field: "seed", key: "seed", type: "number" },
  { field: "revision", key: "revision", type: "string" },
  { field: "code_revision", key: "code-revision", type: "string" },
  { field: "load_format", key: "load-format", type: "string" },
  { field: "quantization_param_path", key: "quantization-param-path", type: "string" },
  { field: "chat_template", key: "chat-template", type: "string" },
  { field: "chat_template_content_format", key: "chat-template-content-format", type: "string" },
  { field: "response_role", key: "response-role", type: "string" },
  { field: "block_size", key: "block-size", type: "number" },
  { field: "swap_space", key: "swap-space", type: "number" },
  { field: "cpu_offload_gb", key: "cpu-offload-gb", type: "number" },
  { field: "num_gpu_blocks_override", key: "num-gpu-blocks-override", type: "number" },
  { field: "enable_prefix_caching", key: "enable-prefix-caching", type: "boolean" },
  { field: "enable_chunked_prefill", key: "enable-chunked-prefill", type: "boolean" },
  { field: "max_num_batched_tokens", key: "max-num-batched-tokens", type: "number" },
  { field: "scheduling_policy", key: "scheduling-policy", type: "string" },
  { field: "max_paddings", key: "max-paddings", type: "number" },
  { field: "data_parallel_size", key: "data-parallel-size", type: "number" },
  { field: "distributed_executor_backend", key: "distributed-executor-backend", type: "string" },
  { field: "enable_expert_parallel", key: "enable-expert-parallel", type: "boolean" },
  { field: "enforce_eager", key: "enforce-eager", type: "boolean" },
  { field: "disable_cuda_graph", key: "disable-cuda-graph", type: "boolean" },
  { field: "cuda_graph_max_bs", key: "cuda-graph-max-bs", type: "number" },
  { field: "disable_custom_all_reduce", key: "disable-custom-all-reduce", type: "boolean" },
  { field: "use_v2_block_manager", key: "use-v2-block-manager", type: "boolean" },
  { field: "compilation_config", key: "compilation-config", type: "string" },
  { field: "speculative_model", key: "speculative-model", type: "string" },
  { field: "speculative_model_quantization", key: "speculative-model-quantization", type: "string" },
  { field: "num_speculative_tokens", key: "num-speculative-tokens", type: "number" },
  {
    field: "speculative_draft_tensor_parallel_size",
    key: "speculative-draft-tensor-parallel-size",
    type: "number",
  },
  { field: "speculative_max_model_len", key: "speculative-max-model-len", type: "number" },
  { field: "speculative_disable_mqa_scorer", key: "speculative-disable-mqa-scorer", type: "boolean" },
  {
    field: "spec_decoding_acceptance_method",
    key: "spec-decoding-acceptance-method",
    type: "string",
  },
  {
    field: "typical_acceptance_sampler_posterior_threshold",
    key: "typical-acceptance-sampler-posterior-threshold",
    type: "number",
  },
  {
    field: "typical_acceptance_sampler_posterior_alpha",
    key: "typical-acceptance-sampler-posterior-alpha",
    type: "number",
  },
  { field: "ngram_prompt_lookup_max", key: "ngram-prompt-lookup-max", type: "number" },
  { field: "ngram_prompt_lookup_min", key: "ngram-prompt-lookup-min", type: "number" },
  { field: "guided_decoding_backend", key: "guided-decoding-backend", type: "string" },
  { field: "tool_parser_plugin", key: "tool-parser-plugin", type: "string" },
  { field: "enable_lora", key: "enable-lora", type: "boolean" },
  { field: "max_loras", key: "max-loras", type: "number" },
  { field: "max_lora_rank", key: "max-lora-rank", type: "number" },
  { field: "lora_extra_vocab_size", key: "lora-extra-vocab-size", type: "number" },
  { field: "lora_dtype", key: "lora-dtype", type: "string" },
  { field: "long_lora_scaling_factors", key: "long-lora-scaling-factors", type: "string" },
  { field: "fully_sharded_loras", key: "fully-sharded-loras", type: "boolean" },
  { field: "image_input_type", key: "image-input-type", type: "string" },
  { field: "image_token_id", key: "image-token-id", type: "number" },
  { field: "image_input_shape", key: "image-input-shape", type: "string" },
  { field: "image_feature_size", key: "image-feature-size", type: "number" },
  { field: "limit_mm_per_prompt", key: "limit-mm-per-prompt", type: "string" },
  { field: "mm_processor_kwargs", key: "mm-processor-kwargs", type: "string" },
  { field: "allowed_local_media_path", key: "allowed-local-media-path", type: "string" },
  { field: "disable_log_requests", key: "disable-log-requests", type: "boolean" },
  { field: "disable_log_stats", key: "disable-log-stats", type: "boolean" },
  { field: "max_log_len", key: "max-log-len", type: "number" },
  { field: "uvicorn_log_level", key: "uvicorn-log-level", type: "string" },
  { field: "disable_frontend_multiprocessing", key: "disable-frontend-multiprocessing", type: "boolean" },
  { field: "enable_request_id_headers", key: "enable-request-id-headers", type: "boolean" },
  { field: "disable_fastapi_docs", key: "disable-fastapi-docs", type: "boolean" },
  { field: "return_tokens_as_token_ids", key: "return-tokens-as-token-ids", type: "boolean" },
  {
    field: "cuda_visible_devices",
    key: "cuda-visible-devices",
    type: "string",
    aliases: ["CUDA_VISIBLE_DEVICES", "cuda_visible_devices"],
  },
];

const RESERVED_EXTRA_ARGS = new Set<string>();

const addReservedKeys = (key: string): void => {
  RESERVED_EXTRA_ARGS.add(key);
  RESERVED_EXTRA_ARGS.add(key.replace(/-/g, "_"));
  RESERVED_EXTRA_ARGS.add(key.replace(/_/g, "-"));
};

for (const field of EXTRA_ARG_FIELDS) {
  addReservedKeys(field.key);
  if (field.aliases) {
    for (const alias of field.aliases) {
      addReservedKeys(alias);
    }
  }
}

["env_vars", "env-vars", "envVars", "status"].forEach(addReservedKeys);
["default-chat-template-kwargs", "default_chat_template_kwargs"].forEach(addReservedKeys);

for (const key of LLAMACPP_OPTION_KEYS) {
  addReservedKeys(key);
}

const coerceBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.toLowerCase().trim();
    if (["true", "1", "yes", "y"].includes(normalized)) return true;
    if (["false", "0", "no", "n"].includes(normalized)) return false;
  }
  return undefined;
};

const coerceNumber = (value: unknown): number | undefined => {
  if (typeof value === "number") return Number.isNaN(value) ? undefined : value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

const coerceValue = (value: unknown, type: ExtraArgType): unknown => {
  if (type === "boolean") return coerceBoolean(value);
  if (type === "number") return coerceNumber(value);
  if (typeof value === "string") return value;
  if (value === undefined || value === null) return undefined;
  return String(value);
};

const getCandidateKeys = (field: ExtraArgField | { key: string; aliases?: string[] }): string[] => {
  const keys = new Set<string>();
  keys.add(field.key);
  keys.add(field.key.replace(/-/g, "_"));
  keys.add(field.key.replace(/_/g, "-"));
  if (field.aliases) {
    for (const alias of field.aliases) {
      keys.add(alias);
      keys.add(alias.replace(/-/g, "_"));
      keys.add(alias.replace(/_/g, "-"));
    }
  }
  return Array.from(keys);
};

const getExtraArgValue = (
  extraArgs: Record<string, unknown>,
  field: ExtraArgField | { key: string; aliases?: string[] },
): unknown => {
  const keys = getCandidateKeys(field);
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(extraArgs, key)) {
      return extraArgs[key];
    }
  }
  return undefined;
};

const parseJsonObject = (value: unknown): Record<string, unknown> | null => {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
};

const extractThinkingBudget = (extraArgs: Record<string, unknown>): number | undefined => {
  const raw = getExtraArgValue(extraArgs, {
    key: "default-chat-template-kwargs",
    aliases: ["default_chat_template_kwargs"],
  });
  const parsed = parseJsonObject(raw);
  if (!parsed) return undefined;
  const budget = parsed["thinking_budget"];
  const coerced = coerceNumber(budget);
  return coerced;
};

export const normalizeRecipeForEditor = (recipe: Recipe): Recipe => {
  const extraArgs = { ...(recipe.extra_args ?? {}) } as Record<string, unknown>;
  const normalized: Recipe = {
    ...recipe,
    extra_args: extraArgs,
  };

  if (normalized.tp === undefined && normalized.tensor_parallel_size !== undefined) {
    normalized.tp = normalized.tensor_parallel_size;
  }
  if (normalized.pp === undefined && normalized.pipeline_parallel_size !== undefined) {
    normalized.pp = normalized.pipeline_parallel_size;
  }

  if (!normalized.env_vars) {
    const envVars = getExtraArgValue(extraArgs, { key: "env_vars", aliases: ["env-vars", "envVars"] });
    if (envVars && typeof envVars === "object" && !Array.isArray(envVars)) {
      normalized.env_vars = Object.fromEntries(
        Object.entries(envVars as Record<string, unknown>).map(([key, value]) => [key, String(value)]),
      );
    }
  }

  for (const field of EXTRA_ARG_FIELDS) {
    if (normalized[field.field] !== undefined) {
      continue;
    }
    const value = getExtraArgValue(extraArgs, field);
    const coerced = coerceValue(value, field.type);
    if (coerced !== undefined) {
      normalized[field.field] = coerced as never;
    }
  }

  if (normalized.thinking_budget === undefined) {
    const budget = extractThinkingBudget(extraArgs);
    if (budget !== undefined) {
      normalized.thinking_budget = budget;
    }
  }

  return normalized;
};

const setExtraArgValue = (
  extraArgs: Record<string, unknown>,
  field: ExtraArgField | { key: string; aliases?: string[] },
  value: unknown,
): void => {
  for (const key of getCandidateKeys(field)) {
    delete extraArgs[key];
  }
  if (value === undefined || value === null || value === "") {
    return;
  }
  extraArgs[field.key] = value;
};

export const prepareRecipeForSave = (recipe: Recipe): Recipe => {
  const payload: Recipe = {
    ...recipe,
    extra_args: { ...(recipe.extra_args ?? {}) },
  };
  const extraArgs = payload.extra_args ?? {};

  if (payload.tensor_parallel_size === undefined && payload.tp !== undefined) {
    payload.tensor_parallel_size = payload.tp;
  }
  if (payload.pipeline_parallel_size === undefined && payload.pp !== undefined) {
    payload.pipeline_parallel_size = payload.pp;
  }

  for (const field of EXTRA_ARG_FIELDS) {
    const value = payload[field.field];
    if (value !== undefined) {
      setExtraArgValue(extraArgs, field, value);
    }
    delete (payload as unknown as Record<string, unknown>)[field.field];
  }

  const existingKwargs = parseJsonObject(
    getExtraArgValue(extraArgs, {
      key: "default-chat-template-kwargs",
      aliases: ["default_chat_template_kwargs"],
    }),
  );
  const updatedKwargs = { ...(existingKwargs ?? {}) };
  if (payload.thinking_budget !== undefined && payload.thinking_budget !== null) {
    updatedKwargs["thinking_budget"] = payload.thinking_budget;
  } else {
    delete updatedKwargs["thinking_budget"];
  }
  for (const key of getCandidateKeys({ key: "default-chat-template-kwargs", aliases: ["default_chat_template_kwargs"] })) {
    delete extraArgs[key];
  }
  if (Object.keys(updatedKwargs).length > 0) {
    extraArgs["default_chat_template_kwargs"] = updatedKwargs;
  }

  if (payload.env_vars) {
    payload.env_vars = Object.fromEntries(
      Object.entries(payload.env_vars).map(([key, value]) => [key, String(value)]),
    );
  }

  delete (payload as unknown as Record<string, unknown>)["tp"];
  delete (payload as unknown as Record<string, unknown>)["pp"];
  delete (payload as unknown as Record<string, unknown>)["status"];
  delete (payload as unknown as Record<string, unknown>)["thinking_budget"];

  payload.extra_args = extraArgs;
  return payload;
};

export const filterExtraArgsForEditor = (extraArgs: Record<string, unknown>): Record<string, unknown> => {
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(extraArgs ?? {})) {
    if (!RESERVED_EXTRA_ARGS.has(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
};

export const mergeExtraArgsFromEditor = (
  extraArgs: Record<string, unknown>,
  editorArgs: Record<string, unknown>,
): Record<string, unknown> => {
  const merged: Record<string, unknown> = { ...extraArgs };
  for (const key of Object.keys(merged)) {
    if (!RESERVED_EXTRA_ARGS.has(key)) {
      delete merged[key];
    }
  }
  for (const [key, value] of Object.entries(editorArgs ?? {})) {
    merged[key] = value;
  }
  return merged;
};
