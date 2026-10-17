"use client";

import { useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import {
  useCreateHiringFlow,
  useUpdateHiringFlow,
} from "@/hooks/api/hr/recruitment";
import { getErrorMessage } from "@/lib/get-error-message";
import type { HiringFlow } from "@/types/hr/recruitment";
import { flowSchema, type FlowFormValues } from "./flow-schema";

interface FlowFormSheetProps {
  open: boolean;
  editFlow: HiringFlow | null;
  onClose: () => void;
}

export function FlowFormSheet({ open, editFlow, onClose }: FlowFormSheetProps) {
  const createFlow = useCreateHiringFlow();
  const updateFlow = useUpdateHiringFlow();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FlowFormValues>({
    resolver: zodResolver(flowSchema),
    defaultValues: { name: "", isDefault: false },
  });

  useEffect(() => {
    if (open) {
      if (editFlow) {
        reset({ name: editFlow.name, isDefault: editFlow.isDefault });
      } else {
        reset({ name: "", isDefault: false });
      }
    }
  }, [open, editFlow, reset]);

  const onSubmit = useCallback(
    (data: FlowFormValues) => {
      if (editFlow) {
        updateFlow.mutate(
          { hiringFlowId: editFlow.id, ...data },
          {
            onSuccess: () => {
              toast.success("Hiring flow updated");
              onClose();
            },
            onError: (e) => toast.error(getErrorMessage(e)),
          },
        );
      } else {
        createFlow.mutate(data, {
          onSuccess: () => {
            toast.success("Hiring flow created");
            onClose();
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        });
      }
    },
    [editFlow, createFlow, updateFlow, onClose],
  );

  const isPending = createFlow.isPending || updateFlow.isPending;

  function handleSheetOpenChange(v: boolean) {
    if (!v) onClose();
  }

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>{editFlow ? "Edit Hiring Flow" : "New Hiring Flow"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
          <SheetBody className="px-6 py-5 flex flex-col gap-4">
            <div>
              <Label className="text-xs font-medium">
                Flow Name <span className="text-destructive">*</span>
              </Label>
              <Input
                className="mt-1"
                placeholder="e.g. Engineering Hiring Flow"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>
            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Set as Default</p>
                <p className="text-xs text-muted-foreground">
                  Use this flow for new job postings automatically
                </p>
              </div>
              <Controller
                name="isDefault"
                control={control}
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>
          </SheetBody>
          <SheetFooter className="shrink-0 px-6 py-4 border-t flex-row gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <LoadingButton type="submit" isPending={isPending} loadingText="Saving…">
              {editFlow ? "Update" : "Create"}
            </LoadingButton>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
