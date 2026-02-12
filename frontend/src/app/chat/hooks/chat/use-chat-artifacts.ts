// CRITICAL
"use client";

import { useCallback, useEffect, useMemo } from "react";
import type { Artifact, ChatMessage } from "@/lib/types";
import { extractArtifacts } from "../../_components/artifacts/artifact-renderer";

type UseChatArtifactsArgs = {
  messages: ChatMessage[];
  artifactsEnabled: boolean;
  currentSessionId: string | null;
  activeArtifactId: string | null;
  setActiveArtifactId: (value: string | null) => void;
};

export function useChatArtifacts(args: UseChatArtifactsArgs): {
  sessionArtifacts: Artifact[];
  artifactsByMessage: Map<string, Artifact[]>;
  activeArtifact: Artifact | null;
  clearArtifactsCache: () => void;
} {
  const { messages, artifactsEnabled, currentSessionId, activeArtifactId, setActiveArtifactId } = args;

  const emptyArtifacts = useMemo(() => [] as Artifact[], []);
  const emptyByMessage = useMemo(() => new Map<string, Artifact[]>(), []);

  const artifactsCache = useMemo(() => new Map<string, { text: string; artifacts: Artifact[] }>(), []);
  const clearArtifactsCache = useCallback(() => {
    artifactsCache.clear();
  }, [artifactsCache]);

  const { sessionArtifacts, artifactsByMessage } = useMemo(() => {
    if (!artifactsEnabled || messages.length === 0) {
      return { sessionArtifacts: emptyArtifacts, artifactsByMessage: emptyByMessage };
    }

    const artifacts: Artifact[] = [];
    const byMessage = new Map<string, Artifact[]>();
    const versionsByGroup = new Map<string, number>();
    const cache = artifactsCache;
    const activeMessageIds = new Set<string>();

    messages.forEach((msg) => {
      if (msg.role !== "assistant") return;

      let textContent = "";
      for (const part of msg.parts) {
        if (part.type !== "text") continue;
        const text = (part as { text?: unknown }).text;
        if (typeof text === "string" && text) textContent += text;
      }

      if (!textContent) return;
      activeMessageIds.add(msg.id);

      const cached = cache.get(msg.id);
      if (cached && cached.text === textContent) {
        byMessage.set(msg.id, cached.artifacts);
        cached.artifacts.forEach((artifact) => {
          artifacts.push(artifact);
          if (artifact.groupId) {
            const current = versionsByGroup.get(artifact.groupId) ?? 0;
            const version = typeof artifact.version === "number" ? artifact.version : current;
            versionsByGroup.set(artifact.groupId, Math.max(current, version));
          }
        });
        return;
      }

      const { artifacts: extracted } = extractArtifacts(textContent, {
        includeImplicit: true,
        maxImplicit: 1,
      });

      const enrichedArtifacts: Artifact[] = [];
      extracted.forEach((artifact, index) => {
        const titleKey = (artifact.title || artifact.type).trim().toLowerCase();
        const groupKey = `${artifact.type}:${titleKey}`;
        const nextVersion = (versionsByGroup.get(groupKey) ?? 0) + 1;
        versionsByGroup.set(groupKey, nextVersion);

        const enriched: Artifact = {
          ...artifact,
          id: `${msg.id}-${index}`,
          groupId: groupKey,
          version: nextVersion,
          message_id: msg.id,
          session_id: currentSessionId || undefined,
        };

        artifacts.push(enriched);
        enrichedArtifacts.push(enriched);
      });

      if (enrichedArtifacts.length > 0) {
        byMessage.set(msg.id, enrichedArtifacts);
      }

      cache.set(msg.id, { text: textContent, artifacts: enrichedArtifacts });
    });

    for (const key of cache.keys()) {
      if (!activeMessageIds.has(key)) {
        cache.delete(key);
      }
    }

    return { sessionArtifacts: artifacts, artifactsByMessage: byMessage };
  }, [messages, artifactsEnabled, currentSessionId, artifactsCache, emptyArtifacts, emptyByMessage]);

  const activeArtifact = useMemo(
    () => sessionArtifacts.find((artifact) => artifact.id === activeArtifactId) ?? null,
    [activeArtifactId, sessionArtifacts],
  );

  useEffect(() => {
    if (activeArtifactId && !activeArtifact) {
      setActiveArtifactId(null);
    }
  }, [activeArtifact, activeArtifactId, setActiveArtifactId]);

  return { sessionArtifacts, artifactsByMessage, activeArtifact, clearArtifactsCache };
}
