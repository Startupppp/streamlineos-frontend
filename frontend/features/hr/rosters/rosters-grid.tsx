"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ChevronDownIcon, ChevronUpIcon } from "@animateicons/react/lucide";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRosters, useRosterEntries, usePublishRoster } from "@/hooks/api/hr/rosters";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api-client";
import { TruncatedText } from "@/components/ui/truncated-text";

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
  const { data: entries } = useRosterEntries(expanded ? roster.id : 0);
  const publishRoster = usePublishRoster();

  function handleToggle() {
    setExpanded((v) => !v);
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
          <Badge variant={STATUS_VARIANTS[roster.status] ?? "secondary"} className="text-[11px]">
            {roster.status}
          </Badge>
          {canManage && roster.status === "DRAFT" && (
            <Button size="sm" variant="outline" className="text-xs" onClick={handlePublish} disabled={publishRoster.isPending}>
              Publish
            </Button>
          )}
          <AnimatedIconButton
            icon={expanded ? ChevronUpIcon : ChevronDownIcon}
            iconSize={16}
            variant="ghost"
            size="icon"
            className="w-7"
            onClick={handleToggle}
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
                <ChartEmptyState message="No entries in this roster" height={120} compact />
              ) : (
                <div className="space-y-1">
                  {entries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
                      <span className="text-muted-foreground">{entry.userId} — {entry.date}</span>
                      <span className="font-medium">
                        {entry.isDayOff ? (
                          <Badge variant="secondary" className="text-[10px]">Day Off</Badge>
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
    </div>
  );
}

export function RostersGrid({ canManage }: Props) {
  const { data: rosters, isLoading } = useRosters();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
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
