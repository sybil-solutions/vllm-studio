/**
 * Capability registry — Phase 1: in-memory registry with shadow-rejection.
 *
 * This is a parallel layer that does NOT rewire existing MCP/skill/plugin/prompt
 * consumers. It can be adopted incrementally by existing surfaces later.
 */

import type { CapabilityEntry, CapabilityProvenance } from "./types";

/** Structured result of a registration attempt. */
export type RegistrationResult =
  | { status: "registered"; entry: CapabilityEntry }
  | {
      status: "rejected";
      reason: string;
      incoming: CapabilityEntry;
      existing: CapabilityEntry;
    }
  | {
      status: "overridden";
      entry: CapabilityEntry;
      previous: CapabilityEntry;
    };

export interface RegistrationOptions {
  /** Explicit opt-in to replacing an existing entry with the same id. */
  override?: boolean;
}

/** A recorded shadow-rejection or override event. */
export interface CollisionEvent {
  id: string;
  action: "rejected" | "overridden";
  incoming: CapabilityProvenance;
  existing: CapabilityProvenance;
  timestamp: number;
}

export class CapabilityRegistry {
  private entries = new Map<string, CapabilityEntry>();
  private collisionLog: CollisionEvent[] = [];

  /**
   * Register a single capability entry.
   *
   * Shadow-REJECT on id collision unless `override: true` is passed.
   * On reject, the existing entry is kept and a structured result is returned
   * (no throw, no crash).
   */
  register(entry: CapabilityEntry, options: RegistrationOptions = {}): RegistrationResult {
    const existing = this.entries.get(entry.id);

    if (!existing) {
      this.entries.set(entry.id, entry);
      return { status: "registered", entry };
    }

    // Shadow-rejection: same id, no explicit override
    if (!options.override) {
      this.collisionLog.push({
        id: entry.id,
        action: "rejected",
        incoming: entry.provenance,
        existing: existing.provenance,
        timestamp: Date.now(),
      });
      return {
        status: "rejected",
        reason: `Capability "${entry.id}" is already registered.`,
        incoming: entry,
        existing,
      };
    }

    // Explicit override: allowed, but logged
    this.collisionLog.push({
      id: entry.id,
      action: "overridden",
      incoming: entry.provenance,
      existing: existing.provenance,
      timestamp: Date.now(),
    });
    this.entries.set(entry.id, entry);
    return { status: "overridden", entry, previous: existing };
  }

  /** Register multiple entries in order. */
  registerAll(entries: CapabilityEntry[], options: RegistrationOptions = {}): RegistrationResult[] {
    return entries.map((entry) => this.register(entry, options));
  }

  /** Look up an entry by id. */
  get(id: string): CapabilityEntry | undefined {
    return this.entries.get(id);
  }

  /** Check whether an id is registered. */
  has(id: string): boolean {
    return this.entries.has(id);
  }

  /** All registered entries. */
  list(): CapabilityEntry[] {
    return Array.from(this.entries.values());
  }

  /** All recorded shadow-rejection and override events. */
  collisions(): CollisionEvent[] {
    return [...this.collisionLog];
  }

  /**
   * Build a registry from one or more adapter outputs (Phase 0 style).
   * Entries are registered in order; collisions are recorded and returned.
   */
  static fromSources(...adapterOutputs: CapabilityEntry[][]): {
    registry: CapabilityRegistry;
    collisions: CollisionEvent[];
  } {
    const registry = new CapabilityRegistry();
    for (const entries of adapterOutputs) {
      registry.registerAll(entries);
    }
    return { registry, collisions: registry.collisions() };
  }
}
