"use client";

import { Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useProjectTemplates } from "@/hooks/api/build/templates";
import type { StepSharedProps } from "../use-project-create";
import { activationProps } from "@/lib/keyboard-activation";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";

export function StepTemplate({ draft, updateDraft }: StepSharedProps) {
  const {
    data: templatePages,
    isLoading,
    isError,
    error,
    refetch,
  } = useProjectTemplates();

  const templateList = templatePages?.pages.flatMap((page) => page.data) ?? [];

  function handleSelect(id: number | null) {
    updateDraft({ templateId: id });
  }

  function handleRefetch() {
    void refetch();
  }

  const resolution = usePageState({ permission: "build:view", isLoading, isError, error });

  const loadingSkeleton = (
    <div className="space-y-3">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  );

  return (
    <PageState resolution={resolution} loading={loadingSkeleton} onRetry={handleRefetch} compact>
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

        {templateList.length === 0 && (
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
    </PageState>
  );
}
