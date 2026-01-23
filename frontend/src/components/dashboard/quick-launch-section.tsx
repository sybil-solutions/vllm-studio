import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { RecipeWithStatus } from "@/lib/types";

interface QuickLaunchSectionProps {
  recipes: RecipeWithStatus[];
  launching: boolean;
  onLaunch: (recipeId: string) => Promise<void>;
  onNewRecipe: () => void;
  onViewAll: () => void;
}

export function QuickLaunchSection({
  recipes,
  launching,
  onLaunch,
  onNewRecipe,
  onViewAll,
}: QuickLaunchSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return recipes
      .filter(
        (recipe) =>
          recipe.name.toLowerCase().includes(query) ||
          recipe.id.toLowerCase().includes(query) ||
          recipe.model_path.toLowerCase().includes(query),
      )
      .slice(0, 8);
  }, [recipes, searchQuery]);

  const handleLaunch = async (recipeId: string) => {
    await onLaunch(recipeId);
    setSearchQuery("");
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-(--muted-foreground)/50 font-medium hover:text-(--foreground)/70 transition-colors"
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          Quick Launch
        </button>
        <button
          onClick={onNewRecipe}
          className="text-[10px] text-(--muted-foreground)/40 hover:text-(--foreground)/60 transition-colors"
        >
          new
        </button>
      </div>

      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search recipes..."
        className="w-full px-3 py-2 bg-transparent border border-(--border)/20 rounded-lg text-sm text-(--foreground) placeholder:text-(--muted-foreground)/30 focus:outline-none focus:border-(--border)/40 transition-all duration-200 mb-2"
      />

      {expanded && (
        <>
          {searchQuery.trim() ? (
            searchResults.length > 0 ? (
              <div className="space-y-0.5">
                {searchResults.map((recipe) => (
                  <RecipeRow
                    key={recipe.id}
                    recipe={recipe}
                    launching={launching}
                    onClick={handleLaunch}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-(--muted-foreground)/40 py-2">No recipes found</p>
            )
          ) : (
            <div className="space-y-0.5">
              {recipes.slice(0, 8).map((recipe) => (
                <RecipeRow
                  key={recipe.id}
                  recipe={recipe}
                  launching={launching}
                  onClick={handleLaunch}
                />
              ))}
              {recipes.length > 8 && (
                <button
                  onClick={onViewAll}
                  className="w-full py-2 text-[10px] text-(--muted-foreground)/40 hover:text-(--foreground)/60 transition-colors"
                >
                  View all {recipes.length} recipes →
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function RecipeRow({
  recipe,
  launching,
  onClick,
}: {
  recipe: RecipeWithStatus;
  launching: boolean;
  onClick: (id: string) => void;
}) {
  const disabled = launching || recipe.status === "running";
  const isRunning = recipe.status === "running";

  return (
    <div
      onClick={() => !disabled && onClick(recipe.id)}
      className={`group py-2 cursor-pointer transition-colors ${
        isRunning ? "cursor-default" : "hover:bg-(--muted)/5"
      } ${disabled && !isRunning ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
            isRunning ? "bg-(--success)" : "bg-(--muted)/30"
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="text-sm text-(--foreground)/80 truncate">{recipe.name}</div>
          <div className="text-[10px] text-(--muted-foreground)/40">
            TP{recipe.tp || recipe.tensor_parallel_size} · {recipe.backend || "vllm"}
          </div>
        </div>
      </div>
    </div>
  );
}
