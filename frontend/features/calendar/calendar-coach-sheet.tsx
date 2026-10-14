"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCalendarCoach,
  useUpdateCalendarCoachConsent,
} from "@/hooks/api/calendar-coach";

export function CalendarCoachSheet({ onClose }: { onClose: () => void }) {
  const coach = useCalendarCoach();
  const update = useUpdateCalendarCoachConsent();
  const insight = coach.data;
  const changeConsent = async (enabled: boolean) => {
    if (!insight) return;
    try {
      await update.mutateAsync({
        enabled,
        expectedVersion: insight.consent.version,
      });
      toast.success(
        enabled ? "Personal insights enabled" : "Personal insights disabled",
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle>My time insights</SheetTitle>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-5 px-5 py-4">
          <p className="text-sm text-muted-foreground">
            Private, optional schedule guidance for you. These totals are not an
            employee score.
          </p>
          {coach.isLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading your preference
            </p>
          ) : null}
          {coach.isError ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive">
                {getErrorMessage(coach.error)}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  void coach.refetch();
                }}
              >
                Retry
              </Button>
            </div>
          ) : null}
          {insight ? (
            <>
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted p-3 dark:border dark:border-background">
                <div>
                  <p className="text-sm font-medium">Personal insights</p>
                  <p className="text-xs text-muted-foreground">
                    Only you can open this view.
                  </p>
                </div>
                <Switch
                  checked={insight.consent.enabled}
                  disabled={update.isPending}
                  aria-label={insight.consent.enabled ? "Turn off personal insights" : "Turn on personal insights"}
                  onCheckedChange={(checked) => {
                    void changeConsent(checked);
                  }}
                />
              </div>
              {insight.consent.enabled ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    Last 28 days ·{" "}
                    {insight.coverage === "complete"
                      ? "Sources complete"
                      : "Partial or unavailable source coverage"}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ["Scheduled meeting time", insight.meetingMinutes === null ? "Unavailable" : `${insight.coverage === "complete" ? "" : "At least "}${Math.round(insight.meetingMinutes / 60)} h`],
                      ["Protected work time", insight.protectedWorkMinutes === null ? "Unavailable" : `${insight.coverage === "complete" ? "" : "At least "}${Math.round(insight.protectedWorkMinutes / 60)} h`],
                      ["Calendar no-shows", insight.missedCommitments === null ? "Unavailable" : String(insight.missedCommitments)],
                      ["Repeated reschedules", insight.repeatedReschedules === null ? "Unavailable" : String(insight.repeatedReschedules)],
                      ["Currently overdue Tasks", insight.overdueTasks === null ? "Unavailable" : String(insight.overdueTasks)],
                      ["Currently overdue Build tickets", insight.overdueBuildTickets === null ? "Unavailable" : String(insight.overdueBuildTickets)],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg bg-muted p-3 dark:border dark:border-background">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-lg font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">
                      Suggestions to consider
                    </h3>
                    {insight.recommendations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No suggestions from the available data.
                      </p>
                    ) : (
                      insight.recommendations.map((item) => (
                        <div key={item.code} className="rounded-lg bg-muted p-3 dark:border dark:border-background">
                          <p className="text-sm font-medium">{item.proposal}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.evidence}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p>{insight.definitions.meetingMinutes}</p>
                    <p>{insight.definitions.protectedWorkMinutes}</p>
                    <p>{insight.definitions.missedCommitments}</p>
                    <p>{insight.definitions.repeatedReschedules}</p>
                    <p>{insight.definitions.overdueTasks}</p>
                    <p>{insight.definitions.overdueBuildTickets}</p>
                  </div>
                </>
              ) : null}
            </>
          ) : null}
        </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
