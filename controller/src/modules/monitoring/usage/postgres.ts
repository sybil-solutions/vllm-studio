// CRITICAL
import { Client } from "pg";
import type { AppContext } from "../../../types/context";
import { calcChange, toNumber } from "./usage-utilities";

export const getUsageFromPostgres = async (
  context: AppContext
): Promise<Record<string, unknown> | null> => {
  const databaseUrl =
    context.config.litellm_database_url ??
    process.env["LITELLM_DATABASE_URL"] ??
    process.env["DATABASE_URL"];
  if (!databaseUrl) return null;

  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    const tableCheck = await client.query(
      `SELECT to_regclass('public."LiteLLM_SpendLogs"') as name`
    );
    if (!tableCheck.rows[0]?.name) {
      return null;
    }

    const totalsRow =
      (
        await client.query(`
      SELECT
        COALESCE(SUM(total_tokens), 0) as total_tokens,
        COALESCE(SUM(prompt_tokens), 0) as prompt_tokens,
        COALESCE(SUM(completion_tokens), 0) as completion_tokens,
        COUNT(*) as total_requests,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_requests,
        SUM(CASE WHEN status != 'success' OR status IS NULL THEN 1 ELSE 0 END) as failed_requests,
        COUNT(DISTINCT session_id) as unique_sessions
      FROM "LiteLLM_SpendLogs"
    `)
      ).rows[0] ?? null;

    if (!totalsRow || toNumber(totalsRow.total_requests) === 0) {
      return null;
    }

    const uniqueUsersRow = (
      await client.query(`
      SELECT COUNT(DISTINCT NULLIF(COALESCE(end_user, "user"), '')) as unique_users
      FROM "LiteLLM_SpendLogs"
    `)
    ).rows[0] ?? { unique_users: 0 };

    const latencyRow =
      (
        await client.query(`
      SELECT
        AVG(latency_ms) as avg_ms,
        MIN(latency_ms) as min_ms,
        MAX(latency_ms) as max_ms,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms) as p50_ms,
        percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_ms,
        percentile_cont(0.99) WITHIN GROUP (ORDER BY latency_ms) as p99_ms
      FROM (
        SELECT EXTRACT(EPOCH FROM ("endTime" - "startTime")) * 1000 as latency_ms
        FROM "LiteLLM_SpendLogs"
        WHERE status = 'success' AND "endTime" IS NOT NULL AND "startTime" IS NOT NULL
      ) s
    `)
      ).rows[0] ?? {};

    const ttftRow =
      (
        await client.query(`
      SELECT
        AVG(ttft_ms) as avg_ms,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY ttft_ms) as p50_ms,
        percentile_cont(0.95) WITHIN GROUP (ORDER BY ttft_ms) as p95_ms,
        percentile_cont(0.99) WITHIN GROUP (ORDER BY ttft_ms) as p99_ms
      FROM (
        SELECT EXTRACT(EPOCH FROM ("completionStartTime" - "startTime")) * 1000 as ttft_ms
        FROM "LiteLLM_SpendLogs"
        WHERE status = 'success'
          AND "completionStartTime" IS NOT NULL
          AND "startTime" IS NOT NULL
      ) s
    `)
      ).rows[0] ?? {};

    const tokenRow =
      (
        await client.query(`
      SELECT
        AVG(total_tokens) as avg_tokens,
        AVG(prompt_tokens) as avg_prompt,
        AVG(completion_tokens) as avg_completion,
        MAX(total_tokens) as max_tokens,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY total_tokens) as p50_tokens,
        percentile_cont(0.95) WITHIN GROUP (ORDER BY total_tokens) as p95_tokens
      FROM "LiteLLM_SpendLogs"
      WHERE status = 'success' AND total_tokens IS NOT NULL
    `)
      ).rows[0] ?? {};

    const cacheRows =
      (
        await client.query(`
      SELECT cache_hit, COUNT(*) as count, COALESCE(SUM(total_tokens), 0) as tokens
      FROM "LiteLLM_SpendLogs"
      GROUP BY cache_hit
    `)
      ).rows ?? [];

    const cache = { hits: 0, misses: 0, hit_tokens: 0, miss_tokens: 0, hit_rate: 0 };
    for (const row of cacheRows) {
      const value = String(row.cache_hit ?? "").toLowerCase();
      if (value === "true") {
        cache.hits = toNumber(row.count);
        cache.hit_tokens = toNumber(row.tokens);
      } else {
        cache.misses += toNumber(row.count);
        cache.miss_tokens += toNumber(row.tokens);
      }
    }
    const totalCache = cache.hits + cache.misses;
    if (totalCache > 0) {
      cache.hit_rate = Math.round((cache.hits / totalCache) * 10000) / 100;
    }

    const byModelRows =
      (
        await client.query(`
      SELECT
        model,
        COUNT(*) as requests,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
        COALESCE(SUM(total_tokens), 0) as total_tokens,
        COALESCE(SUM(prompt_tokens), 0) as prompt_tokens,
        COALESCE(SUM(completion_tokens), 0) as completion_tokens,
        AVG(CASE WHEN status = 'success' THEN total_tokens END) as avg_tokens,
        AVG(CASE WHEN status = 'success' THEN EXTRACT(EPOCH FROM ("endTime" - "startTime")) * 1000 END) as avg_latency_ms,
        AVG(CASE WHEN status = 'success' AND "completionStartTime" IS NOT NULL
          THEN EXTRACT(EPOCH FROM ("completionStartTime" - "startTime")) * 1000 END) as avg_ttft_ms
      FROM "LiteLLM_SpendLogs"
      WHERE model IS NOT NULL AND model != ''
      GROUP BY model
      ORDER BY total_tokens DESC
      LIMIT 25
    `)
      ).rows ?? [];

    const dailyRows =
      (
        await client.query(`
      SELECT
        DATE("startTime") as date,
        COUNT(*) as requests,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
        COALESCE(SUM(total_tokens), 0) as total_tokens,
        COALESCE(SUM(prompt_tokens), 0) as prompt_tokens,
        COALESCE(SUM(completion_tokens), 0) as completion_tokens,
        AVG(CASE WHEN status = 'success' THEN EXTRACT(EPOCH FROM ("endTime" - "startTime")) * 1000 END) as avg_latency_ms
      FROM "LiteLLM_SpendLogs"
      WHERE "startTime" >= NOW() - INTERVAL '14 days'
      GROUP BY DATE("startTime")
      ORDER BY date DESC
    `)
      ).rows ?? [];

    const dailyByModelRows =
      (
        await client.query(`
      SELECT
        DATE("startTime") as date,
        model,
        COUNT(*) as requests,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
        COALESCE(SUM(total_tokens), 0) as total_tokens,
        COALESCE(SUM(prompt_tokens), 0) as prompt_tokens,
        COALESCE(SUM(completion_tokens), 0) as completion_tokens
      FROM "LiteLLM_SpendLogs"
      WHERE "startTime" >= NOW() - INTERVAL '14 days'
        AND model IS NOT NULL
        AND model != ''
      GROUP BY DATE("startTime"), model
      ORDER BY date DESC
    `)
      ).rows ?? [];

    const hourlyRows =
      (
        await client.query(`
      SELECT
        EXTRACT(HOUR FROM "startTime")::int as hour,
        COUNT(*) as requests,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
        COALESCE(SUM(total_tokens), 0) as tokens
      FROM "LiteLLM_SpendLogs"
      WHERE "startTime" IS NOT NULL
      GROUP BY EXTRACT(HOUR FROM "startTime")
      ORDER BY hour
    `)
      ).rows ?? [];

    const wowRow =
      (
        await client.query(`
      SELECT
        SUM(CASE WHEN "startTime" >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) as this_week_requests,
        SUM(CASE WHEN "startTime" >= NOW() - INTERVAL '14 days' AND "startTime" < NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) as last_week_requests,
        SUM(CASE WHEN "startTime" >= NOW() - INTERVAL '7 days' AND status = 'success' THEN total_tokens ELSE 0 END) as this_week_tokens,
        SUM(CASE WHEN "startTime" >= NOW() - INTERVAL '14 days' AND "startTime" < NOW() - INTERVAL '7 days' AND status = 'success' THEN total_tokens ELSE 0 END) as last_week_tokens,
        SUM(CASE WHEN "startTime" >= NOW() - INTERVAL '7 days' AND status = 'success' THEN 1 ELSE 0 END) as this_week_successful,
        SUM(CASE WHEN "startTime" >= NOW() - INTERVAL '14 days' AND "startTime" < NOW() - INTERVAL '7 days' AND status = 'success' THEN 1 ELSE 0 END) as last_week_successful
      FROM "LiteLLM_SpendLogs"
    `)
      ).rows[0] ?? {};

    const peakDays =
      (
        await client.query(`
      SELECT
        DATE("startTime") as date,
        COUNT(*) as requests,
        COALESCE(SUM(total_tokens), 0) as tokens
      FROM "LiteLLM_SpendLogs"
      WHERE status = 'success'
      GROUP BY DATE("startTime")
      ORDER BY requests DESC
      LIMIT 5
    `)
      ).rows ?? [];

    const peakHours =
      (
        await client.query(`
      SELECT
        EXTRACT(HOUR FROM "startTime")::int as hour,
        COUNT(*) as requests
      FROM "LiteLLM_SpendLogs"
      WHERE "startTime" >= NOW() - INTERVAL '7 days'
      GROUP BY EXTRACT(HOUR FROM "startTime")
      ORDER BY requests DESC
      LIMIT 5
    `)
      ).rows ?? [];

    const recentRow =
      (
        await client.query(`
      SELECT
        SUM(CASE WHEN "startTime" >= NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END) as last_24h_requests,
        SUM(CASE WHEN "startTime" >= NOW() - INTERVAL '48 hours' AND "startTime" < NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END) as prev_24h_requests,
        SUM(CASE WHEN "startTime" >= NOW() - INTERVAL '24 hours' AND status = 'success' THEN total_tokens ELSE 0 END) as last_24h_tokens,
        SUM(CASE WHEN "startTime" >= NOW() - INTERVAL '1 hour' THEN 1 ELSE 0 END) as last_hour_requests
      FROM "LiteLLM_SpendLogs"
    `)
      ).rows[0] ?? {};

    const modelsFormatted = byModelRows.map((row) => {
      const avgLatencyMs = toNumber(row.avg_latency_ms);
      const completionTokens = toNumber(row.completion_tokens);
      const successful = toNumber(row.successful);
      let tokensPerSec: number | null = null;
      if (avgLatencyMs > 0 && successful > 0) {
        const avgCompletion = completionTokens / successful;
        tokensPerSec = avgCompletion
          ? Math.round((avgCompletion / (avgLatencyMs / 1000)) * 10) / 10
          : null;
      }
      return {
        model: String(row.model),
        requests: toNumber(row.requests),
        successful,
        success_rate: toNumber(row.requests)
          ? Math.round((successful / toNumber(row.requests)) * 1000) / 10
          : 0,
        total_tokens: toNumber(row.total_tokens),
        prompt_tokens: toNumber(row.prompt_tokens),
        completion_tokens: completionTokens,
        avg_tokens: Math.round(toNumber(row.avg_tokens)),
        avg_latency_ms: Math.round(avgLatencyMs),
        p50_latency_ms: Math.round(avgLatencyMs),
        avg_ttft_ms: Math.round(toNumber(row.avg_ttft_ms)),
        tokens_per_sec: tokensPerSec,
        prefill_tps: null,
        generation_tps: null,
      };
    });

    const totalRequests = toNumber(totalsRow.total_requests);
    const successRate = totalRequests
      ? Math.round((toNumber(totalsRow.successful_requests) / totalRequests) * 10000) / 100
      : 0;

    return {
      totals: {
        total_tokens: toNumber(totalsRow.total_tokens),
        prompt_tokens: toNumber(totalsRow.prompt_tokens),
        completion_tokens: toNumber(totalsRow.completion_tokens),
        total_requests: totalRequests,
        successful_requests: toNumber(totalsRow.successful_requests),
        failed_requests: toNumber(totalsRow.failed_requests),
        success_rate: successRate,
        unique_sessions: toNumber(totalsRow.unique_sessions),
        unique_users: toNumber(uniqueUsersRow.unique_users),
      },
      latency: {
        avg_ms: Math.round(toNumber(latencyRow.avg_ms)),
        p50_ms: Math.round(toNumber(latencyRow.p50_ms)),
        p95_ms: Math.round(toNumber(latencyRow.p95_ms)),
        p99_ms: Math.round(toNumber(latencyRow.p99_ms)),
        min_ms: Math.round(toNumber(latencyRow.min_ms)),
        max_ms: Math.round(toNumber(latencyRow.max_ms)),
      },
      ttft: {
        avg_ms: Math.round(toNumber(ttftRow.avg_ms)),
        p50_ms: Math.round(toNumber(ttftRow.p50_ms)),
        p95_ms: Math.round(toNumber(ttftRow.p95_ms)),
        p99_ms: Math.round(toNumber(ttftRow.p99_ms)),
      },
      tokens_per_request: {
        avg: Math.round(toNumber(tokenRow.avg_tokens)),
        avg_prompt: Math.round(toNumber(tokenRow.avg_prompt)),
        avg_completion: Math.round(toNumber(tokenRow.avg_completion)),
        max: toNumber(tokenRow.max_tokens),
        p50: Math.round(toNumber(tokenRow.p50_tokens)),
        p95: Math.round(toNumber(tokenRow.p95_tokens)),
      },
      cache,
      week_over_week: {
        this_week: {
          requests: toNumber(wowRow.this_week_requests),
          tokens: toNumber(wowRow.this_week_tokens),
          successful: toNumber(wowRow.this_week_successful),
        },
        last_week: {
          requests: toNumber(wowRow.last_week_requests),
          tokens: toNumber(wowRow.last_week_tokens),
          successful: toNumber(wowRow.last_week_successful),
        },
        change_pct: {
          requests: calcChange(
            toNumber(wowRow.this_week_requests),
            toNumber(wowRow.last_week_requests)
          ),
          tokens: calcChange(toNumber(wowRow.this_week_tokens), toNumber(wowRow.last_week_tokens)),
        },
      },
      recent_activity: {
        last_hour_requests: toNumber(recentRow.last_hour_requests),
        last_24h_requests: toNumber(recentRow.last_24h_requests),
        prev_24h_requests: toNumber(recentRow.prev_24h_requests),
        last_24h_tokens: toNumber(recentRow.last_24h_tokens),
        change_24h_pct: calcChange(
          toNumber(recentRow.last_24h_requests),
          toNumber(recentRow.prev_24h_requests)
        ),
      },
      peak_days: peakDays.map((row) => ({
        date: String(row.date),
        requests: toNumber(row.requests),
        tokens: toNumber(row.tokens),
      })),
      peak_hours: peakHours.map((row) => ({
        hour: toNumber(row.hour),
        requests: toNumber(row.requests),
      })),
      by_model: modelsFormatted,
      daily: dailyRows.map((row) => ({
        date: String(row.date),
        requests: toNumber(row.requests),
        successful: toNumber(row.successful),
        success_rate: toNumber(row.requests)
          ? Math.round((toNumber(row.successful) / toNumber(row.requests)) * 1000) / 10
          : 0,
        total_tokens: toNumber(row.total_tokens),
        prompt_tokens: toNumber(row.prompt_tokens),
        completion_tokens: toNumber(row.completion_tokens),
        avg_latency_ms: Math.round(toNumber(row.avg_latency_ms)),
      })),
      daily_by_model: dailyByModelRows.map((row) => ({
        date: String(row.date),
        model: String(row.model),
        requests: toNumber(row.requests),
        successful: toNumber(row.successful),
        success_rate: toNumber(row.requests)
          ? Math.round((toNumber(row.successful) / toNumber(row.requests)) * 1000) / 10
          : 0,
        total_tokens: toNumber(row.total_tokens),
        prompt_tokens: toNumber(row.prompt_tokens),
        completion_tokens: toNumber(row.completion_tokens),
      })),
      hourly_pattern: hourlyRows.map((row) => ({
        hour: toNumber(row.hour),
        requests: toNumber(row.requests),
        successful: toNumber(row.successful),
        tokens: toNumber(row.tokens),
      })),
    };
  } catch (error) {
    console.error("[Usage] Error fetching usage stats from Postgres:", error);
    return null;
  } finally {
    await client.end().catch(() => {});
  }
};
