// CRITICAL
"use client";

import type { ReactNode } from "react";
import {
  Code,
  Cpu,
  Layers,
  Sparkles,
  Terminal,
  Settings,
  Zap,
} from "lucide-react";
import type { RecipeModalTabId } from "./tabs/tab-id";

const tabDefinitions: Array<{ id: RecipeModalTabId; label: string; icon: ReactNode }> = [
  { id: "general", label: "General", icon: <Settings className="w-4 h-4" /> },
  { id: "model", label: "Model", icon: <Layers className="w-4 h-4" /> },
  { id: "resources", label: "Resources", icon: <Cpu className="w-4 h-4" /> },
  { id: "performance", label: "Performance", icon: <Zap className="w-4 h-4" /> },
  { id: "features", label: "Features", icon: <Sparkles className="w-4 h-4" /> },
  { id: "environment", label: "Environment", icon: <Terminal className="w-4 h-4" /> },
  { id: "command", label: "Command", icon: <Code className="w-4 h-4" /> },
];

export function RecipeModalTabBar({
  activeTab,
  onSelectTab,
}: {
  activeTab: RecipeModalTabId;
  onSelectTab: (tab: RecipeModalTabId) => void;
}) {
  return (
    <div className="flex gap-1 px-4 py-3 border-b border-[#363432] shrink-0 bg-[#0d0d0d] overflow-x-auto">
      {tabDefinitions.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onSelectTab(tab.id)}
          className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all whitespace-nowrap ${
            activeTab === tab.id
              ? "bg-[#d97706] text-white shadow-lg shadow-[#d97706]/20"
              : "text-[#9a9088] hover:text-[#e8e6e3] hover:bg-[#1b1b1b]"
          }`}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
