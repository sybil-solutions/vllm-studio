import assert from "node:assert/strict";
import test from "node:test";

import { adaptMcpCatalogue, adaptStoredServers, adaptSkills, adaptPromptTemplates } from "@/features/agent/capabilities/adapters";
import { CapabilityRegistry } from "@/features/agent/capabilities/registry";
import type { McpCatalogueEntry, McpServerEntry } from "@/features/agent/mcp/types";
import type { SkillRow } from "@/features/agent/skill-discovery";
import type { PromptTemplateRow } from "@/features/agent/prompt-templates-store";

function fakeCatalogue(overrides: Partial<McpCatalogueEntry> = {}): McpCatalogueEntry {
  return {
    id: "catalogue:test",
    name: "test",
    displayName: "Test",
    description: "Test server",
    shortDescription: "Test",
    category: "Test",
    tags: ["test"],
    registry: "curated",
    command: "npx",
    args: ["-y", "test-server"],
    ...overrides,
  };
}

function fakeStoredServer(overrides: Partial<McpServerEntry["def"]> = {}): McpServerEntry {
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

test("fromSources with all four adapter outputs builds registry and detects collisions", () => {
  const catalogue = adaptMcpCatalogue([fakeCatalogue(), fakeCatalogue({ id: "catalogue:fetch", name: "fetch", displayName: "Fetch" })]);
  const servers = adaptStoredServers([fakeStoredServer()]);
  const skills = adaptSkills([fakeSkill()]);
  const templates = adaptPromptTemplates([fakeTemplate()]);

  const { registry, collisions } = CapabilityRegistry.fromSources(catalogue, servers, skills, templates);

  assert.equal(registry.list().length, 5);
  assert.equal(registry.has("catalogue:test"), true);
  assert.equal(registry.has("catalogue:fetch"), true);
  assert.equal(registry.has("custom-server"), true);
  assert.equal(registry.has("skill:browser"), true);
  assert.equal(registry.has("template:refactor"), true);
  assert.equal(collisions.length, 0);
});

test("fromSources detects collision when catalogue and server share an id", () => {
  const catalogue = adaptMcpCatalogue([fakeCatalogue({ id: "shared-id" })]);
  const servers = adaptStoredServers([fakeStoredServer({ id: "shared-id" })]);

  const { registry, collisions } = CapabilityRegistry.fromSources(catalogue, servers);

  assert.equal(collisions.length, 1);
  assert.equal(collisions[0].id, "shared-id");
  assert.equal(collisions[0].action, "rejected");
  // First registered wins (catalogue)
  assert.equal(registry.get("shared-id")?.provenance.source, "mcp-catalogue");
});

test("fromSources with empty sources returns empty registry", () => {
  const { registry, collisions } = CapabilityRegistry.fromSources([], [], [], []);
  assert.equal(registry.list().length, 0);
  assert.equal(collisions.length, 0);
});

test("fromSources with partial sources works", () => {
  const catalogue = adaptMcpCatalogue([fakeCatalogue()]);
  const skills = adaptSkills([fakeSkill()]);

  const { registry, collisions } = CapabilityRegistry.fromSources(catalogue, [], skills, []);
  assert.equal(registry.list().length, 2);
  assert.equal(collisions.length, 0);
});

test("adapted entries have correct provenance source", () => {
  const catalogue = adaptMcpCatalogue([fakeCatalogue()]);
  const servers = adaptStoredServers([fakeStoredServer()]);
  const skills = adaptSkills([fakeSkill()]);
  const templates = adaptPromptTemplates([fakeTemplate()]);

  assert.equal(catalogue[0].provenance.source, "mcp-catalogue");
  assert.equal(servers[0].provenance.source, "mcp-server");
  assert.equal(skills[0].provenance.source, "skill");
  assert.equal(templates[0].provenance.source, "template");
});
