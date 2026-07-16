"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { EmptySprintIllustration } from "@/components/illustrations";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetBody } from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useHiringFlows,
  useCreateHiringFlow,
  useUpdateHiringFlow,
  useDeleteHiringFlow,
  useCreateHiringFlowRound,
  useUpdateHiringFlowRound,
  useDeleteHiringFlowRound,
} from "@/hooks/api/hr/recruitment";
import { getErrorMessage } from "@/lib/get-error-message";
import type { HiringFlow, HiringFlowRound } from "@/types/hr/recruitment";
import { TruncatedText } from "@/components/ui/truncated-text";

const ROUND_TYPES = [
  { value: "HR_SCREENING", label: "HR Screening" },
  { value: "TECHNICAL", label: "Technical" },
  { value: "MANAGER", label: "Manager" },
  { value: "CULTURAL_FIT", label: "Cultural Fit" },
  { value: "FINAL", label: "Final" },
  { value: "CUSTOM", label: "Custom" },
] as const;

const ROUND_MODES = [
  { value: "VIDEO", label: "Video" },
  { value: "PHONE", label: "Phone" },
  { value: "ONSITE", label: "On-site" },
] as const;

const flowSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  isDefault: z.boolean(),
});

const roundSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  roundType: z.enum(["HR_SCREENING", "TECHNICAL", "MANAGER", "CULTURAL_FIT", "FINAL", "CUSTOM"]),
  mode: z.enum(["VIDEO", "PHONE", "ONSITE"]),
  durationMinutes: z.number().int().min(15, "Min 15 minutes").max(480, "Max 480 minutes"),
  slaDays: z.number().int().min(1).max(30).optional(),
});

type FlowFormValues = z.infer<typeof flowSchema>;
type RoundFormValues = z.infer<typeof roundSchema>;

function RoundTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    HR_SCREENING: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    TECHNICAL: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    MANAGER: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    CULTURAL_FIT: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300",
    FINAL: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300",
    CUSTOM: "bg-muted text-muted-foreground",
  };
  const labels: Record<string, string> = {
    HR_SCREENING: "HR Screening",
    TECHNICAL: "Technical",
    MANAGER: "Manager",
    CULTURAL_FIT: "Cultural Fit",
    FINAL: "Final",
    CUSTOM: "Custom",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${colors[type] ?? "bg-muted text-muted-foreground"}`}>
      {labels[type] ?? type}
    </span>
  );
}

function ModeBadge({ mode }: { mode: string }) {
  const labels: Record<string, string> = { VIDEO: "Video", PHONE: "Phone", ONSITE: "On-site" };
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      {labels[mode] ?? mode}
    </span>
  );
}

interface RoundItemProps {
  round: HiringFlowRound;
  flowId: number;
  onEdit: (round: HiringFlowRound) => void;
}

function RoundItem({ round, flowId, onEdit }: RoundItemProps) {
  const deleteRound = useDeleteHiringFlowRound();

  const handleDelete = useCallback(() => {
    deleteRound.mutate(
      { flowId, roundId: round.id },
      { onError: (e) => toast.error(getErrorMessage(e)) },
    );
  }, [deleteRound, flowId, round.id]);

  function handleEditClick() { onEdit(round); }

  return (
    <div className="flex items-center gap-3 rounded-md border bg-muted/20 px-3 py-2">
      <svg className="h-4 w-4 shrink-0 text-muted-foreground/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="5" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="9" cy="19" r="1" />
        <circle cx="15" cy="5" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="19" r="1" />
      </svg>
      <TruncatedText text={round.name} className="flex-1 text-sm font-medium" />
      <div className="flex items-center gap-1.5 shrink-0">
        <RoundTypeBadge type={round.roundType} />
        <ModeBadge mode={round.mode} />
        <span className="text-[10px] text-muted-foreground">{round.durationMinutes}m</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={handleEditClick}
          className="rounded p-1 hover:bg-muted transition-colors"
          aria-label="Edit round"
        >
          <svg className="h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleteRound.isPending}
          className="rounded p-1 hover:bg-destructive/10 transition-colors"
          aria-label="Delete round"
        >
          <svg className="h-3.5 w-3.5 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

interface FlowCardProps {
  flow: HiringFlow;
  onEdit: (flow: HiringFlow) => void;
  onAddRound: (flow: HiringFlow) => void;
  onEditRound: (round: HiringFlowRound, flowId: number) => void;
  onDelete: (flow: HiringFlow) => void;
}

function FlowCard({ flow, onEdit, onAddRound, onEditRound, onDelete }: FlowCardProps) {
  const rounds = flow.rounds ?? [];

  function handleAddRound() { onAddRound(flow); }
  function handleEditFlow() { onEdit(flow); }
  function handleDeleteFlow() { onDelete(flow); }
  function handleEditRound(round: HiringFlowRound) { onEditRound(round, flow.id); }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <CardTitle className="text-sm font-semibold truncate">{flow.name}</CardTitle>
            {flow.isDefault && (
              <Badge variant="secondary" className="text-[10px] shrink-0">Default</Badge>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="w-7" onClick={handleAddRound} aria-label="Add round">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </Button>
            <Button variant="ghost" size="icon" className="w-7" onClick={handleEditFlow} aria-label="Edit flow">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </Button>
            <Button variant="ghost" size="icon" className="w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleDeleteFlow} aria-label="Delete flow">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {rounds.length} {rounds.length === 1 ? "round" : "rounds"}
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {rounds.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">No rounds yet — click + to add.</p>
        ) : (
          <div className="grid gap-1.5">
            {rounds.map((r) => (
              <RoundItem key={r.id} round={r} flowId={flow.id} onEdit={handleEditRound} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FlowFormSheet({
  open,
  editFlow,
  onClose,
}: {
  open: boolean;
  editFlow: HiringFlow | null;
  onClose: () => void;
}) {
  const createFlow = useCreateHiringFlow();
  const updateFlow = useUpdateHiringFlow();

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FlowFormValues>({
    resolver: zodResolver(flowSchema),
    defaultValues: { name: "", isDefault: false },
  });


  useEffect(() => {
    if (open) {
      if (editFlow) {
        reset({ name: editFlow.name, isDefault: editFlow.isDefault });
      } else {
        reset({ name: "", isDefault: false });
      }
    }
  }, [open, editFlow, reset]);

  const onSubmit = useCallback(
    (data: FlowFormValues) => {
      if (editFlow) {
        updateFlow.mutate(
          { id: editFlow.id, ...data },
          {
            onSuccess: () => { toast.success("Hiring flow updated"); onClose(); },
            onError: (e) => toast.error(getErrorMessage(e)),
          },
        );
      } else {
        createFlow.mutate(data, {
          onSuccess: () => { toast.success("Hiring flow created"); onClose(); },
          onError: (e) => toast.error(getErrorMessage(e)),
        });
      }
    },
    [editFlow, createFlow, updateFlow, onClose],
  );

  const isPending = createFlow.isPending || updateFlow.isPending;

  function handleSheetOpenChange(v: boolean) { if (!v) onClose(); }

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>{editFlow ? "Edit Hiring Flow" : "New Hiring Flow"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
          <SheetBody className="px-6 py-5 flex flex-col gap-4">
            <div>
              <Label className="text-xs font-medium">Flow Name <span className="text-destructive">*</span></Label>
              <Input className="mt-1" placeholder="e.g. Engineering Hiring Flow" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Set as Default</p>
                <p className="text-xs text-muted-foreground">Use this flow for new job postings automatically</p>
              </div>
              <Controller
                name="isDefault"
                control={control}
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>
          </SheetBody>
          <SheetFooter className="shrink-0 px-6 py-4 border-t flex-row gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : editFlow ? "Update" : "Create"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function RoundFormSheet({
  open,
  flowId,
  editRound,
  onClose,
}: {
  open: boolean;
  flowId: number;
  editRound: HiringFlowRound | null;
  onClose: () => void;
}) {
  const createRound = useCreateHiringFlowRound();
  const updateRound = useUpdateHiringFlowRound();

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<RoundFormValues>({
    resolver: zodResolver(roundSchema),
    defaultValues: { name: "", roundType: "CUSTOM", mode: "VIDEO", durationMinutes: 60 },
  });

  const roundType = watch("roundType");
  const mode = watch("mode");

  useEffect(() => {
    if (open) {
      if (editRound) {
        reset({
          name: editRound.name,
          roundType: editRound.roundType,
          mode: editRound.mode,
          durationMinutes: editRound.durationMinutes,
          slaDays: editRound.slaDays ?? undefined,
        });
      } else {
        reset({ name: "", roundType: "CUSTOM", mode: "VIDEO", durationMinutes: 60 });
      }
    }
  }, [open, editRound, reset]);

  const onSubmit = useCallback(
    (data: RoundFormValues) => {
      const payload = {
        name: data.name,
        roundType: data.roundType,
        mode: data.mode,
        durationMinutes: data.durationMinutes,
        slaDays: data.slaDays ? Number(data.slaDays) : undefined,
      };

      if (editRound) {
        updateRound.mutate(
          { flowId, roundId: editRound.id, ...payload },
          {
            onSuccess: () => { toast.success("Round updated"); onClose(); },
            onError: (e) => toast.error(getErrorMessage(e)),
          },
        );
      } else {
        createRound.mutate(
          { flowId, ...payload },
          {
            onSuccess: () => { toast.success("Round added"); onClose(); },
            onError: (e) => toast.error(getErrorMessage(e)),
          },
        );
      }
    },
    [editRound, createRound, updateRound, flowId, onClose],
  );

  const isPending = createRound.isPending || updateRound.isPending;

  function handleSheetOpenChange(v: boolean) { if (!v) onClose(); }
  function handleRoundTypeChange(v: string) {
    setValue("roundType", v as RoundFormValues["roundType"], { shouldValidate: true });
  }
  function handleModeChange(v: string) {
    setValue("mode", v as RoundFormValues["mode"], { shouldValidate: true });
  }

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>{editRound ? "Edit Round" : "Add Round"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
          <SheetBody className="px-6 py-5 flex flex-col gap-4">
            <div>
              <Label className="text-xs font-medium">Round Name <span className="text-destructive">*</span></Label>
              <Input className="mt-1" placeholder="e.g. Technical Interview" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label className="text-xs font-medium">Round Type <span className="text-destructive">*</span></Label>
              <Select value={roundType} onValueChange={handleRoundTypeChange}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                  {ROUND_TYPES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">Mode <span className="text-destructive">*</span></Label>
              <Select value={mode} onValueChange={handleModeChange}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                  {ROUND_MODES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">Duration (minutes) <span className="text-destructive">*</span></Label>
              <Input className="mt-1" type="number" min={15} max={480} {...register("durationMinutes", { valueAsNumber: true })} />
              {errors.durationMinutes && <p className="text-xs text-destructive mt-1">{errors.durationMinutes.message}</p>}
            </div>
            <div>
              <Label className="text-xs font-medium">SLA Days</Label>
              <Input className="mt-1" type="number" min={1} max={30} placeholder="e.g. 3" {...register("slaDays", { valueAsNumber: true, setValueAs: (v) => (v === "" || isNaN(Number(v)) ? undefined : Number(v)) })} />
              <p className="text-[10px] text-muted-foreground mt-1">Max days to complete this round</p>
            </div>
          </SheetBody>
          <SheetFooter className="shrink-0 px-6 py-4 border-t flex-row gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : editRound ? "Update" : "Add Round"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default function HiringFlowsPage() {
  const { data: flows, isLoading } = useHiringFlows();
  const deleteFlow = useDeleteHiringFlow();

  const [flowSheetOpen, setFlowSheetOpen] = useState(false);
  const [editFlow, setEditFlow] = useState<HiringFlow | null>(null);
  const [roundSheetOpen, setRoundSheetOpen] = useState(false);
  const [editRound, setEditRound] = useState<HiringFlowRound | null>(null);
  const [activeFlowId, setActiveFlowId] = useState<number>(0);
  const [deleteTarget, setDeleteTarget] = useState<HiringFlow | null>(null);

  const handleOpenCreateFlow = useCallback(() => {
    setEditFlow(null);
    setFlowSheetOpen(true);
  }, []);

  const handleOpenEditFlow = useCallback((flow: HiringFlow) => {
    setEditFlow(flow);
    setFlowSheetOpen(true);
  }, []);

  const handleOpenAddRound = useCallback((flow: HiringFlow) => {
    setActiveFlowId(flow.id);
    setEditRound(null);
    setRoundSheetOpen(true);
  }, []);

  const handleOpenEditRound = useCallback((round: HiringFlowRound, flowId: number) => {
    setActiveFlowId(flowId);
    setEditRound(round);
    setRoundSheetOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteFlow.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Hiring flow deleted"); setDeleteTarget(null); },
      onError: (e) => { toast.error(getErrorMessage(e)); setDeleteTarget(null); },
    });
  }, [deleteFlow, deleteTarget]);

  const handleFlowSheetClose = useCallback(() => { setFlowSheetOpen(false); }, []);
  const handleRoundSheetClose = useCallback(() => { setRoundSheetOpen(false); }, []);
  const handleDeleteAlertChange = useCallback((v: boolean) => { if (!v) setDeleteTarget(null); }, []);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      );
    }

    if (!flows || flows.length === 0) {
      return (
        <RecruitmentEmptyState
          illustration={<EmptySprintIllustration />}
          title="No hiring flows yet"
          description="Create reusable interview workflows to assign to job postings."
          action={{ label: "New Hiring Flow", onClick: handleOpenCreateFlow }}
        />
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {flows.map((flow) => (
          <FlowCard
            key={flow.id}
            flow={flow}
            onEdit={handleOpenEditFlow}
            onAddRound={handleOpenAddRound}
            onEditRound={handleOpenEditRound}
            onDelete={setDeleteTarget}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <PageWrapper
        title="Hiring Flows"
        subtitle="Define reusable multi-round interview workflows"
        actions={
          <Button size="sm" onClick={handleOpenCreateFlow}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Flow
          </Button>
        }
      >
        {renderContent()}
      </PageWrapper>

      <FlowFormSheet
        open={flowSheetOpen}
        editFlow={editFlow}
        onClose={handleFlowSheetClose}
      />

      <RoundFormSheet
        open={roundSheetOpen}
        flowId={activeFlowId}
        editRound={editRound}
        onClose={handleRoundSheetClose}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteAlertChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete hiring flow?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; and all its rounds will be permanently deleted. Job postings using this flow will be unlinked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteFlow.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteFlow.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
