/**
 * Formatting utilities for display purposes
 */

/**
 * Convert bytes/MB/GB values to GB for display
 * Handles inconsistent API responses that may be in bytes, MB, or GB
 */
function toGB(value: number): number {
  if (value > 1e10) return value / (1024 * 1024 * 1024); // Bytes
  if (value > 1e8) return value / (1024 * 1024 * 1024); // Bytes (smaller)
  if (value > 1000) return value / 1024; // MB
  return value; // Already GB
}

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function formatDuration(ms: number): string {
  if (ms >= 1000) return (ms / 1000).toFixed(1) + "s";
  return Math.round(ms) + "ms";
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatHour(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}${period}`;
}

export { toGB, formatNumber, formatDuration, formatDate, formatHour };
