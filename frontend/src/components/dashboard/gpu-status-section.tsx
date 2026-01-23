import { useRealtimeStatus } from "@/hooks/use-realtime-status";
import { toGB } from "@/lib/formatters";

export function GpuStatusSection() {
  const { gpus: realtimeGpus } = useRealtimeStatus();
  const gpus = realtimeGpus.length > 0 ? realtimeGpus : [];

  const totalPower = gpus.reduce((sum, g) => sum + (g.power_draw || 0), 0);
  const totalMem = gpus.reduce((sum, g) => sum + toGB(g.memory_used_mb ?? g.memory_used ?? 0), 0);
  const totalMemMax = gpus.reduce(
    (sum, g) => sum + toGB(g.memory_total_mb ?? g.memory_total ?? 0),
    0,
  );
  const avgUtil = gpus.length > 0
    ? Math.round(gpus.reduce((sum, g) => sum + (g.utilization_pct ?? g.utilization ?? 0), 0) / gpus.length)
    : 0;
  const avgTemp = gpus.length > 0
    ? Math.round(gpus.reduce((sum, g) => sum + (g.temp_c ?? g.temperature ?? 0), 0) / gpus.length)
    : 0;

  if (gpus.length === 0) {
    return (
      <section>
        <h2 className="text-[10px] uppercase tracking-widest text-(--muted-foreground)/50 mb-3 font-medium">
          GPU Status
        </h2>
        <p className="text-sm text-(--muted-foreground)/40">No GPU data available</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-[10px] uppercase tracking-widest text-(--muted-foreground)/50 mb-3 font-medium">
        GPU Status
      </h2>

      <div className="space-y-1">
        {gpus.map((gpu) => {
          const memUsed = toGB(gpu.memory_used_mb ?? gpu.memory_used ?? 0);
          const memTotal = toGB(gpu.memory_total_mb ?? gpu.memory_total ?? 1);
          const memPct = (memUsed / memTotal) * 100;
          const temp = gpu.temp_c ?? gpu.temperature ?? 0;
          const util = gpu.utilization_pct ?? gpu.utilization ?? 0;

          return (
            <div
              key={gpu.id ?? gpu.index}
              className="py-2 grid grid-cols-5 gap-4 items-center"
            >
              <div className="text-sm text-(--foreground)/70">
                GPU {gpu.id ?? gpu.index}
              </div>

              {/* Utilization */}
              <div className="space-y-1">
                <div className="h-1 bg-(--muted)/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-(--foreground)/30 rounded-full transition-all duration-500"
                    style={{ width: `${util}%` }}
                  />
                </div>
                <div className="text-[10px] text-(--muted-foreground)/50 tabular-nums">
                  {util}% util
                </div>
              </div>

              {/* Memory */}
              <div className="space-y-1">
                <div className="h-1 bg-(--muted)/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      memPct > 90
                        ? "bg-(--error)/50"
                        : memPct > 70
                          ? "bg-(--warning)/50"
                          : "bg-(--success)/50"
                    }`}
                    style={{ width: `${memPct}%` }}
                  />
                </div>
                <div className="text-[10px] text-(--muted-foreground)/50 tabular-nums">
                  {memUsed.toFixed(1)}/{memTotal.toFixed(0)}G
                </div>
              </div>

              {/* Temperature */}
              <div>
                <span
                  className={`text-[10px] tabular-nums ${
                    temp > 80
                      ? "text-(--error)/70"
                      : temp > 65
                        ? "text-(--warning)/70"
                        : "text-(--success)/70"
                  }`}
                >
                  {temp}°C
                </span>
              </div>

              {/* Power */}
              <div className="text-[10px] text-(--muted-foreground)/50 tabular-nums text-right">
                {gpu.power_draw ? `${Math.round(gpu.power_draw)}W` : "--"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary row */}
      {gpus.length > 1 && (
        <div className="pt-2 mt-2 border-t border-(--border)/20">
          <div className="grid grid-cols-5 gap-4 items-center text-[10px]">
            <div className="text-(--muted-foreground)/50">Total</div>
            <div className="text-(--foreground)/60 tabular-nums">{avgUtil}% avg</div>
            <div className="text-(--foreground)/60 tabular-nums">
              {totalMem.toFixed(0)}/{totalMemMax.toFixed(0)}G
            </div>
            <div className="text-(--foreground)/60 tabular-nums">{avgTemp}° avg</div>
            <div className="text-(--foreground)/60 tabular-nums text-right">{Math.round(totalPower)}W</div>
          </div>
        </div>
      )}
    </section>
  );
}
