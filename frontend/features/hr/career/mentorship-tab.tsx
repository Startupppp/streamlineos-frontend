"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";
import { MemberPicker } from "@/components/shared";
import { useMentorships, useCreateMentorship, useUpdateMentorship } from "@/hooks/api/hr/mentorship";
import { useOrgMembers } from "@/hooks/api/organization";
import {
  getUserDisplayName,
  type NamedUser,
} from "@/features/projects/shared/resolve-user-name";
import { TruncatedText } from "@/components/ui/truncated-text";

const STATUS_CONFIG = {
  active: { label: "Active", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" },
  completed: { label: "Completed", className: "bg-muted text-muted-foreground" },
  paused: { label: "Paused", className: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" },
};

const MentorshipRow = memo(function MentorshipRow({
  mentorLabel,
  menteeLabel,
  goal,
  status,
  statusClassName,
  statusLabel,
  onComplete,
}: {
  mentorLabel: string;
  menteeLabel: string;
  goal?: string | null;
  status: string;
  statusClassName: string;
  statusLabel: string;
  onComplete: () => void;
}) {
  return (
    <Card>
      <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">{mentorLabel} → {menteeLabel}</p>
          {goal && <TruncatedText text={goal} className="text-xs text-muted-foreground mt-0.5" />}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className={`text-xs ${statusClassName}`}>{statusLabel}</Badge>
          {status === "active" && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={onComplete}>Complete</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export function MentorshipTab() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ mentorId: "", menteeId: "", goal: "", startedAt: "" });

  const { data: mentorships = [], isLoading } = useMentorships();
  const { data: membersData } = useOrgMembers(1, 200);
  const create = useCreateMentorship();
  const update = useUpdateMentorship();

  const memberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of membersData?.data ?? []) {
      map.set(member.userId, { name: member.name, email: member.email });
    }
    return map;
  }, [membersData]);

  const resolveMemberName = useCallback(
    (userId: string) => {
      const member = memberById.get(userId);
      return member ? getUserDisplayName(member) : userId;
    },
    [memberById],
  );

  async function handleCreate() {
    if (!form.mentorId || !form.menteeId) { toast.error("Mentor and mentee are required"); return; }
    try {
      await create.mutateAsync({ mentorId: form.mentorId, menteeId: form.menteeId, goal: form.goal || undefined, startedAt: form.startedAt || undefined });
      toast.success("Mentorship created");
      setOpen(false);
      setForm({ mentorId: "", menteeId: "", goal: "", startedAt: "" });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleComplete(id: number) {
    try {
      await update.mutateAsync({ id, status: "completed" });
      toast.success("Mentorship completed");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-14 bg-muted rounded animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{mentorships.length} mentorship{mentorships.length !== 1 ? "s" : ""}</p>
        <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setOpen(true)}>New Mentorship</Button>
      </div>

      {mentorships.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-36 text-sm text-muted-foreground gap-2">
          <span>No mentorships yet</span>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Create first</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {mentorships.map((m) => {
            const cfg = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.active;
            return (
              <MentorshipRow
                key={m.id}
                mentorLabel={resolveMemberName(m.mentorId)}
                menteeLabel={resolveMemberName(m.menteeId)}
                goal={m.goal}
                status={m.status}
                statusClassName={cfg.className}
                statusLabel={cfg.label}
                onComplete={() => handleComplete(m.id)}
              />
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90dvh] flex-col gap-0 p-0">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <DialogTitle>New Mentorship</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3 px-6 py-4">
            <div className="space-y-1">
              <Label>Mentor</Label>
              <MemberPicker
                mode="single"
                value={form.mentorId || undefined}
                onChange={(id) => setForm((p) => ({ ...p, mentorId: id ?? "" }))}
                placeholder="Select mentor"
              />
            </div>
            <div className="space-y-1">
              <Label>Mentee</Label>
              <MemberPicker
                mode="single"
                value={form.menteeId || undefined}
                onChange={(id) => setForm((p) => ({ ...p, menteeId: id ?? "" }))}
                placeholder="Select mentee"
              />
            </div>
            <div className="space-y-1">
              <Label>Goal</Label>
              <Input value={form.goal} onChange={(e) => setForm((p) => ({ ...p, goal: e.target.value }))} placeholder="Mentorship goal" />
            </div>
            <div className="space-y-1">
              <Label>Start Date</Label>
              <Input type="date" value={form.startedAt} onChange={(e) => setForm((p) => ({ ...p, startedAt: e.target.value }))} />
            </div>
          </DialogBody>
          <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <LoadingButton className="bg-primary hover:bg-primary/90 text-primary-foreground" isPending={create.isPending} onClick={handleCreate}>Create</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
