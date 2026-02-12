// CRITICAL
/**
 * Usage analytics types.
 */

export interface UsageStats {
  totals: {
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    success_rate: number;
    unique_sessions: number;
    unique_users: number;
  };
  latency: {
    avg_ms: number;
    p50_ms: number;
    p95_ms: number;
    p99_ms: number;
    min_ms: number;
    max_ms: number;
  };
  ttft: {
    avg_ms: number;
    p50_ms: number;
    p95_ms: number;
    p99_ms: number;
  };
  tokens_per_request: {
    avg: number;
    avg_prompt: number;
    avg_completion: number;
    max: number;
    p50: number;
    p95: number;
  };
  cache: {
    hits: number;
    misses: number;
    hit_tokens: number;
    miss_tokens: number;
    hit_rate: number;
  };
  week_over_week: {
    this_week: {
      requests: number;
      tokens: number;
      successful: number;
    };
    last_week: {
      requests: number;
      tokens: number;
      successful: number;
    };
    change_pct: {
      requests: number | null;
      tokens: number | null;
    };
  };
  recent_activity: {
    last_hour_requests: number;
    last_24h_requests: number;
    prev_24h_requests: number;
    last_24h_tokens: number;
    change_24h_pct: number | null;
  };
  peak_days: Array<{
    date: string;
    requests: number;
    tokens: number;
  }>;
  peak_hours: Array<{
    hour: number;
    requests: number;
  }>;
  by_model: Array<{
    model: string;
    requests: number;
    successful: number;
    success_rate: number;
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
    avg_tokens: number;
    avg_latency_ms: number;
    p50_latency_ms: number;
    avg_ttft_ms: number;
    tokens_per_sec: number | null;
    prefill_tps: number | null;
    generation_tps: number | null;
  }>;
  daily: Array<{
    date: string;
    requests: number;
    successful: number;
    success_rate: number;
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
    avg_latency_ms: number;
  }>;
  daily_by_model?: Array<{
    date: string;
    model: string;
    requests: number;
    successful: number;
    success_rate: number;
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
  }>;
  hourly_pattern: Array<{
    hour: number;
    requests: number;
    successful: number;
    tokens: number;
  }>;
}

export type SortField = "model" | "requests" | "tokens" | "success" | "latency" | "ttft" | "speed";
export type SortDirection = "asc" | "desc";

