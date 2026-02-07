// CRITICAL
"use client";

import { memo, useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import {
  Calculator,
  MoreVertical,
  Package,
  Pin,
  PinOff,
  Play,
  Plus,
  RefreshCw,
  Search,
  Square,
} from "lucide-react";
import api from "@/lib/api";
import type { ModelInfo, Recipe, RecipeWithStatus } from "@/lib/types";
import { useRealtimeStatus } from "@/hooks/use-realtime-status";
import { formatBackendLabel } from "../recipe-labels";
import { normalizeRecipeForEditor, prepareRecipeForSave } from "../recipe-utils";
import { RecipeModal } from "./recipe-modal/recipe-modal";
import { VramCalculatorPanel } from "./vram-calculator-panel";
import { VllmRuntimePanel } from "./vllm-runtime-panel";

type Tab = "recipes" | "tools" | "runtime";

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

export function RecipesContent() {
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

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRecipe, setModalRecipe] = useState<Recipe | null>(null);
  const [saving, setSaving] = useState(false);

  // Available models for selection
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);

  const { launchProgress } = useRealtimeStatus();

  // Load pinned recipes from localStorage
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
      const [recipesData, modelsData] = await Promise.all([
        api.getRecipes().catch(() => ({ recipes: [] as RecipeWithStatus[] })),
        api.getModels().catch(() => ({ models: [] as ModelInfo[] })),
      ]);
      const recipesList = recipesData.recipes || [];
      setRecipes(recipesList);
      const running = recipesList.find((r) => r.status === "running")?.id || null;
      setRunningRecipeId(running);

      // Store available models for selection dropdown
      setAvailableModels(modelsData.models || []);
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
    setModalRecipe(normalizeRecipeForEditor({ ...DEFAULT_RECIPE }));
    setModalOpen(true);
  }, []);

  const handleEditRecipe = useCallback((recipe: RecipeWithStatus) => {
    setModalRecipe(normalizeRecipeForEditor(recipe));
    setModalOpen(true);
    setRecipeMenuOpen(null);
  }, []);

  const handleSaveRecipe = useCallback(async () => {
    if (!modalRecipe) return;

    const recipeToSave = prepareRecipeForSave(modalRecipe);

    setSaving(true);
    try {
      if (recipeToSave.id) {
        await api.updateRecipe(recipeToSave.id, recipeToSave);
      } else {
        // Generate ID from name
        const id = recipeToSave.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        await api.createRecipe({ ...recipeToSave, id });
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

  const handleDeleteRecipe = useCallback(async (recipeId: string) => {
    try {
      await api.deleteRecipe(recipeId);
      await loadRecipes();
      setDeleteConfirm(null);
      setRecipeMenuOpen(null);
    } catch (e) {
      alert("Failed to delete: " + (e as Error).message);
    }
  }, [loadRecipes]);

  const handleLaunchRecipe = useCallback(async (recipeId: string) => {
    setLaunching(true);
    try {
      // Fire and forget - don't block on model loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s max wait

      try {
        await fetch(`/api/proxy/launch/${recipeId}`, {
          method: "POST",
          signal: controller.signal,
        });
      } catch {
        // Timeout or abort is fine - launch continues in background
      } finally {
        clearTimeout(timeoutId);
      }

      // Brief wait then refresh to show "starting" status
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await loadRecipes();
    } catch (e) {
      alert("Failed to launch: " + (e as Error).message);
    } finally {
      setLaunching(false);
    }
  }, [loadRecipes]);

  const handleEvictModel = useCallback(async () => {
    try {
      await api.evictModel();
      await loadRecipes();
    } catch (e) {
      alert("Failed to evict: " + (e as Error).message);
    }
  }, [loadRecipes]);

  const handleToggleRecipeMenu = useCallback((recipeId: string) => {
    setRecipeMenuOpen((current) => (current === recipeId ? null : recipeId));
  }, []);

  const handleRequestDelete = useCallback((recipeId: string) => {
    setDeleteConfirm(recipeId);
    setRecipeMenuOpen(null);
  }, []);

  // Build a lookup: model_path -> served_model_name (from first recipe that uses it)
  const modelServedNames = useMemo(() => {
    const lookup: Record<string, string> = {};
    for (const r of recipes) {
      if (r.model_path && r.served_model_name && !lookup[r.model_path]) {
        lookup[r.model_path] = r.served_model_name;
      }
    }
    return lookup;
  }, [recipes]);

  const runningRecipe = useMemo(() => {
    if (!runningRecipeId) return null;
    return recipes.find((recipe) => recipe.id === runningRecipeId) ?? null;
  }, [recipes, runningRecipeId]);

  const deleteRecipe = useMemo(() => {
    if (!deleteConfirm) return null;
    return recipes.find((recipe) => recipe.id === deleteConfirm) ?? null;
  }, [deleteConfirm, recipes]);

  // Filter recipes
  const filterLower = useMemo(() => filter.trim().toLowerCase(), [filter]);
  const filteredRecipes = useMemo(() => {
    if (!filterLower) return recipes;
    return recipes.filter((recipe) => {
      return (
        recipe.name.toLowerCase().includes(filterLower) ||
        recipe.model_path.toLowerCase().includes(filterLower)
      );
    });
  }, [filterLower, recipes]);

  // Sort: pinned first, then alphabetical
  const sortedRecipes = useMemo(() => {
    return [...filteredRecipes].sort((a, b) => {
      const aPinned = pinnedRecipes.has(a.id);
      const bPinned = pinnedRecipes.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [filteredRecipes, pinnedRecipes]);

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] text-[#e8e6e3]">
      {/* Header */}
      <div
        className="flex items-center justify-between border-b border-[#1f1f1f]"
        style={{
          paddingLeft: "1.5rem",
          paddingRight: "1.5rem",
          paddingTop: "1rem",
          paddingBottom: "1rem",
        }}
      >
        <h1 className="text-xl font-semibold">Recipes</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-[#1f1f1f] rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 border-b border-[#1f1f1f]"
        style={{ paddingLeft: "1.5rem", paddingRight: "1.5rem", paddingTop: "1rem" }}
      >
        <button
          onClick={() => setTab("recipes")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            tab === "recipes"
              ? "text-[#e8e6e3] border-[#d97706]"
              : "text-[#9a9088] border-transparent hover:text-[#e8e6e3]"
          }`}
        >
          Recipes
        </button>
        <button
          onClick={() => setTab("tools")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            tab === "tools"
              ? "text-[#e8e6e3] border-[#d97706]"
              : "text-[#9a9088] border-transparent hover:text-[#e8e6e3]"
          }`}
        >
          <Calculator className="w-4 h-4 inline mr-2" />
          VRAM Calculator
        </button>
        <button
          onClick={() => setTab("runtime")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            tab === "runtime"
              ? "text-[#e8e6e3] border-[#d97706]"
              : "text-[#9a9088] border-transparent hover:text-[#e8e6e3]"
          }`}
        >
          <Package className="w-4 h-4 inline mr-2" />
          vLLM Runtime
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {tab === "recipes" && (
          <div style={{ padding: "1.5rem" }}>
            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9a9088]" />
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search recipes..."
                  className="w-full pl-10 pr-4 py-2 bg-[#1b1b1b] border border-[#363432] rounded-lg text-sm focus:outline-none focus:border-[#d97706]"
                />
              </div>
              <button
                onClick={handleNewRecipe}
                className="flex items-center gap-2 px-4 py-2 bg-[#d97706] hover:bg-[#b45309] text-white rounded-lg transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                New Recipe
              </button>
            </div>

            {/* Running status banner */}
            {runningRecipeId && (
              <div className="mb-4 p-4 bg-[#15803d]/10 border border-[#15803d]/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-[#4ade80]">
                      Model Running: {runningRecipe?.name}
                    </div>
                    {launchProgress?.message && (
                      <div className="text-xs text-[#9a9088] mt-1">{launchProgress.message}</div>
                    )}
                  </div>
                  <button
                    onClick={handleEvictModel}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white rounded text-xs font-medium"
                  >
                    <Square className="w-3 h-3" />
                    Stop
                  </button>
                </div>
              </div>
            )}

            {/* Table */}
            {loading ? (
              <div className="text-center py-12 text-[#9a9088]">Loading recipes...</div>
            ) : sortedRecipes.length === 0 ? (
              <div className="text-center py-12 text-[#9a9088]">
                {filter
                  ? "No recipes match your search"
                  : "No recipes yet. Create one to get started."}
              </div>
            ) : (
              <div className="border border-[#363432] rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[#1b1b1b] border-b border-[#363432]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#9a9088] uppercase tracking-wider w-8"></th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#9a9088] uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#9a9088] uppercase tracking-wider">
                        Model
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#9a9088] uppercase tracking-wider">
                        Backend
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#9a9088] uppercase tracking-wider">
                        TP/PP
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#9a9088] uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-[#9a9088] uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#363432]">
                    {sortedRecipes.map((recipe) => {
                      const isPinned = pinnedRecipes.has(recipe.id);
                      const isMenuOpen = recipeMenuOpen === recipe.id;
                      const launchDisabled = launching || !!runningRecipeId;
                      return (
                        <RecipeRow
                          key={recipe.id}
                          recipe={recipe}
                          isPinned={isPinned}
                          isMenuOpen={isMenuOpen}
                          launchDisabled={launchDisabled}
                          onTogglePin={togglePin}
                          onToggleMenu={handleToggleRecipeMenu}
                          onLaunch={handleLaunchRecipe}
                          onStop={handleEvictModel}
                          onEdit={handleEditRecipe}
                          onRequestDelete={handleRequestDelete}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "tools" && (
          <VramCalculatorPanel availableModels={availableModels} modelServedNames={modelServedNames} />
        )}

        {tab === "runtime" && <VllmRuntimePanel />}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1b1b1b] border border-[#363432] rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Recipe</h3>
            <p className="text-sm text-[#9a9088] mb-6">
              Are you sure you want to delete &quot;
              {deleteRecipe?.name}&quot;?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-[#363432] hover:bg-[#494745] rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteRecipe(deleteConfirm)}
                className="px-4 py-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white rounded-lg text-sm transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Recipe Modal */}
      {modalOpen && modalRecipe && (
        <RecipeModal
          recipe={modalRecipe}
          onClose={() => {
            setModalOpen(false);
            setModalRecipe(null);
          }}
          onSave={handleSaveRecipe}
          onChange={setModalRecipe}
          saving={saving}
          availableModels={availableModels}
          recipes={recipes}
        />
      )}
    </div>
  );
}

interface RecipeRowProps {
  recipe: RecipeWithStatus;
  isPinned: boolean;
  isMenuOpen: boolean;
  launchDisabled: boolean;
  onTogglePin: (recipeId: string) => void;
  onToggleMenu: (recipeId: string) => void;
  onLaunch: (recipeId: string) => void;
  onStop: () => void;
  onEdit: (recipe: RecipeWithStatus) => void;
  onRequestDelete: (recipeId: string) => void;
}

const RecipeRow = memo(function RecipeRow({
  recipe,
  isPinned,
  isMenuOpen,
  launchDisabled,
  onTogglePin,
  onToggleMenu,
  onLaunch,
  onStop,
  onEdit,
  onRequestDelete,
}: RecipeRowProps) {
  const handleTogglePin = useCallback(() => onTogglePin(recipe.id), [onTogglePin, recipe.id]);
  const handleLaunch = useCallback(() => onLaunch(recipe.id), [onLaunch, recipe.id]);
  const handleToggleMenu = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onToggleMenu(recipe.id);
    },
    [onToggleMenu, recipe.id],
  );
  const handleEdit = useCallback(() => onEdit(recipe), [onEdit, recipe]);
  const handleRequestDelete = useCallback(
    () => onRequestDelete(recipe.id),
    [onRequestDelete, recipe.id],
  );

  const tp = recipe.tp || recipe.tensor_parallel_size || 1;
  const pp = recipe.pp || recipe.pipeline_parallel_size || 1;
  const status = recipe.status || "stopped";

  const statusClassName =
    status === "running"
      ? "bg-[#15803d]/20 text-[#4ade80] border border-[#15803d]/30"
      : status === "starting"
        ? "bg-[#d97706]/20 text-[#fbbf24] border border-[#d97706]/30"
        : "bg-[#363432]/20 text-[#9a9088] border border-[#363432]";

  return (
    <tr className="hover:bg-[#1b1b1b]/50 transition-colors">
      <td className="px-4 py-3">
        <button
          onClick={handleTogglePin}
          className="text-[#9a9088] hover:text-[#d97706] transition-colors"
          title={isPinned ? "Unpin" : "Pin"}
        >
          {isPinned ? <Pin className="w-4 h-4 fill-current" /> : <PinOff className="w-4 h-4" />}
        </button>
      </td>
      <td className="px-4 py-3 font-medium text-sm">{recipe.name}</td>
      <td
        className="px-4 py-3 text-sm text-[#9a9088] font-mono truncate max-w-xs"
        title={recipe.model_path}
      >
        {recipe.served_model_name || recipe.model_path.split("/").pop()}
      </td>
      <td className="px-4 py-3 text-sm">
        <span className="px-2 py-1 bg-[#1b1b1b] border border-[#363432] rounded text-xs">
          {formatBackendLabel(recipe.backend)}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-[#9a9088]">
        {tp}/{pp}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusClassName}`}>
          {status}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {status === "running" ? (
            <button
              onClick={onStop}
              className="p-1.5 hover:bg-[#dc2626]/20 text-[#dc2626] rounded transition-colors"
              title="Stop"
            >
              <Square className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleLaunch}
              disabled={launchDisabled}
              className="p-1.5 hover:bg-[#15803d]/20 text-[#4ade80] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Launch"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
          <div className="relative">
            <button
              onClick={handleToggleMenu}
              className="p-1.5 hover:bg-[#1f1f1f] rounded transition-colors"
              title="Actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 mt-1 w-32 bg-[#1b1b1b] border border-[#363432] rounded-lg shadow-lg z-10">
                <button
                  onClick={handleEdit}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-[#363432] transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={handleRequestDelete}
                  className="w-full px-3 py-2 text-left text-sm text-[#dc2626] hover:bg-[#363432] transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
});
