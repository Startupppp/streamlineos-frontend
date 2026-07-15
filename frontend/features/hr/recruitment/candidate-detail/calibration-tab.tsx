"use client";

import { useState, useCallback } from "react";
import {
  useCalibrationSessions,
  useCreateCalibration,
  useUpdateCalibration,
} from "@/hooks/api/hr/recruitment";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetBody,
} from "@/components/ui/sheet";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { toast } from "sonner";
import { Plus, Users, Calendar, CheckCircle, Pencil, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CalibrationTabProps {
  candidateId: number;
}

const DECISIONS = [
  { value: "STRONG_HIRE", label: "Strong Hire", badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800" },
  { value: "HIRE", label: "Hire", badgeClass: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800" },
  { value: "HOLD", label: "Hold", badgeClass: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800" },
  { value: "NO_HIRE", label: "No Hire", badgeClass: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800" },
] as const;

const STATUS_CONFIG = {
  completed: { label: "Completed", accentClass: "border-l-emerald-500", badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800" },
  scheduled: { label: "Scheduled", accentClass: "border-l-blue-500", badgeClass: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800" },
  cancelled: { label: "Cancelled", accentClass: "border-l-rose-500", badgeClass: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800" },
  pending: { label: "Pending", accentClass: "border-l-amber-500", badgeClass: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800" },
} as const;

type SessionStatus = keyof typeof STATUS_CONFIG;

function getStatusConfig(s: string) {
  return STATUS_CONFIG[s as SessionStatus] ?? STATUS_CONFIG.pending;
}

function DecisionBadge({ decision }: { decision: string | null }) {
  if (!decision) return null;
  const found = DECISIONS.find((x) => x.value === decision);
  if (!found) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
      {decision}
    </span>
  );
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border", found.badgeClass)}>
      {found.label}
    </span>
  );
}

export function CalibrationTab({ candidateId }: CalibrationTabProps) {
  const { data: sessions, isLoading } = useCalibrationSessions(candidateId);
  const createCalibration = useCreateCalibration(candidateId);
  const updateCalibration = useUpdateCalibration(candidateId);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [decision, setDecision] = useState<string>("");
  const [status, setStatus] = useState<string>("pending");

  const resetForm = useCallback(() => {
    setScheduledAt("");
    setNotes("");
    setDecision("");
    setStatus("pending");
    setEditingId(null);
  }, []);

  const handleCreate = useCallback(() => {
    createCalibration.mutate(
      {
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Calibration session created");
          setSheetOpen(false);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [scheduledAt, notes, createCalibration, resetForm]);

  const handleUpdate = useCallback(() => {
    if (!editingId) return;
    updateCalibration.mutate(
      {
        id: editingId,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        notes: notes || null,
        decision: decision ? (decision as "STRONG_HIRE" | "HIRE" | "NO_HIRE" | "HOLD") : null,
        status: status as "pending" | "scheduled" | "completed" | "cancelled",
      },
      {
        onSuccess: () => {
          toast.success("Session updated");
          setSheetOpen(false);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [editingId, scheduledAt, notes, decision, status, updateCalibration, resetForm]);

  const openEdit = useCallback(
    (session: NonNullable<typeof sessions>[number]) => {
      setEditingId(session.id);
      setScheduledAt(session.scheduledAt ? new Date(session.scheduledAt).toISOString().slice(0, 16) : "");
      setNotes(session.notes ?? "");
      setDecision(session.decision ?? "");
      setStatus(session.status);
      setSheetOpen(true);
    },
    []
  );

  const handleOpenNew = useCallback(() => {
    resetForm();
    setSheetOpen(true);
  }, [resetForm]);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) resetForm();
  }, [resetForm]);

  const handleMarkComplete = useCallback((sessionId: number) => {
    updateCalibration.mutate(
      { id: sessionId, status: "completed" },
      { onSuccess: () => toast.success("Marked as completed") }
    );
  }, [updateCalibration]);

  const handleCancelSheet = useCallback(() => {
    setSheetOpen(false);
    resetForm();
  }, [resetForm]);

  const handleScheduledAtChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setScheduledAt(e.target.value);
  }, []);

  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full rounded-lg" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
          Calibration sessions align the hiring team on a final decision after scorecards are submitted.
        </p>
        <Button size="sm" onClick={handleOpenNew} className="h-8 gap-1.5 shrink-0">
          <Plus className="h-3.5 w-3.5" />
          New Session
        </Button>
      </div>

      {!sessions?.length ? (
        <RecruitmentEmptyState
          illustrationPreset="team"
          title="No calibration sessions yet"
          description="Schedule a calibration session to align your hiring team on a decision."
          action={{ label: "New Session", onClick: handleOpenNew }}
          compact
        />
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const cfg = getStatusConfig(session.status);
            return (
              <div
                key={session.id}
                className={cn(
                  "rounded-2xl border border-border bg-card shadow-sm overflow-hidden border-l-4 transition-colors duration-200",
                  cfg.accentClass
                )}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
                        <TrendingUp className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Calibration #{session.id}
                        </p>
                        {session.scheduledAt && (
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(session.scheduledAt), "PPp")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {session.decision && <DecisionBadge decision={session.decision} />}
                      <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border", cfg.badgeClass)}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>

                  {session.participantIds.length > 0 && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-2">
                      <Users className="h-3 w-3" />
                      {session.participantIds.length} participant{session.participantIds.length !== 1 ? "s" : ""}
                    </p>
                  )}

                  {session.notes && (
                    <div className="mt-3 rounded-lg bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {session.notes}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      onClick={() => openEdit(session)}
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
                    {session.status !== "completed" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        onClick={() => handleMarkComplete(session.id)}
                      >
                        <CheckCircle className="h-3 w-3" />
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="flex flex-col p-0 gap-0">
          <SheetHeader className="px-4 pt-4 pb-3 border-b">
            <SheetTitle className="text-base font-semibold">
              {editingId ? "Edit Calibration Session" : "New Calibration Session"}
            </SheetTitle>
          </SheetHeader>

          <SheetBody className="px-4 py-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80">Scheduled Date &amp; Time</label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={handleScheduledAtChange}
              />
            </div>

            {editingId && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/80">Status</label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="w-[var(--radix-select-trigger-width)]">
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/80">Decision</label>
                  <Select value={decision} onValueChange={setDecision}>
                    <SelectTrigger><SelectValue placeholder="No decision yet" /></SelectTrigger>
                    <SelectContent className="w-[var(--radix-select-trigger-width)]">
                      {DECISIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80">Notes</label>
              <Textarea
                placeholder="Discussion points, consensus, action items..."
                value={notes}
                onChange={handleNotesChange}
                rows={6}
              />
            </div>
          </SheetBody>

          <SheetFooter className="px-4 py-3 border-t flex-row gap-2">
            <Button variant="outline" className="flex-1 h-9" onClick={handleCancelSheet}>
              Cancel
            </Button>
            <Button
              className="flex-1 h-9"
              onClick={editingId ? handleUpdate : handleCreate}
              disabled={createCalibration.isPending || updateCalibration.isPending}
            >
              {editingId ? "Save Changes" : "Create Session"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
