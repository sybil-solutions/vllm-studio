// CRITICAL
"use client";

import {
  useRef,
  useEffect,
  useState,
  createContext,
  useContext,
  type ComponentType,
  type ReactNode,
} from "react";
import { ChevronDown } from "lucide-react";

interface DropdownContextType {
  close: () => void;
}

const DropdownContext = createContext<DropdownContextType | null>(null);

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
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      // Don't close if clicking on a select element or its options
      // (native select dropdowns render outside the container)
      if (
        target instanceof HTMLElement &&
        (target.tagName === "SELECT" ||
          target.tagName === "OPTION" ||
          target.closest("select") !== null)
      ) {
        return;
      }

      if (ref.current && !ref.current.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <DropdownContext.Provider value={{ close }}>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((prev) => !prev)}
          disabled={disabled}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg transition-all:ease-in:200ms disabled:opacity-50 ${
            isActive
              ? "bg-(--card-hover) text-[#e8e4dd] border border-(--border)"
              : "hover:bg-(--accent) text-[#9a9590]"
          }`}
          title={label}
        >
          <Icon className="h-3.5 w-3.5" />
          <ChevronDown className={`h-2.5 w-2.5 transition-transform:ease-in:150ms ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="absolute bottom-full left-0 mb-1 min-w-[160px] bg-(--card) border border-(--border) rounded-lg shadow-xl transition-all:ease-in:200ms py-1 z-50">
            {children}
          </div>
        )}
      </div>
    </DropdownContext.Provider>
  );
}

interface DropdownItemProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  closeOnClick?: boolean;
}

export function DropdownItem({
  icon: Icon,
  label,
  isActive,
  onClick,
  disabled,
  closeOnClick = false,
}: DropdownItemProps) {
  const context = useContext(DropdownContext);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    console.log("[DropdownItem] clicked:", label, "isActive:", isActive, "onClick:", !!onClick);
    onClick?.();
    if (closeOnClick) {
      context?.close();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2 px-3 py-1.5 font-sans font-medium text-xs transition-colors:ease-in:200ms disabled:opacity-50 ${
        isActive ? "bg-(--accent) text-[#e8e4dd]" : "hover:bg-(--accent) focus:bg-(--accent) text-[#9a9590]"
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate font-medium text-xs">{label}</span>
      {isActive && <span className="ml-auto w-2.5 h-2.5 rounded-full bg-(--success)" />}
    </button>
  );
}
