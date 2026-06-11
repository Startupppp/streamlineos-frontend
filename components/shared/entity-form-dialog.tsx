"use client";

import { ReactNode, useEffect, useRef } from "react";
import {
  useForm,
  FormProvider,
  UseFormReturn,
  DefaultValues,
  SubmitHandler,
  FieldValues,
  Resolver,
} from "react-hook-form";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppDialog } from "./app-dialog";

interface EntityFormDialogProps<TValues extends FieldValues> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  resolver: Resolver<TValues>;
  defaultValues: DefaultValues<TValues>;
  onSubmit: SubmitHandler<TValues>;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  className?: string;
  resetOnOpen?: boolean;
  children: (form: UseFormReturn<TValues>) => ReactNode;
}

export function EntityFormDialog<TValues extends FieldValues>({
  open,
  onOpenChange,
  title,
  description,
  resolver,
  defaultValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  className,
  resetOnOpen = false,
  children,
}: EntityFormDialogProps<TValues>) {
  const form = useForm<TValues>({
    resolver,
    defaultValues,
  });

  const prevOpenRef = useRef(open);
  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;
    if (justOpened && resetOnOpen) {
      form.reset(defaultValues);
    }
  }, [open, resetOnOpen, defaultValues, form]);

  const handleCancel = () => onOpenChange(false);
  const handleSubmit = form.handleSubmit(onSubmit);

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      className={className}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            {cancelLabel}
          </Button>
          <Button type="submit" form="entity-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {submitLabel}
          </Button>
        </>
      }
    >
      <FormProvider {...form}>
        <form id="entity-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
          {children(form)}
        </form>
      </FormProvider>
    </AppDialog>
  );
}
