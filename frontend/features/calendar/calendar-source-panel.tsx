"use client";

import { useCallback } from "react";
import { Layers, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  ResponsivePopover,
  ResponsivePopoverTrigger,
  ResponsivePopoverContent,
} from "@/components/ui/responsive-popover";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import {
  useCalendarSources,
  useSetCalendarSourcePreference,
  type CalendarSource,
} from "@/hooks/api/calendar";

interface SourceRowProps {
  source: CalendarSource;
  isPending: boolean;
  onToggle: (sourceKey: string, enabled: boolean) => void;
}

function SourceRow({ source, isPending, onToggle }: SourceRowProps) {
  const handleCheckedChange = useCallback(
    (checked: boolean) => onToggle(source.key, checked),
    [source.key, onToggle],
  );

  return (
    <div className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50">
      <span className="text-xs text-foreground">{source.label}</span>
      <Switch
        checked={source.enabled}
        onCheckedChange={handleCheckedChange}
        aria-label={`Toggle ${source.label}`}
        disabled={isPending}
      />
    </div>
  );
}

interface SourceFailureBannerProps {
  failures: ReadonlyArray<{ key: string; label: string }>;
  className?: string;
}

/**
 * A partially failed aggregate renders as a calendar quietly missing one
 * source's events — the surviving sources still draw, so nothing on screen is
 * broken enough to notice. The banner therefore has to be reachable without
 * opening the Sources popover; `CalendarToolbar` renders it on the surface and
 * the popover keeps a copy beside the toggles that explain it.
 */
export function SourceFailureBanner({
  failures,
  className,
}: SourceFailureBannerProps) {
  if (failures.length === 0) return null;

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-md border border-status-warning-rule bg-status-warning-surface px-2.5 py-2",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-warning-ink-strong" />
      <p className="text-dense text-status-warning-ink-strong">
        Some events could not be loaded:{" "}
        {failures.map((f) => f.label).join(", ")}
      </p>
    </div>
  );
}

interface CalendarSourcePanelProps {
  failures?: ReadonlyArray<{ key: string; label: string }>;
}

export function CalendarSourcePanel({ failures = [] }: CalendarSourcePanelProps) {
  const { data: sources, isLoading, isError, error, refetch } = useCalendarSources();
  const setPreference = useSetCalendarSourcePreference();

  const handleToggle = useCallback(
    (sourceKey: string, enabled: boolean) => {
      setPreference.mutate(
        { sourceKey, enabled },
        {
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [setPreference],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <ResponsivePopover>
      <ResponsivePopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1 px-2.5 text-xs font-medium xl:px-3"
          aria-label="Event sources"
        >
          <Layers className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">Sources</span>
        </Button>
      </ResponsivePopoverTrigger>

      <ResponsivePopoverContent
        title="Event sources"
        className="w-72 p-3"
        align="end"
      >
        <p className="mb-2 text-xs font-semibold text-foreground">Event sources</p>

        <SourceFailureBanner failures={failures} className="mb-2" />

        {isLoading ? (
          <div className="flex flex-1 min-h-0 flex-col gap-2">
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        ) : sources && sources.length > 0 ? (
          <div className="flex flex-1 min-h-0 flex-col gap-2">
            {isError ? (
              <ErrorState
                compact
                title="Source list is out of date"
                description={getErrorMessage(error)}
                onRetry={handleRetry}
              />
            ) : null}
            <div className="flex flex-col gap-0.5">
              {sources.map((source) => (
                <SourceRow
                  key={source.key}
                  source={source}
                  isPending={setPreference.isPending}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </div>
        ) : isError ? (
          <ErrorState
            compact
            title="Couldn't load event sources"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : (
          <div className="flex min-h-[6rem] flex-1 items-center justify-center">
            <p className="text-xs text-muted-foreground">No sources available.</p>
          </div>
        )}
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}
