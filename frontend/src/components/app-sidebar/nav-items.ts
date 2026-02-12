import {
  BarChart3,
  Compass,
  LayoutDashboard,
  MessageSquareText,
  ScrollText,
  Settings2,
  Sparkles,
} from "lucide-react";

export const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageSquareText },
  { href: "/recipes", label: "Recipes", icon: Sparkles },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/logs", label: "Logs", icon: ScrollText },
  { href: "/usage", label: "Usage", icon: BarChart3 },
  { href: "/configs", label: "Configs", icon: Settings2 },
];

