"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FieldPalette } from "./field-palette";
import { FieldConfigPanel } from "./field-config-panel";
import { slugify } from "../lib/field-type-meta";
import type { HrFormField, HrFormFieldType, HrForm, CreateHrFormPayload } from "../lib/types";

const WORKFLOW_TYPES = [
  { value: "leave_request", label: "Leave Request" },
  { value: "expense_reimbursement", label: "Expense Reimbursement" },
  { value: "travel_request", label: "Travel Request" },
  { value: "asset_request", label: "Asset Request" },
  { value: "employee_data_change", label: "Employee Data Change" },
  { value: "grievance_case", label: "Grievance Case" },
  { value: "document_review", label: "Document Review" },
];

const formSchema = z.object({
  name: z
    .string()
    .min(1, "Form name is required")
    .transform((v) => v.trim())
    .refine((v) => v.length >= 3, "Name must be at least 3 characters")
    .refine((v) => /[a-zA-Z]/.test(v), "Name must contain at least one letter"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .transform((v) => v.trim())
    .refine(
      (v) => /^[a-z0-9-]+$/.test(v),
      "Slug must contain only lowercase letters, numbers, and hyphens",
    ),
  description: z.string().optional(),
  audience: z.enum(["internal", "public"]),
  workflowType: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

interface FormBuilderProps {
  form?: HrForm;
  onSave: (data: CreateHrFormPayload) => void;
  isPending: boolean;
}

function generateKey(label: string, existing: string[]): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "field";
  let key = base;
  let n = 2;
  while (existing.includes(key)) {
    key = `${base}_${n}`;
    n++;
  }
  return key;
}

export function FormBuilder({ form, onSave, isPending }: FormBuilderProps) {
  const [fields, setFields] = useState<HrFormField[]>(form?.schema ?? []);
  const [selectedFieldIdx, setSelectedFieldIdx] = useState<number | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const rhf = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: form?.name ?? "",
      slug: form?.slug ?? "",
      description: form?.description ?? "",
      audience: form?.audience ?? "internal",
      workflowType: form?.workflowObjectType ?? "none",
    },
  });

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    rhf.setValue("name", v, { shouldValidate: rhf.formState.isSubmitted });
    if (!form) {
      rhf.setValue("slug", slugify(v), { shouldValidate: rhf.formState.isSubmitted });
    }
  }

  function handleAddField(type: HrFormFieldType) {
    const existing = fields.map((f) => f.key);
    const key = generateKey(type, existing);
    const newField: HrFormField = {
      key,
      label: key.replace(/_/g, " "),
      type,
      required: false,
      sensitive: false,
    };
    setFields((prev) => [...prev, newField]);
    setSelectedFieldIdx(fields.length);
    setPaletteOpen(false);
  }

  function handleUpdateField(idx: number, updated: HrFormField) {
    setFields((prev) => prev.map((f, i) => (i === idx ? updated : f)));
  }

  function handleRemoveField(idx: number) {
    setFields((prev) => prev.filter((_, i) => i !== idx));
    setSelectedFieldIdx(null);
  }

  function handleMoveField(idx: number, dir: -1 | 1) {
    const next = [...fields];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap]!, next[idx]!];
    setFields(next);
    setSelectedFieldIdx(swap);
  }

  function handleSubmit(values: FormValues) {
    onSave({
      name: values.name,
      slug: values.slug,
      description: values.description?.trim() || undefined,
      audience: values.audience,
      workflowObjectType: values.workflowType === "none" ? null : values.workflowType,
      schema: fields,
    });
  }

  return (
    <Form {...rhf}>
      <form
        onSubmit={rhf.handleSubmit(handleSubmit)}
        className="flex h-full min-h-0 gap-4"
      >
        <ScrollArea hideScrollbar className="hidden md:flex w-44 shrink-0 border-r border-border pr-3">
          <FieldPalette onAddField={handleAddField} />
        </ScrollArea>

        <ScrollArea hideScrollbar className="flex-1 min-h-0 min-w-0">
          <div className="space-y-4 pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              control={rhf.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Form Name *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={handleNameChange}
                      placeholder="e.g. WFH Request"
                      className="h-8 text-sm"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={rhf.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Slug *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="wfh-request"
                      className="h-8 text-sm font-mono"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={rhf.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    className="text-sm h-14 resize-none"
                    placeholder="Optional"
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <div className="flex flex-wrap items-start gap-4">
            <FormField
              control={rhf.control}
              name="audience"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs">Audience</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-8 text-sm w-36">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="internal">Internal</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={rhf.control}
              name="workflowType"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs">Trigger workflow</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-8 text-sm w-52">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {WORKFLOW_TYPES.map((w) => (
                        <SelectItem key={w.value} value={w.value}>
                          {w.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>

          <div className="flex items-center justify-between md:hidden">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Fields ({fields.length})
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setPaletteOpen(true)}
            >
              + Add Field
            </Button>
          </div>

          <Separator className="hidden md:block" />

          <div className="hidden md:block space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Fields ({fields.length})
            </Label>

            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                Add fields from the palette on the left
              </p>
            )}

            {fields.map((field, idx) => (
              <div
                key={`${field.key}-${idx}`}
                className={`cursor-pointer rounded-lg border ${
                  selectedFieldIdx === idx
                    ? "border-primary ring-1 ring-primary"
                    : "border-border"
                }`}
                onClick={() => setSelectedFieldIdx(selectedFieldIdx === idx ? null : idx)}
              >
                {selectedFieldIdx === idx ? (
                  <FieldConfigPanel
                    field={field}
                    allFields={fields}
                    onChange={(updated) => handleUpdateField(idx, updated)}
                    onRemove={() => handleRemoveField(idx)}
                  />
                ) : (
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="min-w-0">
                      <span className="text-sm font-medium">{field.label || field.key}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{field.type}</span>
                      {field.required && (
                        <span className="ml-1 text-xs text-destructive">*</span>
                      )}
                      {field.sensitive && (
                        <span className="ml-1 text-xs text-amber-600">sensitive</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveField(idx, -1);
                        }}
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveField(idx, 1);
                        }}
                      >
                        ↓
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="md:hidden space-y-2">
            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                Tap &ldquo;Add Field&rdquo; above to add fields
              </p>
            )}

            {fields.map((field, idx) => (
              <div
                key={`${field.key}-${idx}`}
                className={`cursor-pointer rounded-lg border ${
                  selectedFieldIdx === idx
                    ? "border-primary ring-1 ring-primary"
                    : "border-border"
                }`}
                onClick={() => setSelectedFieldIdx(selectedFieldIdx === idx ? null : idx)}
              >
                {selectedFieldIdx === idx ? (
                  <FieldConfigPanel
                    field={field}
                    allFields={fields}
                    onChange={(updated) => handleUpdateField(idx, updated)}
                    onRemove={() => handleRemoveField(idx)}
                  />
                ) : (
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="min-w-0">
                      <span className="text-sm font-medium">{field.label || field.key}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{field.type}</span>
                      {field.required && (
                        <span className="ml-1 text-xs text-destructive">*</span>
                      )}
                      {field.sensitive && (
                        <span className="ml-1 text-xs text-amber-600">sensitive</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveField(idx, -1);
                        }}
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveField(idx, 1);
                        }}
                      >
                        ↓
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2 border-t">
            <LoadingButton type="submit" size="sm" isPending={isPending} loadingText="Saving...">
              Save Form
            </LoadingButton>
          </div>
          </div>
        </ScrollArea>
      </form>

      <Sheet open={paletteOpen} onOpenChange={setPaletteOpen}>
        <SheetContent side="bottom" className="h-[60vh] overflow-y-auto">
          <SheetHeader className="pb-3 border-b">
            <SheetTitle className="text-sm">Add Field</SheetTitle>
          </SheetHeader>
          <div className="pt-3">
            <FieldPalette onAddField={handleAddField} />
          </div>
        </SheetContent>
      </Sheet>
    </Form>
  );
}
