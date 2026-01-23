"use client";

import { TrendingUp, TrendingDown } from "lucide-react";

interface ChangeIndicatorOptions {
  value: number | null;
  positiveColor?: string;
  negativeColor?: string;
}

function ChangeIndicator({
  value,
  positiveColor = "text-(--success)",
  negativeColor = "text-(--error)",
}: ChangeIndicatorOptions) {
  if (value === null || value === undefined)
    return <span className="text-(--muted-foreground)">—</span>;
  const isPositive = value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  return (
    <div
      className={`flex items-center gap-1 ${isPositive ? positiveColor : negativeColor}`}
    >
      <Icon className="h-3 w-3" />
      <span className="text-xs tabular-nums">{Math.abs(value).toFixed(1)}%</span>
    </div>
  );
}

export { ChangeIndicator };
