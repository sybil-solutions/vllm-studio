// CRITICAL
"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { getMermaid, looksLikeMermaidDiagram, sanitizeMermaidCode } from "@/lib/mermaid";

export function MermaidDiagram({ code }: { code: string }) {
  const id = useId().replace(/:/g, "_");
  const [state, setState] = useState<{ svg: string; error: string | null }>({ svg: "", error: null });
  const renderSeqRef = useRef(0);

  useEffect(() => {
    const run = async () => {
      if (!code.trim()) return;
      const seq = ++renderSeqRef.current;
      if (!looksLikeMermaidDiagram(code)) {
        setState({
          svg: "",
          error: "Not a valid Mermaid diagram (missing diagram header like `graph TD` or `sequenceDiagram`).",
        });
        return;
      }
      try {
        const mermaid = await getMermaid();
        if (!mermaid) {
          setState({ svg: "", error: "Failed to load mermaid library" });
          return;
        }
        const sanitized = sanitizeMermaidCode(code);
        const { svg } = await mermaid.render(`mermaid_file_${id}_${seq}`, sanitized);
        if (seq !== renderSeqRef.current) return;
        setState({ svg, error: null });
      } catch (e) {
        if (seq !== renderSeqRef.current) return;
        setState({ svg: "", error: e instanceof Error ? e.message : "Failed to render diagram" });
      }
    };

    const handle = window.setTimeout(run, 250);
    return () => window.clearTimeout(handle);
  }, [code, id]);

  if (state.error) {
    return (
      <div className="my-3 p-4 rounded-lg border border-red-500/30 bg-red-500/10">
        <div className="flex items-center gap-2 text-red-400 text-sm mb-2">
          <AlertCircle className="h-4 w-4" />
          <span>Diagram Error</span>
        </div>
        <div className="text-xs text-red-300 mb-2 break-words">{state.error}</div>
        <pre className="text-xs text-(--dim) overflow-x-auto">{code}</pre>
      </div>
    );
  }

  return (
    <div
      className="my-3 p-4 rounded-lg border border-white/10 bg-white/5 overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: state.svg }}
    />
  );
}

