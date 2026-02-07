// CRITICAL
export function ConnectionFlow() {
  const flowItems = [
    { name: "Client", port: "3000", color: "bg-[#363432]" },
    { name: "UI", port: "8080", color: "bg-(--accent-purple)" },
    { name: "API", port: "4100", color: "bg-(--accent-purple)" },
    { name: "LiteLLM", port: "8000", color: "bg-(--accent-purple)" },
    { name: "vLLM", port: "", color: "bg-(--accent-purple)" },
  ];

  return (
    <div>
      <div className="text-xs text-[#9a9088] uppercase tracking-wider mb-3">Connection Flow</div>
      <div className="bg-[#1e1e1e] rounded-lg p-4 sm:p-6">
        <div className="sm:hidden space-y-3">
          {flowItems.map((item, index) => (
            <div key={item.name} className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-lg ${item.color} flex items-center justify-center text-[#f0ebe3] text-xs font-medium`}
              >
                {item.name}
              </div>
              {index < flowItems.length - 1 && (
                <>
                  <div className="flex-1 h-0.5 bg-[#363432]" />
                  <span className="text-[10px] text-[#9a9088]">:{item.port}</span>
                  <div className="text-[#9a9088]">→</div>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="hidden sm:flex items-center justify-between text-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-lg bg-[#363432] flex items-center justify-center text-[#f0ebe3] font-medium">
              Client
            </div>
          </div>
          <div className="flex-1 flex items-center gap-1 px-2">
            <div className="h-0.5 flex-1 bg-[#363432]" />
            <span className="text-[#9a9088] text-xs px-1">:3000</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-lg bg-(--accent-purple) flex items-center justify-center text-[#f0ebe3] font-medium">
              UI
            </div>
          </div>
          <div className="flex-1 flex items-center gap-1 px-2">
            <div className="h-0.5 flex-1 bg-[#363432]" />
            <span className="text-[#9a9088] text-xs px-1">:8080</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-lg bg-(--accent-purple) flex items-center justify-center text-[#f0ebe3] font-medium">
              API
            </div>
          </div>
          <div className="flex-1 flex items-center gap-1 px-2">
            <div className="h-0.5 flex-1 bg-[#363432]" />
            <span className="text-[#9a9088] text-xs px-1">:4100</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-lg bg-(--accent-purple) flex items-center justify-center text-[#f0ebe3] font-medium">
              LLM
            </div>
          </div>
          <div className="flex-1 flex items-center gap-1 px-2">
            <div className="h-0.5 flex-1 bg-[#363432]" />
            <span className="text-[#9a9088] text-xs px-1">:8000</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-lg bg-(--accent-purple) flex items-center justify-center text-[#f0ebe3] font-medium">
              vLLM
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-[#363432] text-[10px] sm:text-xs text-[#9a9088] text-center">
          Client → Frontend → Controller → LiteLLM → Inference Backend
        </div>
      </div>
    </div>
  );
}

