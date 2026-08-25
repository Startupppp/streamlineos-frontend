"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AppDialog } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateRecall } from "@/hooks/api/inventory/quality";
import { createRecallSchema, type CreateRecallFormValues } from "@/features/inventory/lib/recall-schema";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function RecallCreateDialog({ open, onOpenChange }: Props) {
  const createMut = useCreateRecall();

  const form = useForm<CreateRecallFormValues>({
    resolver: zodResolver(createRecallSchema),
    defaultValues: { title: "", reason: "", severity: "", lotIdsRaw: "", serialIdsRaw: "" },
  });

  function handleCancel(): void {
    onOpenChange(false);
  }

  function handleSubmit(values: CreateRecallFormValues): void {
    const lotIds = values.lotIdsRaw
      ? values.lotIdsRaw.split(",").map((s) => Number(s.trim())).filter((n) => !isNaN(n) && n > 0)
      : undefined;
    const serialIds = values.serialIdsRaw
      ? values.serialIdsRaw.split(",").map((s) => Number(s.trim())).filter((n) => !isNaN(n) && n > 0)
      : undefined;

    createMut.mutate(
      {
        title: values.title,
        reason: values.reason,
        severity: values.severity || undefined,
        lotIds: lotIds?.length ? lotIds : undefined,
        serialIds: serialIds?.length ? serialIds : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Recall created");
          form.reset();
          onOpenChange(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  const footer = (
    <>
      <Button size="sm" variant="outline" onClick={handleCancel}>Cancel</Button>
      <LoadingButton size="sm" onClick={form.handleSubmit(handleSubmit)} isPending={createMut.isPending} loadingText="Creating…">
        Create Recall
      </LoadingButton>
    </>
  );

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New Recall"
      description="Create a product recall"
      footer={footer}
    >
      <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="space-y-1.5">
          <Label className="text-xs">Title *</Label>
          <Input className="text-xs" placeholder="e.g. Batch contamination recall" {...form.register("title")} />
          {form.formState.errors.title && (
            <p className="text-micro text-destructive">{form.formState.errors.title.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Reason *</Label>
          <Textarea className="text-xs min-h-[70px] resize-none" placeholder="Describe the recall reason…" {...form.register("reason")} />
          {form.formState.errors.reason && (
            <p className="text-micro text-destructive">{form.formState.errors.reason.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Severity <span className="text-muted-foreground">(opt.)</span></Label>
          <Input className="text-xs" placeholder="e.g. High, Medium, Low" {...form.register("severity")} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Lot IDs <span className="text-muted-foreground">(comma-separated)</span></Label>
          <Input className="text-xs" placeholder="e.g. 1, 2, 3" {...form.register("lotIdsRaw")} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Serial IDs <span className="text-muted-foreground">(comma-separated)</span></Label>
          <Input className="text-xs" placeholder="e.g. 10, 11, 12" {...form.register("serialIdsRaw")} />
        </div>
      </form>
    </AppDialog>
  );
}
