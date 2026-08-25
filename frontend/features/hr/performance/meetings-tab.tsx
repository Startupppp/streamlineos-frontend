"use client";

import { useState, useCallback } from "react";
import {
  useOneOnOneMeetings,
  useCreateOneOnOne,
  useUpdateOneOnOne,
  useDeleteOneOnOne,
} from "@/hooks/api/hr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HrSheet } from "@/features/hr/hr-sheet";
import { EmployeePicker } from "@/features/hr/shared/employee-picker";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { toast } from "sonner";
import { format } from "date-fns";
import { resolveImageUrl } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { Plus, Clock, Trash2 } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { OneOnOneMeeting, MeetingStatus } from "@/types/hr";
import { TruncatedText } from "@/components/ui/truncated-text";
import { meetingFormSchema } from "./meeting-schema";
import { zodFieldErrors } from "./zod-field-errors";

export function MeetingsTab() {
  const { data: meetings, isLoading } = useOneOnOneMeetings();
  const createMeeting = useCreateOneOnOne();
  const updateMeeting = useUpdateOneOnOne();
  const deleteMeeting = useDeleteOneOnOne();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [empId, setEmpId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("10:00");
  const [duration, setDuration] = useState("30");
  const [agenda, setAgenda] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const resetForm = useCallback(() => {
    setEmpId("");
    setScheduledDate("");
    setScheduledTime("10:00");
    setDuration("30");
    setAgenda("");
    setFieldErrors({});
  }, []);

  const handleCreate = useCallback(() => {
    const parsed = meetingFormSchema.safeParse({
      employeeId: empId,
      scheduledDate,
      scheduledTime,
      duration,
      agenda,
    });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});

    const [yr, mo, dy] = scheduledDate.split("-").map(Number);
    const [hr, mn] = scheduledTime.split(":").map(Number);
    const localDt = new Date(yr, mo - 1, dy, hr, mn, 0, 0);
    const numDuration = Number(duration);

    const isDuplicate = (meetings ?? []).some((m: OneOnOneMeeting) => {
      if (m.employeeId !== empId || m.status === "CANCELLED") return false;
      const diff = Math.abs(new Date(m.scheduledAt).getTime() - localDt.getTime());
      return diff < 60 * 60 * 1000;
    });
    if (isDuplicate) {
      setFieldErrors({ scheduledDate: "A meeting with this employee is already scheduled at this time" });
      return;
    }

    createMeeting.mutate(
      { employeeId: empId, scheduledAt: localDt.toISOString(), duration: numDuration, agenda: agenda.trim() },
      {
        onSuccess: () => {
          toast.success("Meeting scheduled");
          setSheetOpen(false);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [empId, scheduledDate, scheduledTime, duration, agenda, createMeeting, meetings, resetForm]);

  const handleStatusChange = useCallback((id: number, status: MeetingStatus) => {
    updateMeeting.mutate({ id, status }, {
      onSuccess: () => toast.success("Status updated"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [updateMeeting]);

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    deleteMeeting.mutate(deleteId, {
      onSuccess: () => { toast.success("Meeting deleted"); setDeleteId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteId, deleteMeeting]);

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);
  const handleDeleteDialogChange = useCallback((open: boolean) => { if (!open) setDeleteId(null); }, []);
  const handleScheduledDateChange = useCallback((value: string) => {
    setScheduledDate(value);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.scheduledDate;
      return next;
    });
  }, []);
  const handleScheduledTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setScheduledTime(e.target.value);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.scheduledTime;
      delete next.scheduledDate;
      return next;
    });
  }, []);
  const handleDurationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDuration(e.target.value);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.duration;
      return next;
    });
  }, []);
  const handleAgendaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAgenda(e.target.value);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.agenda;
      return next;
    });
  }, []);

  const handleEmpIdChange = useCallback((id: string) => {
    setEmpId(id);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.employeeId;
      return next;
    });
  }, []);

  if (isLoading) {
    return <LoadingState variant="list" rows={12} />;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      <div className="flex items-center justify-between shrink-0">
        <p className="text-sm text-muted-foreground">{meetings?.length ?? 0} meetings</p>
        <Button size="sm" onClick={handleOpenSheet}>
          <Plus className="h-3.5 w-3.5 mr-1" />Schedule 1-on-1
        </Button>
      </div>

      {!meetings?.length ? (
        <EmptyState
          illustration={<EmptyTeamIllustration className="h-full w-full" />}
          title="No 1-on-1 meetings scheduled"
          description="Schedule regular check-ins to support your team's growth and alignment."
          action={{ label: "Schedule 1-on-1", onClick: handleOpenSheet }}
        />
      ) : (
        <div className="space-y-2">
          {meetings.map((m: OneOnOneMeeting) => (
            <Card key={m.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex -space-x-2 shrink-0">
                  <Avatar className="w-7 border-2 border-background">
                    <AvatarImage src={resolveImageUrl(m.manager?.image ?? null)} />
                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{m.manager?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <Avatar className="w-7 border-2 border-background">
                    <AvatarImage src={resolveImageUrl(m.employee?.image ?? null)} />
                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{m.employee?.name?.[0]}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 min-w-0">
                  <TruncatedText text={`${m.manager?.name ?? ""} & ${m.employee?.name ?? ""}`} className="text-sm font-medium" />
                  <p className="text-micro text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(m.scheduledAt), "PPp")} &middot; {m.duration}min
                  </p>
                </div>
                <Badge variant={m.status === "COMPLETED" ? "default" : m.status === "CANCELLED" ? "destructive" : "outline"} className="text-micro shrink-0">
                  {m.status}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><AnimatedIconButton icon={EllipsisIcon} variant="ghost" size="icon" className="w-7" aria-label="Meeting actions" /></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {m.status === "SCHEDULED" && <DropdownMenuItem onClick={() => handleStatusChange(m.id, "COMPLETED")}>Mark Completed</DropdownMenuItem>}
                    {m.status === "SCHEDULED" && <DropdownMenuItem onClick={() => handleStatusChange(m.id, "CANCELLED")}>Cancel</DropdownMenuItem>}
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleteId(m.id)}><Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={(open) => { if (!open) resetForm(); setSheetOpen(open); }} title="Schedule 1-on-1" onSubmit={handleCreate} submitLabel="Schedule" isPending={createMeeting.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee</label>
          <EmployeePicker
            value={empId}
            onChange={handleEmpIdChange}
            placeholder="Select team member"
            className={fieldErrors.employeeId ? "border-destructive" : undefined}
          />
          {fieldErrors.employeeId && <p className="text-xs text-destructive">{fieldErrors.employeeId}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Date</label>
            <DatePicker value={scheduledDate ?? ""} onChange={handleScheduledDateChange} fromDate={new Date()} placeholder="Pick a date" className="text-sm" />
            {fieldErrors.scheduledDate && <p className="text-xs text-destructive">{fieldErrors.scheduledDate}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Time</label>
            <Input type="time" value={scheduledTime} onChange={handleScheduledTimeChange} />
            {fieldErrors.scheduledTime && <p className="text-xs text-destructive">{fieldErrors.scheduledTime}</p>}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Duration (min)</label>
          <Input type="number" min={15} max={480} step={15} value={duration} onChange={handleDurationChange} />
          {fieldErrors.duration && <p className="text-xs text-destructive">{fieldErrors.duration}</p>}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Agenda</label>
          <Textarea placeholder="Topics to discuss..." value={agenda} onChange={handleAgendaChange} rows={3} maxLength={1000} className="resize-none w-full" />
          {fieldErrors.agenda && <p className="text-xs text-destructive">{fieldErrors.agenda}</p>}
        </div>
      </HrSheet>

      <ConfirmSheet
        open={deleteId !== null}
        onOpenChange={handleDeleteDialogChange}
        title="Delete Meeting"
        description="Delete this 1-on-1 meeting?"
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        isPending={deleteMeeting.isPending}
      />
    </div>
  );
}
