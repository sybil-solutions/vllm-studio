"use client";

/**
 * Standardized section header for UI pages
 */
function SectionHeader(title: string) {
  return (
    <h2 className="text-xs uppercase tracking-wider text-(--muted-foreground) mb-3 font-medium">
      {title}
    </h2>
  );
}

export { SectionHeader };
