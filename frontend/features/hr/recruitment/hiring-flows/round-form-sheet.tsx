"use client";

import { useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateHiringFlowRound,
  useUpdateHiringFlowRound,
} from "@/hooks/api/hr/recruitment";
import { getErrorMessage } from "@/lib/get-error-message";
import type { HiringFlowRound } from "@/types/hr/recruitment";
import { roundSchema, ROUND_TYPES, ROUND_MODES, type RoundFormValues } from "./round-schema";

interface RoundFormSheetProps {
  open: boolean;
  flowId: number;
  editRound: HiringFlowRound | null;
  onClose: () => void;
}

export function RoundFormSheet({ open, flowId, editRound, onClose }: RoundFormSheetProps) {
  const createRound = useCreateHiringFlowRound();
  const updateRound = useUpdateHiringFlowRound();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<RoundFormValues>({
    resolver: zodResolver(roundSchema),
    defaultValues: {
      name: "",
      roundType: "CUSTOM",
      mode: "VIDEO",
      durationMinutes: "60",
      slaDays: "",
    },
  });

  const roundType = watch("roundType");
  const mode = watch("mode");

  useEffect(() => {
    if (open) {
      if (editRound) {
        reset({
          name: editRound.name,
          roundType: editRound.roundType,
          mode: editRound.mode,
          durationMinutes: String(editRound.durationMinutes),
          slaDays: editRound.slaDays != null ? String(editRound.slaDays) : "",
        });
      } else {
        reset({ name: "", roundType: "CUSTOM", mode: "VIDEO", durationMinutes: "60", slaDays: "" });
      }
    }
  }, [open, editRound, reset]);

  const onSubmit = useCallback(
    (data: RoundFormValues) => {
      const parsedDuration = parseInt(data.durationMinutes, 10);
      const parsedSla =
        data.slaDays && data.slaDays !== "" ? parseInt(data.slaDays, 10) : undefined;
      const payload = {
        name: data.name,
        roundType: data.roundType,
        mode: data.mode,
        durationMinutes: parsedDuration,
        slaDays: parsedSla,
      };

      if (editRound) {
        updateRound.mutate(
          { flowId, roundId: editRound.id, ...payload },
          {
            onSuccess: () => {
              toast.success("Round updated");
              onClose();
            },
            onError: (e) => toast.error(getErrorMessage(e)),
          },
        );
      } else {
        createRound.mutate(
          { flowId, ...payload },
          {
            onSuccess: () => {
              toast.success("Round added");
              onClose();
            },
            onError: (e) => toast.error(getErrorMessage(e)),
          },
        );
      }
    },
    [editRound, createRound, updateRound, flowId, onClose],
  );

  const isPending = createRound.isPending || updateRound.isPending;

  function handleSheetOpenChange(v: boolean) {
    if (!v) onClose();
  }

  function handleRoundTypeChange(v: string) {
    setValue("roundType", v as RoundFormValues["roundType"], { shouldValidate: true });
  }

  function handleModeChange(v: string) {
    setValue("mode", v as RoundFormValues["mode"], { shouldValidate: true });
  }

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>{editRound ? "Edit Round" : "Add Round"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
          <SheetBody className="px-6 py-5 flex flex-col gap-4">
            <div>
              <Label className="text-xs font-medium">
                Round Name <span className="text-destructive">*</span>
              </Label>
              <Input
                className="mt-1"
                placeholder="e.g. Technical Interview"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>
            <div>
              <Label className="text-xs font-medium">
                Round Type <span className="text-destructive">*</span>
              </Label>
              <Select value={roundType} onValueChange={handleRoundTypeChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                  {ROUND_TYPES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">
                Mode <span className="text-destructive">*</span>
              </Label>
              <Select value={mode} onValueChange={handleModeChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                  {ROUND_MODES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">
                Duration (minutes) <span className="text-destructive">*</span>
              </Label>
              <Input
                className="mt-1"
                type="number"
                min={15}
                max={480}
                {...register("durationMinutes")}
              />
              {errors.durationMinutes && (
                <p className="text-xs text-destructive mt-1">{errors.durationMinutes.message}</p>
              )}
            </div>
            <div>
              <Label className="text-xs font-medium">SLA Days</Label>
              <Input
                className="mt-1"
                type="number"
                min={1}
                max={30}
                placeholder="e.g. 3"
                {...register("slaDays")}
              />
              {errors.slaDays && (
                <p className="text-xs text-destructive mt-1">{errors.slaDays.message}</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">
                Max days to complete this round
              </p>
            </div>
          </SheetBody>
          <SheetFooter className="shrink-0 px-6 py-4 border-t flex-row gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <LoadingButton type="submit" isPending={isPending} loadingText="Saving…">
              {editRound ? "Update" : "Add Round"}
            </LoadingButton>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
