// CRITICAL
"use client";

import { formatNumber } from "@/lib/formatters";
import { Hash, Database, Clock } from "lucide-react";

interface TokensPerRequestStats {
  avg: number;
  avg_prompt: number;
  avg_completion: number;
  p50: number;
  p95: number;
}

interface CacheStats {
  hit_rate: number;
  hits: number;
  misses: number;
  hit_tokens: number;
  miss_tokens: number;
}

interface HourlyPatternData {
  hour: number;
  requests: number;
}

interface SecondaryMetricsStats {
  tokens_per_request: TokensPerRequestStats;
  cache: CacheStats;
  hourly_pattern: HourlyPatternData[];
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-(--surface) rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-(--border) text-(--dim)">
        <Icon className="h-4 w-4" />
        <span className="text-xs uppercase tracking-wider">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function SecondaryMetrics(stats: SecondaryMetricsStats) {
  const maxHourlyRequests = Math.max(...stats.hourly_pattern.map((h: HourlyPatternData) => h.requests), 1);
  const peakHour = stats.hourly_pattern.reduce((max, h) => h.requests > max.requests ? h : max, stats.hourly_pattern[0]);

  return (
    <div className="space-y-4">
      {/* Tokens per Request */}
      <SectionCard title="Tokens per Request" icon={Hash}>
        <div className="space-y-3">
          <div>
            <div className="text-xs text-(--dim) mb-1">Average</div>
            <div className="text-xl font-medium tabular-nums">
              {formatNumber(stats.tokens_per_request.avg)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-(--dim) mb-1">Prompt</div>
              <div className="text-base tabular-nums">
                {formatNumber(stats.tokens_per_request.avg_prompt)}
              </div>
            </div>
            <div>
              <div className="text-xs text-(--dim) mb-1">Completion</div>
              <div className="text-base tabular-nums">
                {formatNumber(stats.tokens_per_request.avg_completion)}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-(--border) grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-(--dim)">P50: </span>
              <span className="tabular-nums">{formatNumber(stats.tokens_per_request.p50)}</span>
            </div>
            <div>
              <span className="text-(--dim)">P95: </span>
              <span className="tabular-nums">{formatNumber(stats.tokens_per_request.p95)}</span>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Cache Stats */}
      <SectionCard title="Cache Performance" icon={Database}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-(--dim) mb-1">Hit Rate</div>
              <div className="text-xl font-medium tabular-nums">
                {stats.cache.hit_rate.toFixed(1)}%
              </div>
            </div>
            <div className="h-10 w-10 relative">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-(--border)"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="text-(--hl2)"
                  strokeDasharray={`${stats.cache.hit_rate}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-(--hl2) mb-1">Hits</div>
              <div className="text-base tabular-nums">{formatNumber(stats.cache.hits)}</div>
            </div>
            <div>
              <div className="text-xs text-(--dim) mb-1">Misses</div>
              <div className="text-base tabular-nums">{formatNumber(stats.cache.misses)}</div>
            </div>
          </div>

          <div className="pt-3 border-t border-(--border) grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-(--dim)">Cached: </span>
              <span className="tabular-nums">{formatNumber(stats.cache.hit_tokens)}</span>
            </div>
            <div>
              <span className="text-(--dim)">Uncached: </span>
              <span className="tabular-nums">{formatNumber(stats.cache.miss_tokens)}</span>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Hourly Pattern */}
      <SectionCard title="Hourly Activity" icon={Clock}>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-(--dim)">
            <span>Peak: {peakHour?.hour}:00 ({formatNumber(peakHour?.requests || 0)} req)</span>
            <span>24h view</span>
          </div>

          <div className="flex items-end gap-0.5 h-20">
            {Array.from({ length: 24 }, (_: unknown, i: number) => {
              const hourData = stats.hourly_pattern.find((h: HourlyPatternData) => h.hour === i);
              const requests = hourData?.requests || 0;
              const height = (requests / maxHourlyRequests) * 100;
              const isPeak = requests === maxHourlyRequests;

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group min-w-0">
                  <div
                    className={`w-full rounded-t ${isPeak ? "bg-(--hl3)" : "bg-(--fg)/20"}`}
                    style={{
                      height: `${Math.max(height, 3)}%`,
                      minHeight: height > 0 ? "2px" : "0",
                    }}
                    title={`${i}:00 - ${formatNumber(requests)} requests`}
                  />
                  {i % 6 === 0 && (
                    <div className="text-[8px] text-(--dim)/60">
                      {i}:00
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-(--border) flex items-center justify-between text-xs text-(--dim)">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-(--hl3)" />
              <span>Peak hour</span>
            </div>
            <span>
              Total: {formatNumber(stats.hourly_pattern.reduce((sum, h) => sum + h.requests, 0))} requests
            </span>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
