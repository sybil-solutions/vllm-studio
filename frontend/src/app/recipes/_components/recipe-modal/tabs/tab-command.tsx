// CRITICAL
"use client";

import { Eye, Info, Terminal } from "lucide-react";

export function RecipeModalTabCommand({
  commandText,
  onCommandChange,
}: {
  commandText: string;
  onCommandChange: (value: string) => void;
}) {
  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center gap-2 text-(--fg) pb-2 border-b border-(--border)/50">
        <Eye className="w-4 h-4 text-(--accent)" />
        <span className="text-sm font-medium">Command Preview</span>
      </div>

      <p className="text-xs text-(--dim)">
        This is the generated command. You can copy it for reference or edit it directly.
        <strong className="text-(--accent)"> Note: Direct edits here are not saved yet.</strong>
      </p>

      <div className="flex-1 bg-(--bg) border border-(--border) rounded-lg overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 px-3 py-2 bg-(--surface) border-b border-(--border)">
          <Terminal className="w-4 h-4 text-(--dim)" />
          <span className="text-xs text-(--dim)">Generated Command</span>
        </div>
        <textarea
          value={commandText}
          onChange={(e) => onCommandChange(e.target.value)}
          spellCheck={false}
          className="flex-1 w-full px-3 py-3 bg-transparent border-0 text-xs font-mono text-(--hl2) focus:outline-none resize-none leading-relaxed"
          placeholder="Command will appear here..."
        />
      </div>

      <div className="flex items-start gap-2 p-3 bg-(--surface) border border-(--border) rounded-lg">
        <Info className="w-4 h-4 text-(--accent) mt-0.5 shrink-0" />
        <div className="text-xs text-(--dim) space-y-1">
          <p>Use the form tabs to configure the recipe. This preview updates automatically.</p>
          <p>If you edit this command directly, those changes won&apos;t be saved with the recipe.</p>
        </div>
      </div>
    </div>
  );
}

