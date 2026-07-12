"use client";

import { useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Draggable } from "@hello-pangea/dnd";
import { GripVertical, MoreHorizontal, Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { CrmStageBadge } from "@/features/crm/shared/metadata";
import { CrmColorPicker } from "@/features/crm/settings/shared/crm-color-picker";
import { getCrmTokenClasses } from "@/features/crm/shared/metadata/crm-color-tokens";
import {
  useCreatePipeline, useCreateStage, useUpdateStage,
} from "@/hooks/api/crm";
import type { CrmPipelineStage, CrmPipelineType, CrmStageType } from "@/types/crm/metadata";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

export const PIPELINE_TYPES: { value: CrmPipelineType; label: string; badgeClass: string }[] = [
  { value: "lead", label: "Lead", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "deal", label: "Deal", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "renewal", label: "Renewal", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "customer_success", label: "CS", badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  { value: "partner", label: "Partner", badgeClass: "bg-sky-50 text-sky-700 border-sky-200" },
  { value: "custom", label: "Custom", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
];

export const STAGE_TYPES: { value: CrmStageType; label: string; className: string }[] = [
  { value: "open", label: "Open", className: "text-blue-700" },
  { value: "won", label: "Won", className: "text-emerald-700" },
  { value: "lost", label: "Lost", className: "text-red-700" },
  { value: "archived", label: "Archived", className: "text-slate-500" },
];

export function getPipelineTypeMeta(type: CrmPipelineType) {
  return PIPELINE_TYPES.find((t) => t.value === type) ?? PIPELINE_TYPES[5];
}

export function slugify(val: string) {
  return val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const createPipelineSchema = z.object({
  name: z.string().min(1, "Name required"),
  type: z.enum(["lead", "deal", "renewal", "customer_success", "partner", "custom"] as const),
  key: z.string().min(1, "Key required"),
});
type CreatePipelineValues = z.infer<typeof createPipelineSchema>;

export function CreatePipelineDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const createPipeline = useCreatePipeline();
  const form = useForm<CreatePipelineValues>({
    resolver: zodResolver(createPipelineSchema),
    defaultValues: { name: "", type: "deal", key: "" },
  });

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    form.setValue("name", e.target.value);
    form.setValue("key", slugify(e.target.value));
  }, [form]);

  const handleSubmit = useCallback((data: CreatePipelineValues) => {
    createPipeline.mutate(
      { ...data, description: null, isDefault: false, isActive: true, sortOrder: 0 },
      {
        onSuccess: () => { toast.success("Pipeline created"); onOpenChange(false); form.reset(); },
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }, [createPipeline, onOpenChange, form]);

  const handleOpenChange = useCallback((v: boolean) => {
    if (!v) form.reset();
    onOpenChange(v);
  }, [onOpenChange, form]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>New Pipeline</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Name</FormLabel>
                <FormControl>
                  <Input {...field} onChange={handleNameChange} placeholder="Sales Pipeline" className="h-8 text-sm" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PIPELINE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="key" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Key</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="sales-pipeline" className="h-8 text-sm font-mono" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <LoadingButton type="submit" size="sm" isPending={createPipeline.isPending} loadingText="Creating...">
                Create
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function AddStageRow({
  pipelineId,
  stagesCount,
}: {
  pipelineId: string;
  stagesCount: number;
}) {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("blue");
  const createStage = useCreateStage();

  const handleLabelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLabel(e.target.value);
  }, []);

  const handleAdd = useCallback(() => {
    const trimmed = label.trim();
    if (!trimmed) return;
    createStage.mutate(
      {
        pipelineId,
        label: trimmed,
        key: slugify(trimmed),
        color,
        sortOrder: stagesCount,
        description: null,
        probability: 50,
        stageType: "open",
        isTerminal: false,
        slaHours: null,
        requiresApproval: false,
        requiredFields: [],
        allowedNextStageKeys: null,
        isActive: true,
        icon: null,
      },
      {
        onSuccess: () => { setLabel(""); setColor("blue"); toast.success("Stage added"); },
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }, [createStage, pipelineId, label, color, stagesCount]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
  }, [handleAdd]);

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-dashed border-border">
      <CrmColorPicker value={color} onChange={setColor} />
      <Input
        value={label}
        onChange={handleLabelChange}
        onKeyDown={handleKeyDown}
        placeholder="Stage name…"
        className="h-7 text-xs flex-1"
      />
      <LoadingButton
        type="button"
        size="sm"
        className="h-7 text-xs px-2.5"
        isPending={createStage.isPending}
        loadingText="Adding..."
        onClick={handleAdd}
        disabled={!label.trim()}
      >
        <Plus className="h-3 w-3 mr-1" />
        Add
      </LoadingButton>
    </div>
  );
}

const stageAdvancedSchema = z.object({
  label: z.string().min(1, "Label required"),
  color: z.string().min(1),
  probability: z.string(),
  stageType: z.enum(["open", "won", "lost", "archived"] as const),
  slaHours: z.string(),
  requiresApproval: z.boolean(),
  isTerminal: z.boolean(),
  requiredFields: z.array(z.string()),
  allowedNextStageKeys: z.array(z.string()).nullable(),
});
type StageAdvancedValues = z.infer<typeof stageAdvancedSchema>;

export function StageAdvancedSheet({
  stage,
  siblingStages,
  open,
  onOpenChange,
}: {
  stage: CrmPipelineStage | null;
  siblingStages: CrmPipelineStage[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const updateStage = useUpdateStage();
  const [fieldInput, setFieldInput] = useState("");

  const form = useForm<StageAdvancedValues>({
    resolver: zodResolver(stageAdvancedSchema),
    defaultValues: stage
      ? {
          label: stage.label,
          color: stage.color,
          probability: String(stage.probability),
          stageType: stage.stageType,
          slaHours: stage.slaHours != null ? String(stage.slaHours) : "",
          requiresApproval: stage.requiresApproval,
          isTerminal: stage.isTerminal,
          requiredFields: stage.requiredFields,
          allowedNextStageKeys: stage.allowedNextStageKeys ?? [],
        }
      : {
          label: "",
          color: "blue",
          probability: "50",
          stageType: "open",
          slaHours: "",
          requiresApproval: false,
          isTerminal: false,
          requiredFields: [],
          allowedNextStageKeys: [],
        },
  });

  const handleSubmit = useCallback((data: StageAdvancedValues) => {
    if (!stage) return;
    const probNum = Number(data.probability);
    updateStage.mutate(
      {
        id: stage.id,
        label: data.label,
        color: data.color,
        probability: Number.isFinite(probNum) ? probNum : 0,
        stageType: data.stageType,
        slaHours: data.slaHours.trim() === "" ? null : Number(data.slaHours),
        requiresApproval: data.requiresApproval,
        isTerminal: data.isTerminal,
        requiredFields: data.requiredFields,
        allowedNextStageKeys: data.allowedNextStageKeys,
      },
      {
        onSuccess: () => { toast.success("Stage updated"); onOpenChange(false); },
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }, [stage, updateStage, onOpenChange]);

  const handleFieldKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = fieldInput.trim();
      if (!val) return;
      const current = form.getValues("requiredFields");
      if (!current.includes(val)) form.setValue("requiredFields", [...current, val]);
      setFieldInput("");
    }
  }, [fieldInput, form]);

  const handleFieldInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFieldInput(e.target.value);
  }, []);

  const handleRemoveField = useCallback((field: string) => {
    form.setValue("requiredFields", form.getValues("requiredFields").filter((f) => f !== field));
  }, [form]);

  const handleToggleAllowedKey = useCallback((key: string, checked: boolean) => {
    const current = form.getValues("allowedNextStageKeys") ?? [];
    form.setValue(
      "allowedNextStageKeys",
      checked ? [...current, key] : current.filter((k) => k !== key)
    );
  }, [form]);

  const otherStages = siblingStages.filter((s) => s.id !== stage?.id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-md overflow-y-auto" side="right">
        <SheetHeader>
          <SheetTitle className="text-sm">Edit Stage</SheetTitle>
          {stage && <p className="text-[11px] font-mono text-muted-foreground">{stage.key}</p>}
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-4 pb-6">
            <FormField control={form.control} name="label" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Label</FormLabel>
                <FormControl><Input {...field} className="h-8 text-sm" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="color" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Color</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <CrmColorPicker value={field.value} onChange={field.onChange} />
                    <span className="text-xs text-muted-foreground capitalize">{field.value}</span>
                  </div>
                </FormControl>
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="probability" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Probability (%)</FormLabel>
                  <FormControl><Input type="number" min={0} max={100} {...field} className="h-8 text-sm" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="slaHours" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">SLA Hours</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} placeholder="None" value={field.value ?? ""} onChange={field.onChange} className="h-8 text-sm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="stageType" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Stage Type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {STAGE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className={t.className}>{t.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
            <div className="flex items-center gap-6">
              <FormField control={form.control} name="requiresApproval" render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="text-xs font-normal cursor-pointer">Requires Approval</FormLabel>
                </FormItem>
              )} />
              <FormField control={form.control} name="isTerminal" render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="text-xs font-normal cursor-pointer">Terminal</FormLabel>
                </FormItem>
              )} />
            </div>
            <Separator />
            <FormField control={form.control} name="requiredFields" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Required Fields</FormLabel>
                <div className="flex flex-wrap gap-1 mb-1.5 min-h-[1.5rem]">
                  {field.value.map((f) => (
                    <Badge
                      key={f}
                      variant="outline"
                      className="text-[10px] h-5 px-1.5 gap-1 cursor-pointer hover:bg-destructive/10"
                      onClick={() => handleRemoveField(f)}
                    >
                      {f} ×
                    </Badge>
                  ))}
                </div>
                <Input
                  value={fieldInput}
                  onChange={handleFieldInputChange}
                  onKeyDown={handleFieldKeyDown}
                  placeholder="Type field name + Enter"
                  className="h-7 text-xs"
                />
              </FormItem>
            )} />
            <FormField control={form.control} name="allowedNextStageKeys" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Allowed Next Stages</FormLabel>
                <div className="border border-border rounded-md max-h-36 overflow-y-auto divide-y divide-border">
                  {otherStages.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2 py-2">No other stages</p>
                  ) : otherStages.map((s) => {
                    const checked = (field.value ?? []).includes(s.key);
                    return (
                      <label key={s.key} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-muted/40 text-xs">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => handleToggleAllowedKey(s.key, e.target.checked)}
                          className="rounded border-border"
                        />
                        <span className={cn("size-2 rounded-full shrink-0", getCrmTokenClasses(s.color).dotClass)} />
                        {s.label}
                      </label>
                    );
                  })}
                </div>
              </FormItem>
            )} />
            <SheetFooter>
              <LoadingButton type="submit" size="sm" isPending={updateStage.isPending} loadingText="Saving...">
                Save Changes
              </LoadingButton>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

