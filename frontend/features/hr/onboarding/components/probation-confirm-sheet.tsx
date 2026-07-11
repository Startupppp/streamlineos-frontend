"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { HrSheet } from "@/features/hr/hr-sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/get-error-message";
import { useConfirmProbation, type ProbationReview } from "@/hooks/api/hr/probation";

const confirmSchema = z.object({
  confirmedAt: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

type ConfirmFormValues = z.infer<typeof confirmSchema>;

interface ProbationConfirmSheetProps {
  review: ProbationReview | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProbationConfirmSheet({ review, open, onOpenChange }: ProbationConfirmSheetProps) {
  const confirm = useConfirmProbation();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ConfirmFormValues>({
    resolver: zodResolver(confirmSchema),
    defaultValues: { confirmedAt: "", notes: "" },
  });

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) reset();
      onOpenChange(next);
    },
    [onOpenChange, reset],
  );

  const onSubmit = useCallback(
    (values: ConfirmFormValues) => {
      if (!review) return;
      confirm.mutate(
        {
          reviewId: review.id,
          confirmedAt: values.confirmedAt || undefined,
          notes: values.notes || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Probation confirmed successfully");
            handleOpenChange(false);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [review, confirm, handleOpenChange],
  );

  const employeeName = review ? `${review.firstName} ${review.lastName}` : "";

  return (
    <HrSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Confirm Probation"
      description={employeeName ? `Confirm probation completion for ${employeeName}` : undefined}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel="Confirm Probation"
      isPending={confirm.isPending}
    >
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-foreground">
          Confirmed At{" "}
          <span className="text-muted-foreground font-normal">(optional — defaults to today)</span>
        </Label>
        <Input
          type="date"
          {...register("confirmedAt")}
          aria-invalid={!!errors.confirmedAt}
        />
        {errors.confirmedAt && (
          <p className="text-xs text-destructive">{errors.confirmedAt.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-foreground">
          Notes{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          placeholder="Add any notes about the probation outcome..."
          rows={4}
          maxLength={2000}
          className="resize-none"
          {...register("notes")}
          aria-invalid={!!errors.notes}
        />
        {errors.notes && (
          <p className="text-xs text-destructive">{errors.notes.message}</p>
        )}
      </div>
    </HrSheet>
  );
}
