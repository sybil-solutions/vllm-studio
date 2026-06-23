import assert from "node:assert/strict";
import test from "node:test";

import {
  adaptMcpCatalogue,
  adaptStoredServers,
  adaptSkills,
  adaptPromptTemplates,
  detectCollisions,
} from "@/features/agent/capabilities/adapters";
import type { McpCatalogueEntry, McpServerEntry } from "@/features/agent/mcp/types";
import type { SkillRow } from "@/features/agent/skill-discovery";
import type { PromptTemplateRow } from "@/features/agent/prompt-templates-store";

// --- Fake inputs ---

function fakeCatalogueEntry(overrides: Partial<McpCatalogueEntry> = {}): McpCatalogueEntry {
  return {
    id: "catalogue:filesystem",
    name: "filesystem",
    displayName: "Filesystem",
    description: "Read and write files",
    shortDescription: "Local file access",
    category: "Files",
    tags: ["files"],
    registry: "curated",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem"],
    requiresTargetArg: true,
    ...overrides,
  };
}

function fakeStoredServer(
  overrides: Partial<McpServerEntry["def"]> = {},
): McpServerEntry {
  return {
    def: {
      id: "custom-server",
      name: "my-tools",
      displayName: "My Tools",
      description: "Custom MCP tools",
      transport: "stdio",
      command: "node",
      args: ["server.js"],
      ...overrides,
    },
    enabled: true,
    source: "manual",
  };
}

function fakeSkill(overrides: Partial<SkillRow> = {}): SkillRow {
  return {
    id: "skill:browser",
    name: "browser",
    source: "devin",
    path: "/skills/browser/SKILL.md",
    ...overrides,
  };
}

function fakeTemplate(overrides: Partial<PromptTemplateRow> = {}): PromptTemplateRow {
  return {
    id: "template:refactor",
    name: "refactor",
    source: "devin",
    path: "/prompts/refactor.md",
    description: "Refactor code",
    ...overrides,
  };
}

// --- Tests ---

test("adaptMcpCatalogue maps catalogue entries to CapabilityEntry", () => {
  const entries = [
    fakeCatalogueEntry(),
    fakeCatalogueEntry({ id: "catalogue:fetch", name: "fetch", displayName: "Fetch" }),
  ];
  const result = adaptMcpCatalogue(entries);
  assert.equal(result.length, 2);
  assert.equal(result[0].id, "catalogue:filesystem");
  assert.equal(result[0].label, "Filesystem");
  assert.equal(result[0].kind, "mcp");
  assert.equal(result[0].provenance.source, "mcp-catalogue");
  assert.equal(result[0].isAvailable(), null);
  assert.equal(result[1].id, "catalogue:fetch");
});

test("adaptStoredServers maps server entries to CapabilityEntry", () => {
  const disabled = fakeStoredServer({ id: "disabled-server", name: "disabled" });
  disabled.enabled = false;
  const entries = [fakeStoredServer(), disabled];
  const result = adaptStoredServers(entries);
  assert.equal(result.length, 2);
  assert.equal(result[0].id, "custom-server");
  assert.equal(result[0].kind, "mcp");
  assert.equal(result[0].provenance.source, "mcp-server");
  assert.equal(result[0].isAvailable(), null);
  assert.equal(result[1].isAvailable(), "server disabled");
});

test("adaptSkills maps skill rows to CapabilityEntry", () => {
  const entries = [fakeSkill(), fakeSkill({ id: "skill:git", name: "git", path: "/skills/git" })];
  const result = adaptSkills(entries);
  assert.equal(result.length, 2);
  assert.equal(result[0].id, "skill:browser");
  assert.equal(result[0].kind, "skill");
  assert.equal(result[0].provenance.source, "skill");
  assert.equal(result[1].id, "skill:git");
});

test("adaptPromptTemplates maps template rows to CapabilityEntry", () => {
  const entries = [fakeTemplate()];
  const result = adaptPromptTemplates(entries);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "template:refactor");
  assert.equal(result[0].label, "refactor");
  assert.equal(result[0].kind, "template");
  assert.equal(result[0].provenance.source, "template");
  assert.equal(result[0].description, "Refactor code");
});

test("adaptPromptTemplates uses fallback description when none provided", () => {
  const entry = fakeTemplate({ description: undefined });
  const result = adaptPromptTemplates([entry]);
  assert.equal(result[0].description, "Template from devin");
});

test("detectCollisions returns empty when no duplicates", () => {
  const a = adaptMcpCatalogue([fakeCatalogueEntry()]);
  const b = adaptSkills([fakeSkill()]);
  const collisions = detectCollisions(a, b);
  assert.equal(collisions.length, 0);
});

test("detectCollisions finds duplicate ids across sources", () => {
  // Force a collision: give the catalogue entry and server entry the same id
  const catalogue = adaptMcpCatalogue([
    fakeCatalogueEntry({ id: "shared-id" }),
  ]);
  const servers = adaptStoredServers([
    fakeStoredServer({ id: "shared-id" }),
  ]);
  const collisions = detectCollisions(catalogue, servers);
  assert.equal(collisions.length, 1);
  assert.equal(collisions[0].id, "shared-id");
  assert.equal(collisions[0].entries.length, 2);
  assert.equal(collisions[0].entries[0].provenance.source, "mcp-catalogue");
  assert.equal(collisions[0].entries[1].provenance.source, "mcp-server");
});

test("detectCollisions flags duplicate ids even within a single input array", () => {
  // Two entries with the same id in the same array still count as a collision
  const entries = adaptMcpCatalogue([
    fakeCatalogueEntry({ id: "dup" }),
    fakeCatalogueEntry({ id: "dup", name: "dup2", displayName: "Dup 2" }),
  ]);
  const collisions = detectCollisions(entries);
  assert.equal(collisions.length, 1);
  assert.equal(collisions[0].id, "dup");
  assert.equal(collisions[0].entries.length, 2);
});

test("detectCollisions handles multiple independent collisions", () => {
  const a = [
    ...adaptMcpCatalogue([fakeCatalogueEntry({ id: "collision-a" })]),
    ...adaptSkills([fakeSkill({ id: "collision-b" })]),
  ];
  const b = [
    ...adaptStoredServers([fakeStoredServer({ id: "collision-a" })]),
    ...adaptPromptTemplates([fakeTemplate({ id: "collision-b" })]),
  ];
  const collisions = detectCollisions(a, b);
  assert.equal(collisions.length, 2);
  const ids = collisions.map((c) => c.id).sort();
  assert.deepEqual(ids, ["collision-a", "collision-b"]);
});
