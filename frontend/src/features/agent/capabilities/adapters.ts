/**
 * Pure read-only adapters that map existing scattered capability definitions
 * into the unified `CapabilityEntry` view type.
 *
 * These adapters DO NOT change how any of the source definitions are registered
 * or consumed. They are a read-only projection layer (Phase 0).
 */

import type { McpCatalogueEntry, McpServerEntry } from "@/features/agent/mcp/types";
import type { SkillRow } from "@/features/agent/skill-discovery";
import type { PromptTemplateRow } from "@/features/agent/prompt-templates-store";
import type { CapabilityEntry, CollisionEntry, CapabilityProvenance } from "./types";

/**
 * Adapt curated MCP catalogue entries into CapabilityEntry[].
 */
export function adaptMcpCatalogue(entries: McpCatalogueEntry[]): CapabilityEntry[] {
  return entries.map((entry) => ({
    id: entry.id,
    label: entry.displayName ?? entry.name,
    description: entry.description ?? "",
    kind: "mcp" as const,
    provenance: {
      source: "mcp-catalogue" as const,
      catalogueId: entry.id,
    },
    isAvailable: () => null,
  }));
}

/**
 * Adapt user-added / stored MCP server entries into CapabilityEntry[].
 */
export function adaptStoredServers(entries: McpServerEntry[]): CapabilityEntry[] {
  return entries.map((entry) => ({
    id: entry.def.id,
    label: entry.def.displayName ?? entry.def.name,
    description: entry.def.description ?? "",
    kind: "mcp" as const,
    provenance: {
      source: "mcp-server" as const,
      serverId: entry.def.id,
      serverName: entry.def.name,
    },
    isAvailable: () => (entry.enabled ? null : "server disabled"),
  }));
}

/**
 * Adapt discovered skills into CapabilityEntry[].
 */
export function adaptSkills(rows: SkillRow[]): CapabilityEntry[] {
  return rows.map((row) => ({
    id: row.id,
    label: row.name,
    description: `Skill from ${row.source}`,
    kind: "skill" as const,
    provenance: {
      source: "skill" as const,
      skillId: row.id,
      skillPath: row.path,
    },
    isAvailable: () => null,
  }));
}

/**
 * Adapt discovered prompt templates into CapabilityEntry[].
 */
export function adaptPromptTemplates(rows: PromptTemplateRow[]): CapabilityEntry[] {
  return rows.map((row) => ({
    id: row.id,
    label: row.name,
    description: row.description ?? `Template from ${row.source}`,
    kind: "template" as const,
    provenance: {
      source: "template" as const,
      templateId: row.id,
      templatePath: row.path,
    },
    isAvailable: () => null,
  }));
}

/**
 * Detect duplicate ids across multiple sets of CapabilityEntry arrays.
 * Returns only the collisions (ids shared by 2+ entries from different provenance sources).
 */
export function detectCollisions(...entrySets: CapabilityEntry[][]): CollisionEntry[] {
  const byId = new Map<string, Array<{ provenance: CapabilityProvenance; label: string }>>();

  for (const entries of entrySets) {
    for (const entry of entries) {
      const existing = byId.get(entry.id);
      if (existing) {
        existing.push({ provenance: entry.provenance, label: entry.label });
      } else {
        byId.set(entry.id, [{ provenance: entry.provenance, label: entry.label }]);
      }
    }
  }

  const collisions: CollisionEntry[] = [];
  for (const [id, entries] of byId) {
    if (entries.length > 1) {
      collisions.push({ id, entries });
    }
  }
  return collisions;
}
