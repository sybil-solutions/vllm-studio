/**
 * Unified capability registry types (Phase 0 — read-only adapters).
 *
 * Every action the system can perform — built-in tools, MCP-provided tools,
 * skills, prompt templates — can be represented as a `CapabilityEntry`.
 * Phase 0 only reads from existing sources via thin adapters; it does NOT
 * change how any of those definitions are registered or consumed.
 */

/**
 * Tracks the origin of a capability entry so the registry can detect
 * collisions and enforce shadow-rejection in later phases.
 */
export type CapabilityProvenance =
  | { source: "builtin"; module: string }
  | { source: "mcp-catalogue"; catalogueId: string }
  | { source: "mcp-server"; serverId: string; serverName: string }
  | { source: "skill"; skillId: string; skillPath: string }
  | { source: "template"; templateId: string; templatePath: string };

/**
 * A single entry in the unified capability registry (read-only view).
 *
 * Phase 0 keeps this intentionally minimal: id, label, description, kind,
 * provenance, and an availability check. The full `CapabilityEntry` shape
 * from the design doc (inputSchema, permission, handler, ui, timeline) is
 * deferred to Phase 1 when the registry gains write ownership.
 */
export interface CapabilityEntry {
  /** Globally unique, stable id. Format: "<namespace>:<name>". */
  id: string;
  /** Human-readable short label for UI. */
  label: string;
  /** One-line description for tooltips and help panels. */
  description: string;
  /** Semantic kind for grouping and timeline rendering. */
  kind: "mcp" | "skill" | "template" | "builtin";
  /** Where this capability came from. */
  provenance: CapabilityProvenance;
  /**
   * Runtime availability check. Returns a reason string if unavailable,
   * or null if available. Phase 0: always returns null (always available).
   */
  isAvailable: () => string | null;
}

/** Result of a collision/provenance check. */
export interface CollisionEntry {
  /** The colliding id. */
  id: string;
  /** All entries that share this id. */
  entries: Array<{ provenance: CapabilityProvenance; label: string }>;
}
