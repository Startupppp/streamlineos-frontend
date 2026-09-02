"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGeneratePeriods } from "@/hooks/api/accounting/core";

interface GeneratePeriodsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GeneratePeriodsDialog({ open, onOpenChange }: GeneratePeriodsDialogProps) {
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const mutation = useGeneratePeriods();

  function handleYearChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setYear(e.target.value);
  }

  function handleGenerate(): void {
    const yearNum = parseInt(year, 10);
    if (!Number.isInteger(yearNum) || yearNum < 2000 || yearNum > 2100) {
      toast.error("Enter a valid year");
      return;
    }
    mutation.mutate(
      { year: yearNum },
      {
        onSuccess: (result) => {
          toast.success(`${result.created} periods created for ${yearNum}`);
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }

  function handleCancelClick(): void {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[340px]">
        <DialogHeader>
          <DialogTitle>Generate fiscal periods</DialogTitle>
          <DialogDescription>
            Create monthly periods for the selected year.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <label
            htmlFor="gen-year"
            className="text-xs font-medium text-muted-foreground block mb-1.5"
          >
            Year
          </label>
          <Input
            id="gen-year"
            type="number"
            value={year}
            onChange={handleYearChange}
            min={2000}
            max={2100}
            placeholder="e.g. 2025"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancelClick} disabled={mutation.isPending}>
            Cancel
          </Button>
          <LoadingButton
            isPending={mutation.isPending}
            loadingText="Generating…"
            onClick={handleGenerate}
          >
            Generate
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
