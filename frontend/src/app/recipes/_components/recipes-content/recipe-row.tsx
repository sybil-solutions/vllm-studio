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
              <div className="absolute right-0 mt-1 w-32 bg-[#1b1b1b] border border-[#363432] rounded-lg shadow-lg z-50">
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

