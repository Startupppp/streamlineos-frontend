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

/**
 * Rung 1 of the overlay ladder: one boolean on a record already on screen, so
 * the control is the value. A `ResponsivePopover` offering "Active" and "Off"
 * would be a second click to reach a two-item list the switch already is, and
 * §13 calls escalating past the first rung that fits a violation rather than a
 * style choice.
 *
 * **Turning a rule off asks; turning it on does not.** The asymmetry is the
 * decision, not an oversight. Off is the direction with the silent blast
 * radius: putaway stops steering that class to its zone from the next receipt
 * onward, the rule goes on reading as configured in this very table, and
 * nothing on this screen shows the consequence — the planner finds out weeks
 * later when the gold zone is half empty. On restores what the rule already
 * says it does, and the row it changes is the row under the operator's finger.
 * It is not `destructive`: nothing is lost, and a red dialog for a reversible
 * flip is how a confirm stops being read.
 */
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
