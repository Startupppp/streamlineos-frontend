"use client";

import { useState, useCallback, useMemo } from "react";
import {
  useOneOnOneMeetings,
  useCreateOneOnOne,
  useUpdateOneOnOne,
  useDeleteOneOnOne,
  useHrEmployees,
} from "@/lib/api/hooks/hr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { resolveImageUrl } from "@/lib/utils";
import { Plus, Users, Clock, MoreHorizontal, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Employee, OneOnOneMeeting, MeetingStatus } from "@/types/hr";

export function OneOnOnesTab() {
  const { data: meetings, isLoading } = useOneOnOneMeetings();
  const { data: employeesRaw } = useHrEmployees();
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

  const employees = useMemo(
    () =>
      (Array.isArray(employeesRaw)
        ? employeesRaw
        : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[],
    [employeesRaw]
  );

  const handleCreate = useCallback(() => {
    if (!empId.trim()) { toast.error("Please select an employee"); return; }
    if (!scheduledDate.trim()) { toast.error("Please select a date"); return; }
    createMeeting.mutate(
      {
        employeeId: empId,
        scheduledAt: `${scheduledDate}T${scheduledTime}`,
        duration: Number(duration) || 30,
        agenda: agenda || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Meeting scheduled");
          setSheetOpen(false);
          setEmpId("");
          setScheduledDate("");
          setScheduledTime("10:00");
          setAgenda("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [empId, scheduledDate, scheduledTime, duration, agenda, createMeeting]);

  const handleStatusChange = useCallback(
    (id: number, status: MeetingStatus) => {
      updateMeeting.mutate(
        { id, status },
        {
          onSuccess: () => toast.success("Status updated"),
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    },
    [updateMeeting]
  );

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    deleteMeeting.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Meeting deleted");
        setDeleteId(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteId, deleteMeeting]);

  const handleSheetOpen = useCallback(() => setSheetOpen(true), []);
  const handleDeleteDialogChange = useCallback(
    (open: boolean) => { if (!open) setDeleteId(null); },
    []
  );
  const handleScheduledDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setScheduledDate(e.target.value),
    []
  );
  const handleScheduledTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setScheduledTime(e.target.value),
    []
  );
  const handleDurationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setDuration(e.target.value),
    []
  );
  const handleAgendaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setAgenda(e.target.value),
    []
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{meetings?.length ?? 0} meetings</p>
        <Button size="sm" onClick={handleSheetOpen}>
          <Plus className="h-3.5 w-3.5 mr-1" />Schedule 1-on-1
        </Button>
      </div>

      {!meetings?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No 1-on-1 meetings scheduled.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {meetings.map((m: OneOnOneMeeting) => (
            <MeetingCard
              key={m.id}
              meeting={m}
              onStatusChange={handleStatusChange}
              onDeleteRequest={setDeleteId}
            />
          ))}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Schedule 1-on-1"
        onSubmit={handleCreate}
        submitLabel="Schedule"
        isPending={createMeeting.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee</label>
          <Select value={empId} onValueChange={setEmpId}>
            <SelectTrigger>
              <SelectValue placeholder="Select team member" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name ?? e.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Date</label>
            <Input type="date" value={scheduledDate} onChange={handleScheduledDateChange} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Time</label>
            <Input type="time" value={scheduledTime} onChange={handleScheduledTimeChange} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Duration (min)</label>
          <Input type="number" value={duration} onChange={handleDurationChange} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Agenda</label>
          <Textarea
            placeholder="Topics to discuss..."
            value={agenda}
            onChange={handleAgendaChange}
            rows={3}
          />
        </div>
      </HrSheet>

      <ConfirmActionDialog
        open={deleteId !== null}
        onOpenChange={handleDeleteDialogChange}
        title="Delete Meeting"
        description="Delete this 1-on-1 meeting?"
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isPending={deleteMeeting.isPending}
      />
    </div>
  );
}

interface MeetingCardProps {
  meeting: OneOnOneMeeting;
  onStatusChange: (id: number, status: MeetingStatus) => void;
  onDeleteRequest: (id: number) => void;
}

function MeetingCard({ meeting: m, onStatusChange, onDeleteRequest }: MeetingCardProps) {
  const handleMarkCompleted = useCallback(
    () => onStatusChange(m.id, "COMPLETED"),
    [onStatusChange, m.id]
  );
  const handleCancel = useCallback(
    () => onStatusChange(m.id, "CANCELLED"),
    [onStatusChange, m.id]
  );
  const handleDeleteRequest = useCallback(
    () => onDeleteRequest(m.id),
    [onDeleteRequest, m.id]
  );

  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="flex -space-x-2 shrink-0">
          <Avatar className="h-7 w-7 border-2 border-background">
            <AvatarImage src={resolveImageUrl(m.manager?.image ?? null)} />
            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
              {m.manager?.name?.[0]}
            </AvatarFallback>
          </Avatar>
          <Avatar className="h-7 w-7 border-2 border-background">
            <AvatarImage src={resolveImageUrl(m.employee?.image ?? null)} />
            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
              {m.employee?.name?.[0]}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {m.manager?.name} &amp; {m.employee?.name}
          </p>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(m.scheduledAt), "PPp")} &middot; {m.duration}min
          </p>
        </div>
        <Badge
          variant={
            m.status === "COMPLETED"
              ? "default"
              : m.status === "CANCELLED"
                ? "destructive"
                : "outline"
          }
          className="text-[10px] shrink-0"
        >
          {m.status}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {m.status === "SCHEDULED" && (
              <DropdownMenuItem onClick={handleMarkCompleted}>Mark Completed</DropdownMenuItem>
            )}
            {m.status === "SCHEDULED" && (
              <DropdownMenuItem onClick={handleCancel}>Cancel</DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-destructive" onClick={handleDeleteRequest}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}
