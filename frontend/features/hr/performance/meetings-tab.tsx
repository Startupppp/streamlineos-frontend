"use client";

import { useState, useCallback, useMemo } from "react";
import {
  useOneOnOneMeetings,
  useCreateOneOnOne,
  useUpdateOneOnOne,
  useDeleteOneOnOne,
  useHrEmployees,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { resolveImageUrl, cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { Plus, Clock, MoreHorizontal, Trash2, ChevronsUpDown, Check } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Employee, OneOnOneMeeting, MeetingStatus } from "@/types/hr";

export function MeetingsTab() {
  const { data: meetings, isLoading } = useOneOnOneMeetings();
  const { data: employeesRaw } = useHrEmployees();
  const createMeeting = useCreateOneOnOne();
  const updateMeeting = useUpdateOneOnOne();
  const deleteMeeting = useDeleteOneOnOne();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [empId, setEmpId] = useState("");
  const [empPickerOpen, setEmpPickerOpen] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("10:00");
  const [duration, setDuration] = useState("30");
  const [agenda, setAgenda] = useState("");

  const employees = useMemo(
    () => ((Array.isArray(employeesRaw) ? employeesRaw : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[]).filter((e) => !!e.id),
    [employeesRaw]
  );

  const resetForm = useCallback(() => {
    setEmpId("");
    setScheduledDate("");
    setScheduledTime("10:00");
    setDuration("30");
    setAgenda("");
  }, []);

  const handleCreate = useCallback(() => {
    if (!empId.trim()) { toast.error("Please select an employee"); return; }
    if (!scheduledDate.trim()) { toast.error("Please select a date"); return; }
    const numDuration = Number(duration);
    if (!Number.isInteger(numDuration) || numDuration < 15 || numDuration > 480) {
      toast.error("Duration must be a whole number between 15 and 480 minutes");
      return;
    }
    if (!agenda.trim()) { toast.error("Agenda is required"); return; }

    const [yr, mo, dy] = scheduledDate.split("-").map(Number);
    const [hr, mn] = scheduledTime.split(":").map(Number);
    const localDt = new Date(yr, mo - 1, dy, hr, mn, 0, 0);

    if (localDt <= new Date()) { toast.error("Meeting date must be in the future"); return; }

    const isDuplicate = (meetings ?? []).some((m: OneOnOneMeeting) => {
      if (m.employeeId !== empId || m.status === "CANCELLED") return false;
      const diff = Math.abs(new Date(m.scheduledAt).getTime() - localDt.getTime());
      return diff < 60 * 60 * 1000;
    });
    if (isDuplicate) { toast.error("A meeting with this employee is already scheduled at this time"); return; }

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
  const handleScheduledDateChange = useCallback((value: string) => setScheduledDate(value), []);
  const handleScheduledTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setScheduledTime(e.target.value), []);
  const handleDurationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setDuration(e.target.value), []);
  const handleAgendaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setAgenda(e.target.value), []);

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
                  <p className="text-sm font-medium truncate">{m.manager?.name} & {m.employee?.name}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(m.scheduledAt), "PPp")} &middot; {m.duration}min
                  </p>
                </div>
                <Badge variant={m.status === "COMPLETED" ? "default" : m.status === "CANCELLED" ? "destructive" : "outline"} className="text-[10px] shrink-0">
                  {m.status}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
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
          <Popover open={empPickerOpen} onOpenChange={setEmpPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={empPickerOpen} className="w-full justify-between font-normal">
                <span className="truncate">{employees.find((e) => e.id === empId)?.name ?? employees.find((e) => e.id === empId)?.email ?? "Select team member"}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search employees..." />
                <CommandList className="max-h-48 overflow-y-auto">
                  <CommandEmpty>No employee found.</CommandEmpty>
                  <CommandGroup>
                    {employees.map((e) => (
                      <CommandItem key={e.id} value={`${e.name ?? ""} ${e.email}`} onSelect={() => { setEmpId(e.id); setEmpPickerOpen(false); }}>
                        <Check className={cn("mr-2 h-4 w-4", empId === e.id ? "opacity-100" : "opacity-0")} />
                        {e.name ?? e.email}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Date</label>
            <DatePicker value={scheduledDate ?? ""} onChange={handleScheduledDateChange} fromDate={new Date()} placeholder="Pick a date" className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Time</label>
            <Input type="time" value={scheduledTime} onChange={handleScheduledTimeChange} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Duration (min)</label>
          <Input type="number" min={15} max={480} step={15} value={duration} onChange={handleDurationChange} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Agenda</label>
          <Textarea placeholder="Topics to discuss..." value={agenda} onChange={handleAgendaChange} rows={3} maxLength={1000} className="resize-none w-full" />
        </div>
      </HrSheet>

      <ConfirmDialog
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
