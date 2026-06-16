"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HrSheet } from "@/features/hr/hr-sheet";

import { getErrorMessage } from "@/lib/get-error-message";
import { useInitiateOnboarding } from "@/lib/api/hooks/hr/onboarding";

interface OnboardingInitiateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OnboardingInitiateSheet({ open, onOpenChange }: OnboardingInitiateSheetProps) {
  const [userId, setUserId] = useState("");
  const initiate = useInitiateOnboarding();

  const handleSubmit = useCallback(() => {
    if (!userId.trim()) {
      toast.error("Please enter a user ID");
      return;
    }
    initiate.mutate(userId.trim(), {
      onSuccess: (data) => {
        toast.success(`Onboarding initiated — ${data.tasksCreated} tasks created`);
        setUserId("");
        onOpenChange(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [userId, initiate, onOpenChange]);

  const handleSheetOpenChange = useCallback(
    (v: boolean) => {
      if (!v) setUserId("");
      onOpenChange(v);
    },
    [onOpenChange]
  );

  const handleUserIdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUserId(e.target.value);
  }, []);

  return (
    <HrSheet
      open={open}
      onOpenChange={handleSheetOpenChange}
      title="Initiate Onboarding"
      description="Create an onboarding checklist for an employee using the active template."
      onSubmit={handleSubmit}
      submitLabel="Start Onboarding"
      isPending={initiate.isPending}
    >
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Employee User ID <span className="text-destructive">*</span>
        </Label>
        <Input
          placeholder="user_..."
          value={userId}
          onChange={handleUserIdChange}
          aria-label="Employee user ID"
        />
        <p className="text-[11px] text-muted-foreground">
          Enter the internal user ID of the employee to onboard.
        </p>
      </div>
    </HrSheet>
  );
}
