// CRITICAL
import { memo, useMemo } from "react";
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  DownloadCloud,
  ExternalLink,
  Heart,
  Pause,
  Play,
  RefreshCw,
} from "lucide-react";
import type { HuggingFaceModel, ModelDownload } from "@/lib/types";
import { formatNumber } from "@/lib/formatters";
import { extractProvider, extractQuantizations } from "../utils";

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

const ModelRow = memo(function ModelRow({
  model,
  copied,
  isLocal,
  activeDownload,
  onCopyModelId,
  onStartDownload,
  onPauseDownload,
  onResumeDownload,
}: {
  model: HuggingFaceModel;
  copied: boolean;
  isLocal: boolean;
  activeDownload: ModelDownload | null;
  onCopyModelId: (modelId: string) => void;
  onStartDownload: (params: { model_id: string }) => Promise<void>;
  onPauseDownload: (downloadId: string) => Promise<void>;
  onResumeDownload: (downloadId: string) => Promise<void>;
}) {
  const provider = useMemo(() => extractProvider(model.modelId), [model.modelId]);
  const quantizations = useMemo(() => extractQuantizations(model.tags), [model.tags]);

  return (
    <tr className="hover:bg-(--card)/30 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-(--foreground) truncate max-w-xs" title={model.modelId}>
            {model.modelId}
          </div>
          <button
            onClick={() => onCopyModelId(model.modelId)}
            className="p-1 hover:bg-(--card-hover) rounded transition-colors shrink-0"
            title="Copy model ID"
          >
            {copied ? (
              <Check className="h-3 w-3 text-(--success)" />
            ) : (
              <Copy className="h-3 w-3 text-(--muted-foreground)" />
            )}
          </button>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="px-2 py-1 bg-(--card) border border-(--border) rounded text-xs text-(--foreground)">
          {provider}
        </span>
      </td>
      <td className="px-4 py-3">
        {model.pipeline_tag ? (
          <span className="px-2 py-1 bg-(--card) border border-(--border) rounded text-xs text-(--muted-foreground)">
            {model.pipeline_tag}
          </span>
        ) : (
          <span className="text-xs text-(--muted-foreground)">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {quantizations.length > 0 ? (
            quantizations.map((quantization) => (
              <span
                key={quantization}
                className="px-2 py-1 bg-(--warning)/20 text-(--warning) border border-(--warning)/30 rounded text-xs font-medium"
              >
                {quantization}
              </span>
            ))
          ) : (
            <span className="text-xs text-(--muted-foreground)">—</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        {isLocal ? (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-(--success)/20 text-(--success) border border-(--success)/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Local
          </span>
        ) : (
          <span className="text-xs text-(--muted-foreground)">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-4 text-xs text-(--muted-foreground)">
          <div className="flex items-center gap-1" title="Downloads">
            <Download className="h-3.5 w-3.5" />
            <span>{formatNumber(model.downloads)}</span>
          </div>
          <div className="flex items-center gap-1" title="Likes">
            <Heart className="h-3.5 w-3.5" />
            <span>{formatNumber(model.likes)}</span>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <a
          href={`https://huggingface.co/${model.modelId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 hover:bg-(--card-hover) rounded transition-colors inline-block text-(--link) hover:text-(--link-hover)"
          title="View on Hugging Face"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </td>
      <td className="px-4 py-3 text-right">
        {isLocal ? (
          <span className="inline-flex items-center gap-1 text-xs text-(--success)">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Ready
          </span>
        ) : activeDownload ? (
          <div className="flex items-center justify-end gap-2">
            {activeDownload.status === "downloading" && (
              <button
                onClick={() => onPauseDownload(activeDownload.id)}
                className="p-1.5 rounded-lg border border-(--border) hover:bg-(--card-hover)"
                title="Pause download"
              >
                <Pause className="h-4 w-4" />
              </button>
            )}
            {(activeDownload.status === "paused" || activeDownload.status === "failed") && (
              <button
                onClick={() => onResumeDownload(activeDownload.id)}
                className="p-1.5 rounded-lg border border-(--border) hover:bg-(--card-hover)"
                title="Resume download"
              >
                <Play className="h-4 w-4" />
              </button>
            )}
            {activeDownload.status === "completed" && (
              <span className="text-xs text-(--success)">Downloaded</span>
            )}
            {(activeDownload.status === "downloading" || activeDownload.status === "queued") && (
              <span className="text-xs text-(--muted-foreground)">Downloading…</span>
            )}
          </div>
        ) : (
          <button
            onClick={() => onStartDownload({ model_id: model.modelId })}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-(--accent-purple) text-white text-xs font-medium hover:opacity-90"
          >
            <DownloadCloud className="h-3.5 w-3.5" />
            Download
          </button>
        )}
      </td>
    </tr>
  );
});
