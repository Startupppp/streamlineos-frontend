"use client";

import { Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProjectTemplates } from "@/hooks/api/build/templates";
import type { StepSharedProps } from "../use-project-create";
import { activationProps } from "@/lib/keyboard-activation";
import { useCanState } from "@/hooks/api/access";

export function StepTemplate({ draft, updateDraft }: StepSharedProps) {
  const accessState = useCanState("build:view");
  const { data: templates, isLoading, isError, refetch } = useProjectTemplates();
  const templateAccessDenied = accessState === "denied";
  const templateAccessGranted = accessState === "granted";
  const templateList = templateAccessDenied
    ? []
    : templateAccessGranted
      ? templates ?? []
      : [];

  function handleSelect(id: number | null) {
    updateDraft({ templateId: id });
  }

  function handleRefetch() {
    void refetch();
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <p className="text-sm text-muted-foreground">Failed to load templates.</p>
        <Button type="button" variant="outline" size="sm" onClick={handleRefetch}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Start from a template or build from scratch.
      </p>

      {draft.templateId !== null && (
        <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Key and client fields from Basics are not applied when using a template.</span>
        </div>
      )}

      {templateAccessGranted && templateList.length === 0 && (
        <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
          No templates exist yet. Start from scratch below, or create a template first.
        </p>
      )}

      <div className="space-y-2">
        <div
          {...activationProps(() => handleSelect(null), "Blank Project")}
          className={cn(
            "cursor-pointer rounded-xl border p-4 transition-all",
            draft.templateId === null
              ? "border-primary bg-primary/5"
              : "border-border bg-card hover:border-muted-foreground/40"
          )}
        >
          <div className="text-sm font-medium">Blank Project</div>
          <div className="text-xs text-muted-foreground mt-0.5">No predefined tickets — start from scratch</div>
        </div>

        {templateList.map((t) => (
          <div
            key={t.id}
            {...activationProps(() => handleSelect(t.id), t.name)}
            className={cn(
              "cursor-pointer rounded-xl border p-4 transition-all",
              draft.templateId === t.id
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-muted-foreground/40"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{t.name}</div>
                {t.description && (
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.description}</div>
                )}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                {(t.tickets ?? []).length} tickets
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
