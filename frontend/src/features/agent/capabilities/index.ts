/**
 * Capability registry — Phase 0 read-only adapters.
 *
 * Re-exports the unified CapabilityEntry view type and pure adapter functions
 * that project existing scattered definitions (MCP catalogue, stored servers,
 * skills, prompt templates) into CapabilityEntry[].
 */

export type { CapabilityEntry, CapabilityProvenance, CollisionEntry } from "./types";

export {
  adaptMcpCatalogue,
  adaptStoredServers,
  adaptSkills,
  adaptPromptTemplates,
  detectCollisions,
} from "./adapters";
