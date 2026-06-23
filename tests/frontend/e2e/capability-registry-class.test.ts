import assert from "node:assert/strict";
import test from "node:test";

import { CapabilityRegistry } from "@/features/agent/capabilities/registry";
import type { CapabilityEntry, CapabilityProvenance } from "@/features/agent/capabilities/types";

function fakeEntry(
  id: string,
  provenance: CapabilityProvenance = { source: "builtin", module: "test" },
): CapabilityEntry {
  return {
    id,
    label: id,
    description: `Description for ${id}`,
    kind: "builtin",
    provenance,
    isAvailable: () => null,
  };
}

test("register stores an entry and get retrieves it", () => {
  const reg = new CapabilityRegistry();
  const entry = fakeEntry("a");
  const result = reg.register(entry);
  assert.equal(result.status, "registered");
  assert.equal(reg.get("a")?.id, "a");
  assert.equal(reg.has("a"), true);
  assert.equal(reg.has("b"), false);
});

test("register shadow-rejects on id collision without override", () => {
  const reg = new CapabilityRegistry();
  const first = fakeEntry("x", { source: "builtin", module: "mod-a" });
  const second = fakeEntry("x", { source: "mcp-catalogue", catalogueId: "cat:1" });

  reg.register(first);
  const result = reg.register(second);

  assert.equal(result.status, "rejected");
  if (result.status === "rejected") {
    assert.equal(result.incoming.id, "x");
    assert.equal(result.existing.provenance.source, "builtin");
  }
  // Original entry is kept
  assert.equal(reg.get("x")?.provenance.source, "builtin");
});

test("register overrides on collision when override=true", () => {
  const reg = new CapabilityRegistry();
  const first = fakeEntry("y", { source: "builtin", module: "mod-a" });
  const second = fakeEntry("y", { source: "skill", skillId: "s1", skillPath: "/s" });

  reg.register(first);
  const result = reg.register(second, { override: true });

  assert.equal(result.status, "overridden");
  if (result.status === "overridden") {
    assert.equal(result.entry.provenance.source, "skill");
    assert.equal(result.previous.provenance.source, "builtin");
  }
  // New entry replaced the old one
  assert.equal(reg.get("y")?.provenance.source, "skill");
});

test("registerAll registers multiple entries", () => {
  const reg = new CapabilityRegistry();
  const results = reg.registerAll([
    fakeEntry("a"),
    fakeEntry("b"),
    fakeEntry("c"),
  ]);
  assert.equal(results.length, 3);
  assert.equal(results[0].status, "registered");
  assert.equal(results[1].status, "registered");
  assert.equal(results[2].status, "registered");
  assert.equal(reg.list().length, 3);
});

test("collisions records shadow-rejections", () => {
  const reg = new CapabilityRegistry();
  reg.register(fakeEntry("dup", { source: "builtin", module: "m" }));
  reg.register(fakeEntry("dup", { source: "mcp-server", serverId: "s", serverName: "S" }));

  const log = reg.collisions();
  assert.equal(log.length, 1);
  assert.equal(log[0].id, "dup");
  assert.equal(log[0].action, "rejected");
  assert.equal(log[0].incoming.source, "mcp-server");
  assert.equal(log[0].existing.source, "builtin");
});

test("collisions records overrides", () => {
  const reg = new CapabilityRegistry();
  reg.register(fakeEntry("o", { source: "builtin", module: "m" }));
  reg.register(fakeEntry("o", { source: "skill", skillId: "s", skillPath: "/s" }), {
    override: true,
  });

  const log = reg.collisions();
  assert.equal(log.length, 1);
  assert.equal(log[0].action, "overridden");
});

test("fromSources builds registry and reports collisions", () => {
  const sourceA = [
    fakeEntry("shared", { source: "builtin", module: "a" }),
    fakeEntry("only-a", { source: "builtin", module: "a" }),
  ];
  const sourceB = [
    fakeEntry("shared", { source: "mcp-server", serverId: "s", serverName: "S" }),
    fakeEntry("only-b", { source: "skill", skillId: "sk", skillPath: "/sk" }),
  ];

  const { registry, collisions } = CapabilityRegistry.fromSources(sourceA, sourceB);

  assert.equal(registry.list().length, 3); // shared (first wins), only-a, only-b
  assert.equal(registry.has("shared"), true);
  assert.equal(registry.has("only-a"), true);
  assert.equal(registry.has("only-b"), true);
  // First registration of "shared" wins (builtin)
  assert.equal(registry.get("shared")?.provenance.source, "builtin");

  assert.equal(collisions.length, 1);
  assert.equal(collisions[0].id, "shared");
  assert.equal(collisions[0].action, "rejected");
});

test("collisions returns a copy (mutation-safe)", () => {
  const reg = new CapabilityRegistry();
  reg.register(fakeEntry("z"));
  reg.register(fakeEntry("z"));
  const log1 = reg.collisions();
  const log2 = reg.collisions();
  assert.deepEqual(log1, log2);
  assert.notEqual(log1, log2); // different array reference
});

test("list returns empty array for fresh registry", () => {
  const reg = new CapabilityRegistry();
  assert.deepEqual(reg.list(), []);
  assert.deepEqual(reg.collisions(), []);
});
