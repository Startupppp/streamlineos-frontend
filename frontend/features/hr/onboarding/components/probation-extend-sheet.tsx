"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { HrSheet } from "@/components/shared/hr-sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/get-error-message";
import { useExtendProbation, type ProbationReview } from "@/hooks/api/hr/probation";

const extendSchema = z.object({
  extendedUntil: z.string().min(1, "Extension date is required"),
  reason: z.string().max(1000).optional(),
});

type ExtendFormValues = z.infer<typeof extendSchema>;

interface ProbationExtendSheetProps {
  review: ProbationReview | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProbationExtendSheet({ review, open, onOpenChange }: ProbationExtendSheetProps) {
  const extend = useExtendProbation();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ExtendFormValues>({
    resolver: zodResolver(extendSchema),
    defaultValues: { extendedUntil: "", reason: "" },
  });

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) reset();
      onOpenChange(next);
    },
    [onOpenChange, reset],
  );

  const onSubmit = useCallback(
    (values: ExtendFormValues) => {
      if (!review) return;
      extend.mutate(
        {
          reviewId: review.id,
          extendedUntil: values.extendedUntil,
          reason: values.reason || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Probation extended successfully");
            handleOpenChange(false);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [review, extend, handleOpenChange],
  );

  const employeeName = review ? `${review.firstName} ${review.lastName}` : "";

  return (
    <HrSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Extend Probation"
      description={employeeName ? `Extend probation period for ${employeeName}` : undefined}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel="Extend Probation"
      isPending={extend.isPending}
    >
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-foreground">
          Extended Until <span className="text-destructive">*</span>
        </Label>
        <Input
          type="date"
          {...register("extendedUntil")}
          aria-invalid={!!errors.extendedUntil}
        />
        {errors.extendedUntil && (
          <p className="text-xs text-destructive">{errors.extendedUntil.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-foreground">
          Reason{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          placeholder="Briefly explain why the probation is being extended..."
          rows={4}
          maxLength={1000}
          className="resize-none"
          {...register("reason")}
          aria-invalid={!!errors.reason}
        />
        {errors.reason && (
          <p className="text-xs text-destructive">{errors.reason.message}</p>
        )}
      </div>
    </HrSheet>
  );
}
