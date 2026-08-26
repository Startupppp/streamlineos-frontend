"use client";

import { useCallback, useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  useCreateCustomField,
  useUpdateCustomField,
  type CustomFieldDefinition,
} from "@/hooks/api/crm/custom-fields";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  customFieldSchema,
  labelToName,
  type CustomFieldFormValues,
} from "./custom-field-sheet-schema";

/**
 * Define a custom field.
 *
 * The one form on this migration that is still written by hand, and the reason
 * is in `CUSTOM_FIELD_LAYOUT`: a choice field's options are a list of
 * `{ value, label }` pairs, and the editor for them must appear only when the
 * type is `select`. `FieldSpec` has no array kind and no conditional visibility,
 * and inventing either to serve one screen would put a container and a
 * conditional into a vocabulary whose whole point is that it describes what a
 * field *is*.
 *
 * It is a sheet rather than the dialog it replaces. Adding options one at a time
 * is work with a length — six options is six additions, each losable to a stray
 * Escape — and multi-step work does not belong in a modal.
 */

type EntityType = CustomFieldDefinition["entityType"];

interface CustomFieldSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: EntityType;
  field: CustomFieldDefinition | null;
  sortOrder: number;
}

const EMPTY_VALUES: CustomFieldFormValues = {
  label: "",
  fieldType: "text",
  isRequired: false,
  options: [],
};

export function CustomFieldSheet({
  open,
  onOpenChange,
  entityType,
  field,
  sortOrder,
}: CustomFieldSheetProps) {
  const createField = useCreateCustomField();
  const updateField = useUpdateCustomField();
  const isEditing = field !== null;
  const isPending = createField.isPending || updateField.isPending;

  const form = useForm<CustomFieldFormValues>({
    resolver: zodResolver(customFieldSchema),
    defaultValues: EMPTY_VALUES,
  });

  const { fields: options, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  });

  const { reset } = form;
  useEffect(() => {
    reset(
      field
        ? {
            label: field.label,
            fieldType: field.fieldType,
            isRequired: field.isRequired,
            options: field.options ?? [],
          }
        : EMPTY_VALUES,
    );
  }, [field, reset]);

  const fieldType = form.watch("fieldType");

  const handleAddOption = useCallback(() => append({ value: "", label: "" }), [append]);
  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);

  function handleSubmit(values: CustomFieldFormValues) {
    if (field) {
      updateField.mutate(
        {
          id: field.id,
          entityType: field.entityType,
          label: values.label,
          isRequired: values.isRequired,
          options: field.fieldType === "select" ? values.options : null,
        },
        {
          onSuccess: () => {
            toast.success("Field updated");
            onOpenChange(false);
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
      return;
    }

    createField.mutate(
      {
        entityType,
        name: labelToName(values.label),
        label: values.label,
        fieldType: values.fieldType,
        isRequired: values.isRequired,
        options: values.fieldType === "select" ? values.options : undefined,
        sortOrder,
      },
      {
        onSuccess: () => {
          toast.success("Field created");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b px-6 py-4">
          <SheetTitle>{isEditing ? "Edit custom field" : "New custom field"}</SheetTitle>
          <SheetDescription>
            A field of your own on every {entityType}, alongside the ones the product ships with.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex min-h-0 flex-1 flex-col">
            <SheetBody className="flex flex-col gap-gap-toolbar px-6 py-5">
              <FormField
                control={form.control}
                name="label"
                render={({ field: control }) => (
                  <FormItem>
                    <FormLabel>
                      Label<span aria-hidden="true"> *</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...control} placeholder="Lead source" />
                    </FormControl>
                    <FormDescription>
                      Stored as {labelToName(control.value) || "…"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fieldType"
                render={({ field: control }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      value={control.value}
                      onValueChange={control.onChange}
                      disabled={isEditing}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="boolean">Yes / no</SelectItem>
                        <SelectItem value="select">Choice</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {isEditing
                        ? "A field's type cannot change once records carry values in it."
                        : "Choose carefully — this cannot be changed later."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isRequired"
                render={({ field: control }) => (
                  <FormItem>
                    <FormLabel>Required</FormLabel>
                    <FormControl>
                      <Switch checked={control.value} onCheckedChange={control.onChange} />
                    </FormControl>
                    <FormDescription>
                      A required field has to be filled in before the record can be saved.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {fieldType === "select" ? (
                <div className="flex flex-col gap-gap-field">
                  <FormLabel>Choices</FormLabel>
                  {options.map((option, index) => (
                    <div key={option.id} className="flex items-start gap-gap-field">
                      <FormField
                        control={form.control}
                        name={`options.${index}.label`}
                        render={({ field: control }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input {...control} placeholder="Shown to people" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`options.${index}.value`}
                        render={({ field: control }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input {...control} placeholder="Stored value" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-destructive"
                        onClick={() => remove(index)}
                        aria-label={`Remove choice ${index + 1}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={handleAddOption}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add choice
                  </Button>
                </div>
              ) : null}
            </SheetBody>

            <SheetFooter className="shrink-0 border-t px-6 py-4">
              <div className="grid w-full grid-cols-2 gap-gap-field">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <LoadingButton type="submit" isPending={isPending}>
                  {isEditing ? "Save changes" : "Create field"}
                </LoadingButton>
              </div>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
