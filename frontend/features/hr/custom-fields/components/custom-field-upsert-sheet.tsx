"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AlertTriangle, Lock, Plus, X } from "lucide-react";
import type {
  HrCustomFieldDefinition,
  CreateCustomFieldPayload,
  UpdateCustomFieldPayload,
  HrCustomFieldSettings,
} from "@/features/hr/forms/lib/types";
import {
  FIELD_TYPES,
  ENTITY_TYPES,
  SENSITIVE_WARNING_TEXT,
  slugify,
  keySchema,
  fieldFormSchema,
  getDefaultValues,
  type FieldFormValues,
} from "../lib/custom-field-form";
import { FieldPreview } from "./field-preview";

interface CustomFieldUpsertSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: string;
  field?: HrCustomFieldDefinition;
  onSave: (payload: CreateCustomFieldPayload | UpdateCustomFieldPayload) => Promise<void>;
  isPending: boolean;
}

function parseOptionalNumber(raw: string | undefined): number | undefined {
  if (!raw || raw.trim() === "") return undefined;
  const n = Number(raw);
  return isNaN(n) ? undefined : n;
}

function buildSettings(values: FieldFormValues): HrCustomFieldSettings {
  const validationRules: HrCustomFieldSettings["validationRules"] = {};
  const minLen = parseOptionalNumber(values.validationMinLength);
  const maxLen = parseOptionalNumber(values.validationMaxLength);
  const minVal = parseOptionalNumber(values.validationMinValue);
  const maxVal = parseOptionalNumber(values.validationMaxValue);

  if (minLen !== undefined) validationRules.minLength = minLen;
  if (maxLen !== undefined) validationRules.maxLength = maxLen;
  if (minVal !== undefined) validationRules.minValue = minVal;
  if (maxVal !== undefined) validationRules.maxValue = maxVal;
  if (values.validationDateMin) validationRules.dateMin = values.validationDateMin;
  if (values.validationDateMax) validationRules.dateMax = values.validationDateMax;

  return {
    helpText: values.helpText || undefined,
    placeholder: values.placeholder || undefined,
    validationRules: Object.keys(validationRules).length > 0 ? validationRules : undefined,
    visibility: {
      hrOnly: values.visibilityHrOnly,
      managerVisible: values.visibilityManagerVisible,
      selfServiceVisible: values.visibilitySelfService,
      hiddenFromExports: values.visibilityHiddenFromExports,
    },
    searchable: values.searchable,
    reportable: values.reportable,
  };
}

