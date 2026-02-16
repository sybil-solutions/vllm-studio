// CRITICAL
export function ConnectionFlow() {
  const flowItems = [
    { name: "Client", port: "3000", color: "bg-(--border)" },
    { name: "UI", port: "8080", color: "bg-(--hl1)" },
    { name: "API", port: "4100", color: "bg-(--hl1)" },
    { name: "LiteLLM", port: "8000", color: "bg-(--hl1)" },
    { name: "vLLM", port: "", color: "bg-(--hl1)" },
  ];

  return (
    <div>
      <div className="text-xs text-(--dim) uppercase tracking-wider mb-3">Connection Flow</div>
      <div className="bg-(--surface) rounded-lg p-4 sm:p-6">
        <div className="sm:hidden space-y-3">
          {flowItems.map((item, index) => (
            <div key={item.name} className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-lg ${item.color} flex items-center justify-center text-(--fg) text-xs font-medium`}
              >
                {item.name}
              </div>
              {index < flowItems.length - 1 && (
                <>
                  <div className="flex-1 h-0.5 bg-(--border)" />
                  <span className="text-[10px] text-(--dim)">:{item.port}</span>
                  <div className="text-(--dim)">→</div>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="hidden sm:flex items-center justify-between text-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-lg bg-(--border) flex items-center justify-center text-(--fg) font-medium">
              Client
            </div>
          </div>
          <div className="flex-1 flex items-center gap-1 px-2">
            <div className="h-0.5 flex-1 bg-(--border)" />
            <span className="text-(--dim) text-xs px-1">:3000</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-lg bg-(--hl1) flex items-center justify-center text-(--fg) font-medium">
              UI
            </div>
          </div>
          <div className="flex-1 flex items-center gap-1 px-2">
            <div className="h-0.5 flex-1 bg-(--border)" />
            <span className="text-(--dim) text-xs px-1">:8080</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-lg bg-(--hl1) flex items-center justify-center text-(--fg) font-medium">
              API
            </div>
          </div>
          <div className="flex-1 flex items-center gap-1 px-2">
            <div className="h-0.5 flex-1 bg-(--border)" />
            <span className="text-(--dim) text-xs px-1">:4100</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-lg bg-(--hl1) flex items-center justify-center text-(--fg) font-medium">
              LLM
            </div>
          </div>
          <div className="flex-1 flex items-center gap-1 px-2">
            <div className="h-0.5 flex-1 bg-(--border)" />
            <span className="text-(--dim) text-xs px-1">:8000</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-lg bg-(--hl1) flex items-center justify-center text-(--fg) font-medium">
              vLLM
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-(--border) text-[10px] sm:text-xs text-(--dim) text-center">
          Client → Frontend → Controller → LiteLLM → Inference Backend
        </div>
      </div>
    </div>
  );
}

