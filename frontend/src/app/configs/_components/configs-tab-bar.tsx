// CRITICAL
"use client";

import type { ReactNode } from "react";
import { Cable, Network, Paintbrush, ServerCog } from "lucide-react";

type ConfigTabId = "connection" | "services" | "system" | "appearance";

const configTabs: Array<{ id: ConfigTabId; label: string; icon: ReactNode }> = [
  { id: "connection", label: "Connection", icon: <Cable className="h-4 w-4" /> },
  { id: "services", label: "Services", icon: <Network className="h-4 w-4" /> },
  { id: "system", label: "System", icon: <ServerCog className="h-4 w-4" /> },
  { id: "appearance", label: "Appearance", icon: <Paintbrush className="h-4 w-4" /> },
];

export type { ConfigTabId };

export function ConfigsTabBar({
  activeTab,
  onSelectTab,
}: {
  activeTab: ConfigTabId;
  onSelectTab: (tab: ConfigTabId) => void;
}) {
  return (
    <div className="mb-6 overflow-x-auto">
      <div className="flex items-center gap-2 min-w-max bg-(--bg) border border-(--border) rounded-lg p-1">
        {configTabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors text-xs sm:text-sm whitespace-nowrap border ${
                isActive
                  ? "bg-(--hl1)/15 border-(--hl1)/40 text-(--fg)"
                  : "text-(--dim) border-transparent hover:text-(--fg) hover:border-(--border)"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
