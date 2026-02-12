// CRITICAL
"use client";

import { memo } from "react";
import type { ComponentProps } from "react";
import { useAppStore } from "@/store";
import { ToolBeltToolbar } from "../tool-belt-toolbar";

export const ToolBeltToolbarContainer = memo(function ToolBeltToolbarContainer(
  props: Omit<ComponentProps<typeof ToolBeltToolbar>, "elapsedSeconds" | "lastRunDurationSeconds">,
) {
  const elapsedSeconds = useAppStore((state) => state.elapsedSeconds);
  const lastRunDurationSeconds = useAppStore((state) => state.lastRunDurationSeconds);
  return (
    <ToolBeltToolbar
      {...props}
      elapsedSeconds={elapsedSeconds}
      lastRunDurationSeconds={lastRunDurationSeconds}
    />
  );
});

