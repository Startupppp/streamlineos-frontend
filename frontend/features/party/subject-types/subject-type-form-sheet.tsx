"use client";

import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCreateSubjectType, useUpdateSubjectType } from "@/hooks/api/party/subjects";
import { getErrorMessage } from "@/lib/get-error-message";
import type { SubjectFieldDefinition, SubjectType } from "@/types/party/subjects";
import type { FieldKind } from "@/lib/renderer/layout";
import { SubjectTypeFieldRow } from "./subject-type-field-row";
import {
  EMPTY_FIELD,
  OPTION_KINDS,
  subjectTypeFormSchema,
  type SubjectTypeForm,
} from "./subject-type-schema";

export interface SubjectTypeFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Absent when declaring a new type. */
  type?: SubjectType;
}

const BLANK: SubjectTypeForm = {
  key: "",
  singular: "",
  plural: "",
  titleField: "",
  fields: [{ ...EMPTY_FIELD }],
};

function toFormValues(type: SubjectType): SubjectTypeForm {
  return {
    key: type.key,
    singular: type.singular,
    plural: type.plural,
    titleField: type.titleField,
    fields: type.fields.map((field) => ({
      name: field.name,
      label: field.label,
      kind: field.kind,
      required: field.required ?? false,
      options: field.options?.map((option) => ({ value: option.value, label: option.label })) ?? [],
    })),
  };
}

/** Drops the properties a kind does not carry, so the payload matches the API. */
function toDeclaration(field: SubjectTypeForm["fields"][number]): SubjectFieldDefinition {
  return {
    name: field.name,
    label: field.label,
    kind: field.kind as FieldKind,
    ...(field.required ? { required: true } : {}),
    ...(OPTION_KINDS.has(field.kind) ? { options: field.options } : {}),
  };
}

/**
 * Declaring what the business transacts.
 *
 * This is the screen that makes "without an engineer" true. Its output is a
 * schema, so it is the one form whose validation has to restate the backend's
 * own rules rather than trusting a submit to explain them.
 */
export function SubjectTypeFormSheet({ open, onOpenChange, type }: SubjectTypeFormSheetProps) {
  const createType = useCreateSubjectType();
  const updateType = useUpdateSubjectType();

  const isEdit = !!type;
  const isSubmitting = createType.isPending || updateType.isPending;

  const form = useForm<SubjectTypeForm>({
    resolver: zodResolver(subjectTypeFormSchema),
    defaultValues: type ? toFormValues(type) : BLANK,
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "fields" });

  useEffect(() => {
    if (open) form.reset(type ? toFormValues(type) : BLANK);
  }, [open, type, form]);

  const declaredFields = form.watch("fields");
  const titleCandidates = declaredFields.filter((field) => field.name && field.label);

  function handleAddField() {
    append({ ...EMPTY_FIELD });
  }

  function handleCancel() {
    onOpenChange(false);
  }

  function handleSubmit(values: SubjectTypeForm) {
    const payload = {
      key: values.key,
      singular: values.singular,
      plural: values.plural,
      titleField: values.titleField,
      fields: values.fields.map(toDeclaration),
    };

    const onSuccess = () => {
      toast.success(isEdit ? "Subject type updated" : "Subject type declared");
      onOpenChange(false);
    };
    const onError = (error: unknown) => toast.error(getErrorMessage(error));

    if (type) {
      updateType.mutate({ subjectTypeId: type.subjectTypeId, ...payload }, { onSuccess, onError });
      return;
    }
    createType.mutate(payload, { onSuccess, onError });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <div className="shrink-0 border-b px-6 py-4">
          <SheetHeader>
            <SheetTitle>{isEdit ? `Edit ${type.singular}` : "Declare a subject type"}</SheetTitle>
            <SheetDescription>
              The thing your business transacts — a property, a candidate, a shipment, a policy.
            </SheetDescription>
          </SheetHeader>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="singular"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Singular name</FormLabel>
                      <FormControl>
                        <Input placeholder="Property" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="plural"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plural name</FormLabel>
                      <FormControl>
                        <Input placeholder="Properties" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="property"
                          className="font-mono text-[13px]"
                          disabled={isEdit}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {isEdit
                          ? "The key is fixed once records exist."
                          : "How your own integrations will address this type."}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="titleField"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title field</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Which field names the record?" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                          {titleCandidates.map((candidate) => (
                            <SelectItem key={candidate.name} value={candidate.name}>
                              {candidate.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-label font-medium text-muted-foreground">Fields</h3>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddField}>
                    <Plus className="mr-1 h-3 w-3" /> Add field
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <SubjectTypeFieldRow
                    key={field.id}
                    form={form}
                    index={index}
                    onRemove={remove}
                    canRemove={fields.length > 1}
                  />
                ))}

                {form.formState.errors.fields?.message ? (
                  <p className="text-xs text-destructive" role="alert">
                    {form.formState.errors.fields.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="shrink-0 border-t px-6 py-4">
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                  Cancel
                </Button>
                <LoadingButton type="submit" isPending={isSubmitting}>
                  {isEdit ? "Save changes" : "Declare type"}
                </LoadingButton>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
