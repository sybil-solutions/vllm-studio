import type { GPU, Metrics } from "@/lib/types";
import { toGB } from "@/lib/formatters";

interface DashboardMetricsProps {
  metrics: Metrics | null;
  gpus: GPU[];
}

export function DashboardMetrics({ metrics, gpus }: DashboardMetricsProps) {

  const totalPower = gpus.reduce((sum, g) => sum + (g.power_draw || 0), 0);
  const totalMem = gpus.reduce((sum, g) => sum + toGB(g.memory_used_mb ?? g.memory_used ?? 0), 0);
  const totalMemMax = gpus.reduce(
    (sum, g) => sum + toGB(g.memory_total_mb ?? g.memory_total ?? 0),
    0,
  );

  // Use session average as main display, fall back to real-time
  const generationTps = metrics?.session_avg_generation || metrics?.generation_throughput || 0;
  const prefillTps = metrics?.session_avg_prefill || metrics?.prompt_throughput || 0;

  // Peak is the all-time best (now auto-tracked)
  const peakGeneration = metrics?.peak_generation_tps || 0;
  const peakPrefill = metrics?.peak_prefill_tps || 0;

  return (
    <section className="mb-8 pb-6 border-b border-(--border)/10">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 sm:gap-8">
        <Metric
          label="Requests"
          value={metrics?.running_requests || 0}
          sub={metrics?.pending_requests ? `${metrics.pending_requests} queued` : undefined}
        />
        <TpsMetric
          label="Generation"
          value={generationTps}
          peak={peakGeneration}
        />
        <TpsMetric
          label="Prefill"
          value={prefillTps}
          peak={peakPrefill}
        />
        <Metric
          label="TTFT"
          value={metrics?.avg_ttft_ms ? Math.round(metrics.avg_ttft_ms) : "--"}
          unit="ms"
          sub={metrics?.peak_ttft_ms ? `best ${Math.round(metrics.peak_ttft_ms)}` : undefined}
        />
        <Metric
          label="KV Cache"
          value={metrics?.kv_cache_usage != null ? Math.round(metrics.kv_cache_usage * 100) : "--"}
          unit="%"
        />
        <Metric
          label="Power"
          value={Math.round(totalPower)}
          unit="W"
          sub={`${totalMem.toFixed(0)}/${totalMemMax.toFixed(0)}G`}
        />
      </div>
    </section>
  );
}

function TpsMetric({
  label,
  value,
  peak,
}: {
  label: string;
  value: number;
  peak: number;
}) {
  const pct = peak > 0 ? Math.min((value / peak) * 100, 100) : 0;

  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-(--muted-foreground)/50 mb-1.5">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-light tracking-tight tabular-nums text-(--foreground)/80">
          {value > 0 ? value.toFixed(1) : "--"}
        </span>
        {value > 0 && (
          <span className="text-[10px] text-(--muted-foreground)/40">tok/s</span>
        )}
      </div>
      {peak > 0 && (
        <div className="mt-2 space-y-1">
          <div className="h-1 bg-(--muted)/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-(--foreground)/25 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-[10px] text-(--muted-foreground)/40 tabular-nums">
            peak {peak.toFixed(1)}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
  sub,
}: {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-(--muted-foreground)/50 mb-1.5">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-light tracking-tight tabular-nums text-(--foreground)/80">
          {value}
        </span>
        {unit && value !== "--" && (
          <span className="text-[10px] text-(--muted-foreground)/40">{unit}</span>
        )}
      </div>
      {sub && (
        <div className="text-[10px] text-(--muted-foreground)/40 mt-1 tabular-nums">{sub}</div>
      )}
    </div>
  );
}
