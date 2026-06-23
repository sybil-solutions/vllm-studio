"use client";

import { useCallback } from "react";
import {
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Layers,
  Plug,
  FileText,
  Puzzle,
  RefreshCw,
  XCircle,
} from "lucide-react";
import type { CapabilityEntry, CapabilityProvenance } from "@/features/agent/capabilities/types";
import type { CollisionEvent } from "@/features/agent/capabilities/registry";
import { useCapabilitiesRegistry, type GroupedCapabilities } from "./use-capabilities-registry";

function provenanceLabel(p: CapabilityProvenance): string {
  switch (p.source) {
    case "builtin":
      return `builtin:${p.module}`;
    case "mcp-catalogue":
      return `catalogue:${p.catalogueId}`;
    case "mcp-server":
      return `server:${p.serverName}`;
    case "skill":
      return `skill:${p.skillId}`;
    case "template":
      return `template:${p.templateId}`;
  }
}

function sourceIcon(source: CapabilityEntry["provenance"]["source"]) {
  switch (source) {
    case "mcp-catalogue":
      return Plug;
    case "mcp-server":
      return Layers;
    case "skill":
      return Puzzle;
    case "template":
      return FileText;
    default:
      return HelpCircle;
  }
}

function AvailabilityBadge({ entry }: { entry: CapabilityEntry }) {
  const reason = entry.isAvailable();
  if (reason === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
        <CheckCircle className="h-3 w-3" />
        Available
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] font-medium text-yellow-600 dark:text-yellow-400"
      title={reason}
    >
      <AlertTriangle className="h-3 w-3" />
      {reason}
    </span>
  );
}

function CollisionCard({ event }: { event: CollisionEvent }) {
  const isIncomingRejected = event.action === "rejected";
  return (
    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
      <div className="flex items-start gap-2">
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-(--fg)">
            <code className="rounded bg-(--surface) px-1 py-0.5 font-mono text-[11px]">
              {event.id}
            </code>
          </div>
          <div className="mt-1 text-[11px] text-(--dim)">
            {isIncomingRejected ? (
              <>
                Shadow-rejected: incoming from{" "}
                <code className="text-[10px]">{provenanceLabel(event.incoming)}</code> conflicts
                with existing <code className="text-[10px]">{provenanceLabel(event.existing)}</code>
              </>
            ) : (
              <>
                Overridden: <code className="text-[10px]">{provenanceLabel(event.incoming)}</code>{" "}
                replaced <code className="text-[10px]">{provenanceLabel(event.existing)}</code>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CapabilityRow({ entry }: { entry: CapabilityEntry }) {
  const reason = entry.isAvailable();
  return (
    <div
      className={`flex items-start gap-3 rounded-md px-3 py-2 transition-colors hover:bg-(--surface)/50 ${
        reason !== null ? "opacity-60" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-(--fg)">{entry.label}</span>
          <span className="rounded bg-(--surface) px-1.5 py-0.5 font-mono text-[10px] text-(--dim)">
            {entry.kind}
          </span>
        </div>
        {entry.description ? (
          <p className="mt-0.5 text-xs text-(--dim) line-clamp-2">{entry.description}</p>
        ) : null}
        <p className="mt-0.5 font-mono text-[10px] text-(--dim)/60">{entry.id}</p>
      </div>
      <div className="shrink-0 pt-0.5">
        <AvailabilityBadge entry={entry} />
      </div>
    </div>
  );
}

function GroupSection({ group }: { group: GroupedCapabilities }) {
  const Icon = sourceIcon(group.source);
  return (
    <section>
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-(--border) bg-(--bg) px-4 py-2.5">
        <Icon className="h-4 w-4 text-(--dim)" />
        <h3 className="text-sm font-semibold text-(--fg)">{group.label}</h3>
        <span className="ml-auto rounded-full bg-(--surface) px-2 py-0.5 text-[10px] font-medium text-(--dim)">
          {group.entries.length}
        </span>
      </div>
      <div className="divide-y divide-(--border)/40">
        {group.entries.map((entry) => (
          <CapabilityRow key={entry.id} entry={entry} />
        ))}
      </div>
    </section>
  );
}

export function CapabilitiesPage() {
  const { grouped, all, collisions, loading, error, skippedSources, ...view } =
    useCapabilitiesRegistry();

  const handleRefresh = useCallback(() => {
    // Re-trigger by reloading the page data
    window.location.reload();
  }, []);

  return (
    <div className="mx-auto w-full max-w-[86rem] px-4 py-4 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-6 2xl:px-10">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-(--fg)">Capabilities</h1>
          <p className="mt-1 text-sm text-(--dim)">
            Unified view of all registered capabilities and their provenance.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="flex h-8 items-center gap-1.5 rounded-md border border-(--border) bg-(--surface) px-3 text-xs text-(--dim) transition-colors hover:bg-(--surface-2) hover:text-(--fg)"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Summary bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-(--border) bg-(--surface)/30 px-4 py-2.5 text-xs text-(--dim)">
        <span>
          <strong className="font-semibold text-(--fg)">{all.length}</strong> capabilities
        </span>
        <span className="text-(--border)">·</span>
        <span>
          <strong className="font-semibold text-(--fg)">{grouped.length}</strong> sources
        </span>
        {collisions.length > 0 ? (
          <>
            <span className="text-(--border)">·</span>
            <span className="text-yellow-600 dark:text-yellow-400">
              <strong className="font-semibold">{collisions.length}</strong> collision
              {collisions.length !== 1 ? "s" : ""}
            </span>
          </>
        ) : null}
        {skippedSources.length > 0 ? (
          <>
            <span className="text-(--border)">·</span>
            <span title={skippedSources.join(", ")} className="text-(--dim)/70">
              {skippedSources.length} source{skippedSources.length !== 1 ? "s" : ""} unavailable
            </span>
          </>
        ) : null}
      </div>

      {/* Error state */}
      {error ? (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      ) : null}

      {/* Loading state */}
      {loading ? (
        <div className="py-12 text-center text-sm text-(--dim)">Loading capabilities...</div>
      ) : all.length === 0 && !error ? (
        <div className="py-12 text-center text-sm text-(--dim)">
          No capabilities registered. Add MCP servers, skills, or prompt templates to see them here.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Collisions section */}
          {collisions.length > 0 ? (
            <section>
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <h2 className="text-sm font-semibold text-(--fg)">
                  Collisions ({collisions.length})
                </h2>
              </div>
              <div className="space-y-2">
                {collisions.map((event, i) => (
                  <CollisionCard key={`${event.id}-${i}`} event={event} />
                ))}
              </div>
            </section>
          ) : null}

          {/* Grouped capabilities */}
          {grouped.map((group) => (
            <GroupSection key={group.source} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}