export function StageCard({
  stage,
  index,
  siblingStages,
  onEditAdvanced,
  onDeleteRequest,
}: {
  stage: CrmPipelineStage;
  index: number;
  siblingStages: CrmPipelineStage[];
  onEditAdvanced: (stage: CrmPipelineStage) => void;
  onDeleteRequest: (id: string) => void;
}) {
  const updateStage = useUpdateStage();
  const { dotClass } = getCrmTokenClasses(stage.color);
  const slaRef = useRef<HTMLInputElement>(null);

  const handleProbChange = useCallback((delta: number) => {
    const next = Math.max(0, Math.min(100, stage.probability + delta));
    updateStage.mutate({ id: stage.id, probability: next }, { onError: (err) => toast.error(getErrorMessage(err)) });
  }, [stage.id, stage.probability, updateStage]);

  const handleDecrease = useCallback(() => handleProbChange(-5), [handleProbChange]);
  const handleIncrease = useCallback(() => handleProbChange(5), [handleProbChange]);

  const handleStageTypeChange = useCallback((val: string) => {
    updateStage.mutate({ id: stage.id, stageType: val as CrmStageType }, { onError: (err) => toast.error(getErrorMessage(err)) });
  }, [stage.id, updateStage]);

  const handleSlaBlur = useCallback(() => {
    const val = slaRef.current?.value;
    const slaHours = val ? Number(val) : null;
    if (slaHours !== stage.slaHours) {
      updateStage.mutate({ id: stage.id, slaHours }, { onError: (err) => toast.error(getErrorMessage(err)) });
    }
  }, [stage.id, stage.slaHours, updateStage]);

  const handleApprovalChange = useCallback((checked: boolean) => {
    updateStage.mutate({ id: stage.id, requiresApproval: checked }, { onError: (err) => toast.error(getErrorMessage(err)) });
  }, [stage.id, updateStage]);

  const handleTerminalChange = useCallback((checked: boolean) => {
    updateStage.mutate({ id: stage.id, isTerminal: checked }, { onError: (err) => toast.error(getErrorMessage(err)) });
  }, [stage.id, updateStage]);

  const handleEditAdvanced = useCallback(() => onEditAdvanced(stage), [stage, onEditAdvanced]);
  const handleDeleteRequest = useCallback(() => onDeleteRequest(stage.id), [stage.id, onDeleteRequest]);

  const stageTypeMeta = STAGE_TYPES.find((t) => t.value === stage.stageType);

  void siblingStages;

  return (
    <Draggable draggableId={stage.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            "flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-sm transition-shadow",
            snapshot.isDragging && "shadow-lg ring-1 ring-blue-500/30"
          )}
        >
          <div {...provided.dragHandleProps} className="shrink-0 cursor-grab text-muted-foreground hover:text-foreground">
            <GripVertical className="h-4 w-4" />
          </div>
          <span className={cn("size-2.5 rounded-full shrink-0", dotClass)} />
          <span className="font-medium text-sm min-w-[80px] flex-1 truncate">{stage.label}</span>
          <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground shrink-0">
            {stage.key}
          </span>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleDecrease} disabled={stage.probability <= 0} type="button">
              <span className="text-xs leading-none">−</span>
            </Button>
            <span className="bg-blue-50 text-blue-700 text-xs px-1.5 rounded min-w-[3rem] text-center">
              {stage.probability}%
            </span>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleIncrease} disabled={stage.probability >= 100} type="button">
              <span className="text-xs leading-none">+</span>
            </Button>
          </div>
          <Select value={stage.stageType} onValueChange={handleStageTypeChange}>
            <SelectTrigger className="h-6 w-[72px] text-[11px] border-none shadow-none px-1.5">
              <SelectValue>
                <span className={cn("text-[11px]", stageTypeMeta?.className)}>{stageTypeMeta?.label}</span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STAGE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <span className={t.className}>{t.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input ref={slaRef} type="number" min={1} defaultValue={stage.slaHours ?? ""} placeholder="SLA" className="h-7 w-16 text-xs" onBlur={handleSlaBlur} />
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-muted-foreground">Appr.</span>
            <Switch checked={stage.requiresApproval} onCheckedChange={handleApprovalChange} className="scale-75" />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-muted-foreground">Terminal</span>
            <Switch checked={stage.isTerminal} onCheckedChange={handleTerminalChange} className="scale-75" />
          </div>
          <CrmStageBadge stage={stage} size="table" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem onClick={handleEditAdvanced}>
                <Pencil className="h-3.5 w-3.5 mr-2" />
                Edit (advanced)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDeleteRequest} className="text-destructive focus:text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </Draggable>
  );
}
