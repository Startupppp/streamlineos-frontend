"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSetSlottingRuleActive } from "@/hooks/api/inventory/slotting-labor";
import type { SlottingRule } from "@/hooks/api/inventory/slotting-labor";

interface SlottingRuleActiveToggleProps {
  rule: SlottingRule;
}

export function SlottingRuleActiveToggle({ rule }: SlottingRuleActiveToggleProps) {
  const setActive = useSetSlottingRuleActive();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function apply(isActive: boolean): void {
    setActive.mutate(
      { ruleId: rule.id, isActive },
      {
        onSuccess: () => {
          toast.success(isActive ? `${rule.name} is on` : `${rule.name} is off`);
          setConfirmOpen(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleCheckedChange(next: boolean): void {
    if (next) apply(true);
    else setConfirmOpen(true);
  }

  function handleConfirmOpenChange(next: boolean): void {
    setConfirmOpen(next);
  }

  function handleConfirmDeactivate(): void {
    apply(false);
  }

  return (
    <>
      <Switch
        checked={rule.isActive}
        onCheckedChange={handleCheckedChange}
        disabled={setActive.isPending}
        aria-label={rule.isActive ? `Turn off ${rule.name}` : `Turn on ${rule.name}`}
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={handleConfirmOpenChange}
        title={`Turn off ${rule.name}?`}
        description="Putaway stops sending this stock to its zone from the next receipt onward, and the rule goes on reading as configured here. Nothing already put away moves."
        confirmLabel="Turn it off"
        cancelLabel="Leave it on"
        isPending={setActive.isPending}
        keepOpenOnConfirm
        onConfirm={handleConfirmDeactivate}
      />
    </>
  );
}
