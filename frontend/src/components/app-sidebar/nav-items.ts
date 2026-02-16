import {
  Activity,
  BookOpen,
  Compass,
  FileText,
  Home,
  MessageCircle,
  Settings,
} from "lucide-react";

export const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/recipes", label: "Recipes", icon: BookOpen },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/logs", label: "Logs", icon: FileText },
  { href: "/usage", label: "Usage", icon: Activity },
  { href: "/configs", label: "Configs", icon: Settings },
];
