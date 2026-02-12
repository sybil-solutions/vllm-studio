import type { GPU, LaunchProgress, Metrics, ProcessInfo, RecipeWithStatus } from "@/lib/types";

export interface DashboardLayoutProps {
  currentProcess: ProcessInfo | null;
  currentRecipe: RecipeWithStatus | null;
  metrics: Metrics | null;
  gpus: GPU[];
  recipes: RecipeWithStatus[];
  logs: string[];
  launching: boolean;
  benchmarking: boolean;
  launchProgress: LaunchProgress | null;
  isConnected: boolean;
  reconnectAttempts: number;
  inferencePort?: number;
  onNavigateChat: () => void;
  onNavigateLogs: () => void;
  onBenchmark: () => void;
  onStop: () => void;
  onLaunch: (recipeId: string) => Promise<void>;
  onNewRecipe: () => void;
  onViewAll: () => void;
}
