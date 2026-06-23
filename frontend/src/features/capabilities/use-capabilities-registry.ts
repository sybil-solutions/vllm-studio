"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { MCP_CATALOGUE } from "@/features/agent/mcp/catalogue";
import type { SkillRow } from "@/features/agent/skill-discovery";
import type { PromptTemplateRow } from "@/features/agent/prompt-templates-store";
import {
  adaptMcpCatalogue,
  adaptStoredServers,
  adaptSkills,
  adaptPromptTemplates,
} from "@/features/agent/capabilities/adapters";
import { CapabilityRegistry, type CollisionEvent } from "@/features/agent/capabilities/registry";
import type { CapabilityEntry } from "@/features/agent/capabilities/types";

export type GroupedCapabilities = {
  label: string;
  source: CapabilityEntry["provenance"]["source"];
  entries: CapabilityEntry[];
};

export type CapabilitiesRegistryView = {
  grouped: GroupedCapabilities[];
  all: CapabilityEntry[];
  collisions: CollisionEvent[];
  loading: boolean;
  error: string | null;
  skippedSources: string[];
};

const GROUP_ORDER: CapabilityEntry["provenance"]["source"][] = [
  "mcp-catalogue",
  "mcp-server",
  "skill",
  "template",
];

const GROUP_LABELS: Record<CapabilityEntry["provenance"]["source"], string> = {
  builtin: "Built-in",
  "mcp-catalogue": "MCP Catalogue",
  "mcp-server": "MCP Servers",
  skill: "Skills",
  template: "Prompt Templates",
};

export function useCapabilitiesRegistry(): CapabilitiesRegistryView {
  const [view, setView] = useState<CapabilitiesRegistryView>({
    grouped: [],
    all: [],
    collisions: [],
    loading: true,
    error: null,
    skippedSources: [],
  });

  const load = useCallback(async () => {
    setView((prev) => ({ ...prev, loading: true, error: null }));
    try {
      // Source 1: MCP catalogue — always available (static import)
      const catalogueEntries = adaptMcpCatalogue(MCP_CATALOGUE);

      // Source 2: stored MCP servers — fetched from API
      let serverEntries: CapabilityEntry[] = [];
      try {
        const res = await fetch("/api/agent/plugins?includeDisabled=1", { cache: "no-store" });
        const payload = (await res.json()) as {
          plugins?: Array<{
            id: string;
            name: string;
            displayName?: string;
            description?: string;
            enabled?: boolean;
          }>;
        };
        const plugins = payload.plugins ?? [];
        serverEntries = plugins.map((p) => ({
          id: p.id,
          label: p.displayName ?? p.name,
          description: p.description ?? "",
          kind: "mcp" as const,
          provenance: {
            source: "mcp-server" as const,
            serverId: p.id,
            serverName: p.name,
          },
          isAvailable: () => (p.enabled === false ? "server disabled" : null),
        }));
      } catch {
        // Silently skip if unavailable
      }

      // Source 3: skills — fetched from API
      let skillEntries: CapabilityEntry[] = [];
      try {
        const res = await fetch("/api/agent/skills", { cache: "no-store" });
        const payload = (await res.json()) as { skills?: SkillRow[] };
        if (payload.skills?.length) {
          skillEntries = adaptSkills(payload.skills);
        }
      } catch {
        // Silently skip if unavailable
      }

      // Source 4: prompt templates — fetched from API
      let templateEntries: CapabilityEntry[] = [];
      try {
        const res = await fetch("/api/agent/prompt-templates", { cache: "no-store" });
        const payload = (await res.json()) as { templates?: PromptTemplateRow[] };
        if (payload.templates?.length) {
          templateEntries = adaptPromptTemplates(payload.templates);
        }
      } catch {
        // Silently skip if unavailable
      }

      // Build registry
      const { registry, collisions } = CapabilityRegistry.fromSources(
        catalogueEntries,
        serverEntries,
        skillEntries,
        templateEntries,
      );

      const all = registry.list();

      // Group by provenance source
      const bySource = new Map<string, CapabilityEntry[]>();
      for (const entry of all) {
        const key = entry.provenance.source;
        const group = bySource.get(key);
        if (group) {
          group.push(entry);
        } else {
          bySource.set(key, [entry]);
        }
      }

      const grouped: GroupedCapabilities[] = [];
      for (const source of GROUP_ORDER) {
        const entries = bySource.get(source);
        if (entries?.length) {
          grouped.push({
            label: GROUP_LABELS[source],
            source,
            entries,
          });
        }
      }

      // Track which sources we skipped (had no client-side accessor or returned empty)
      const skipped: string[] = [];
      if (!serverEntries.length) skipped.push("mcp-server");
      if (!skillEntries.length) skipped.push("skill");
      if (!templateEntries.length) skipped.push("template");

      setView({
        grouped,
        all,
        collisions,
        loading: false,
        error: null,
        skippedSources: skipped,
      });
    } catch (err) {
      setView((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load capabilities",
      }));
    }
  }, []);

  const subscribe = useCallback(
    (_notify: () => void) => {
      void load();
      return () => {};
    },
    [load],
  );

  const getSnapshot = useCallback(() => view, [view]);
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return view;
}
