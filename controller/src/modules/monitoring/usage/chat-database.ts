// CRITICAL
import Database from "bun:sqlite";
import { resolve } from "node:path";
import { calcChange } from "./usage-utilities";

export const getUsageFromChatDatabase = (dataDirectory: string): Record<string, unknown> | null => {
  let db: Database | null = null;
  try {
    const chatDatabasePath = resolve(dataDirectory, "chats.db");
    db = new Database(chatDatabasePath, { readonly: true });
    const tableCheck = db
      .query<{ name: string }, []>(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='chat_messages'`,
      )
      .get();
    if (!tableCheck) return null;

    const totals =
      db
        .query<{
          total_requests: number;
          prompt_tokens: number;
          completion_tokens: number;
          unique_sessions: number;
        }, []>(`
      SELECT
        SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) as total_requests,
        COALESCE(SUM(CASE WHEN role = 'assistant' THEN
          CASE WHEN request_total_input_tokens > 0 THEN request_total_input_tokens ELSE COALESCE(request_prompt_tokens, 0) END
        ELSE 0 END), 0) as prompt_tokens,
        COALESCE(SUM(CASE WHEN role = 'assistant' THEN COALESCE(request_completion_tokens, 0) ELSE 0 END), 0) as completion_tokens,
        COUNT(DISTINCT session_id) as unique_sessions
      FROM chat_messages
    `)
        .get() ?? { total_requests: 0, prompt_tokens: 0, completion_tokens: 0, unique_sessions: 0 };

    if (totals.total_requests === 0) {
      return null;
    }

    const byModel =
      db
        .query<{
          model: string;
          requests: number;
          total_tokens: number;
          prompt_tokens: number;
          completion_tokens: number;
          avg_tokens: number;
        }, []>(`
      SELECT
        COALESCE(model, '') as model,
        COUNT(*) as requests,
        COALESCE(SUM(CASE WHEN request_total_input_tokens > 0 THEN request_total_input_tokens ELSE COALESCE(request_prompt_tokens, 0) END), 0) as prompt_tokens,
        COALESCE(SUM(COALESCE(request_completion_tokens, 0)), 0) as completion_tokens,
        COALESCE(SUM(COALESCE(request_completion_tokens, 0)), 0) + COALESCE(SUM(CASE WHEN request_total_input_tokens > 0 THEN request_total_input_tokens ELSE COALESCE(request_prompt_tokens, 0) END), 0) as total_tokens,
        AVG(COALESCE(request_completion_tokens, 0) + COALESCE(request_total_input_tokens, request_prompt_tokens, 0)) as avg_tokens
      FROM chat_messages
      WHERE role = 'assistant'
      GROUP BY model
      ORDER BY total_tokens DESC
      LIMIT 25
    `)
        .all() ?? [];

    const daily =
      db
        .query<{
          date: string;
          requests: number;
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
        }, []>(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as requests,
        COALESCE(SUM(CASE WHEN request_total_input_tokens > 0 THEN request_total_input_tokens ELSE COALESCE(request_prompt_tokens, 0) END), 0) as prompt_tokens,
        COALESCE(SUM(COALESCE(request_completion_tokens, 0)), 0) as completion_tokens,
        COALESCE(SUM(COALESCE(request_completion_tokens, 0)), 0) + COALESCE(SUM(CASE WHEN request_total_input_tokens > 0 THEN request_total_input_tokens ELSE COALESCE(request_prompt_tokens, 0) END), 0) as total_tokens
      FROM chat_messages
      WHERE role = 'assistant' AND DATE(created_at) >= DATE('now', '-14 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `)
        .all() ?? [];

    const dailyByModel =
      db
        .query<{
          date: string;
          model: string;
          requests: number;
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
        }, []>(`
      SELECT
        DATE(created_at) as date,
        COALESCE(model, '') as model,
        COUNT(*) as requests,
        COALESCE(SUM(CASE WHEN request_total_input_tokens > 0 THEN request_total_input_tokens ELSE COALESCE(request_prompt_tokens, 0) END), 0) as prompt_tokens,
        COALESCE(SUM(COALESCE(request_completion_tokens, 0)), 0) as completion_tokens,
        COALESCE(SUM(COALESCE(request_completion_tokens, 0)), 0) + COALESCE(SUM(CASE WHEN request_total_input_tokens > 0 THEN request_total_input_tokens ELSE COALESCE(request_prompt_tokens, 0) END), 0) as total_tokens
      FROM chat_messages
      WHERE role = 'assistant' AND DATE(created_at) >= DATE('now', '-14 days')
      GROUP BY DATE(created_at), model
      ORDER BY date DESC
    `)
        .all() ?? [];

    const hourly =
      db
        .query<{
          hour: number;
          requests: number;
          tokens: number;
        }, []>(`
      SELECT
        CAST(strftime('%H', created_at) AS INTEGER) as hour,
        COUNT(*) as requests,
        COALESCE(SUM(COALESCE(request_completion_tokens, 0) + COALESCE(request_total_input_tokens, request_prompt_tokens, 0)), 0) as tokens
      FROM chat_messages
      WHERE role = 'assistant'
      GROUP BY strftime('%H', created_at)
      ORDER BY hour
    `)
        .all() ?? [];

    const peakDays =
      db
        .query<{
          date: string;
          requests: number;
          tokens: number;
        }, []>(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as requests,
        COALESCE(SUM(COALESCE(request_completion_tokens, 0) + COALESCE(request_total_input_tokens, request_prompt_tokens, 0)), 0) as tokens
      FROM chat_messages
      WHERE role = 'assistant'
      GROUP BY DATE(created_at)
      ORDER BY requests DESC
      LIMIT 5
    `)
        .all() ?? [];

    const peakHours =
      db
        .query<{
          hour: number;
          requests: number;
        }, []>(`
      SELECT
        CAST(strftime('%H', created_at) AS INTEGER) as hour,
        COUNT(*) as requests
      FROM chat_messages
      WHERE role = 'assistant' AND DATE(created_at) >= DATE('now', '-7 days')
      GROUP BY strftime('%H', created_at)
      ORDER BY requests DESC
      LIMIT 5
    `)
        .all() ?? [];

    const recent =
      db
        .query<{
          last_24h_requests: number;
          prev_24h_requests: number;
          last_24h_tokens: number;
          last_hour_requests: number;
        }, []>(`
      SELECT
        SUM(CASE WHEN datetime(created_at) >= datetime('now', '-24 hours') THEN 1 ELSE 0 END) as last_24h_requests,
        SUM(CASE WHEN datetime(created_at) >= datetime('now', '-48 hours') AND datetime(created_at) < datetime('now', '-24 hours') THEN 1 ELSE 0 END) as prev_24h_requests,
        SUM(CASE WHEN datetime(created_at) >= datetime('now', '-24 hours')
          THEN COALESCE(request_completion_tokens, 0) + COALESCE(request_total_input_tokens, request_prompt_tokens, 0)
          ELSE 0 END) as last_24h_tokens,
        SUM(CASE WHEN datetime(created_at) >= datetime('now', '-1 hour') THEN 1 ELSE 0 END) as last_hour_requests
      FROM chat_messages
      WHERE role = 'assistant'
    `)
        .get() ?? { last_24h_requests: 0, prev_24h_requests: 0, last_24h_tokens: 0, last_hour_requests: 0 };

    const totalTokens = totals.prompt_tokens + totals.completion_tokens;
    const avgTokens = totals.total_requests ? Math.round(totalTokens / totals.total_requests) : 0;
    const avgPrompt = totals.total_requests ? Math.round(totals.prompt_tokens / totals.total_requests) : 0;
    const avgCompletion = totals.total_requests
      ? Math.round(totals.completion_tokens / totals.total_requests)
      : 0;

    return {
      totals: {
        total_tokens: totalTokens,
        prompt_tokens: totals.prompt_tokens,
        completion_tokens: totals.completion_tokens,
        total_requests: totals.total_requests,
        successful_requests: totals.total_requests,
        failed_requests: 0,
        success_rate: totals.total_requests ? 100 : 0,
        unique_sessions: totals.unique_sessions,
        unique_users: 0,
      },
      latency: {
        avg_ms: 0,
        p50_ms: 0,
        p95_ms: 0,
        p99_ms: 0,
        min_ms: 0,
        max_ms: 0,
      },
      ttft: { avg_ms: 0, p50_ms: 0, p95_ms: 0, p99_ms: 0 },
      tokens_per_request: {
        avg: avgTokens,
        avg_prompt: avgPrompt,
        avg_completion: avgCompletion,
        max: 0,
        p50: 0,
        p95: 0,
      },
      cache: { hits: 0, misses: 0, hit_tokens: 0, miss_tokens: 0, hit_rate: 0 },
      week_over_week: {
        this_week: { requests: 0, tokens: 0, successful: 0 },
        last_week: { requests: 0, tokens: 0, successful: 0 },
        change_pct: { requests: null, tokens: null },
      },
      recent_activity: {
        last_hour_requests: recent.last_hour_requests,
        last_24h_requests: recent.last_24h_requests,
        prev_24h_requests: recent.prev_24h_requests,
        last_24h_tokens: recent.last_24h_tokens,
        change_24h_pct: calcChange(recent.last_24h_requests, recent.prev_24h_requests),
      },
      peak_days: peakDays.map((row) => ({
        date: row.date,
        requests: row.requests,
        tokens: row.tokens,
      })),
      peak_hours: peakHours.map((row) => ({
        hour: row.hour,
        requests: row.requests,
      })),
      by_model: byModel.map((row) => ({
        model: row.model || "unknown",
        requests: row.requests,
        successful: row.requests,
        success_rate: row.requests ? 100 : 0,
        total_tokens: row.total_tokens,
        prompt_tokens: row.prompt_tokens,
        completion_tokens: row.completion_tokens,
        avg_tokens: Math.round(row.avg_tokens ?? 0),
        avg_latency_ms: 0,
        p50_latency_ms: 0,
        avg_ttft_ms: 0,
        tokens_per_sec: null,
        prefill_tps: null,
        generation_tps: null,
      })),
      daily: daily.map((row) => ({
        date: row.date,
        requests: row.requests,
        successful: row.requests,
        success_rate: row.requests ? 100 : 0,
        total_tokens: row.total_tokens,
        prompt_tokens: row.prompt_tokens,
        completion_tokens: row.completion_tokens,
        avg_latency_ms: 0,
      })),
      daily_by_model: dailyByModel.map((row) => ({
        date: row.date,
        model: row.model || "unknown",
        requests: row.requests,
        successful: row.requests,
        success_rate: row.requests ? 100 : 0,
        total_tokens: row.total_tokens,
        prompt_tokens: row.prompt_tokens,
        completion_tokens: row.completion_tokens,
      })),
      hourly_pattern: hourly.map((row) => ({
        hour: row.hour,
        requests: row.requests,
        successful: row.requests,
        tokens: row.tokens,
      })),
    };
  } catch (error) {
    console.error("[Usage] Error fetching usage stats from chats DB:", error);
    return null;
  } finally {
    if (db) db.close();
  }
};
