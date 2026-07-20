"use client";

import { memo, useMemo } from "react";
import { LayoutGroup } from "framer-motion";
import { cn } from "@/lib/utils";
import { PREVIEW_GRADIENT_GLOW } from "../lib/preview-chrome";
import {
  buildGoalChips,
  buildStats,
  buildWidgets,
  emptyPreviewCopy,
  resolvePreviewModules,
} from "../lib/preview-mock-content";
import type { WorkspacePreviewSnapshot } from "../lib/preview-snapshot";
import { previewSnapshotsEqual } from "../lib/preview-snapshot";
import { WorkspacePreviewMain } from "./workspace-preview-main";
import { WorkspacePreviewSidebar } from "./workspace-preview-sidebar";

type WorkspacePreviewMockProps = {
  snapshot: WorkspacePreviewSnapshot;
  className?: string;
  compact?: boolean;
};

function WorkspacePreviewMockInner({
  snapshot,
  className,
  compact = false,
}: WorkspacePreviewMockProps) {
  const modules = useMemo(() => resolvePreviewModules(snapshot), [snapshot]);
  const companyLabel = snapshot.companyName.trim() || "Your workspace";
  const industryLabel = snapshot.industry.trim();
  const goalChips = useMemo(
    () => buildGoalChips(snapshot.goals),
    [snapshot.goals],
  );
  const stats = useMemo(
    () => buildStats(modules, snapshot.teamSize, snapshot.goals.length),
    [modules, snapshot.teamSize, snapshot.goals.length],
  );
  const widgets = useMemo(
    () => buildWidgets(modules, snapshot.goals, compact),
    [modules, snapshot.goals, compact],
  );
  const emptyCopy = emptyPreviewCopy(snapshot);
  const hasGoals = goalChips.length > 0;
  const metaLine = [
    hasGoals ? goalChips.map((g) => g.label).join(" · ") : null,
    hasGoals && snapshot.teamSize ? snapshot.teamSize : null,
    hasGoals && snapshot.inviteesCount > 0
      ? `${snapshot.inviteesCount} invite${snapshot.inviteesCount === 1 ? "" : "s"}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const companyInitial = (companyLabel[0] ?? "S").toUpperCase();

  return (
    <div className={cn("relative flex h-full min-h-0 w-full min-w-0", className)}>
      <div
        className={cn(
          "pointer-events-none absolute -z-10 rounded-[2rem] blur-2xl",
          PREVIEW_GRADIENT_GLOW,
          compact ? "-inset-2" : "-inset-4",
        )}
        aria-hidden
      />

      <LayoutGroup id="org-setup-preview">
        <div
          className={cn(
            "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_28px_60px_-32px_rgba(30,64,175,0.28)]",
            compact
              ? "h-[220px]"
              : "h-full max-h-full min-h-[320px] lg:min-h-[360px] xl:min-h-[400px] 2xl:min-h-[440px]",
          )}
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-brand-core/[0.05] to-transparent"
            aria-hidden
          />

          <div className="relative flex h-full min-h-0 min-w-0 flex-1 overflow-hidden">
            <WorkspacePreviewSidebar
              modules={modules}
              companyLabel={companyLabel}
              companyInitial={companyInitial}
              compact={compact}
            />
            <WorkspacePreviewMain
              companyLabel={companyLabel}
              industryLabel={industryLabel}
              metaLine={metaLine}
              emptyCopy={emptyCopy}
              compact={compact}
              modules={modules}
              goalChips={goalChips}
              stats={stats}
              widgets={widgets}
            />
          </div>
        </div>
      </LayoutGroup>
    </div>
  );
}

export const WorkspacePreviewMock = memo(
  WorkspacePreviewMockInner,
  (prev, next) =>
    prev.compact === next.compact &&
    prev.className === next.className &&
    previewSnapshotsEqual(prev.snapshot, next.snapshot),
);
