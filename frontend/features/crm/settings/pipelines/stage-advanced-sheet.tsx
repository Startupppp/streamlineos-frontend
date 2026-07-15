"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetBody,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";

import { CrmColorPicker } from "@/features/crm/settings/shared/crm-color-picker";
import { getCrmTokenClasses } from "@/features/crm/shared/metadata/crm-color-tokens";
import { useUpdateStage } from "@/hooks/api/crm";
import type { CrmPipelineStage } from "@/types/crm/metadata";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { STAGE_TYPES } from "./pipeline-constants";

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
      <SheetContent className="flex w-full max-w-md flex-col gap-0 overflow-hidden p-0" side="right">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <SheetTitle className="text-sm">Edit Stage</SheetTitle>
          {stage && <p className="font-mono text-[11px] text-muted-foreground">{stage.key}</p>}
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex min-h-0 flex-1 flex-col">
            <SheetBody className="space-y-4 px-6 py-5">
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
            </SheetBody>
            <SheetFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
              <LoadingButton type="submit" size="sm" isPending={updateStage.isPending} loadingText="Saving..." className="w-full">
                Save Changes
              </LoadingButton>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
