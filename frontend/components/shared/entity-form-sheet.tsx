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
import { AppSheet } from "./app-sheet";

interface EntityFormSheetProps<
  TInput extends FieldValues,
  TOutput extends FieldValues = TInput,
> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  resolver: Resolver<TInput, unknown, TOutput>;
  defaultValues: DefaultValues<TInput>;
  onSubmit: SubmitHandler<TOutput>;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  side?: "right" | "left" | "top" | "bottom";
  className?: string;
  resetOnOpen?: boolean;
  children: (form: UseFormReturn<TInput, unknown, TOutput>) => ReactNode;
}

export function EntityFormSheet<
  TInput extends FieldValues,
  TOutput extends FieldValues = TInput,
>({
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
  side = "right",
  className,
  resetOnOpen = false,
  children,
}: EntityFormSheetProps<TInput, TOutput>) {
  const form = useForm<TInput, unknown, TOutput>({
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
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      side={side}
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
    </AppSheet>
  );
}
