// CRITICAL
"use client";

import { Calculator, Package, RefreshCw } from "lucide-react";
import type { RecipesContentTab } from "./recipes-content-model";

type Props = {
  tab: RecipesContentTab;
  setTab: (tab: RecipesContentTab) => void;
  refreshing: boolean;
  onRefresh: () => void;
};

export function RecipesContentHeader({ tab, setTab, refreshing, onRefresh }: Props) {
  return (
    <>
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
            onClick={onRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-[#1f1f1f] rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

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
    </>
  );
}

