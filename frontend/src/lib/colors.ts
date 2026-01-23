/**
 * Color utilities for status display
 */

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "running":
      return "text-[#7d9a6a]";
    case "stopped":
      return "text-[#363432]";
    case "error":
      return "text-[#c97a6b]";
    case "degraded":
      return "text-[#c9a66b]";
    default:
      return "text-[#c9a66b]";
  }
}

function getStatusBg(status: string): string {
  switch (status.toLowerCase()) {
    case "running":
      return "bg-[#7d9a6a]";
    case "stopped":
      return "bg-[#363432]";
    case "error":
      return "bg-[#c97a6b]";
    case "degraded":
      return "bg-[#c9a66b]";
    default:
      return "bg-[#c9a66b]";
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
