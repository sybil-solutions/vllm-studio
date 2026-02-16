// CRITICAL
"use client";

import { memo, useCallback, type MouseEvent } from "react";
import { MoreVertical, Pin, PinOff, Play, Square } from "lucide-react";
import type { RecipeWithStatus } from "@/lib/types";
import { formatBackendLabel } from "../../recipe-labels";

type Props = {
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
};

export const RecipeRow = memo(function RecipeRow({
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
}: Props) {
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
      ? "bg-(--hl2)/20 text-(--hl2) border border-(--hl2)/30"
      : status === "starting"
        ? "bg-(--accent)/20 text-(--accent) border border-(--accent)/30"
        : "bg-(--border)/20 text-(--dim) border border-(--border)";

  return (
    <tr className="hover:bg-(--surface)/50 transition-colors">
      <td className="px-4 py-3">
        <button
          onClick={handleTogglePin}
          className="text-(--dim) hover:text-(--accent) transition-colors"
          title={isPinned ? "Unpin" : "Pin"}
        >
          {isPinned ? <Pin className="w-4 h-4 fill-current" /> : <PinOff className="w-4 h-4" />}
        </button>
      </td>
      <td className="px-4 py-3 font-medium text-sm">{recipe.name}</td>
      <td
        className="px-4 py-3 text-sm text-(--dim) font-mono truncate max-w-xs"
        title={recipe.model_path}
      >
        {recipe.served_model_name || recipe.model_path.split("/").pop()}
      </td>
      <td className="px-4 py-3 text-sm">
        <span className="px-2 py-1 bg-(--surface) border border-(--border) rounded text-xs">
          {formatBackendLabel(recipe.backend)}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-(--dim)">
        {tp}/{pp}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusClassName}`}
        >
          {status}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {status === "running" ? (
            <button
              onClick={onStop}
              className="p-1.5 hover:bg-(--err)/20 text-(--err) rounded transition-colors"
              title="Stop"
            >
              <Square className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleLaunch}
              disabled={launchDisabled}
              className="p-1.5 hover:bg-(--hl2)/20 text-(--hl2) rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Launch"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
          <div className="relative">
            <button
              onClick={handleToggleMenu}
              className="p-1.5 hover:bg-(--surface) rounded transition-colors"
              title="Actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 mt-1 w-32 bg-(--surface) border border-(--border) rounded-lg shadow-lg z-50">
                <button
                  onClick={handleEdit}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-(--border) transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={handleRequestDelete}
                  className="w-full px-3 py-2 text-left text-sm text-(--err) hover:bg-(--border) transition-colors"
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

