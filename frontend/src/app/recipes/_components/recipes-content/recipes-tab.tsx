// CRITICAL
"use client";

import { Plus, Search, Square } from "lucide-react";
import type { RecipeWithStatus } from "@/lib/types";
import type { RecipesTableProps } from "./types";
import { RecipesTable } from "./recipes-table";

type Props = {
  loading: boolean;
  filter: string;
  setFilter: (value: string) => void;
  sortedRecipes: RecipeWithStatus[];
  runningRecipeId: string | null;
  runningRecipeName: string | null;
  launchProgressMessage: string | null;
  onEvictModel: () => void;
  onNewRecipe: () => void;
  table: RecipesTableProps;
};

export function RecipesTab({
  loading,
  filter,
  setFilter,
  sortedRecipes,
  runningRecipeId,
  runningRecipeName,
  launchProgressMessage,
  onEvictModel,
  onNewRecipe,
  table,
}: Props) {
  return (
    <div style={{ padding: "1.5rem" }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--dim)" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search recipes..."
            className="w-full pl-10 pr-4 py-2 bg-(--surface) border border-(--border) rounded-lg text-sm focus:outline-none focus:border-(--accent)"
          />
        </div>
        <button
          onClick={onNewRecipe}
          className="flex items-center gap-2 px-4 py-2 bg-(--accent) hover:bg-(--accent) text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Recipe
        </button>
      </div>

      {runningRecipeId && (
        <div className="mb-4 p-4 bg-(--hl2)/10 border border-(--hl2)/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-(--hl2)">
                Model Running: {runningRecipeName}
              </div>
              {launchProgressMessage && (
                <div className="text-xs text-(--dim) mt-1">{launchProgressMessage}</div>
              )}
            </div>
            <button
              onClick={onEvictModel}
              className="flex items-center gap-2 px-3 py-1.5 bg-(--err) hover:bg-(--err) text-white rounded text-xs font-medium"
            >
              <Square className="w-3 h-3" />
              Stop
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-(--dim)">Loading recipes...</div>
      ) : sortedRecipes.length === 0 ? (
        <div className="text-center py-12 text-(--dim)">
          {filter ? "No recipes match your search" : "No recipes yet. Create one to get started."}
        </div>
      ) : (
        <RecipesTable {...table} recipes={sortedRecipes} />
      )}
    </div>
  );
}

