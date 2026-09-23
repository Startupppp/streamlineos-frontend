"use client";

import { useCallback, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ChevronDownIcon, ChevronUpIcon } from "@animateicons/react/lucide";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRosters, useRosterEntries, usePublishRoster } from "@/hooks/api/hr/rosters";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useOrgMembersByIds } from "@/hooks/api/organization";
import { getUserDisplayName, type NamedUser } from "@/lib/person-display";
import { AssignRosterEntrySheet } from "./assign-roster-entry-sheet";

interface Props {
  canManage: boolean;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  DRAFT: "outline",
  PUBLISHED: "default",
};

interface RosterCardProps {
  roster: { id: number; name: string; weekStart: string; weekEnd: string; status: string };
  canManage: boolean;
}

function RosterCard({ roster, canManage }: RosterCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const { data: entries } = useRosterEntries(expanded ? roster.id : 0);
  const publishRoster = usePublishRoster();

  const entryUserIds = useMemo(
    () => [...new Set((entries ?? []).map((e) => e.userId))],
    [entries],
  );
  const { data: membersData } = useOrgMembersByIds(entryUserIds);

  const memberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of membersData?.data ?? []) {
      map.set(member.userId, { name: member.name, email: member.email });
    }
    return map;
  }, [membersData]);

  function handleToggle() {
    setExpanded((v) => !v);
  }

  function handleOpenAssign() {
    setExpanded(true);
    setAssignOpen(true);
  }

  function handlePublish() {
    publishRoster.mutate(roster.id, {
      onSuccess: () => toast.success("Roster published"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <TruncatedText text={roster.name} className="text-sm font-semibold text-foreground" />
          <p className="text-xs text-muted-foreground mt-0.5">{roster.weekStart} – {roster.weekEnd}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={STATUS_VARIANTS[roster.status] ?? "secondary"} className="text-dense">
            {roster.status}
          </Badge>
          {canManage && roster.status === "DRAFT" && (
            <>
              <Button size="sm" variant="outline" className="text-xs" onClick={handleOpenAssign}>
                Assign
              </Button>
              <Button size="sm" variant="outline" className="text-xs" onClick={handlePublish} disabled={publishRoster.isPending}>
                Publish
              </Button>
            </>
          )}
          <AnimatedIconButton
            icon={expanded ? ChevronUpIcon : ChevronDownIcon}
            iconSize={16}
            variant="ghost"
            size="icon"
            className="w-7"
            onClick={handleToggle}
            aria-label={expanded ? `Collapse ${roster.name}` : `Expand ${roster.name}`}
          />
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border p-4">
              {!entries?.length ? (
                canManage ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <p className="text-sm font-medium text-foreground">Nobody is rostered yet</p>
                    <p className="max-w-xs text-xs text-muted-foreground">
                      Add an employee against a day in this week, then publish the roster so they can see it.
                    </p>
                    <Button size="sm" className="mt-1 text-xs" onClick={handleOpenAssign}>
                      Assign an employee
                    </Button>
                  </div>
                ) : (
                  <ChartEmptyState message="No entries in this roster" height={120} compact />
                )
              ) : (
                <div className="space-y-1">
                  {entries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
                      <span className="text-muted-foreground">{getUserDisplayName(memberById.get(entry.userId))} — {entry.date}</span>
                      <span className="font-medium">
                        {entry.isDayOff ? (
                          <Badge variant="secondary" className="text-micro">Day Off</Badge>
                        ) : (
                          entry.shiftId ? `Shift #${entry.shiftId}` : "—"
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {canManage && (
        <AssignRosterEntrySheet
          open={assignOpen}
          onOpenChange={setAssignOpen}
          rosterId={roster.id}
          rosterName={roster.name}
          weekStart={roster.weekStart}
          weekEnd={roster.weekEnd}
        />
      )}
    </div>
  );
}

export function RostersGrid({ canManage }: Props) {
  const { data: rosters, isLoading, isError, error, refetch } = useRosters();

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        className="flex-1"
        title="Couldn't load rosters"
        description={getErrorMessage(error)}
        onRetry={handleRetry}
      />
    );
  }

  if (!rosters?.length) {
    return (
      <EmptyState
        illustrationPreset="calendar"
        title="No rosters yet"
        description="Create your first weekly roster using the button above"
        className={CONTENT_FILL_PANEL}
      />
    );
  }

  return (
    <div className="space-y-3">
      {rosters.map((roster) => (
        <RosterCard key={roster.id} roster={roster} canManage={canManage} />
      ))}
    </div>
  );
}
