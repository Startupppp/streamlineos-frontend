"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Info, X } from "lucide-react";
import { toast } from "sonner";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

import {
  useBlueprints,
  useCreateBlueprint,
  useUpdateBlueprint,
  useCrmMetadata,
  useCrmOptions,
} from "@/hooks/api/crm";
import type { CrmBlueprint, CrmBlueprintTransition, CrmPipelineStage } from "@/types/crm/metadata";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  pipelineId: z.string().min(1, "Pipeline is required"),
});
type CreateFormValues = z.infer<typeof createSchema>;

type TransitionInput = {
  fromStageKey: string;
  toStageKey: string;
  requiredFields: string[];
  requiredActivityTypeKeys: string[];
  requiresApproval: boolean;
  requiresQuote: boolean;
};

function useBlueprintTransitions(blueprintId: string | null) {
  return useQuery({
    queryKey: ["crmMetadata", "blueprints", blueprintId, "transitions"] as const,
    queryFn: () =>
      apiClient.get<CrmBlueprintTransition[]>(`/crm/blueprints/${blueprintId}/transitions`),
    enabled: blueprintId !== null,
    staleTime: 60_000,
  });
}

function useCreateTransition(blueprintId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmMetadata", "blueprints", blueprintId, "transitions", "create"] as const,
    mutationFn: (input: TransitionInput) =>
      apiClient.post<CrmBlueprintTransition>(`/crm/blueprints/${blueprintId}/transitions`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["crmMetadata", "blueprints", blueprintId, "transitions"] });
    },
  });
}

function useUpdateTransition(blueprintId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmMetadata", "blueprints", blueprintId, "transitions", "update"] as const,
    mutationFn: ({ id, ...data }: { id: string } & Partial<TransitionInput>) =>
      apiClient.patch<CrmBlueprintTransition>(
        `/crm/blueprints/${blueprintId}/transitions/${id}`,
        data
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["crmMetadata", "blueprints", blueprintId, "transitions"] });
    },
  });
}

function useDeleteTransition(blueprintId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crmMetadata", "blueprints", blueprintId, "transitions", "delete"] as const,
    mutationFn: (id: string) =>
      apiClient.delete<{ success: boolean }>(
        `/crm/blueprints/${blueprintId}/transitions/${id}`
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["crmMetadata", "blueprints", blueprintId, "transitions"] });
    },
  });
}

function useTestTransition(blueprintId: string) {
  return useMutation({
    mutationKey: ["crmMetadata", "blueprints", blueprintId, "test"] as const,
    mutationFn: (input: {
      fromStageKey: string;
      toStageKey: string;
      sampleFields: Record<string, string>;
    }) => apiClient.post<{ allowed: boolean; missing: string[] }>(`/crm/blueprints/${blueprintId}/test`, input),
  });
}

interface TransitionPopoverProps {
  fromStage: CrmPipelineStage;
  toStage: CrmPipelineStage;
  transition: CrmBlueprintTransition | undefined;
  blueprintId: string;
  onClose: () => void;
}

