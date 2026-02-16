"use client";
// CRITICAL

import { Check, ChevronDown, Search, Palette } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/store";
import { THEMES, type ThemeMeta } from "@/lib/themes";
import type { ThemeId } from "@/lib/themes";

export function ThemeSelector() {
  const themeId = useAppStore((s) => s.themeId);
  const setThemeId = useAppStore((s) => s.setThemeId);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const selectedTheme = useMemo(() => THEMES.find((theme) => theme.id === themeId), [themeId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [open]);

  useEffect(() => {
    if (open) {
      searchInputRef.current?.focus();
    }
  }, [open]);

  const filteredThemes = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return THEMES;
    }

    return THEMES.filter((theme) => {
      const haystack = `${theme.name} ${theme.group} ${theme.description}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [query]);

  const groupedThemes = useMemo(() => {
    return filteredThemes.reduce<Record<string, ThemeMeta[]>>((acc, theme) => {
      const list = acc[theme.group] ?? [];
      list.push(theme);
      acc[theme.group] = list;
      return acc;
    }, {});
  }, [filteredThemes]);

  const handleSelectTheme = (nextThemeId: ThemeId) => {
    setThemeId(nextThemeId);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Palette className="h-4 w-4 text-(--dim)" strokeWidth={1.5} />
        <h3 className="text-sm font-medium text-(--fg)">Appearance</h3>
      </div>

      <div className="relative" ref={pickerRef}>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-(--border) bg-(--surface) text-left hover:border-(--hl1)/55 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1">
              {(selectedTheme?.swatches ?? []).map((color, index) => (
                <span
                  key={`${selectedTheme?.id}-${index}`}
                  className="w-4 h-4 rounded-full border border-white/15"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            <div className="text-left min-w-0">
              <div className="text-sm font-medium text-(--fg) truncate">{selectedTheme?.name ?? "Theme"}</div>
              <div className="text-xs text-(--dim) truncate">{selectedTheme?.description ?? ""}</div>
            </div>
          </div>

          <ChevronDown className="h-4 w-4 text-(--dim)" strokeWidth={1.75} />
        </button>

        {open && (
          <div className="absolute z-20 mt-2 w-full rounded-lg border border-(--border) bg-(--surface) shadow-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-(--border)">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-(--border) bg-background/90">
                <Search className="h-3.5 w-3.5 text-(--dim)" strokeWidth={2} />
                <input
                  ref={searchInputRef}
                  aria-label="Search themes"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search themes"
                  className="flex-1 bg-transparent border-0 outline-none text-sm text-(--fg) placeholder:text-(--dim)"
                />
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto p-2">
              {filteredThemes.length === 0 ? (
                <div className="px-2 py-6 text-center text-xs text-(--dim)">No themes match your search.</div>
              ) : (
                <>
                  {Object.entries(groupedThemes).map(([group, themes]) => (
                    <div key={group} className="mb-2">
                      <div className="px-2 py-1 text-[10px] tracking-wide uppercase text-(--dim)">{group}</div>
                      <div className="space-y-1">
                        {themes.map((theme) => {
                          const isActive = themeId === theme.id;

                          return (
                            <button
                              key={theme.id}
                              type="button"
                              onClick={() => handleSelectTheme(theme.id)}
                              className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-left transition-colors border ${
                                isActive
                                  ? "border-(--accent) bg-(--accent) text-(--bg)"
                                  : "border-transparent hover:border-(--border) hover:bg-background"
                              }`}
                            >
                              {isActive && <Check className="h-3 w-3 text-(--hl2)" strokeWidth={2.5} />}

                              {!isActive && <span className="w-3" />}

                              <div className="flex items-center gap-1">
                                {theme.swatches.map((color, index) => (
                                  <span
                                    key={`${theme.id}-${index}`}
                                    className="w-3 h-3 rounded-full border border-white/15"
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </div>

                              <span
                                className={`text-xs font-medium flex-1 truncate ${isActive ? "text-(--bg)" : "text-(--fg)"}`}
                              >
                                {theme.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
