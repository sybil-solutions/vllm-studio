// CRITICAL
"use client";

import type { ModelInfo, RecipeEditor, RecipeWithStatus } from "@/lib/types";
import type { RecipesContentTab } from "./recipes-content-model";
import type { RecipesTableProps } from "./types";
import { DeleteRecipeConfirmModal } from "./delete-recipe-confirm-modal";
import { RecipesContentHeader } from "./recipes-content-header";
import { RecipesTab } from "./recipes-tab";
import { RecipeModal } from "../recipe-modal/recipe-modal";
import { VramCalculatorPanel } from "../vram-calculator-panel";
import { VllmRuntimePanel } from "../vllm-runtime-panel";

type Props = {
  tab: RecipesContentTab;
  setTab: (tab: RecipesContentTab) => void;
  loading: boolean;
  refreshing: boolean;
  filter: string;
  setFilter: (value: string) => void;
  modalOpen: boolean;
  modalRecipe: RecipeEditor | null;
  setModalRecipe: (recipe: RecipeEditor | null) => void;
  saving: boolean;
  recipes: RecipeWithStatus[];
  deleteConfirm: string | null;
  deleteRecipeName: string;
  runningRecipeId: string | null;
  runningRecipeName: string | null;
  launchProgressMessage: string | null;
  availableModels: ModelInfo[];
  modelServedNames: Record<string, string>;
  sortedRecipes: RecipeWithStatus[];
  onRefresh: () => void;
  onNewRecipe: () => void;
  onSaveRecipe: () => void;
  onCloseRecipeModal: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onEvictModel: () => void;
  table: RecipesTableProps;
};

export function RecipesContentView(props: Props) {
  const {
    tab,
    setTab,
    loading,
    refreshing,
    filter,
    setFilter,
    modalOpen,
    modalRecipe,
    setModalRecipe,
    saving,
    recipes,
    deleteConfirm,
    deleteRecipeName,
    runningRecipeId,
    runningRecipeName,
    launchProgressMessage,
    availableModels,
    modelServedNames,
    sortedRecipes,
    onRefresh,
    onNewRecipe,
    onSaveRecipe,
    onCloseRecipeModal,
    onCancelDelete,
    onConfirmDelete,
    onEvictModel,
    table,
  } = props;

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] text-[#e8e6e3]">
      <RecipesContentHeader tab={tab} setTab={setTab} refreshing={refreshing} onRefresh={onRefresh} />

      <div className="flex-1 overflow-auto">
        {tab === "recipes" && (
          <RecipesTab
            loading={loading}
            filter={filter}
            setFilter={setFilter}
            sortedRecipes={sortedRecipes}
            runningRecipeId={runningRecipeId}
            runningRecipeName={runningRecipeName}
            launchProgressMessage={launchProgressMessage}
            onEvictModel={onEvictModel}
            onNewRecipe={onNewRecipe}
            table={table}
          />
        )}

        {tab === "tools" && (
          <VramCalculatorPanel availableModels={availableModels} modelServedNames={modelServedNames} />
        )}

        {tab === "runtime" && <VllmRuntimePanel />}
      </div>

      {deleteConfirm && (
        <DeleteRecipeConfirmModal
          recipeName={deleteRecipeName}
          onCancel={onCancelDelete}
          onConfirm={onConfirmDelete}
        />
      )}

      {modalOpen && modalRecipe && (
        <RecipeModal
          recipe={modalRecipe}
          onClose={onCloseRecipeModal}
          onSave={onSaveRecipe}
          onChange={setModalRecipe}
          saving={saving}
          availableModels={availableModels}
          recipes={recipes}
        />
      )}
    </div>
  );
}