function TransitionPopover({
  fromStage,
  toStage,
  transition,
  blueprintId,
  onClose,
}: TransitionPopoverProps) {
  const [requiredFields, setRequiredFields] = useState<string[]>(
    transition?.requiredFields ?? []
  );
  const [fieldInput, setFieldInput] = useState("");
  const [requiredActivityTypeKeys, setRequiredActivityTypeKeys] = useState<string[]>(
    transition?.requiredActivityTypeKeys ?? []
  );
  const [requiresApproval, setRequiresApproval] = useState(
    transition?.requiresApproval ?? false
  );
  const [requiresQuote, setRequiresQuote] = useState(
    transition?.requiresQuote ?? false
  );

  const { data: activityTypes = [] } = useCrmOptions("activity_type");
  const createTransition = useCreateTransition(blueprintId);
  const updateTransition = useUpdateTransition(blueprintId);
  const deleteTransition = useDeleteTransition(blueprintId);

  const handleFieldKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const val = fieldInput.trim();
        if (val && !requiredFields.includes(val)) {
          setRequiredFields((prev) => [...prev, val]);
        }
        setFieldInput("");
      }
    },
    [fieldInput, requiredFields]
  );

  const handleRemoveField = useCallback((field: string) => {
    setRequiredFields((prev) => prev.filter((f) => f !== field));
  }, []);

  const handleFieldInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setFieldInput(e.target.value),
    []
  );

  const handleToggleActivityType = useCallback((key: string, checked: boolean) => {
    setRequiredActivityTypeKeys((prev) =>
      checked ? [...prev, key] : prev.filter((k) => k !== key)
    );
  }, []);

  const handleSave = useCallback(() => {
    const payload: TransitionInput = {
      fromStageKey: fromStage.key,
      toStageKey: toStage.key,
      requiredFields,
      requiredActivityTypeKeys,
      requiresApproval,
      requiresQuote,
    };
    if (transition) {
      updateTransition.mutate(
        { id: transition.id, ...payload },
        {
          onSuccess: () => { toast.success("Transition updated"); onClose(); },
          onError: (err) => toast.error(getErrorMessage(err)),
        }
      );
    } else {
      createTransition.mutate(payload, {
        onSuccess: () => { toast.success("Transition configured"); onClose(); },
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    }
  }, [
    transition, fromStage.key, toStage.key, requiredFields,
    requiredActivityTypeKeys, requiresApproval, requiresQuote,
    createTransition, updateTransition, onClose,
  ]);

  const handleDelete = useCallback(() => {
    if (!transition) return;
    deleteTransition.mutate(transition.id, {
      onSuccess: () => { toast.success("Transition removed"); onClose(); },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [transition, deleteTransition, onClose]);

  const isSaving = createTransition.isPending || updateTransition.isPending;

  return (
    <div className="w-72 space-y-3 p-1">
      <div className="text-[11px] font-semibold text-foreground">
        {fromStage.label} → {toStage.label}
      </div>
      <Separator />

      <div>
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
          Required Fields
        </div>
        <div className="flex flex-wrap gap-1 mb-1.5">
          {requiredFields.map((f) => (
            <span
              key={f}
              className="inline-flex items-center gap-0.5 bg-slate-100 text-slate-700 text-[10px] px-1.5 h-5 rounded"
            >
              {f}
              <button type="button" onClick={() => handleRemoveField(f)} className="ml-0.5 hover:text-destructive">
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
        <Input
          value={fieldInput}
          onChange={handleFieldInputChange}
          onKeyDown={handleFieldKeyDown}
          placeholder="field_name → Enter"
          className="h-7 text-xs"
        />
      </div>

      {activityTypes.length > 0 && (
        <div>
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            Required Activity Types
          </div>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {activityTypes.map((at) => (
              <label key={at.key} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={requiredActivityTypeKeys.includes(at.key)}
                  onCheckedChange={(checked) =>
                    handleToggleActivityType(at.key, checked === true)
                  }
                  className="h-3.5 w-3.5"
                />
                <span className="text-xs">{at.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs">Requires Approval</span>
          <Switch
            checked={requiresApproval}
            onCheckedChange={setRequiresApproval}
            className="scale-75"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs">Requires Quote</span>
          <Switch
            checked={requiresQuote}
            onCheckedChange={setRequiresQuote}
            className="scale-75"
          />
        </div>
        {transition && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Auto Tasks</span>
            <Badge variant="outline" className="text-[9px] h-4 px-1.5">
              {transition.autoTaskTemplates.length} task{transition.autoTaskTemplates.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        )}
      </div>

      <Separator />
      <div className="flex items-center gap-2">
        <LoadingButton
          size="sm"
          className="h-7 text-xs flex-1"
          onClick={handleSave}
          isPending={isSaving}
          loadingText="Saving…"
        >
          Save
        </LoadingButton>
        {transition && (
          <LoadingButton
            size="sm"
            variant="destructive"
            className="h-7 text-xs"
            onClick={handleDelete}
            isPending={deleteTransition.isPending}
            loadingText="…"
          >
            Remove
          </LoadingButton>
        )}
      </div>
    </div>
  );
}

interface MatrixCellProps {
  fromStage: CrmPipelineStage;
  toStage: CrmPipelineStage;
  transition: CrmBlueprintTransition | undefined;
  blueprintId: string;
}

function MatrixCell({ fromStage, toStage, transition, blueprintId }: MatrixCellProps) {
  const [open, setOpen] = useState(false);

  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {transition ? (
          <button
            type="button"
            className="inline-flex items-center bg-blue-500 text-white text-[9px] px-1.5 h-5 rounded cursor-pointer hover:bg-blue-600 transition-colors"
          >
            {toStage.label.slice(0, 6)}
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex items-center border border-dashed border-border text-muted-foreground text-[9px] px-1.5 h-5 rounded cursor-pointer hover:border-blue-400 transition-colors"
          >
            +
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="p-3 w-auto">
        <TransitionPopover
          fromStage={fromStage}
          toStage={toStage}
          transition={transition}
          blueprintId={blueprintId}
          onClose={handleClose}
        />
      </PopoverContent>
    </Popover>
  );
}

interface TestPanelProps {
  blueprintId: string;
  stages: CrmPipelineStage[];
}

function TestPanel({ blueprintId, stages }: TestPanelProps) {
  const [fromKey, setFromKey] = useState("");
  const [toKey, setToKey] = useState("");
  const [sampleFields, setSampleFields] = useState<{ key: string; value: string }[]>([
    { key: "", value: "" },
  ]);
  const testTransition = useTestTransition(blueprintId);

  const handleAddRow = useCallback(() => {
    setSampleFields((prev) => [...prev, { key: "", value: "" }]);
  }, []);

  const handleFieldKeyChange = useCallback(
    (idx: number, val: string) => {
      setSampleFields((prev) => {
        const next = [...prev];
        const row = next[idx];
        if (row) next[idx] = { ...row, key: val };
        return next;
      });
    },
    []
  );

  const handleFieldValChange = useCallback(
    (idx: number, val: string) => {
      setSampleFields((prev) => {
        const next = [...prev];
        const row = next[idx];
        if (row) next[idx] = { ...row, value: val };
        return next;
      });
    },
    []
  );

  const handleTest = useCallback(() => {
    if (!fromKey || !toKey) {
      toast.error("Select both stages to test");
      return;
    }
    const fields: Record<string, string> = {};
    for (const row of sampleFields) {
      if (row.key.trim()) fields[row.key.trim()] = row.value;
    }
    testTransition.mutate(
      { fromStageKey: fromKey, toStageKey: toKey, sampleFields: fields },
      { onError: (err) => toast.error(getErrorMessage(err)) }
    );
  }, [fromKey, toKey, sampleFields, testTransition]);

  const handleFromChange = useCallback((v: string) => setFromKey(v), []);
  const handleToChange = useCallback((v: string) => setToKey(v), []);

  return (
    <Card className="bg-card border border-border rounded-xl shadow-sm">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-sm font-semibold">Test Transition</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="flex items-center gap-2">
          <Select value={fromKey} onValueChange={handleFromChange}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="From stage" />
            </SelectTrigger>
            <SelectContent>
              {stages.map((s) => (
                <SelectItem key={s.key} value={s.key} className="text-xs">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground text-xs">→</span>
          <Select value={toKey} onValueChange={handleToChange}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="To stage" />
            </SelectTrigger>
            <SelectContent>
              {stages.map((s) => (
                <SelectItem key={s.key} value={s.key} className="text-xs">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Sample Fields
          </div>
          {sampleFields.map((row, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <Input
                value={row.key}
                onChange={(e) => handleFieldKeyChange(idx, e.target.value)}
                placeholder="field"
                className="h-7 text-xs flex-1"
              />
              <Input
                value={row.value}
                onChange={(e) => handleFieldValChange(idx, e.target.value)}
                placeholder="value"
                className="h-7 text-xs flex-1"
              />
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={handleAddRow}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add field
          </Button>
        </div>

        <LoadingButton
          size="sm"
          className="h-8 text-xs"
          onClick={handleTest}
          isPending={testTransition.isPending}
          loadingText="Testing…"
        >
          Test
        </LoadingButton>

        {testTransition.data && (
          <div
            className={cn(
              "rounded-lg border p-3 text-xs space-y-1",
              testTransition.data.allowed
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            )}
          >
            <div className="font-semibold">
              {testTransition.data.allowed ? "Transition allowed" : "Transition blocked"}
            </div>
            {!testTransition.data.allowed && testTransition.data.missing.length > 0 && (
              <ul className="list-disc list-inside space-y-0.5">
                {testTransition.data.missing.map((m) => (
                  <li key={m} className="text-[11px]">
                    {m}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface TransitionMatrixProps {
  blueprint: CrmBlueprint;
  stages: CrmPipelineStage[];
}

function TransitionMatrix({ blueprint, stages }: TransitionMatrixProps) {
  const { data: transitions = [], isLoading } = useBlueprintTransitions(blueprint.id);

  const transitionMap = new Map(
    transitions.map((t) => [`${t.fromStageKey}::${t.toStageKey}`, t])
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>Unconfigured transitions are allowed by default (fail-open)</span>
      </div>

      <div className="overflow-x-auto">
        <table className="text-[10px] border-collapse w-full">
          <thead>
            <tr>
              <th className="text-left text-muted-foreground font-medium px-2 py-1.5 whitespace-nowrap border-b border-border w-24">
                From \ To
              </th>
              {stages.map((s) => (
                <th
                  key={s.key}
                  className="text-center text-muted-foreground font-medium px-1.5 py-1.5 whitespace-nowrap border-b border-border min-w-[60px]"
                >
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stages.map((fromStage) => (
              <tr key={fromStage.key} className="border-b border-border/50 hover:bg-muted/20">
                <td className="px-2 py-1.5 font-medium text-[10px] whitespace-nowrap text-foreground">
                  {fromStage.label}
                </td>
                {stages.map((toStage) => (
                  <td key={toStage.key} className="px-1.5 py-1.5 text-center">
                    {fromStage.key === toStage.key ? (
                      <span className="text-muted-foreground/40">—</span>
                    ) : (
                      <MatrixCell
                        fromStage={fromStage}
                        toStage={toStage}
                        transition={transitionMap.get(`${fromStage.key}::${toStage.key}`)}
                        blueprintId={blueprint.id}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TestPanel blueprintId={blueprint.id} stages={stages} />
    </div>
  );
}

function CreateBlueprintDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const { data: metadata } = useCrmMetadata();
  const createBlueprint = useCreateBlueprint();

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", description: "", pipelineId: "" },
  });

  const handleSubmit = useCallback(
    (values: CreateFormValues) => {
      createBlueprint.mutate(
        {
          name: values.name,
          description: values.description ?? null,
          pipelineId: values.pipelineId,
          isActive: true,
        },
        {
          onSuccess: (created) => {
            toast.success("Blueprint created");
            form.reset();
            onOpenChange(false);
            onCreated(created.id);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        }
      );
    },
    [createBlueprint, form, onOpenChange, onCreated]
  );

  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (!v) form.reset();
      onOpenChange(v);
    },
    [form, onOpenChange]
  );

  const pipelines = metadata?.pipelines ?? [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Blueprint</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Blueprint name" className="h-9 text-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief description" className="h-9 text-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pipelineId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pipeline</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select pipeline" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {pipelines.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-sm">
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <LoadingButton
                type="submit"
                isPending={createBlueprint.isPending}
                loadingText="Creating…"
              >
                Create Blueprint
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function BlueprintsPage() {
  const { data: blueprints, isLoading, isError, refetch } = useBlueprints();
  const { data: metadata } = useCrmMetadata();
  const updateBlueprint = useUpdateBlueprint();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const selectedBlueprint = blueprints?.find((b) => b.id === selectedId) ?? null;
  const selectedStages = selectedBlueprint
    ? (metadata?.pipelines.find((p) => p.id === selectedBlueprint.pipelineId)?.stages ?? [])
        .filter((s) => s.isActive)
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  const handleToggleActive = useCallback(
    (blueprint: CrmBlueprint) => {
      updateBlueprint.mutate(
        { id: blueprint.id, isActive: !blueprint.isActive },
        {
          onSuccess: () => toast.success("Blueprint updated"),
          onError: (err) => toast.error(getErrorMessage(err)),
        }
      );
    },
    [updateBlueprint]
  );

  const handleSelect = useCallback((id: string) => setSelectedId(id), []);

  const handleCreated = useCallback((id: string) => setSelectedId(id), []);

  const handleOpenDialog = useCallback(() => setDialogOpen(true), []);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const getPipelineName = useCallback(
    (pipelineId: string) =>
      metadata?.pipelines.find((p) => p.id === pipelineId)?.name ?? "—",
    [metadata]
  );

  return (
    <>
      <CreateBlueprintDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={handleCreated}
      />

      <PageWrapper
        title="Blueprints"
        subtitle="Configure stage transition rules for pipelines"
        actions={
          <Button onClick={handleOpenDialog}>
            <Plus className="h-4 w-4 mr-2" />
            New Blueprint
          </Button>
        }
      >
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : isError ? (
          <EmptyState
            title="Failed to load blueprints"
            description="Something went wrong. Please try again."
            action={{ label: "Retry", onClick: handleRetry }}
            className="flex-1 min-h-[40vh] border-0 bg-transparent"
          />
        ) : !blueprints || blueprints.length === 0 ? (
          <EmptyState
            title="No blueprints"
            description="Blueprints define which stage transitions are allowed and what requirements must be met."
            action={{ label: "New Blueprint", onClick: handleOpenDialog }}
            className="flex-1 min-h-[40vh] border-0 bg-transparent"
          />
        ) : (
          <div className="flex gap-4 items-start">
            <Card className="bg-card border border-border rounded-xl shadow-sm w-[250px] shrink-0">
              <CardHeader className="px-3 py-2.5">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Blueprints
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {blueprints.map((bp) => (
                    <button
                      key={bp.id}
                      type="button"
                      onClick={() => handleSelect(bp.id)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-muted/40 transition-colors border-l-2",
                        selectedId === bp.id
                          ? "border-l-blue-500 bg-blue-50/50"
                          : "border-l-transparent"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{bp.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {getPipelineName(bp.pipelineId)}
                        </div>
                      </div>
                      <Switch
                        checked={bp.isActive}
                        onCheckedChange={() => handleToggleActive(bp)}
                        onClick={(e) => e.stopPropagation()}
                        className="scale-75 shrink-0"
                      />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex-1 min-w-0">
              {selectedBlueprint ? (
                <Card className="bg-card border border-border rounded-xl shadow-sm">
                  <CardHeader className="px-4 py-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">
                        {selectedBlueprint.name}
                      </CardTitle>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {getPipelineName(selectedBlueprint.pipelineId)}
                        {selectedBlueprint.description && (
                          <span className="ml-2">· {selectedBlueprint.description}</span>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] h-4 px-1.5",
                        selectedBlueprint.isActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      )}
                    >
                      {selectedBlueprint.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {selectedStages.length > 0 ? (
                      <TransitionMatrix
                        blueprint={selectedBlueprint}
                        stages={selectedStages}
                      />
                    ) : (
                      <div className="text-xs text-muted-foreground py-4 text-center">
                        No stages found for this pipeline.
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <EmptyState
                  title="Select a blueprint"
                  description="Choose a blueprint from the list to configure its transition rules."
                  className="flex-1 min-h-[40vh] border-0 bg-transparent"
                />
              )}
            </div>
          </div>
        )}
      </PageWrapper>
    </>
  );
}
