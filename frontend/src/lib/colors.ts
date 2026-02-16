/**
 * Color utilities for status display
 */

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "running":
      return "text-(--hl2)";
    case "stopped":
      return "text-(--border)";
    case "error":
      return "text-(--err)";
    case "degraded":
      return "text-(--hl3)";
    default:
      return "text-(--hl3)";
  }
}

function getStatusBg(status: string): string {
  switch (status.toLowerCase()) {
    case "running":
      return "bg-(--hl2)";
    case "stopped":
      return "bg-(--border)";
    case "error":
      return "bg-(--err)";
    case "degraded":
      return "bg-(--hl3)";
    default:
      return "bg-(--hl3)";
  }
}

function getModelColor(model: string): string {
  const colors = [
    "hsl(270, 50%, 55%)", // Purple
    "hsl(200, 60%, 55%)", // Blue
    "hsl(142, 45%, 45%)", // Green
    "hsl(38, 85%, 55%)", // Yellow/Orange
    "hsl(0, 60%, 55%)", // Red
    "hsl(300, 50%, 55%)", // Magenta
    "hsl(180, 50%, 50%)", // Cyan
    "hsl(30, 70%, 50%)", // Orange
    "hsl(120, 40%, 50%)", // Light Green
    "hsl(240, 50%, 55%)", // Dark Blue
  ];
  // Use hash of model name for consistent color assignment
  let hash = 0;
  for (let i = 0; i < model.length; i++) {
    hash = model.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export { getStatusColor, getStatusBg, getModelColor };
