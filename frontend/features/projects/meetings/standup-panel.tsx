"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useUpsertStandup } from "@/hooks/api/projects";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import { Separator } from "@/components/ui/separator";
import { getErrorMessage } from "@/lib/get-error-message";
import { getUserDisplayName } from "@/features/projects/shared/resolve-user-name";
import { cn } from "@/lib/utils";
import { PM_PANEL, PM_PANEL_SOLID } from "@/features/projects/shared/pm-chrome";
import { TEXT_ONE_LINE, TEXT_BODY } from "@/features/projects/shared/text-overflow";
import type { StandupEntry, MeetingAttendee, ProjectMemberRecord } from "@/types/projects";

const standupSchema = z.object({
  yesterday: z.string().trim().min(1, "Required"),
  today: z.string().trim().min(1, "Required"),
  blockers: z.string().trim().min(1, "Required"),
});

type StandupFormValues = z.infer<typeof standupSchema>;

interface StandupPanelProps {
  projectId: number;
  meetingId: number;
  standupEntries: StandupEntry[];
  attendees: MeetingAttendee[];
  projectMembers: ProjectMemberRecord[];
}

export function StandupPanel({
  projectId, meetingId, standupEntries, attendees, projectMembers,
}: StandupPanelProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const upsertStandup = useUpsertStandup(projectId, meetingId);

  const myEntry = standupEntries.find((e) => e.userId === currentUserId);

  const form = useForm<StandupFormValues>({
    resolver: zodResolver(standupSchema),
    defaultValues: { yesterday: "", today: "", blockers: "" },
  });

  useEffect(() => {
    form.reset({
      yesterday: myEntry?.yesterday ?? "",
      today: myEntry?.today ?? "",
      blockers: myEntry?.blockers ?? "",
    });
  }, [myEntry, form]);

  function handleSubmit(values: StandupFormValues) {
    upsertStandup.mutate(
      {
        yesterday: values.yesterday || undefined,
        today: values.today || undefined,
        blockers: values.blockers || undefined,
      },
      {
        onSuccess: () => toast.success("Standup saved"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function memberName(userId: string): string {
    const m = projectMembers.find((p) => p.id === userId);
    return getUserDisplayName(m) || "Unknown";
  }

  const otherEntries = standupEntries.filter((e) => e.userId !== currentUserId);

  const allAttendeeIds = new Set(attendees.map((a) => a.userId));
  const attendeesWithoutEntry = attendees
    .filter((a) => a.userId !== currentUserId && !standupEntries.some((e) => e.userId === a.userId))
    .map((a) => a.userId);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Standup</h3>

      <div className={cn(PM_PANEL_SOLID, "space-y-3 p-4")}>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your Update</p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
            <FormField control={form.control} name="yesterday" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Yesterday</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={2} placeholder="What did you do yesterday?" className="resize-none text-sm" />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )} />
            <FormField control={form.control} name="today" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Today</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={2} placeholder="What will you do today?" className="resize-none text-sm" />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )} />
            <FormField control={form.control} name="blockers" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Blockers</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={2} placeholder="Any blockers or impediments?" className="resize-none text-sm" />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )} />
            <LoadingButton type="submit" size="sm" className="text-xs" isPending={upsertStandup.isPending} loadingText="Saving…">
              Save Standup
            </LoadingButton>
          </form>
        </Form>
      </div>

      {(otherEntries.length > 0 || attendeesWithoutEntry.length > 0) ? (
        <>
          <Separator />
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Team Updates</p>
            {otherEntries.map((entry) => (
              <div key={entry.userId} className={cn(PM_PANEL, "space-y-2 p-3")}>
                <p className={cn(TEXT_ONE_LINE, "text-xs font-semibold text-foreground")}>
                  {memberName(entry.userId)}
                </p>
                {entry.yesterday ? (
                  <div>
                    <p className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Yesterday</p>
                    <p className={cn(TEXT_BODY, "whitespace-pre-wrap text-sm text-foreground")}>{entry.yesterday}</p>
                  </div>
                ) : null}
                {entry.today ? (
                  <div>
                    <p className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Today</p>
                    <p className={cn(TEXT_BODY, "whitespace-pre-wrap text-sm text-foreground")}>{entry.today}</p>
                  </div>
                ) : null}
                {entry.blockers ? (
                  <div>
                    <p className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Blockers</p>
                    <p className={cn(TEXT_BODY, "whitespace-pre-wrap text-sm text-amber-700 dark:text-amber-400")}>
                      {entry.blockers}
                    </p>
                  </div>
                ) : null}
              </div>
            ))}
            {attendeesWithoutEntry.filter((id) => allAttendeeIds.has(id)).map((userId) => (
              <div key={userId} className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-3">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{memberName(userId)}</span> — not submitted yet
                </p>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
