"use client";

import { useCallback, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ChevronDownIcon, ChevronUpIcon } from "@animateicons/react/lucide";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { usePageState } from "@/hooks/api/use-page-state";
import { useHrShifts } from "@/hooks/api/hr/shifts";
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
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
  const { data: entries, isLoading: entriesLoading } = useRosterEntries(expanded ? roster.id : 0);
  const publishRoster = usePublishRoster();
  // Entries carry a shiftId; show the shift's name, never "Shift #12" (FE-85).
  const { data: shifts } = useHrShifts();
  const shiftNameById = useMemo(
    () => new Map((shifts ?? []).map((shift) => [shift.id, shift.name])),
    [shifts],
  );

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

  function handleOpenPublish() {
    setConfirmPublishOpen(true);
  }

  // Publishing shows the week to every rostered employee; confirm it (FE-83).
  function handlePublish() {
    publishRoster.mutate(roster.id, {
      onSuccess: () => {
        toast.success(`Published ${roster.name}`);
        setConfirmPublishOpen(false);
      },
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
              <Button size="sm" variant="outline" onClick={handleOpenAssign}>
                Assign
              </Button>
              <LoadingButton size="sm" variant="outline" onClick={handleOpenPublish} isPending={publishRoster.isPending}>
                Publish
              </LoadingButton>
            </>
          )}
          <AnimatedIconButton
            icon={expanded ? ChevronUpIcon : ChevronDownIcon}
            iconSize={16}
            variant="ghost"
            size="icon"
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
              {entriesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-5/6" />
                </div>
              ) : !entries?.length ? (
                canManage ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <p className="text-sm font-medium text-foreground">Nobody is rostered yet</p>
                    <p className="max-w-xs text-xs text-muted-foreground">
                      Add an employee against a day in this week, then publish the roster so they can see it.
                    </p>
                    <Button size="sm" className="mt-1" onClick={handleOpenAssign}>
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
                          entry.shiftId ? (shiftNameById.get(entry.shiftId) ?? "Unknown shift") : "—"
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

      {canManage && roster.status === "DRAFT" && (
        <ConfirmDialog
          open={confirmPublishOpen}
          onOpenChange={setConfirmPublishOpen}
          title={`Publish ${roster.name}?`}
          description="Everyone on this roster can see their shifts for the week once it is published."
          confirmLabel="Publish"
          isPending={publishRoster.isPending}
          keepOpenOnConfirm
          onConfirm={handlePublish}
        />
      )}

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

  // No route guard and useRosters is gated on hr:attendance:view: a denied
  // caller read "No rosters yet" (FE-47).
  const pageState = usePageState({ permission: "hr:attendance:view", isLoading, isError, error });

  if (pageState.kind !== "ready" && pageState.kind !== "empty") {
    return (
      <PageState
        resolution={pageState}
        className="flex-1"
        onRetry={handleRetry}
        loading={
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        }
      >
        {null}
      </PageState>
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
