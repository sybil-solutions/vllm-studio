import type { Hono } from "hono";
import { Client } from "pg";
import type { AppContext } from "../types/context";
import { HttpStatus } from "../core/errors";

type UsageRow = Record<string, unknown>;

/**
 * Register usage analytics routes.
 * @param app - Hono app.
 * @param _context - App context.
 */
export const registerUsageRoutes = (app: Hono, _context: AppContext): void => {
  /**
   * Convert numeric-like values to numbers.
   * @param value - Raw value.
   * @returns Numeric value or null.
   */
  const toNumber = (value: unknown): number | null => {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
  };

  /**
   * Calculate percentage change.
   * @param current - Current value.
   * @param previous - Previous value.
   * @returns Change percent or null.
   */
  const calcChange = (current: number | null, previous: number | null): number | null => {
    if (!previous || previous === 0 || current === null) {
      return null;
    }
    return Math.round(((current - previous) / previous) * 1000) / 10;
  };

  app.get("/usage", async (ctx) => {
    const dbUrl = "postgresql://postgres:postgres@127.0.0.1:5432/litellm";
    const client = new Client({ connectionString: dbUrl });
    try {
      await client.connect();

      const totals = await client.query<UsageRow>(`
        SELECT
          COALESCE(SUM(total_tokens), 0) as total_tokens,
          COALESCE(SUM(prompt_tokens), 0) as prompt_tokens,
          COALESCE(SUM(completion_tokens), 0) as completion_tokens,
          COUNT(*) as total_requests,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_requests,
          SUM(CASE WHEN status = 'failure' THEN 1 ELSE 0 END) as failed_requests,
          COUNT(DISTINCT session_id) as unique_sessions,
          COUNT(DISTINCT "user") as unique_users
        FROM "LiteLLM_SpendLogs"
      `);

      const latencyStats = await client.query<UsageRow>(`
        SELECT
          AVG(EXTRACT(EPOCH FROM ("endTime" - "startTime")) * 1000) as avg_latency_ms,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM ("endTime" - "startTime")) * 1000) as p50_latency_ms,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM ("endTime" - "startTime")) * 1000) as p95_latency_ms,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM ("endTime" - "startTime")) * 1000) as p99_latency_ms,
          MIN(EXTRACT(EPOCH FROM ("endTime" - "startTime")) * 1000) as min_latency_ms,
          MAX(EXTRACT(EPOCH FROM ("endTime" - "startTime")) * 1000) as max_latency_ms
        FROM "LiteLLM_SpendLogs"
        WHERE status = 'success' AND "endTime" IS NOT NULL AND "startTime" IS NOT NULL
      `);

      const ttftStats = await client.query<UsageRow>(`
        SELECT
          AVG(EXTRACT(EPOCH FROM ("completionStartTime" - "startTime")) * 1000) as avg_ttft_ms,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM ("completionStartTime" - "startTime")) * 1000) as p50_ttft_ms,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM ("completionStartTime" - "startTime")) * 1000) as p95_ttft_ms,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM ("completionStartTime" - "startTime")) * 1000) as p99_ttft_ms
        FROM "LiteLLM_SpendLogs"
        WHERE status = 'success' AND "completionStartTime" IS NOT NULL AND "startTime" IS NOT NULL
      `);

      const tokenStats = await client.query<UsageRow>(`
        SELECT
          AVG(total_tokens) as avg_tokens_per_request,
          AVG(prompt_tokens) as avg_prompt_tokens,
          AVG(completion_tokens) as avg_completion_tokens,
          MAX(total_tokens) as max_tokens_single_request,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_tokens) as p50_tokens,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_tokens) as p95_tokens
        FROM "LiteLLM_SpendLogs"
        WHERE status = 'success' AND total_tokens IS NOT NULL
      `);

      const cacheStats = await client.query<UsageRow>(`
        SELECT
          cache_hit,
          COUNT(*) as count,
          COALESCE(SUM(total_tokens), 0) as tokens
        FROM "LiteLLM_SpendLogs"
        GROUP BY cache_hit
      `);

      const byModel = await client.query<UsageRow>(`
        SELECT
          model,
          COUNT(*) as requests,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
          COALESCE(SUM(total_tokens), 0) as total_tokens,
          COALESCE(SUM(prompt_tokens), 0) as prompt_tokens,
          COALESCE(SUM(completion_tokens), 0) as completion_tokens,
          AVG(CASE WHEN status = 'success' THEN total_tokens END) as avg_tokens,
          AVG(CASE WHEN status = 'success' THEN EXTRACT(EPOCH FROM ("endTime" - "startTime")) END) as avg_latency_sec,
          AVG(CASE WHEN status = 'success' THEN EXTRACT(EPOCH FROM ("completionStartTime" - "startTime")) END) as avg_ttft_sec,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY CASE WHEN status = 'success' THEN EXTRACT(EPOCH FROM ("endTime" - "startTime")) END) as p50_latency_sec
        FROM "LiteLLM_SpendLogs"
        WHERE model != '' AND model IS NOT NULL
        GROUP BY model
        ORDER BY total_tokens DESC
        LIMIT 25
      `);

      const daily = await client.query<UsageRow>(`
        SELECT
          DATE("startTime") as date,
          COUNT(*) as requests,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
          COALESCE(SUM(total_tokens), 0) as total_tokens,
          COALESCE(SUM(prompt_tokens), 0) as prompt_tokens,
          COALESCE(SUM(completion_tokens), 0) as completion_tokens,
          AVG(CASE WHEN status = 'success' THEN EXTRACT(EPOCH FROM ("endTime" - "startTime")) * 1000 END) as avg_latency_ms
        FROM "LiteLLM_SpendLogs"
        WHERE "startTime" >= CURRENT_DATE - INTERVAL '14 days'
        GROUP BY DATE("startTime")
        ORDER BY date DESC
      `);

      const hourly = await client.query<UsageRow>(`
        SELECT
          EXTRACT(HOUR FROM "startTime")::int as hour,
          COUNT(*) as requests,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
          COALESCE(SUM(total_tokens), 0) as total_tokens
        FROM "LiteLLM_SpendLogs"
        WHERE "startTime" IS NOT NULL
        GROUP BY EXTRACT(HOUR FROM "startTime")
        ORDER BY hour
      `);

      const wow = await client.query<UsageRow>(`
        SELECT
          SUM(CASE WHEN "startTime" >= CURRENT_DATE - INTERVAL '7 days' THEN 1 ELSE 0 END) as this_week_requests,
          SUM(CASE WHEN "startTime" >= CURRENT_DATE - INTERVAL '14 days' AND "startTime" < CURRENT_DATE - INTERVAL '7 days' THEN 1 ELSE 0 END) as last_week_requests,
          SUM(CASE WHEN "startTime" >= CURRENT_DATE - INTERVAL '7 days' AND status = 'success' THEN total_tokens ELSE 0 END) as this_week_tokens,
          SUM(CASE WHEN "startTime" >= CURRENT_DATE - INTERVAL '14 days' AND "startTime" < CURRENT_DATE - INTERVAL '7 days' AND status = 'success' THEN total_tokens ELSE 0 END) as last_week_tokens,
          SUM(CASE WHEN "startTime" >= CURRENT_DATE - INTERVAL '7 days' AND status = 'success' THEN 1 ELSE 0 END) as this_week_successful,
          SUM(CASE WHEN "startTime" >= CURRENT_DATE - INTERVAL '14 days' AND "startTime" < CURRENT_DATE - INTERVAL '7 days' AND status = 'success' THEN 1 ELSE 0 END) as last_week_successful
        FROM "LiteLLM_SpendLogs"
      `);

      const peakDays = await client.query<UsageRow>(`
        SELECT
          DATE("startTime") as date,
          COUNT(*) as requests,
          COALESCE(SUM(total_tokens), 0) as tokens
        FROM "LiteLLM_SpendLogs"
        WHERE status = 'success'
        GROUP BY DATE("startTime")
        ORDER BY requests DESC
        LIMIT 5
      `);

      const peakHours = await client.query<UsageRow>(`
        SELECT
          EXTRACT(HOUR FROM "startTime")::int as hour,
          COUNT(*) as requests
        FROM "LiteLLM_SpendLogs"
        WHERE "startTime" >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY EXTRACT(HOUR FROM "startTime")
        ORDER BY requests DESC
        LIMIT 5
      `);

      const recent = await client.query<UsageRow>(`
        SELECT
          SUM(CASE WHEN "startTime" >= NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END) as last_24h_requests,
          SUM(CASE WHEN "startTime" >= NOW() - INTERVAL '48 hours' AND "startTime" < NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END) as prev_24h_requests,
          SUM(CASE WHEN "startTime" >= NOW() - INTERVAL '24 hours' AND status = 'success' THEN total_tokens ELSE 0 END) as last_24h_tokens,
          SUM(CASE WHEN "startTime" >= NOW() - INTERVAL '1 hour' THEN 1 ELSE 0 END) as last_hour_requests
        FROM "LiteLLM_SpendLogs"
      `);

      const totalsRow = (totals.rows[0] ?? {}) as UsageRow;
      const latencyRow = (latencyStats.rows[0] ?? {}) as UsageRow;
      const ttftRow = (ttftStats.rows[0] ?? {}) as UsageRow;
      const tokenRow = (tokenStats.rows[0] ?? {}) as UsageRow;
      const wowRow = (wow.rows[0] ?? {}) as UsageRow;
      const recentRow = (recent.rows[0] ?? {}) as UsageRow;

      const cacheFormatted = { hits: 0, misses: 0, hit_tokens: 0, miss_tokens: 0, hit_rate: 0 };
      for (const row of cacheStats.rows) {
        if (row["cache_hit"] === "True") {
          cacheFormatted.hits = Number(row["count"] ?? 0);
          cacheFormatted.hit_tokens = Number(row["tokens"] ?? 0);
        } else if (row["cache_hit"] === "False") {
          cacheFormatted.misses = Number(row["count"] ?? 0);
          cacheFormatted.miss_tokens = Number(row["tokens"] ?? 0);
        }
      }
      const totalCache = cacheFormatted.hits + cacheFormatted.misses;
      if (totalCache > 0) {
        cacheFormatted.hit_rate = Math.round((cacheFormatted.hits / totalCache) * 10000) / 100;
      }

      const wowData = {
        this_week: {
          requests: Number(wowRow["this_week_requests"] ?? 0),
          tokens: Number(wowRow["this_week_tokens"] ?? 0),
          successful: Number(wowRow["this_week_successful"] ?? 0),
        },
        last_week: {
          requests: Number(wowRow["last_week_requests"] ?? 0),
          tokens: Number(wowRow["last_week_tokens"] ?? 0),
          successful: Number(wowRow["last_week_successful"] ?? 0),
        },
        change_pct: {
          requests: calcChange(toNumber(wowRow["this_week_requests"]), toNumber(wowRow["last_week_requests"])),
          tokens: calcChange(toNumber(wowRow["this_week_tokens"]), toNumber(wowRow["last_week_tokens"])),
        },
      };

      const modelsFormatted = byModel.rows.map((row) => {
        const avgLatency = toNumber(row["avg_latency_sec"]);
        const completionTokens = Number(row["completion_tokens"] ?? 0);
        let tokensPerSec: number | null = null;
        if (avgLatency && Number(row["successful"] ?? 0) > 0) {
          const avgCompletion = completionTokens / Number(row["successful"] ?? 1);
          tokensPerSec = avgCompletion ? Math.round((avgCompletion / avgLatency) * 10) / 10 : null;
        }
        return {
          model: row["model"],
          requests: Number(row["requests"] ?? 0),
          successful: Number(row["successful"] ?? 0),
          success_rate: Number(row["requests"] ?? 0)
            ? Math.round((Number(row["successful"] ?? 0) / Number(row["requests"] ?? 1)) * 1000) / 10
            : 0,
          total_tokens: Number(row["total_tokens"] ?? 0),
          prompt_tokens: Number(row["prompt_tokens"] ?? 0),
          completion_tokens: completionTokens,
          avg_tokens: Math.round(toNumber(row["avg_tokens"]) ?? 0),
          avg_latency_ms: Math.round((toNumber(row["avg_latency_sec"]) ?? 0) * 1000),
          p50_latency_ms: Math.round((toNumber(row["p50_latency_sec"]) ?? 0) * 1000),
          avg_ttft_ms: Math.round((toNumber(row["avg_ttft_sec"]) ?? 0) * 1000),
          tokens_per_sec: tokensPerSec,
        };
      });

      const successRate = Number(totalsRow["total_requests"] ?? 0)
        ? Math.round((Number(totalsRow["successful_requests"] ?? 0) / Number(totalsRow["total_requests"] ?? 1)) * 10000) / 100
        : 0;

      return ctx.json({
        totals: {
          total_tokens: Number(totalsRow["total_tokens"] ?? 0),
          prompt_tokens: Number(totalsRow["prompt_tokens"] ?? 0),
          completion_tokens: Number(totalsRow["completion_tokens"] ?? 0),
          total_requests: Number(totalsRow["total_requests"] ?? 0),
          successful_requests: Number(totalsRow["successful_requests"] ?? 0),
          failed_requests: Number(totalsRow["failed_requests"] ?? 0),
          success_rate: successRate,
          unique_sessions: Number(totalsRow["unique_sessions"] ?? 0),
          unique_users: Number(totalsRow["unique_users"] ?? 0),
        },
        latency: {
          avg_ms: Math.round(toNumber(latencyRow["avg_latency_ms"]) ?? 0),
          p50_ms: Math.round(toNumber(latencyRow["p50_latency_ms"]) ?? 0),
          p95_ms: Math.round(toNumber(latencyRow["p95_latency_ms"]) ?? 0),
          p99_ms: Math.round(toNumber(latencyRow["p99_latency_ms"]) ?? 0),
          min_ms: Math.round(toNumber(latencyRow["min_latency_ms"]) ?? 0),
          max_ms: Math.round(toNumber(latencyRow["max_latency_ms"]) ?? 0),
        },
        ttft: {
          avg_ms: Math.round(toNumber(ttftRow["avg_ttft_ms"]) ?? 0),
          p50_ms: Math.round(toNumber(ttftRow["p50_ttft_ms"]) ?? 0),
          p95_ms: Math.round(toNumber(ttftRow["p95_ttft_ms"]) ?? 0),
          p99_ms: Math.round(toNumber(ttftRow["p99_ttft_ms"]) ?? 0),
        },
        tokens_per_request: {
          avg: Math.round(toNumber(tokenRow["avg_tokens_per_request"]) ?? 0),
          avg_prompt: Math.round(toNumber(tokenRow["avg_prompt_tokens"]) ?? 0),
          avg_completion: Math.round(toNumber(tokenRow["avg_completion_tokens"]) ?? 0),
          max: Number(tokenRow["max_tokens_single_request"] ?? 0),
          p50: Math.round(toNumber(tokenRow["p50_tokens"]) ?? 0),
          p95: Math.round(toNumber(tokenRow["p95_tokens"]) ?? 0),
        },
        cache: cacheFormatted,
        week_over_week: wowData,
        recent_activity: {
          last_hour_requests: Number(recentRow["last_hour_requests"] ?? 0),
          last_24h_requests: Number(recentRow["last_24h_requests"] ?? 0),
          prev_24h_requests: Number(recentRow["prev_24h_requests"] ?? 0),
          last_24h_tokens: Number(recentRow["last_24h_tokens"] ?? 0),
          change_24h_pct: calcChange(toNumber(recentRow["last_24h_requests"]), toNumber(recentRow["prev_24h_requests"])),
        },
        peak_days: peakDays.rows.map((row) => ({
          date: (row["date"] as { toISOString?: () => string } | undefined)?.toISOString?.() ?? String(row["date"]),
          requests: Number(row["requests"] ?? 0),
          tokens: Number(row["tokens"] ?? 0),
        })),
        peak_hours: peakHours.rows.map((row) => ({
          hour: Number(row["hour"] ?? 0),
          requests: Number(row["requests"] ?? 0),
        })),
        by_model: modelsFormatted,
        daily: daily.rows.map((row) => ({
          date: (row["date"] as { toISOString?: () => string } | undefined)?.toISOString?.() ?? String(row["date"]),
          requests: Number(row["requests"] ?? 0),
          successful: Number(row["successful"] ?? 0),
          success_rate: Number(row["requests"] ?? 0)
            ? Math.round((Number(row["successful"] ?? 0) / Number(row["requests"] ?? 1)) * 1000) / 10
            : 0,
          total_tokens: Number(row["total_tokens"] ?? 0),
          prompt_tokens: Number(row["prompt_tokens"] ?? 0),
          completion_tokens: Number(row["completion_tokens"] ?? 0),
          avg_latency_ms: Math.round(toNumber(row["avg_latency_ms"]) ?? 0),
        })),
        hourly_pattern: hourly.rows.map((row) => ({
          hour: Number(row["hour"] ?? 0),
          requests: Number(row["requests"] ?? 0),
          successful: Number(row["successful"] ?? 0),
          tokens: Number(row["total_tokens"] ?? 0),
        })),
      });
    } catch (error) {
      throw new HttpStatus(500, String(error));
    } finally {
      await client.end();
    }
  });
};
