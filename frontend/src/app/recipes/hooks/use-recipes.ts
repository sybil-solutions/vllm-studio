// CRITICAL
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import type { Recipe, RecipeWithStatus, VRAMCalculation } from "@/lib/types";
import { useRealtimeStatus } from "@/hooks/use-realtime-status";

type Tab = "recipes" | "tools";

const DEFAULT_RECIPE: Recipe = {
  id: "",
  name: "",
  model_path: "",
  backend: "vllm",
  tp: 1,
  pp: 1,
  tensor_parallel_size: 1,
  pipeline_parallel_size: 1,
  port: 8000,
  host: "0.0.0.0",
  gpu_memory_utilization: 0.9,
  max_model_len: 32768,
  max_num_seqs: 256,
  kv_cache_dtype: "auto",
  trust_remote_code: true,
  extra_args: {},
};

export function useRecipes() {
  const [tab, setTab] = useState<Tab>("recipes");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recipes, setRecipes] = useState<RecipeWithStatus[]>([]);
  const [filter, setFilter] = useState("");
  const [pinnedRecipes, setPinnedRecipes] = useState<Set<string>>(new Set());
  const [recipeMenuOpen, setRecipeMenuOpen] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [runningRecipeId, setRunningRecipeId] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRecipe, setModalRecipe] = useState<Recipe | null>(null);
  const [saving, setSaving] = useState(false);
  const [vramModel, setVramModel] = useState("");
  const [contextLength, setContextLength] = useState(32768);
  const [tpSize, setTpSize] = useState(8);
  const [kvDtype, setKvDtype] = useState<"auto" | "fp16" | "fp8">("auto");
  const [vramResult, setVramResult] = useState<VRAMCalculation | null>(null);
  const [calculating, setCalculating] = useState(false);

  const { launchProgress } = useRealtimeStatus();

  useEffect(() => {
    try {
      const saved = localStorage.getItem("vllm-studio-pinned-recipes");
      if (saved) setPinnedRecipes(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  const togglePin = useCallback((recipeId: string) => {
    setPinnedRecipes((prev) => {
      const next = new Set(prev);
      if (next.has(recipeId)) {
        next.delete(recipeId);
      } else {
        next.add(recipeId);
      }
      localStorage.setItem("vllm-studio-pinned-recipes", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const loadRecipes = useCallback(async () => {
    try {
      const recipesData = await api
        .getRecipes()
        .catch(() => ({ recipes: [] as RecipeWithStatus[] }));
      const recipesList = recipesData.recipes || [];
      setRecipes(recipesList);
      const running = recipesList.find((recipe) => recipe.status === "running")?.id || null;
      setRunningRecipeId(running);
    } catch (e) {
      console.error("Failed to load recipes:", e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await loadRecipes();
      } finally {
        setLoading(false);
      }
    })();
  }, [loadRecipes]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecipes();
    setRefreshing(false);
  }, [loadRecipes]);

  const handleNewRecipe = useCallback(() => {
    setModalRecipe({ ...DEFAULT_RECIPE });
    setModalOpen(true);
  }, []);

  const handleEditRecipe = useCallback((recipe: RecipeWithStatus) => {
    setModalRecipe({ ...recipe });
    setModalOpen(true);
    setRecipeMenuOpen(null);
  }, []);

  const handleSaveRecipe = useCallback(async () => {
    if (!modalRecipe) return;

    setSaving(true);
    try {
      if (modalRecipe.id) {
        await api.updateRecipe(modalRecipe.id, modalRecipe);
      } else {
        const id = modalRecipe.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        await api.createRecipe({ ...modalRecipe, id });
      }
      await loadRecipes();
      setModalOpen(false);
      setModalRecipe(null);
    } catch (e) {
      alert("Failed to save recipe: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [loadRecipes, modalRecipe]);

  const handleDeleteRecipe = useCallback(
    async (recipeId: string) => {
      try {
        await api.deleteRecipe(recipeId);
        await loadRecipes();
        setDeleteConfirm(null);
        setRecipeMenuOpen(null);
      } catch (e) {
        alert("Failed to delete: " + (e as Error).message);
      }
    },
    [loadRecipes],
  );

  const handleLaunchRecipe = useCallback(
    async (recipeId: string) => {
      setLaunching(true);
      try {
        await api.launch(recipeId);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await loadRecipes();
      } catch (e) {
        alert("Failed to launch: " + (e as Error).message);
      } finally {
        setLaunching(false);
      }
    },
    [loadRecipes],
  );

  const handleEvictModel = useCallback(async () => {
    try {
      await api.evictModel();
      await loadRecipes();
    } catch (e) {
      alert("Failed to evict: " + (e as Error).message);
    }
  }, [loadRecipes]);

  const calculateVRAM = useCallback(async () => {
    if (!vramModel.trim()) return;
    setCalculating(true);
    try {
      const result = await api.calculateVRAM({
        model: vramModel,
        context_length: contextLength,
        tp_size: tpSize,
        kv_dtype: kvDtype,
      });
      setVramResult(result);
    } catch (e) {
      alert("Failed to calculate: " + (e as Error).message);
    } finally {
      setCalculating(false);
    }
  }, [contextLength, kvDtype, tpSize, vramModel]);

  const filteredRecipes = useMemo(
    () =>
      recipes.filter(
        (recipe) =>
          recipe.name.toLowerCase().includes(filter.toLowerCase()) ||
          recipe.model_path.toLowerCase().includes(filter.toLowerCase()),
      ),
    [filter, recipes],
  );

  const sortedRecipes = useMemo(() => {
    return [...filteredRecipes].sort((a, b) => {
      const aPinned = pinnedRecipes.has(a.id);
      const bPinned = pinnedRecipes.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [filteredRecipes, pinnedRecipes]);

  return {
    tab,
    setTab,
    loading,
    refreshing,
    recipes,
    filter,
    setFilter,
    pinnedRecipes,
    togglePin,
    recipeMenuOpen,
    setRecipeMenuOpen,
    deleteConfirm,
    setDeleteConfirm,
    runningRecipeId,
    launching,
    modalOpen,
    setModalOpen,
    modalRecipe,
    setModalRecipe,
    saving,
    vramModel,
    setVramModel,
    contextLength,
    setContextLength,
    tpSize,
    setTpSize,
    kvDtype,
    setKvDtype,
    vramResult,
    calculating,
    launchProgress,
    handleRefresh,
    handleNewRecipe,
    handleEditRecipe,
    handleSaveRecipe,
    handleDeleteRecipe,
    handleLaunchRecipe,
    handleEvictModel,
    calculateVRAM,
    sortedRecipes,
  };
}
