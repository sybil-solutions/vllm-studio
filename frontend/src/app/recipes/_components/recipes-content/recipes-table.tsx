// CRITICAL
"use client";

import type { RecipeWithStatus } from "@/lib/types";
import { RecipeRow } from "./recipe-row";

type Props = {
  recipes: RecipeWithStatus[];
  pinnedRecipes: Set<string>;
  recipeMenuOpen: string | null;
  launching: boolean;
  runningRecipeId: string | null;
  onTogglePin: (recipeId: string) => void;
  onToggleMenu: (recipeId: string) => void;
  onLaunch: (recipeId: string) => void;
  onStop: () => void;
  onEdit: (recipe: RecipeWithStatus) => void;
  onRequestDelete: (recipeId: string) => void;
};

export function RecipesTable({
  recipes,
  pinnedRecipes,
  recipeMenuOpen,
  launching,
  runningRecipeId,
  onTogglePin,
  onToggleMenu,
  onLaunch,
  onStop,
  onEdit,
  onRequestDelete,
}: Props) {
  return (
    <div className="border border-(--border) rounded-lg overflow-visible">
      <table className="w-full">
        <thead className="bg-(--surface) border-b border-(--border)">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-(--dim) uppercase tracking-wider w-8"></th>
            <th className="px-4 py-3 text-left text-xs font-medium text-(--dim) uppercase tracking-wider">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-(--dim) uppercase tracking-wider">
              Model
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-(--dim) uppercase tracking-wider">
              Backend
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-(--dim) uppercase tracking-wider">
              TP/PP
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-(--dim) uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-(--dim) uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-(--border)">
          {recipes.map((recipe) => {
            const isPinned = pinnedRecipes.has(recipe.id);
            const isMenuOpen = recipeMenuOpen === recipe.id;
            const launchDisabled = launching || Boolean(runningRecipeId);
            return (
              <RecipeRow
                key={recipe.id}
                recipe={recipe}
                isPinned={isPinned}
                isMenuOpen={isMenuOpen}
                launchDisabled={launchDisabled}
                onTogglePin={onTogglePin}
                onToggleMenu={onToggleMenu}
                onLaunch={onLaunch}
                onStop={onStop}
                onEdit={onEdit}
                onRequestDelete={onRequestDelete}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

