"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { checkInSchema, type CheckInFormValues } from "./goal-form-schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useCheckIn, type KeyResult } from "@/hooks/api/goals";
import { formatMetricValue } from "./constants";
import { getErrorMessage } from "@/lib/get-error-message";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";

interface CheckInDialogProps {
  goalId: number;
  keyResult: KeyResult;
  onClose: () => void;
}

export function CheckInDialog({ goalId, keyResult, onClose }: CheckInDialogProps) {
  const checkIn = useCheckIn(goalId);

  const form = useForm<CheckInFormValues>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      newValue: String(keyResult.currentValue),
      note: "",
    },
  });

  function handleOpenChange(open: boolean) {
    if (!open) onClose();
  }

  function handleSubmit(values: CheckInFormValues) {
    checkIn.mutate(
      {
        keyResultId: keyResult.id,
        newValue: Number(values.newValue),
        note: values.note.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Check-in recorded");
          onClose();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className={TEXT_ONE_LINE}>Check in — {keyResult.title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="newValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New current value <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} type="number" />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Target:{" "}
                    {formatMetricValue(keyResult.targetValue, keyResult.metricType, keyResult.unit)}
                  </p>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} className="resize-none" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <LoadingButton type="submit" isPending={checkIn.isPending} loadingText="Saving…">
                Record Check-in
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
