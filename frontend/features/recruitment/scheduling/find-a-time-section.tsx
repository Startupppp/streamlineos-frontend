"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useRecruiters } from "@/hooks/api/hr/recruitment";
import { SuggestSlotsPanel } from "./suggest-slots-panel";

/**
 * Picks a panel, then asks when they are all free.
 *
 * Sourced from the recruiters list because that is the only interviewer roster
 * this side already has; an interviewer who is not on it can still be scheduled
 * by hand, which is the same fallback the rest of this feature leans on.
 */
export function FindATimeSection() {
  const { data, isLoading, isError } = useRecruiters();
  const [selected, setSelected] = useState<string[]>([]);

  const handleToggle = useCallback((userId: string) => {
    setSelected((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }, []);

  const handlePick = useCallback((startIso: string) => {
    /*
      Copied rather than written into a form: nothing on this page creates a
      booking link yet, and a button that silently did nothing would be worse
      than one that hands the recruiter the time to paste where they need it.
    */
    navigator.clipboard
      .writeText(startIso)
      .then(() => toast.success("Slot copied"))
      .catch(() => toast.error("Could not copy that time."));
  }, []);

  if (isError) return null;

  return (
    <div className="space-y-3">
      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">Panel</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pick everyone who has to be in the room.
            </p>
          </div>
          {isLoading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <div className="flex flex-wrap gap-2">
              {(data ?? []).map((recruiter) => (
                <RecruiterChip
                  key={recruiter.userId}
                  userId={recruiter.userId}
                  name={recruiter.name}
                  selected={selected.includes(recruiter.userId)}
                  onToggle={handleToggle}
                />
              ))}
              {(data ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No interviewers on record yet. Anyone who has run an interview appears here.
                </p>
              )}
            </div>
          )}
          {selected.length > 0 && (
            <Badge variant="outline" className="text-micro">
              {selected.length} selected
            </Badge>
          )}
        </CardContent>
      </Card>

      <SuggestSlotsPanel panelUserIds={selected} onPick={handlePick} />
    </div>
  );
}

function RecruiterChip({
  userId,
  name,
  selected,
  onToggle,
}: {
  userId: string;
  name: string | null;
  selected: boolean;
  onToggle: (userId: string) => void;
}) {
  const handleClick = useCallback(() => onToggle(userId), [onToggle, userId]);
  return (
    <Button
      type="button"
      size="sm"
      variant={selected ? "default" : "outline"}
      className={cn("h-8", selected && "shadow-sm")}
      onClick={handleClick}
    >
      {name ?? "Unnamed interviewer"}
    </Button>
  );
}
