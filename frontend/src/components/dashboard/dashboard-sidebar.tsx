import type { Metrics } from "@/lib/types";

const ELECTRICITY_PRICE_PLN = 1.2;

interface DashboardSidebarProps {
  metrics: Metrics | null;
}

export function DashboardSidebar({ metrics }: DashboardSidebarProps) {
  return (
    <div className="space-y-6">
      <SessionStats metrics={metrics} />
      <LifetimeStats metrics={metrics} />
      <CostAnalytics metrics={metrics} />
    </div>
  );
}

function SessionStats({ metrics }: { metrics: Metrics | null }) {
  if (
    !metrics?.request_success &&
    !metrics?.prompt_tokens_total &&
    !metrics?.generation_tokens_total &&
    !metrics?.running_requests
  ) {
    return null;
  }

  return (
    <section>
      <h2 className="text-[10px] uppercase tracking-widest text-(--muted-foreground)/50 mb-3 font-medium">
        Session
      </h2>
      <div className="space-y-1.5">
        {metrics?.prompt_tokens_total !== undefined && (
          <StatRow label="Input Tokens" value={formatNumber(metrics.prompt_tokens_total)} />
        )}
        {metrics?.generation_tokens_total !== undefined && (
          <StatRow label="Output Tokens" value={formatNumber(metrics.generation_tokens_total)} />
        )}
        {metrics?.running_requests !== undefined && metrics.running_requests > 0 && (
          <StatRow label="Active" value={metrics.running_requests} accent />
        )}
      </div>
    </section>
  );
}

function LifetimeStats({ metrics }: { metrics: Metrics | null }) {
  if (
    !metrics?.lifetime_prompt_tokens &&
    !metrics?.lifetime_completion_tokens &&
    !metrics?.lifetime_requests &&
    !metrics?.lifetime_energy_kwh &&
    !metrics?.lifetime_uptime_hours
  ) {
    return null;
  }

  return (
    <section>
      <h2 className="text-[10px] uppercase tracking-widest text-(--muted-foreground)/50 mb-3 font-medium">
        Lifetime
      </h2>
      <div className="space-y-1.5">
        {metrics?.lifetime_energy_kwh !== undefined && metrics.lifetime_energy_kwh > 0 && (
          <StatRow label="Energy" value={`${metrics.lifetime_energy_kwh.toFixed(2)} kWh`} />
        )}
        {metrics?.lifetime_uptime_hours !== undefined && metrics.lifetime_uptime_hours > 0 && (
          <StatRow label="Uptime" value={formatUptime(metrics.lifetime_uptime_hours)} />
        )}
      </div>
    </section>
  );
}

function CostAnalytics({ metrics }: { metrics: Metrics | null }) {
  if (!metrics?.lifetime_energy_kwh && !metrics?.current_power_watts) {
    return null;
  }

  const totalCost = metrics?.lifetime_energy_kwh
    ? (metrics.lifetime_energy_kwh * ELECTRICITY_PRICE_PLN).toFixed(2)
    : null;

  return (
    <section>
      <h2 className="text-[10px] uppercase tracking-widest text-(--muted-foreground)/50 mb-3 font-medium">
        Cost
      </h2>
      <div className="space-y-3">
        {totalCost && (
          <div>
            <div className="text-lg font-light text-(--success)/80 tabular-nums">{totalCost} PLN</div>
          </div>
        )}
        {metrics?.current_power_watts && (
          <div className="text-xs text-(--muted-foreground)/50 tabular-nums">
            {Math.round(metrics.current_power_watts)}W draw
          </div>
        )}
      </div>
    </section>
  );
}

function StatRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs text-(--muted-foreground)/50">{label}</span>
      <span
        className={`text-xs tabular-nums ${
          accent ? "text-(--success)/80" : "text-(--foreground)/70"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatUptime(hours: number): string {
  if (hours >= 24) return `${(hours / 24).toFixed(1)}d`;
  return `${hours.toFixed(1)}h`;
}
