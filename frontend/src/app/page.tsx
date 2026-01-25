"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useRealtimeStatus } from "@/hooks/use-realtime-status";
import type { RecipeWithStatus } from "@/lib/types";

import {
  DashboardHeader,
  DashboardMetrics,
  DashboardSidebar,
  LaunchToast,
  RecentLogsSection,
  QuickLaunchSection,
  GpuStatusSection,
} from "@/components/dashboard";

export default function Dashboard() {
  const {
    status: realtimeStatus,
    gpus: realtimeGpus,
    metrics: realtimeMetrics,
    launchProgress,
    isConnected,
    reconnectAttempts,
  } = useRealtimeStatus();

  const [recipes, setRecipes] = useState<RecipeWithStatus[]>([]);
  const [currentRecipe, setCurrentRecipe] = useState<RecipeWithStatus | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [benchmarking, setBenchmarking] = useState(false);
  const router = useRouter();

  const gpus = realtimeGpus.length > 0 ? realtimeGpus : [];
  const currentProcess = realtimeStatus?.process || null;
  const metrics = realtimeMetrics;
  const inferencePort = realtimeStatus?.inference_port;
  const modelLabel = currentRecipe?.name || currentProcess?.model_path?.split("/").pop();
  const launchStage = launchProgress?.stage;

  const loadRecipes = useCallback(async () => {
    try {
      const recipesData = await api.getRecipes();
      const recipesList = recipesData.recipes || [];
      setRecipes(recipesList);
      if (currentProcess) {
        const runningRecipe = recipesList.find((r: RecipeWithStatus) => r.status === "running");
        setCurrentRecipe(runningRecipe || null);
        if (runningRecipe) {
          const logsData = await api.getLogs(runningRecipe.id, 50).catch(() => ({ logs: [] }));
          setLogs(logsData.logs || []);
        }
      } else {
        setCurrentRecipe(null);
        setLogs([]);
      }
    } catch (e) {
      console.error("Failed to load recipes:", e);
    } finally {
      setLoading(false);
    }
  }, [currentProcess]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  useEffect(() => {
    if (
      launchProgress?.stage === "ready" ||
      launchProgress?.stage === "error" ||
      launchProgress?.stage === "cancelled"
    )
      loadRecipes();
  }, [launchProgress?.stage, loadRecipes]);

  const handleLaunch = async (recipeId: string) => {
    setLaunching(true);
    try {
      await api.switchModel(recipeId, true);
    } catch (e) {
      alert("Failed to launch: " + (e as Error).message);
    } finally {
      setLaunching(false);
    }
  };

  const handleStop = async () => {
    if (!confirm("Stop the current model?")) return;
    try {
      await api.evictModel(true);
      await loadRecipes();
    } catch (e) {
      alert("Failed to stop: " + (e as Error).message);
    }
  };

  const handleBenchmark = async () => {
    if (benchmarking) return;
    setBenchmarking(true);
    try {
      const result = await api.runBenchmark(1000, 100);
      if (result.error) alert("Benchmark error: " + result.error);
    } catch (e) {
      alert("Benchmark failed: " + (e as Error).message);
    } finally {
      setBenchmarking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-(--background)">
        <div className="text-(--muted-foreground) animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background text-foreground">
      {/* Connection Warning */}
      {!isConnected && (
        <div className="fixed top-4 right-4 z-50 px-3 py-1.5 text-xs text-(--muted-foreground) bg-(--card) border border-(--border)">
          Reconnecting... ({reconnectAttempts})
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-6 sm:py-8 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <DashboardHeader
          currentProcess={currentProcess}
          currentRecipe={currentRecipe}
          onNavigateChat={() => router.push("/chat")}
          onNavigateLogs={() => router.push("/logs")}
          onBenchmark={handleBenchmark}
          benchmarking={benchmarking}
          onStop={handleStop}
        />

        <section className="mb-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <OverviewCard
              label="Connection"
              value={isConnected ? "Live" : "Offline"}
              sub={isConnected ? "SSE streaming" : `Retry ${reconnectAttempts}`}
              tone={isConnected ? "success" : "muted"}
            />
            <OverviewCard
              label="Active Model"
              value={modelLabel || "Idle"}
              sub={currentProcess ? `${currentProcess.backend} · pid ${currentProcess.pid}` : "No process"}
              tone={currentProcess ? "accent" : "muted"}
            />
            <OverviewCard
              label="Recipes"
              value={recipes.length}
              sub="Available to launch"
              tone={recipes.length > 0 ? "default" : "muted"}
            />
            <OverviewCard
              label="GPU / Port"
              value={`${gpus.length} GPU`}
              sub={inferencePort ? `Port ${inferencePort}` : "Port --"}
              tone={gpus.length > 0 ? "default" : "muted"}
            />
          </div>
          {launchStage && launchStage !== "ready" && (
            <div className="mt-4 text-[10px] uppercase tracking-widest text-(--muted-foreground)/40">
              Launching: {launchStage}
            </div>
          )}
        </section>

        {currentProcess && <DashboardMetrics metrics={metrics} gpus={gpus} />}

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            <GpuStatusSection />
            <RecentLogsSection logs={logs} />
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <QuickLaunchSection
              recipes={recipes}
              launching={launching}
              onLaunch={handleLaunch}
              onNewRecipe={() => router.push("/recipes?new=1")}
              onViewAll={() => router.push("/recipes")}
            />
            <DashboardSidebar metrics={metrics} />
          </div>
        </div>
      </div>

      <LaunchToast launching={launching} launchProgress={launchProgress} />
    </div>
  );
}

function OverviewCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "accent" | "success" | "muted";
}) {
  const toneClass =
    tone === "success"
      ? "text-(--success)/80"
      : tone === "accent"
        ? "text-(--foreground)"
        : tone === "muted"
          ? "text-(--muted-foreground)/60"
          : "text-(--foreground)/80";

  return (
    <div className="rounded-lg border border-(--border)/20 bg-(--card)/30 px-4 py-3">
      <div className="text-[10px] uppercase tracking-widest text-(--muted-foreground)/50">
        {label}
      </div>
      <div className={`mt-2 text-lg font-light tracking-tight ${toneClass}`}>{value}</div>
      {sub && <div className="mt-1 text-[10px] text-(--muted-foreground)/40">{sub}</div>}
    </div>
  );
}
