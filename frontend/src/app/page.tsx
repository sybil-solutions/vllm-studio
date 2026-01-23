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
