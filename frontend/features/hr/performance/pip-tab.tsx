"use client";

import { useState, useCallback, useMemo, type ChangeEvent } from "react";
import {
  usePIPs,
  useCreatePIP,
  useUpdatePIP,
  useHrEmployees,
  unwrapEmployees,
  type PIP,
} from "@/hooks/api/hr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyApprovalIllustration } from "@/components/illustrations";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { HrSheet } from "@/features/hr/hr-sheet";
import { toast } from "sonner";
import { resolveImageUrl, cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  clearEndIfInvalid,
  planningEndPickerProps,
  planningStartPickerProps,
} from "@/lib/date-constraints";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Trash2, Pencil,
  CheckCircle2, Calendar, ChevronsUpDown, Check,
} from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buildPipSchema } from "./pip-schema";
import { zodFieldErrors } from "./zod-field-errors";

export function PIPTab() {
  const { data: pips, isLoading } = usePIPs();
  const { data: employeesRaw } = useHrEmployees({ limit: 100 });
  const createPIP = useCreatePIP();
  const updatePIP = useUpdatePIP();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPip, setEditingPip] = useState<PIP | null>(null);
  const [pipUserId, setPipUserId] = useState("");
  const [pipUserPickerOpen, setPipUserPickerOpen] = useState(false);
  const [hrRepPickerOpen, setHrRepPickerOpen] = useState(false);
  const [hrRepId, setHrRepId] = useState("");
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [managerRating, setManagerRating] = useState("");
  const [objectives, setObjectives] = useState([{ objective: "", metric: "", deadline: "" }]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const employees = useMemo(
    () => unwrapEmployees(employeesRaw).filter((e) => !!e.id),
    [employeesRaw],
  );

  const hrEmployees = useMemo(
    () => employees.filter((e) => e.isActive && e.role === "HR"),
    [employees]
  );

  const pipsList = useMemo(() => (Array.isArray(pips) ? pips : []) as PIP[], [pips]);

  const resetForm = useCallback(() => {
    setPipUserId("");
    setHrRepId("");
    setReason("");
    setStartDate("");
    setEndDate("");
    setNotes("");
    setManagerRating("");
    setObjectives([{ objective: "", metric: "", deadline: "" }]);
    setEditingPip(null);
    setFieldErrors({});
  }, []);

  const handleManagerRatingChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") { setManagerRating(""); return; }
    const n = Math.min(5, Math.max(1, Math.round(Number(raw))));
    setManagerRating(String(n));
  }, []);

  const handleOpenEdit = useCallback((pip: PIP) => {
    setEditingPip(pip);
    setPipUserId(pip.userId);
    setHrRepId(pip.hrRepId ?? "");
    setReason(pip.reason);
    setStartDate(pip.startDate);
    setEndDate(pip.endDate);
    setNotes(pip.notes ?? "");
    setManagerRating("");
    setObjectives(pip.objectives && pip.objectives.length > 0 ? pip.objectives : [{ objective: "", metric: "", deadline: "" }]);
    setFieldErrors({});
    setSheetOpen(true);
  }, []);

  const handleSubmit = useCallback(() => {
    const completeObjectives = objectives.filter(
      (o) => o.objective.trim() && o.metric.trim() && o.deadline,
    );
    const schema = buildPipSchema({ enforceFutureStart: !editingPip });
    const parsed = schema.safeParse({
      userId: pipUserId,
      hrRepId,
      reason,
      startDate,
      endDate,
      notes,
      objectives:
        completeObjectives.length > 0
          ? completeObjectives
          : [{ objective: "", metric: "", deadline: "" }],
    });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});

    const data = parsed.data;
    const payload = {
      reason: data.reason,
      objectives: data.objectives.map((o) => ({
        objective: o.objective,
        metric: o.metric,
        deadline: o.deadline,
      })),
      endDate: data.endDate,
      notes: data.notes || undefined,
      hrRepId: data.hrRepId || undefined,
    };

    if (editingPip) {
      updatePIP.mutate(
        { id: editingPip.id, ...payload },
        {
          onSuccess: () => { toast.success("PIP updated"); setSheetOpen(false); resetForm(); },
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    } else {
      const existingActive = pipsList.find((p) => p.userId === pipUserId && (p.status === "ACTIVE" || p.status === "EXTENDED"));
      if (existingActive) {
        setFieldErrors({ userId: "This employee already has an active PIP" });
        return;
      }

      createPIP.mutate(
        { userId: data.userId, startDate: data.startDate, ...payload },
        {
          onSuccess: () => { toast.success("PIP created"); setSheetOpen(false); resetForm(); },
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    }
  }, [pipUserId, hrRepId, reason, startDate, endDate, notes, objectives, pipsList, editingPip, createPIP, updatePIP, resetForm]);

  const handleUpdateStatus = useCallback((id: number, status: string) => {
    updatePIP.mutate({ id, status }, {
      onSuccess: () => toast.success("PIP updated"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [updatePIP]);

  const addObjective = useCallback(() => {
    setObjectives((prev) => [...prev, { objective: "", metric: "", deadline: "" }]);
  }, []);

  const removeObjective = useCallback((index: number) => {
    setObjectives((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateObjectiveField = useCallback((index: number, field: "objective" | "metric" | "deadline", value: string) => {
    setObjectives((prev) => prev.map((o, i) => (i === index ? { ...o, [field]: value } : o)));
  }, []);

  const handleOpenCreate = useCallback(() => { resetForm(); setSheetOpen(true); }, [resetForm]);
  const handleSheetOpenChange = useCallback((open: boolean) => { if (!open) resetForm(); setSheetOpen(open); }, [resetForm]);
  const handleReasonChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value), []);
  const handleStartDateChange = useCallback((value: string) => {
    setStartDate(value);
    setEndDate((prev) => clearEndIfInvalid(value, prev, "after"));
  }, []);
  const handleEndDateChange = useCallback((value: string) => setEndDate(value), []);
  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value), []);

  const pipStartBounds = planningStartPickerProps({
    existingValue: editingPip ? startDate : undefined,
  });
  const pipEndBounds = planningEndPickerProps({
    startDate,
    mode: "after",
    existingValue: editingPip ? endDate : undefined,
  });
  const objectiveDeadlineBounds = planningEndPickerProps({
    startDate,
    mode: "after",
    existingValue: editingPip ? startDate : undefined,
  });

  if (isLoading) {
    return <LoadingState variant="list" rows={12} />;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      <div className="flex items-center justify-between shrink-0">
        <p className="text-sm text-muted-foreground">{pipsList.length} performance improvement plans</p>
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="h-3.5 w-3.5 mr-1" />New PIP
        </Button>
      </div>

      {pipsList.length === 0 ? (
        <EmptyState
          illustration={<EmptyApprovalIllustration className="h-full w-full" />}
          title="No PIPs issued yet"
          description="Performance improvement plans help employees get back on track with clear objectives and timelines."
          action={{ label: "New PIP", onClick: handleOpenCreate }}
        />
      ) : (
        <div className="space-y-2">
          {pipsList.map((pip) => (
            <Card key={pip.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="w-7 shrink-0">
                      <AvatarImage src={resolveImageUrl(pip.user?.image ?? null)} />
                      <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{pip.user?.name?.[0] ?? "?"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <TruncatedText text={pip.user?.name ?? "Employee"} className="text-sm font-medium" />
                      <p className="text-[10px] text-muted-foreground">{pip.startDate} → {pip.endDate}</p>
                      {pip.hrRep && (
                        <p className="text-[10px] text-muted-foreground">HR Rep: {pip.hrRep.name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={
                        pip.status === "COMPLETED" ? "default" :
                        pip.status === "TERMINATED" ? "destructive" :
                        pip.status === "EXTENDED" ? "secondary" : "outline"
                      }
                      className="text-[10px]"
                    >
                      {pip.status ?? "ACTIVE"}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <AnimatedIconButton icon={EllipsisIcon} variant="ghost" size="icon" className="w-7" aria-label="PIP actions" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEdit(pip)}>
                          <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit
                        </DropdownMenuItem>
                        {(pip.status === "ACTIVE" || pip.status === "EXTENDED") && (
                          <>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(pip.id, "COMPLETED")}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Mark Completed
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(pip.id, "EXTENDED")}>
                              <Calendar className="h-3.5 w-3.5 mr-1.5" />Extend
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onClick={() => handleUpdateStatus(pip.id, "TERMINATED")}>
                              <Trash2 className="h-3.5 w-3.5 mr-1.5" />Terminate
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {pip.reason && <TruncatedText text={pip.reason} lines={2} className="text-xs text-muted-foreground mt-2" />}
                {pip.objectives && pip.objectives.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">{pip.objectives.length} objective{pip.objectives.length !== 1 ? "s" : ""}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title={editingPip ? "Edit Performance Improvement Plan" : "Create Performance Improvement Plan"}
        onSubmit={handleSubmit}
        submitLabel={editingPip ? "Save Changes" : "Create PIP"}
        isPending={createPIP.isPending || updatePIP.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee <span className="text-destructive">*</span></label>
          <Popover open={pipUserPickerOpen} onOpenChange={(o) => { if (!editingPip) setPipUserPickerOpen(o); }}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={pipUserPickerOpen}
                className={cn(
                  "w-full justify-between font-normal",
                  fieldErrors.userId && "border-destructive",
                )}
                disabled={!!editingPip}
              >
                <span className="truncate">
                  {pipUserId
                    ? (() => { const e = employees.find((x) => x.id === pipUserId); return e ? ([e.firstName, e.lastName].filter(Boolean).join(" ") || e.email) : "Select employee"; })()
                    : "Select employee"}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search employees..." />
                <CommandList className="max-h-48 overflow-y-auto">
                  <CommandEmpty>No employee found.</CommandEmpty>
                  <CommandGroup>
                    {employees.filter((e) => e.isActive).map((e) => {
                      const label = [e.firstName, e.lastName].filter(Boolean).join(" ") || e.email;
                      return (
                        <CommandItem
                          key={e.id}
                          value={`${label} ${e.email}`}
                          onSelect={() => {
                            setPipUserId(e.id);
                            setPipUserPickerOpen(false);
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next.userId;
                              return next;
                            });
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", pipUserId === e.id ? "opacity-100" : "opacity-0")} />
                          {label}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {fieldErrors.userId && <p className="text-xs text-destructive">{fieldErrors.userId}</p>}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">HR Representative <span className="text-muted-foreground font-normal">(optional)</span></label>
          <Popover open={hrRepPickerOpen} onOpenChange={setHrRepPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={hrRepPickerOpen}
                className={cn(
                  "w-full justify-between font-normal",
                  fieldErrors.hrRepId && "border-destructive",
                )}
              >
                <span className="truncate">
                  {hrRepId
                    ? (() => { const e = hrEmployees.find((x) => x.id === hrRepId); return e ? ([e.firstName, e.lastName].filter(Boolean).join(" ") || e.email) : "Select HR representative"; })()
                    : "None"}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search HR representatives..." />
                <CommandList className="max-h-48 overflow-y-auto">
                  <CommandEmpty>No HR representative found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value="none" onSelect={() => { setHrRepId(""); setHrRepPickerOpen(false); }}>
                      <Check className={cn("mr-2 h-4 w-4", !hrRepId ? "opacity-100" : "opacity-0")} />
                      None
                    </CommandItem>
                    {hrEmployees.filter((e) => e.id !== pipUserId).map((e) => {
                      const label = [e.firstName, e.lastName].filter(Boolean).join(" ") || e.email;
                      return (
                        <CommandItem
                          key={e.id}
                          value={`${label} ${e.email}`}
                          onSelect={() => {
                            setHrRepId(e.id);
                            setHrRepPickerOpen(false);
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next.hrRepId;
                              return next;
                            });
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", hrRepId === e.id ? "opacity-100" : "opacity-0")} />
                          {label}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {fieldErrors.hrRepId && <p className="text-xs text-destructive">{fieldErrors.hrRepId}</p>}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Reason <span className="text-destructive">*</span></label>
          <Textarea placeholder="Describe the performance concerns..." value={reason} onChange={handleReasonChange} rows={3} maxLength={1000} />
          {fieldErrors.reason && <p className="text-xs text-destructive">{fieldErrors.reason}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Start Date <span className="text-destructive">*</span></label>
            <DatePicker
              value={startDate ?? ""}
              onChange={handleStartDateChange}
              disabled={!!editingPip}
              placeholder="Pick a date"
              className="text-sm"
              fromDate={pipStartBounds.fromDate}
              fromYear={pipStartBounds.fromYear}
              toYear={pipStartBounds.toYear}
            />
            {fieldErrors.startDate && <p className="text-xs text-destructive">{fieldErrors.startDate}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">End Date <span className="text-destructive">*</span></label>
            <DatePicker
              value={endDate ?? ""}
              onChange={handleEndDateChange}
              placeholder="Pick a date"
              className="text-sm"
              fromDate={pipEndBounds.fromDate}
              fromYear={pipEndBounds.fromYear}
              toYear={pipEndBounds.toYear}
            />
            {fieldErrors.endDate && <p className="text-xs text-destructive">{fieldErrors.endDate}</p>}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Objectives <span className="text-destructive">*</span></label>
            <Button type="button" variant="outline" size="sm" className="text-xs" onClick={addObjective}>
              <Plus className="h-3 w-3 mr-1" />Add
            </Button>
          </div>
          {fieldErrors.objectives && <p className="text-xs text-destructive">{fieldErrors.objectives}</p>}
          <div className="space-y-3">
            {objectives.map((obj, idx) => (
              <div key={idx} className="space-y-2 p-3 border rounded-lg bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Objective {idx + 1}</span>
                  {objectives.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeObjective(idx)} aria-label={`Remove objective ${idx + 1}`}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Input placeholder="Goal / objective" value={obj.objective} onChange={(e) => updateObjectiveField(idx, "objective", e.target.value)} className="text-xs" />
                {fieldErrors[`objectives.${idx}.objective`] && (
                  <p className="text-xs text-destructive">{fieldErrors[`objectives.${idx}.objective`]}</p>
                )}
                <Input placeholder="Success metric" value={obj.metric} onChange={(e) => updateObjectiveField(idx, "metric", e.target.value)} className="text-xs" />
                {fieldErrors[`objectives.${idx}.metric`] && (
                  <p className="text-xs text-destructive">{fieldErrors[`objectives.${idx}.metric`]}</p>
                )}
                <DatePicker
                  value={obj.deadline ?? ""}
                  onChange={(v) => updateObjectiveField(idx, "deadline", v)}
                  placeholder="Pick a date"
                  className="text-xs"
                  fromDate={objectiveDeadlineBounds.fromDate}
                  fromYear={objectiveDeadlineBounds.fromYear}
                  toYear={objectiveDeadlineBounds.toYear}
                  toDate={endDate ? new Date(`${endDate}T00:00:00`) : undefined}
                />
                {fieldErrors[`objectives.${idx}.deadline`] && (
                  <p className="text-xs text-destructive">{fieldErrors[`objectives.${idx}.deadline`]}</p>
                )}
              </div>
            ))}
          </div>
        </div>
        <Separator />
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes (optional)</label>
          <Textarea placeholder="Additional context or manager notes..." value={notes} onChange={handleNotesChange} rows={2} maxLength={2000} />
          {fieldErrors.notes && <p className="text-xs text-destructive">{fieldErrors.notes}</p>}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Manager Rating <span className="text-muted-foreground font-normal">(1–5, optional)</span></label>
          <Input
            type="number"
            min="1"
            max="5"
            step="1"
            placeholder="1–5"
            value={managerRating}
            onChange={handleManagerRatingChange}
          />
        </div>
      </HrSheet>
    </div>
  );
}
