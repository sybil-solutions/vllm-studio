"use client";

import { useState, useRef, useEffect, type ComponentType, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface ToolDropdownProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  isActive?: boolean;
  disabled?: boolean;
  children: ReactNode;
}

export function ToolDropdown({
  icon: Icon,
  label,
  isActive,
  disabled,
  children,
}: ToolDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg transition-all disabled:opacity-50 ${
          isActive
            ? "bg-(--card-hover) text-[#e8e4dd] border border-(--border)/50"
            : "hover:bg-(--accent) text-[#9a9590]"
        }`}
        title={label}
      >
        <Icon className="h-4 w-4" />
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1 min-w-[160px] bg-(--card) border border-(--border) rounded-lg shadow-lg py-1 z-50">
          {children}
        </div>
      )}
    </div>
  );
}

interface DropdownItemProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export function DropdownItem({
  icon: Icon,
  label,
  isActive,
  onClick,
  disabled,
}: DropdownItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors disabled:opacity-50 ${
        isActive ? "bg-(--accent) text-[#e8e4dd]" : "hover:bg-(--accent) text-[#9a9590]"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
      {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-(--success)" />}
    </button>
  );
}
