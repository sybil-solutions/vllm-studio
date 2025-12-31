'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Calculator,
  ChevronDown,
  ChevronRight,
  Copy,
  Plus,
  RefreshCw,
  Save,
  Search,
  Square,
  Play,
  Trash2,
  Check,
} from 'lucide-react';
import api from '@/lib/api';
import type { ModelInfo, Recipe, RecipeWithStatus, VRAMCalculation, ProcessInfo } from '@/lib/types';
import { parseCommand, recipeToCommand, slugifyRecipeId } from '@/lib/recipe-command';

type Tab = 'recipes' | 'tools';

const DEFAULT_RECIPE: Recipe = {
  id: '',
  name: '',
  model_path: '',
  backend: 'vllm',
  tp: 1,
  pp: 1,
  port: 8000,
  host: '0.0.0.0',
  gpu_memory_utilization: 0.9,
  extra_args: {},
};

function RecipesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editRecipeId = searchParams.get('edit');
  const startNew = searchParams.get('new') === '1';
  const [tab, setTab] = useState<Tab>('recipes');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [copied, setCopied] = useState(false);

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [recipes, setRecipes] = useState<RecipeWithStatus[]>([]);
  const [runningProcess, setRunningProcess] = useState<ProcessInfo | null>(null);
  const [runningRecipeId, setRunningRecipeId] = useState<string | null>(null);

  const [filter, setFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Recipe>({ ...DEFAULT_RECIPE });
  const [isDirty, setIsDirty] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [commandMode, setCommandMode] = useState(false);
  const [commandText, setCommandText] = useState('');
  const [commandParseError, setCommandParseError] = useState<string | null>(null);
  const [extraArgsText, setExtraArgsText] = useState('{}');
  const [envVarsText, setEnvVarsText] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // VRAM Tool
  const [vramModel, setVramModel] = useState('');
  const [contextLength, setContextLength] = useState(32768);
  const [tpSize, setTpSize] = useState(8);
  const [kvDtype, setKvDtype] = useState<'auto' | 'fp16' | 'fp8'>('auto');
  const [vramResult, setVramResult] = useState<VRAMCalculation | null>(null);
  const [calculating, setCalculating] = useState(false);

  const loadData = useCallback(async () => {
    const [modelsData, recipesData, statusData] = await Promise.all([
      api.getModels().catch(() => ({ models: [] as ModelInfo[] })),
      api.getRecipes().catch(() => ({ recipes: [] as RecipeWithStatus[] })),
      api.getStatus().catch(() => ({ running: false, process: null as ProcessInfo | null, inference_port: 8000 })),
    ]);

    setModels(modelsData.models || []);
    const recipesList = recipesData.recipes || [];
    setRecipes(recipesList);
    setRunningProcess(statusData.process || null);
    const running = recipesList.find((r) => r.status === 'running')?.id || null;
    setRunningRecipeId(running);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await loadData();
      } finally {
        setLoading(false);
      }
    })();
  }, [loadData]);

  const selectRecipe = useCallback((recipe: RecipeWithStatus) => {
    setSelectedId(recipe.id);
    setDraft({ ...recipe });
    setIsDirty(false);
    setCommandParseError(null);
    const cmd = recipeToCommand(recipe);
    setCommandText(cmd);
    setExtraArgsText(JSON.stringify(recipe.extra_args || {}, null, 2));
    setEnvVarsText(JSON.stringify(recipe.env_vars || {}, null, 2));
    setJsonError(null);
  }, []);

  const startNewRecipe = useCallback(() => {
    setSelectedId(null);
    setDraft({ ...DEFAULT_RECIPE });
    setIsDirty(false);
    setCommandParseError(null);
    setCommandText(`# Paste a vLLM command here (optional)\n# Or fill in the fields below.\n\nvllm serve /mnt/llm_models/YourModel \\\n  --tensor-parallel-size 8 \\\n  --max-model-len 32768 \\\n  --gpu-memory-utilization 0.9 \\\n  --trust-remote-code \\\n  --host 0.0.0.0 \\\n  --port 8000`);
    setExtraArgsText('{}');
    setEnvVarsText('{}');
    setJsonError(null);
  }, []);

  useEffect(() => {
    if (startNew) startNewRecipe();
  }, [startNew, startNewRecipe]);

  useEffect(() => {
    if (!editRecipeId) return;
    const recipe = recipes.find((r) => r.id === editRecipeId);
    if (recipe) selectRecipe(recipe);
  }, [editRecipeId, recipes, selectRecipe]);

  const filteredRecipes = useMemo(() => {
    if (!filter.trim()) return recipes;
    const q = filter.toLowerCase();
    return recipes.filter((r) => {
      return (
        r.id.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.model_path.toLowerCase().includes(q)
      );
    });
  }, [filter, recipes]);

  const setDraftField = <K extends keyof Recipe>(key: K, value: Recipe[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const ensureIdAndName = (recipe: Recipe): Recipe => {
    let id = recipe.id;
    let name = recipe.name;
    if (!id && recipe.model_path) id = slugifyRecipeId(recipe.model_path.split('/').pop() || 'new-recipe');
    if (!name && recipe.model_path) name = recipe.model_path.split('/').pop() || 'New Recipe';
    return { ...recipe, id, name };
  };

  const parseAdvancedJson = (): { extra_args: Record<string, unknown>; env_vars: Record<string, string> } | null => {
    try {
      const extra = extraArgsText.trim() ? JSON.parse(extraArgsText) : {};
      const env = envVarsText.trim() ? JSON.parse(envVarsText) : {};
      if (typeof extra !== 'object' || extra === null || Array.isArray(extra)) throw new Error('extra_args must be a JSON object');
      if (typeof env !== 'object' || env === null || Array.isArray(env)) throw new Error('env_vars must be a JSON object');
      for (const [k, v] of Object.entries(env)) {
        if (typeof v !== 'string') throw new Error(`env_vars.${k} must be a string`);
      }
      setJsonError(null);
      return { extra_args: extra as Record<string, unknown>, env_vars: env as Record<string, string> };
    } catch (e) {
      setJsonError((e as Error).message);
      return null;
    }
  };

  const saveRecipe = useCallback(async () => {
    const normalized = ensureIdAndName(draft);
    if (!normalized.id || !normalized.name || !normalized.model_path) {
      alert('Please provide: model path, recipe id, and name.');
      return null;
    }

    const advanced = parseAdvancedJson();
    if (!advanced) return null;

    const recipeToSave: Recipe = {
      ...normalized,
      extra_args: advanced.extra_args,
      env_vars: advanced.env_vars,
      tp: normalized.tp || normalized.tensor_parallel_size || 1,
      pp: normalized.pp || normalized.pipeline_parallel_size || 1,
      backend: normalized.backend || 'vllm',
    };

    setSaving(true);
    try {
      const exists = recipes.some((r) => r.id === recipeToSave.id);
      if (exists) await api.updateRecipe(recipeToSave.id, recipeToSave);
      else await api.createRecipe(recipeToSave);

      await loadData();
      const updated = await api.getRecipe(recipeToSave.id).catch(() => recipeToSave as unknown as RecipeWithStatus);
      setSelectedId(recipeToSave.id);
      setDraft({ ...updated });
      setIsDirty(false);
      setCommandText(recipeToCommand(updated));
      setExtraArgsText(JSON.stringify(recipeToSave.extra_args || {}, null, 2));
      setEnvVarsText(JSON.stringify(recipeToSave.env_vars || {}, null, 2));
      return recipeToSave.id;
    } catch (e) {
      alert('Failed to save: ' + (e as Error).message);
      return null;
    } finally {
      setSaving(false);
    }
  }, [draft, loadData, recipes, extraArgsText, envVarsText]);

  const launchSelected = useCallback(async () => {
    const id = await saveRecipe();
    if (!id) return;
    setLaunching(true);
    try {
      await api.switchModel(id, true);
      await loadData();
    } catch (e) {
      alert('Failed to launch: ' + (e as Error).message);
    } finally {
      setLaunching(false);
    }
  }, [loadData, saveRecipe]);

  const stopRunning = useCallback(async () => {
    if (!confirm('Stop the currently running model?')) return;
    try {
      await api.evictModel(true);
      await loadData();
    } catch (e) {
      alert('Failed to stop: ' + (e as Error).message);
    }
  }, [loadData]);

  const deleteSelected = useCallback(async () => {
    const id = selectedId || draft.id;
    if (!id) return;
    if (!confirm(`Delete recipe "${id}"?`)) return;
    try {
      await api.deleteRecipe(id);
      await loadData();
      startNewRecipe();
    } catch (e) {
      alert('Failed to delete: ' + (e as Error).message);
    }
  }, [draft.id, loadData, selectedId, startNewRecipe]);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const parseCommandIntoDraft = () => {
    setCommandParseError(null);
    try {
      const parsed = parseCommand(commandText, { id: draft.id, name: draft.name });
      const merged = ensureIdAndName({ ...draft, ...parsed });
      setDraft(merged);
      setIsDirty(true);
      setExtraArgsText(JSON.stringify(merged.extra_args || {}, null, 2));
      setEnvVarsText(JSON.stringify(merged.env_vars || {}, null, 2));
      setJsonError(null);
    } catch (e) {
      setCommandParseError((e as Error).message);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const commandPreview = useMemo(() => {
    const normalized = ensureIdAndName(draft);
    if (!normalized.model_path) return '';
    return recipeToCommand(normalized);
  }, [draft]);

  const selectedIsRunning = !!runningRecipeId && (selectedId === runningRecipeId || draft.id === runningRecipeId);

  const calculateVRAM = async () => {
    if (!vramModel) return;
    setCalculating(true);
    try {
      const data = await api.calculateVRAM({
        model_path: vramModel,
        context_length: contextLength,
        batch_size: 1,
        tp_size: tpSize,
        kv_cache_dtype: kvDtype,
      });
      setVramResult(data);
    } catch (e) {
      alert('Failed to calculate VRAM: ' + (e as Error).message);
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-[#1b1b1b]">
        <div className="flex items-center gap-2 text-[#9a9088]">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading recipes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#1b1b1b] text-[#f0ebe3] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-medium text-[#f0ebe3]">Recipes</h1>
            <div className="text-sm text-[#9a9088]">
              {runningProcess
                ? `Running: ${runningRecipeId || runningProcess.model_path?.split('/').pop() || 'Unknown'}`
                : 'No model running'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('recipes')}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                tab === 'recipes'
                  ? 'bg-[#2a2826] border-[#363432] text-[#f0ebe3]'
                  : 'border-[#363432] text-[#9a9088] hover:bg-[#1e1e1e]'
              }`}
            >
              Recipes
            </button>
            <button
              onClick={() => setTab('tools')}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                tab === 'tools'
                  ? 'bg-[#2a2826] border-[#363432] text-[#f0ebe3]'
                  : 'border-[#363432] text-[#9a9088] hover:bg-[#1e1e1e]'
              }`}
            >
              Tools
            </button>
            <button
              onClick={refresh}
              className="p-2 border border-[#363432] rounded-lg hover:bg-[#1e1e1e] transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 text-[#9a9088] ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {tab === 'tools' ? (
          <div className="bg-[#1e1e1e] border border-[#363432] rounded-lg">
            <div className="flex items-center gap-2 p-4 border-b border-[#363432]">
              <Calculator className="h-5 w-5 text-[#8b7355]" />
              <h2 className="font-medium">VRAM Calculator</h2>
            </div>
            <div className="p-4 grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#9a9088] mb-1">Model</label>
                <input
                  value={vramModel}
                  onChange={(e) => setVramModel(e.target.value)}
                  placeholder="/mnt/llm_models/..."
                  className="w-full px-3 py-2 bg-[#1b1b1b] border border-[#363432] rounded-lg text-sm font-mono text-[#f0ebe3] placeholder-[#9a9088]/50 focus:outline-none focus:border-[#8b7355]"
                  list="models-list"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-[#9a9088] mb-1">Context</label>
                  <input
                    type="number"
                    value={contextLength}
                    onChange={(e) => setContextLength(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-[#1b1b1b] border border-[#363432] rounded-lg text-sm text-[#f0ebe3] focus:outline-none focus:border-[#8b7355]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#9a9088] mb-1">TP</label>
                  <select
                    value={tpSize}
                    onChange={(e) => setTpSize(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-[#1b1b1b] border border-[#363432] rounded-lg text-sm text-[#f0ebe3] focus:outline-none focus:border-[#8b7355]"
                  >
                    {[1, 2, 4, 8].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[#9a9088] mb-1">KV</label>
                  <select
                    value={kvDtype}
                    onChange={(e) => setKvDtype(e.target.value as 'auto' | 'fp16' | 'fp8')}
                    className="w-full px-3 py-2 bg-[#1b1b1b] border border-[#363432] rounded-lg text-sm text-[#f0ebe3] focus:outline-none focus:border-[#8b7355]"
                  >
                    <option value="auto">auto</option>
                    <option value="fp16">fp16</option>
                    <option value="fp8">fp8</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-2 flex gap-2">
                <button
                  onClick={calculateVRAM}
                  disabled={!vramModel || calculating}
                  className="px-4 py-2 bg-[#8b7355] text-white rounded-lg text-sm font-medium hover:bg-[#8b7355]/90 disabled:opacity-50 transition-colors"
                >
                  {calculating ? 'Calculating...' : 'Calculate'}
                </button>
                {vramResult && (
                  <div className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                    vramResult.fits ? 'bg-[#7d9a6a]/10 text-[#7d9a6a]' : 'bg-[#c97a6b]/10 text-[#c97a6b]'
                  }`}>
                    {vramResult.fits ? 'Fits' : 'May not fit'} • {vramResult.breakdown.per_gpu_gb.toFixed(2)} GB/GPU • {Math.round(vramResult.utilization_percent)}% util
                  </div>
                )}
              </div>

              {vramResult && (
                <div className="md:col-span-2 bg-[#1b1b1b] rounded-lg p-4 text-sm">
                  <div className="grid sm:grid-cols-2 gap-2">
                    <div className="flex justify-between"><span className="text-[#9a9088]">Weights</span><span className="font-mono text-[#f0ebe3]">{vramResult.breakdown.model_weights_gb.toFixed(2)} GB</span></div>
                    <div className="flex justify-between"><span className="text-[#9a9088]">KV Cache</span><span className="font-mono text-[#f0ebe3]">{vramResult.breakdown.kv_cache_gb.toFixed(2)} GB</span></div>
                    <div className="flex justify-between"><span className="text-[#9a9088]">Activations</span><span className="font-mono text-[#f0ebe3]">{vramResult.breakdown.activations_gb.toFixed(2)} GB</span></div>
                    <div className="flex justify-between"><span className="text-[#9a9088]">Total</span><span className="font-mono text-[#f0ebe3]">{vramResult.breakdown.total_gb.toFixed(2)} GB</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Recipe List */}
            <section className="lg:col-span-1 bg-[#1e1e1e] border border-[#363432] rounded-lg overflow-hidden">
              <div className="p-3 border-b border-[#363432] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-[#9a9088] uppercase tracking-wider">Recipe List</div>
                  <button
                    onClick={() => {
                      router.replace('/recipes?new=1');
                      startNewRecipe();
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-[#8b7355] text-white rounded hover:bg-[#8b7355]/90"
                  >
                    <Plus className="h-3 w-3" /> New
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9a9088]" />
                  <input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Search recipes..."
                    className="w-full pl-9 pr-3 py-2 bg-[#1b1b1b] border border-[#363432] rounded-lg text-sm text-[#f0ebe3] placeholder-[#9a9088]/50 focus:outline-none focus:border-[#8b7355]"
                  />
                </div>
              </div>
              <div className="max-h-[calc(100vh-16rem)] overflow-auto">
                {filteredRecipes.length === 0 ? (
                  <div className="p-6 text-sm text-center text-[#9a9088]">No recipes found</div>
                ) : (
                  filteredRecipes.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        router.replace(`/recipes?edit=${encodeURIComponent(r.id)}`);
                        selectRecipe(r);
                      }}
                      className={`w-full text-left p-3 border-b border-[#363432]/50 transition-colors ${
                        (selectedId || draft.id) === r.id ? 'bg-[#2a2826]' : 'hover:bg-[#1e1e1e]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[#f0ebe3] truncate">{r.name}</div>
                          <div className="text-xs text-[#9a9088] truncate">{r.id}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {r.status === 'running' && (
                            <span className="px-1.5 py-0.5 bg-[#7d9a6a]/10 text-[#7d9a6a] rounded text-[10px]">
                              Running
                            </span>
                          )}
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                            r.backend === 'vllm' ? 'bg-[#6b9ac9]/10 text-[#6b9ac9]' : 'bg-[#9a6bc9]/10 text-[#9a6bc9]'
                          }`}>
                            {r.backend}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-[#9a9088]/70 mt-1 truncate">{r.model_path}</div>
                    </button>
                  ))
                )}
              </div>
            </section>

            {/* Recipe Editor */}
            <section className="lg:col-span-2 bg-[#1e1e1e] border border-[#363432] rounded-lg">
              <div className="p-4 border-b border-[#363432] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-[#f0ebe3] truncate">
                    {draft.name || (draft.model_path ? draft.model_path.split('/').pop() : 'New Recipe')}
                  </div>
                  <div className="text-xs text-[#9a9088] truncate">
                    {draft.id ? `ID: ${draft.id}` : 'Not saved yet'}
                    {selectedIsRunning ? ' • running' : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {runningProcess && (
                    <button
                      onClick={stopRunning}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm border border-[#363432] rounded-lg hover:bg-[#2a2826] text-[#9a9088]"
                      title="Stop running model"
                    >
                      <Square className="h-3.5 w-3.5" /> Stop
                    </button>
                  )}
                  <button
                    onClick={launchSelected}
                    disabled={launching || saving || !draft.model_path}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[#7d9a6a] text-white rounded-lg hover:bg-[#7d9a6a]/90 disabled:opacity-50"
                    title="Save and launch"
                  >
                    <Play className="h-3.5 w-3.5" /> {launching ? 'Launching...' : 'Launch'}
                  </button>
                  <button
                    onClick={async () => { await saveRecipe(); }}
                    disabled={saving || !isDirty}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm border border-[#363432] rounded-lg hover:bg-[#2a2826] disabled:opacity-50 text-[#9a9088]"
                  >
                    <Save className="h-3.5 w-3.5" /> {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#9a9088] mb-1">Model path</label>
                    <input
                      value={draft.model_path}
                      onChange={(e) => setDraftField('model_path', e.target.value)}
                      placeholder="/mnt/llm_models/..."
                      className="w-full px-3 py-2 bg-[#1b1b1b] border border-[#363432] rounded-lg text-sm font-mono text-[#f0ebe3] placeholder-[#9a9088]/50 focus:outline-none focus:border-[#8b7355]"
                      list="models-list"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-[#9a9088] mb-1">Backend</label>
                      <select
                        value={draft.backend}
                        onChange={(e) => setDraftField('backend', e.target.value as 'vllm' | 'sglang')}
                        className="w-full px-3 py-2 bg-[#1b1b1b] border border-[#363432] rounded-lg text-sm text-[#f0ebe3] focus:outline-none focus:border-[#8b7355]"
                      >
                        <option value="vllm">vLLM</option>
                        <option value="sglang">SGLang</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-[#9a9088] mb-1">Port</label>
                      <input
                        type="number"
                        value={draft.port || 8000}
                        onChange={(e) => setDraftField('port', parseInt(e.target.value) || 8000)}
                        className="w-full px-3 py-2 bg-[#1b1b1b] border border-[#363432] rounded-lg text-sm text-[#f0ebe3] focus:outline-none focus:border-[#8b7355]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#9a9088] mb-1">Recipe name</label>
                    <input
                      value={draft.name}
                      onChange={(e) => setDraftField('name', e.target.value)}
                      placeholder="Human-friendly name"
                      className="w-full px-3 py-2 bg-[#1b1b1b] border border-[#363432] rounded-lg text-sm text-[#f0ebe3] placeholder-[#9a9088]/50 focus:outline-none focus:border-[#8b7355]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#9a9088] mb-1">Recipe id</label>
                    <input
                      value={draft.id}
                      onChange={(e) => setDraftField('id', slugifyRecipeId(e.target.value))}
                      placeholder="e.g. glm-4-6v-awq"
                      className="w-full px-3 py-2 bg-[#1b1b1b] border border-[#363432] rounded-lg text-sm font-mono text-[#f0ebe3] placeholder-[#9a9088]/50 focus:outline-none focus:border-[#8b7355]"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-[#9a9088] mb-1">TP</label>
                    <input
                      type="number"
                      value={draft.tp || draft.tensor_parallel_size || 1}
                      onChange={(e) => setDraftField('tp', Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 bg-[#1b1b1b] border border-[#363432] rounded-lg text-sm text-[#f0ebe3] focus:outline-none focus:border-[#8b7355]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#9a9088] mb-1">Max context</label>
                    <input
                      type="number"
                      value={draft.max_model_len || ''}
                      onChange={(e) => setDraftField('max_model_len', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="e.g. 32768"
                      className="w-full px-3 py-2 bg-[#1b1b1b] border border-[#363432] rounded-lg text-sm text-[#f0ebe3] placeholder-[#9a9088]/50 focus:outline-none focus:border-[#8b7355]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#9a9088] mb-1">GPU util</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      max="1"
                      value={draft.gpu_memory_utilization ?? 0.9}
                      onChange={(e) => setDraftField('gpu_memory_utilization', Math.max(0.1, Math.min(1, parseFloat(e.target.value) || 0.9)))}
                      className="w-full px-3 py-2 bg-[#1b1b1b] border border-[#363432] rounded-lg text-sm text-[#f0ebe3] focus:outline-none focus:border-[#8b7355]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setAdvancedOpen((v) => !v)}
                    className="flex items-center gap-2 text-sm text-[#9a9088] hover:text-[#f0ebe3]"
                  >
                    {advancedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    Advanced
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCommandMode((v) => !v)}
                      className="px-3 py-1.5 text-xs border border-[#363432] rounded-lg hover:bg-[#2a2826] text-[#9a9088]"
                    >
                      {commandMode ? 'Guided fields' : 'Command mode'}
                    </button>
                    <button
                      onClick={() => copyText(commandPreview)}
                      disabled={!commandPreview}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs border border-[#363432] rounded-lg hover:bg-[#2a2826] disabled:opacity-50 text-[#9a9088]"
                      title="Copy launch command"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-[#7d9a6a]" /> : <Copy className="h-3.5 w-3.5" />}
                      Copy command
                    </button>
                  </div>
                </div>

                {commandMode ? (
                  <div className="space-y-2">
                    <textarea
                      value={commandText}
                      onChange={(e) => setCommandText(e.target.value)}
                      rows={8}
                      className="w-full px-3 py-2 bg-[#1b1b1b] border border-[#363432] rounded-lg text-xs font-mono text-[#f0ebe3] focus:outline-none focus:border-[#8b7355]"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={parseCommandIntoDraft}
                        className="px-3 py-2 text-sm bg-[#8b7355] text-white rounded-lg hover:bg-[#8b7355]/90"
                      >
                        Parse into fields
                      </button>
                      {commandParseError && <div className="text-sm text-[#c97a6b]">{commandParseError}</div>}
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#1b1b1b] rounded-lg p-3 text-xs font-mono text-[#9a9088] whitespace-pre-wrap break-words">
                    {commandPreview || 'Fill the model path to see the command preview.'}
                  </div>
                )}

                {advancedOpen && (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[#9a9088] mb-1">Tool call parser</label>
                        <input
                          value={draft.tool_call_parser || ''}
                          onChange={(e) => setDraftField('tool_call_parser', e.target.value || undefined)}
                          placeholder="e.g. glm4, hermes"
                          className="w-full px-3 py-2 bg-[#1b1b1b] border border-[#363432] rounded-lg text-sm font-mono text-[#f0ebe3] placeholder-[#9a9088]/50 focus:outline-none focus:border-[#8b7355]"
                        />
                        <label className="mt-2 flex items-center gap-2 text-sm text-[#9a9088]">
                          <input
                            type="checkbox"
                            checked={!!draft.enable_auto_tool_choice}
                            onChange={(e) => setDraftField('enable_auto_tool_choice', e.target.checked)}
                            className="rounded border-[#363432] bg-[#1b1b1b] text-[#7d9a6a]"
                          />
                          Enable auto tool choice
                        </label>
                      </div>
                      <div>
                        <label className="block text-sm text-[#9a9088] mb-1">Served model name</label>
                        <input
                          value={draft.served_model_name || ''}
                          onChange={(e) => setDraftField('served_model_name', e.target.value || undefined)}
                          placeholder="Optional (overrides model name)"
                          className="w-full px-3 py-2 bg-[#1b1b1b] border border-[#363432] rounded-lg text-sm font-mono text-[#f0ebe3] placeholder-[#9a9088]/50 focus:outline-none focus:border-[#8b7355]"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[#9a9088] mb-1">env_vars (JSON)</label>
                        <textarea
                          value={envVarsText}
                          onChange={(e) => {
                            setEnvVarsText(e.target.value);
                            setIsDirty(true);
                          }}
                          rows={6}
                          className="w-full px-3 py-2 bg-[#1b1b1b] border border-[#363432] rounded-lg text-xs font-mono text-[#f0ebe3] focus:outline-none focus:border-[#8b7355]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[#9a9088] mb-1">extra_args (JSON)</label>
                        <textarea
                          value={extraArgsText}
                          onChange={(e) => {
                            setExtraArgsText(e.target.value);
                            setIsDirty(true);
                          }}
                          rows={6}
                          className="w-full px-3 py-2 bg-[#1b1b1b] border border-[#363432] rounded-lg text-xs font-mono text-[#f0ebe3] focus:outline-none focus:border-[#8b7355]"
                        />
                      </div>
                    </div>

                    {jsonError && <div className="text-sm text-[#c97a6b]">{jsonError}</div>}

                    <div className="flex items-center justify-between pt-2 border-t border-[#363432]">
                      <button
                        onClick={deleteSelected}
                        className="flex items-center gap-1 px-3 py-2 text-sm text-[#c97a6b] border border-[#363432] rounded-lg hover:bg-[#2a2826]"
                        disabled={selectedIsRunning}
                        title={selectedIsRunning ? 'Stop the model before deleting this recipe.' : 'Delete recipe'}
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                      <div className="text-xs text-[#9a9088]">
                        {isDirty ? 'Unsaved changes' : 'Saved'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        <datalist id="models-list">
          {models.map((m) => (
            <option key={m.path} value={m.path}>
              {m.name}
            </option>
          ))}
        </datalist>
      </div>
    </div>
  );
}

export default function RecipesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[100dvh] bg-[#1b1b1b]">
          <div className="flex items-center gap-2 text-[#9a9088]">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        </div>
      }
    >
      <RecipesContent />
    </Suspense>
  );
}
