"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useUpsertStandup } from "@/hooks/api/projects";
import {
  Form, FormField, FormItem, FormLabel, FormControl,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getErrorMessage } from "@/lib/get-error-message";
import type { StandupEntry, MeetingAttendee, ProjectMember } from "@/types/projects";

const standupSchema = z.object({
  yesterday: z.string(),
  today: z.string(),
  blockers: z.string(),
});

type StandupFormValues = z.infer<typeof standupSchema>;

interface StandupPanelProps {
  projectId: number;
  meetingId: number;
  standupEntries: StandupEntry[];
  attendees: MeetingAttendee[];
  projectMembers: ProjectMember[];
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
    const m = projectMembers.find((p) => p.userId === userId);
    return m?.user?.name ?? m?.user?.email ?? userId;
  }

  const otherEntries = standupEntries.filter((e) => e.userId !== currentUserId);

  const allAttendeeIds = new Set(attendees.map((a) => a.userId));
  const attendeesWithoutEntry = attendees
    .filter((a) => a.userId !== currentUserId && !standupEntries.some((e) => e.userId === a.userId))
    .map((a) => a.userId);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Standup</h3>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Update</p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
            <FormField control={form.control} name="yesterday" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Yesterday</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={2} placeholder="What did you do yesterday?" className="text-sm resize-none" />
                </FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="today" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Today</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={2} placeholder="What will you do today?" className="text-sm resize-none" />
                </FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="blockers" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Blockers</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={2} placeholder="Any blockers or impediments?" className="text-sm resize-none" />
                </FormControl>
              </FormItem>
            )} />
            <Button type="submit" size="sm" className="h-8 text-xs" disabled={upsertStandup.isPending}>
              {upsertStandup.isPending ? "Saving…" : "Save Standup"}
            </Button>
          </form>
        </Form>
      </div>

      {(otherEntries.length > 0 || attendeesWithoutEntry.length > 0) && (
        <>
          <Separator />
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Team Updates</p>
            {otherEntries.map((entry) => (
              <div key={entry.userId} className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-semibold text-foreground">{memberName(entry.userId)}</p>
                {entry.yesterday && (
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wide mb-0.5">Yesterday</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{entry.yesterday}</p>
                  </div>
                )}
                {entry.today && (
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wide mb-0.5">Today</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{entry.today}</p>
                  </div>
                )}
                {entry.blockers && (
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wide mb-0.5">Blockers</p>
                    <p className="text-sm text-amber-700 whitespace-pre-wrap">{entry.blockers}</p>
                  </div>
                )}
              </div>
            ))}
            {attendeesWithoutEntry.filter((id) => allAttendeeIds.has(id)).map((userId) => (
              <div key={userId} className="rounded-lg border border-dashed bg-muted/10 p-3">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{memberName(userId)}</span> — not submitted yet
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
