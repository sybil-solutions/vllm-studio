// CRITICAL
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import type { ModelDownload } from "@/lib/types";

type StartDownloadParams = {
  model_id: string;
  revision?: string;
  destination_dir?: string;
  allow_patterns?: string[];
  ignore_patterns?: string[];
  hf_token?: string;
};

export function useDownloads(pollIntervalMs = 2500) {
  const [downloads, setDownloads] = useState<ModelDownload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getDownloads();
      setDownloads(data.downloads || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load downloads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    if (pollIntervalMs <= 0) return;
    const interval = setInterval(refresh, pollIntervalMs);
    return () => clearInterval(interval);
  }, [pollIntervalMs, refresh]);

  const startDownload = useCallback(
    async (params: StartDownloadParams) => {
      const result = await api.startDownload(params);
      await refresh();
      return result.download;
    },
    [refresh],
  );

  const pauseDownload = useCallback(
    async (id: string) => {
      const result = await api.pauseDownload(id);
      await refresh();
      return result.download;
    },
    [refresh],
  );

  const resumeDownload = useCallback(
    async (id: string, hfToken?: string) => {
      const result = await api.resumeDownload(id, hfToken);
      await refresh();
      return result.download;
    },
    [refresh],
  );

  const cancelDownload = useCallback(
    async (id: string) => {
      const result = await api.cancelDownload(id);
      await refresh();
      return result.download;
    },
    [refresh],
  );

  const downloadsByModel = useMemo(() => {
    const map = new Map<string, ModelDownload>();
    for (const download of downloads) {
      if (!map.has(download.model_id)) {
        map.set(download.model_id, download);
      }
    }
    return map;
  }, [downloads]);

  return {
    downloads,
    downloadsByModel,
    loading,
    error,
    refresh,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
  };
}
