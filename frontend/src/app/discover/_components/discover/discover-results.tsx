// CRITICAL
"use client";

import { Download, RefreshCw } from "lucide-react";
import type { HuggingFaceModel, ModelDownload } from "@/lib/types";
import { ModelRow } from "./discover-results/model-row";

export function DiscoverResults({
  models,
  filteredModels,
  loading,
  error,
  providerFilter,
  copiedId,
  hasMore,
  isModelLocal,
  getDownloadForModel,
  onCopyModelId,
  onRefresh,
  onLoadMore,
  onStartDownload,
  onPauseDownload,
  onResumeDownload,
}: {
  models: HuggingFaceModel[];
  filteredModels: HuggingFaceModel[];
  loading: boolean;
  error: string | null;
  providerFilter: string;
  copiedId: string | null;
  hasMore: boolean;
  isModelLocal: (modelId: string) => boolean;
  getDownloadForModel: (modelId: string) => ModelDownload | null;
  onCopyModelId: (modelId: string) => void;
  onRefresh: () => void;
  onLoadMore: () => void;
  onStartDownload: (params: { model_id: string }) => Promise<void>;
  onPauseDownload: (downloadId: string) => Promise<void>;
  onResumeDownload: (downloadId: string) => Promise<void>;
}) {
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-(--error) mb-4">{error}</p>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-(--card) border border-(--border) rounded-lg text-(--foreground) hover:bg-(--card-hover) transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (loading && models.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-(--muted-foreground)">
        <RefreshCw className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (filteredModels.length === 0) {
    return (
      <div className="text-center py-12 text-(--muted-foreground)">
        <p>No models found</p>
        <p className="text-sm mt-1">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <>
      <div className="text-xs text-(--muted-foreground) mb-3">
        {filteredModels.length} {filteredModels.length === 1 ? "model" : "models"}
        {providerFilter && ` from ${providerFilter}`}
      </div>

      <div className="border border-(--border) rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-(--card) border-b border-(--border)">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-(--muted-foreground) uppercase tracking-wider">
                Model
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-(--muted-foreground) uppercase tracking-wider">
                Provider
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-(--muted-foreground) uppercase tracking-wider">
                Task
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-(--muted-foreground) uppercase tracking-wider">
                Quantization
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-(--muted-foreground) uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-(--muted-foreground) uppercase tracking-wider">
                Stats
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-(--muted-foreground) uppercase tracking-wider w-8"></th>
              <th className="px-4 py-3 text-right text-xs font-medium text-(--muted-foreground) uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--border)">
            {filteredModels.map((model) => (
              <ModelRow
                key={model._id}
                model={model}
                copied={copiedId === model.modelId}
                isLocal={isModelLocal(model.modelId)}
                activeDownload={getDownloadForModel(model.modelId)}
                onCopyModelId={onCopyModelId}
                onStartDownload={onStartDownload}
                onPauseDownload={onPauseDownload}
                onResumeDownload={onResumeDownload}
              />
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="px-4 py-2 bg-(--card) border border-(--border) rounded-lg text-sm text-(--foreground) hover:bg-(--card-hover) transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading...
              </span>
            ) : (
              "Load More"
            )}
          </button>
        </div>
      )}
    </>
  );
}
