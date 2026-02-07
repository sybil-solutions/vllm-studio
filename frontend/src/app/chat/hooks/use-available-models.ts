// CRITICAL
"use client";

import { useEffect, useRef } from "react";
import api from "@/lib/api";

type AvailableModel = {
  id: string;
  name: string;
  maxModelLen?: number;
  active?: boolean;
};

type UseAvailableModelsArgs = {
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
  setAvailableModels: (models: AvailableModel[]) => void;
};

export function useAvailableModels({ selectedModel, setSelectedModel, setAvailableModels }: UseAvailableModelsArgs): void {
  const modelsLoadedRef = useRef(false);

  useEffect(() => {
    if (modelsLoadedRef.current) return;
    modelsLoadedRef.current = true;

    const loadModels = async () => {
      try {
        const [data, recipesResult] = await Promise.all([
          api.getOpenAIModels(),
          api.getRecipes().catch(() => ({ recipes: [] })),
        ]);

        const dataModels = (data as { data?: unknown[] }).data;
        const modelsField = (data as { models?: unknown[] }).models;
        const rawModels = Array.isArray(data)
          ? data
          : Array.isArray(dataModels)
            ? dataModels
            : Array.isArray(modelsField)
              ? modelsField
              : [];

        const recipeMaxById = new Map<string, number>();
        for (const recipe of recipesResult.recipes ?? []) {
          if (!recipe || typeof recipe !== "object") continue;
          const record = recipe as { id?: string; served_model_name?: string; max_model_len?: number };
          const maxLen = record.max_model_len ?? 0;
          if (!maxLen || maxLen <= 0) continue;
          if (record.id) recipeMaxById.set(record.id, maxLen);
          if (record.served_model_name) recipeMaxById.set(record.served_model_name, maxLen);
        }

        const KNOWN_CONTEXT_LENGTHS: Record<string, number> = {
          "gpt-4": 8192,
          "gpt-4-32k": 32768,
          "gpt-4-turbo": 128000,
          "gpt-4o": 128000,
          "gpt-4o-mini": 128000,
          "gpt-3.5-turbo": 4096,
          "claude-3-opus": 200000,
          "claude-3-sonnet": 200000,
          "claude-3-haiku": 200000,
          "claude-3-5-sonnet": 200000,
          "gemini-pro": 32768,
          "gemini-1.5-pro": 1048576,
          "gemini-1.5-flash": 1048576,
          qwen: 32768,
          qwen2: 131072,
          llama: 8192,
          "llama-2": 4096,
          "llama-3": 8192,
          "llama-3.1": 131072,
          mistral: 32768,
          mixtral: 32768,
          phi: 2048,
          "phi-3": 131072,
          yi: 32768,
          glm: 32768,
          "glm-4": 131072,
          deepseek: 65536,
          "command-r": 128000,
          "command-r-plus": 128000,
        };

        const getContextLength = (id: string, apiMaxLen?: number): number => {
          if (apiMaxLen && apiMaxLen > 0) return apiMaxLen;
          const lowerId = id.toLowerCase();
          for (const [pattern, length] of Object.entries(KNOWN_CONTEXT_LENGTHS)) {
            if (lowerId.includes(pattern.toLowerCase())) {
              return length;
            }
          }
          return 32768;
        };

        const mappedModels: AvailableModel[] = rawModels
          .flatMap((model) => {
            if (!model || typeof model !== "object") return [];
            const record = model as {
              id?: string;
              model?: string;
              name?: string;
              max_model_len?: number;
              active?: boolean;
            };
            const id = record.id ?? record.model ?? record.name;
            if (!id) return [];
            const recipeMaxLen = recipeMaxById.get(id);
            return [
              {
                id,
                name: id,
                maxModelLen: getContextLength(id, record.max_model_len ?? recipeMaxLen),
                active: record.active === true,
              },
            ];
          })
          .sort((a, b) => a.id.localeCompare(b.id));

        setAvailableModels(mappedModels);

        const lastModel = localStorage.getItem("vllm-studio-last-model");
        const activeModel = mappedModels.find((model) => model.active)?.id;
        const fallbackModel = activeModel ?? mappedModels[0]?.id ?? "";
        const currentModel = selectedModel;

        if (mappedModels.length === 0) {
          if (lastModel && !currentModel) {
            setSelectedModel(lastModel);
          }
          return;
        }

        let next = currentModel;
        if (next && mappedModels.some((model) => model.id === next)) {
          // keep selected model
        } else if (lastModel && mappedModels.some((model) => model.id === lastModel)) {
          next = lastModel;
        } else {
          next = fallbackModel;
        }

        if (next && next !== currentModel) {
          setSelectedModel(next);
        }
      } catch (err) {
        console.error("Failed to load models:", err);
      }
    };

    void loadModels();
  }, [selectedModel, setAvailableModels, setSelectedModel]);
}

