interface RecentLogsSectionProps {
  logs: string[];
}

export function RecentLogsSection({ logs }: RecentLogsSectionProps) {
  return (
    <section>
      <h2 className="text-[10px] uppercase tracking-widest text-(--muted-foreground)/50 mb-3 font-medium">
        Recent Logs
      </h2>

      {logs.length > 0 ? (
        <div className="h-64 sm:h-80 overflow-auto font-mono text-[11px] leading-relaxed">
          <div className="space-y-0.5">
            {logs.map((line, i) => {
              const isError = line.includes("ERROR");
              const isWarning = line.includes("WARNING");
              return (
                <div
                  key={i}
                  className={`break-all ${
                    isError
                      ? "text-(--error)/70"
                      : isWarning
                        ? "text-(--warning)/70"
                        : "text-(--muted-foreground)/50"
                  }`}
                >
                  {line}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="h-64 sm:h-80 flex items-center justify-center">
          <p className="text-xs text-(--muted-foreground)/30">No logs available</p>
        </div>
      )}
    </section>
  );
}