export function CustomFieldUpsertSheet({
  open,
  onOpenChange,
  entityType,
  field,
  onSave,
  isPending,
}: CustomFieldUpsertSheetProps) {
  const [confirmSensitiveOpen, setConfirmSensitiveOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<FieldFormValues | null>(null);

  const isEdit = !!field;

  const form = useForm<FieldFormValues>({
    resolver: zodResolver(fieldFormSchema),
    defaultValues: getDefaultValues(field, entityType),
  });

  const watchedIsSensitive = form.watch("isSensitive");
  const watchedFieldType = form.watch("fieldType");
  const watchedName = form.watch("name");

  const {
    fields: optionFields,
    append: appendOption,
    remove: removeOption,
  } = useFieldArray({ control: form.control, name: "options" });

  useEffect(() => {
    if (!isEdit && watchedName) {
      const generated = slugify(watchedName);
      form.setValue("key", generated, { shouldValidate: false });
    }
  }, [watchedName, isEdit, form]);

  useEffect(() => {
    if (!open) {
      form.reset(getDefaultValues(field, entityType));
    }
  }, [open, field, entityType, form]);

  const needsOptions = watchedFieldType === "select" || watchedFieldType === "multi_select";
  const needsTextValidation = watchedFieldType === "text";
  const needsNumericValidation = watchedFieldType === "number" || watchedFieldType === "currency";
  const needsDateValidation = watchedFieldType === "date";

  function handleAddOption() {
    appendOption({ label: "", value: "" });
  }

  function handleOptionLabelChange(idx: number, label: string) {
    const slug = label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    form.setValue(`options.${idx}.value`, slug);
  }

  async function performSave(values: FieldFormValues) {
    const settings = buildSettings(values);
    if (isEdit) {
      await onSave({
        name: values.name,
        options: needsOptions ? (values.options ?? []) : undefined,
        settings,
        isSensitive: values.isSensitive,
        isRequired: values.isRequired,
      });
    } else {
      const keyResult = keySchema.safeParse(values.key);
      if (!keyResult.success) {
        form.setError("key", { message: keyResult.error.issues[0]?.message ?? "Invalid key" });
        return;
      }
      await onSave({
        entityType: values.entityType,
        name: values.name,
        key: values.key,
        fieldType: values.fieldType,
        options: needsOptions ? (values.options ?? []) : undefined,
        settings,
        isSensitive: values.isSensitive,
        isRequired: values.isRequired,
      });
    }
  }

  async function handleConfirmSensitive() {
    if (!pendingValues) return;
    setConfirmSensitiveOpen(false);
    await performSave(pendingValues);
  }

  function handleCancelSensitiveConfirm() {
    setConfirmSensitiveOpen(false);
    setPendingValues(null);
  }

  async function onSubmit(values: FieldFormValues) {
    if (values.isSensitive) {
      setPendingValues(values);
      setConfirmSensitiveOpen(true);
      return;
    }
    await performSave(values);
  }

  function handleCancelClick() {
    onOpenChange(false);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="sm:max-w-lg w-full flex flex-col gap-0 p-0 overflow-hidden"
        >
          <SheetHeader className="px-6 pt-5 pb-4 border-b shrink-0">
            <SheetTitle className="text-base">
              {isEdit ? "Edit Custom Field" : "New Custom Field"}
            </SheetTitle>
            {isEdit && field.isSensitive && (
              <div className="flex items-center gap-1.5 mt-1">
                <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">Sensitive field</span>
              </div>
            )}
          </SheetHeader>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <SheetBody className="space-y-5 px-6 py-4">
              {!isEdit && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Applies To *</Label>
                  <Controller
                    control={form.control}
                    name="entityType"
                    render={({ field: f }) => (
                      <Select value={f.value} onValueChange={f.onChange}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ENTITY_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value} className="text-sm">
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.entityType && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.entityType.message}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-medium">Name *</Label>
                <Input
                  {...form.register("name")}
                  className="h-8 text-sm"
                  placeholder="e.g. Employee Badge Number"
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              {!isEdit && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">
                      Key *
                      <span className="text-muted-foreground font-normal ml-1">
                        (auto-generated, editable)
                      </span>
                    </Label>
                    <Input
                      {...form.register("key")}
                      className="h-8 text-sm font-mono"
                      placeholder="e.g. badge_number"
                    />
                    {form.formState.errors.key && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.key.message}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Lowercase letters, numbers, underscores only. Cannot start with a number or
                      use reserved names.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Field Type</Label>
                    <Controller
                      control={form.control}
                      name="fieldType"
                      render={({ field: f }) => (
                        <Select value={f.value} onValueChange={f.onChange}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value} className="text-sm">
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-medium">Help Text</Label>
                <Textarea
                  {...form.register("helpText")}
                  className="text-sm resize-none"
                  rows={2}
                  placeholder="Guidance shown below the field in forms"
                />
                {form.formState.errors.helpText && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.helpText.message}
                  </p>
                )}
              </div>

              {(watchedFieldType === "text" ||
                watchedFieldType === "number" ||
                watchedFieldType === "currency" ||
                watchedFieldType === "date") && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Placeholder</Label>
                  <Input
                    {...form.register("placeholder")}
                    className="h-8 text-sm"
                    placeholder="Shown when the field is empty"
                  />
                </div>
              )}

              {needsOptions && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Options *</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2 gap-1"
                      onClick={handleAddOption}
                    >
                      <Plus className="h-3 w-3" /> Add Option
                    </Button>
                  </div>
                  {optionFields.length === 0 && (
                    <p className="text-xs text-muted-foreground">No options yet. Add at least one.</p>
                  )}
                  {optionFields.map((optField, idx) => (
                    <div key={optField.id} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-1">
                        <Input
                          {...form.register(`options.${idx}.label`)}
                          className="h-8 text-xs"
                          placeholder="Label"
                          onChange={(e) => {
                            form.register(`options.${idx}.label`).onChange(e);
                            handleOptionLabelChange(idx, e.target.value);
                          }}
                        />
                        {form.formState.errors.options?.[idx]?.label && (
                          <p className="text-[10px] text-destructive">
                            {form.formState.errors.options[idx]?.label?.message}
                          </p>
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <Input
                          {...form.register(`options.${idx}.value`)}
                          className="h-8 text-xs font-mono"
                          placeholder="value"
                        />
                        {form.formState.errors.options?.[idx]?.value && (
                          <p className="text-[10px] text-destructive">
                            {form.formState.errors.options[idx]?.value?.message}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => removeOption(idx)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {(needsTextValidation || needsNumericValidation || needsDateValidation) && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Validation Rules</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {needsTextValidation && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Min Length</Label>
                          <Input
                            type="number"
                            {...form.register("validationMinLength")}
                            className="h-8 text-xs"
                            placeholder="0"
                            min={0}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Max Length</Label>
                          <Input
                            type="number"
                            {...form.register("validationMaxLength")}
                            className="h-8 text-xs"
                            placeholder="500"
                            min={1}
                          />
                        </div>
                      </>
                    )}
                    {needsNumericValidation && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Min Value</Label>
                          <Input
                            type="number"
                            {...form.register("validationMinValue")}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Max Value</Label>
                          <Input
                            type="number"
                            {...form.register("validationMaxValue")}
                            className="h-8 text-xs"
                          />
                        </div>
                      </>
                    )}
                    {needsDateValidation && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Date From</Label>
                          <Input
                            type="date"
                            {...form.register("validationDateMin")}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Date To</Label>
                          <Input
                            type="date"
                            {...form.register("validationDateMax")}
                            className="h-8 text-xs"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <Label className="text-xs font-medium">Field Flags</Label>
                <div className="flex items-center gap-2">
                  <Controller
                    control={form.control}
                    name="isRequired"
                    render={({ field: f }) => (
                      <Switch checked={f.value} onCheckedChange={f.onChange} id="isRequired" />
                    )}
                  />
                  <Label htmlFor="isRequired" className="text-sm cursor-pointer">
                    Required
                  </Label>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Controller
                      control={form.control}
                      name="isSensitive"
                      render={({ field: f }) => (
                        <Switch checked={f.value} onCheckedChange={f.onChange} id="isSensitive" />
                      )}
                    />
                    <Label htmlFor="isSensitive" className="text-sm cursor-pointer">
                      Sensitive
                    </Label>
                    {watchedIsSensitive && <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />}
                  </div>
                  {watchedIsSensitive && (
                    <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md dark:bg-amber-500/10 dark:border-amber-500/30">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800 dark:text-amber-300">{SENSITIVE_WARNING_TEXT}</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-xs font-medium">Visibility</Label>
                <div className="space-y-2">
                  {(
                    [
                      {
                        name: "visibilityHrOnly",
                        label: "HR only (hidden from managers and employees)",
                      },
                      { name: "visibilityManagerVisible", label: "Visible to managers" },
                      {
                        name: "visibilitySelfService",
                        label: "Visible in employee self-service",
                      },
                      { name: "visibilityHiddenFromExports", label: "Hidden from exports" },
                    ] as const
                  ).map(({ name, label }) => (
                    <div key={name} className="flex items-center gap-2">
                      <Controller
                        control={form.control}
                        name={name}
                        render={({ field: f }) => (
                          <Checkbox id={name} checked={f.value} onCheckedChange={f.onChange} />
                        )}
                      />
                      <Label htmlFor={name} className="text-sm font-normal cursor-pointer">
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-xs font-medium">Reporting &amp; Search</Label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Controller
                      control={form.control}
                      name="searchable"
                      render={({ field: f }) => (
                        <Checkbox
                          id="searchable"
                          checked={f.value}
                          onCheckedChange={f.onChange}
                        />
                      )}
                    />
                    <Label htmlFor="searchable" className="text-sm font-normal cursor-pointer">
                      Include in search results
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Controller
                      control={form.control}
                      name="reportable"
                      render={({ field: f }) => (
                        <Checkbox
                          id="reportable"
                          checked={f.value}
                          onCheckedChange={f.onChange}
                        />
                      )}
                    />
                    <Label htmlFor="reportable" className="text-sm font-normal cursor-pointer">
                      Available in reports
                    </Label>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Preview</Label>
                <FieldPreview
                  name={form.watch("name") || (isEdit ? field?.name ?? "" : "")}
                  fieldType={watchedFieldType}
                  helpText={form.watch("helpText")}
                  placeholder={form.watch("placeholder")}
                  isRequired={form.watch("isRequired")}
                  isSensitive={form.watch("isSensitive")}
                  options={form.watch("options")}
                />
              </div>
            </SheetBody>

            <SheetFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancelClick}
                disabled={isPending}
              >
                Cancel
              </Button>
              <LoadingButton type="submit" size="sm" isPending={isPending}>
                {isEdit ? "Save Changes" : "Create Field"}
              </LoadingButton>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmSensitiveOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleCancelSensitiveConfirm();
        }}
        title="Create sensitive field?"
        description={`"${pendingValues?.name ?? ""}" will be marked as sensitive. ${SENSITIVE_WARNING_TEXT}`}
        confirmLabel="Create Sensitive Field"
        isPending={isPending}
        onConfirm={handleConfirmSensitive}
      />
    </>
  );
}
