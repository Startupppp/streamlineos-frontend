"use client";

import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { ToggleRow } from "@/features/payroll/shared";
import { NavButtons } from "@/features/payroll/setup/nav-buttons";
import { useToggleImpact } from "@/hooks/api/payroll";
import { TOGGLE_GROUPS, TOGGLE_META, RISKY_TOGGLES } from "@/features/payroll/setup/lib/constants";
import type { SetupDraft } from "@/features/payroll/setup/lib/draft";
import type { ToggleKey } from "@/types/payroll/setup";

const DEFAULT_TOGGLES: Partial<Record<ToggleKey, boolean>> = {
  pf: true,
  esi: true,
  professionalTax: true,
  tds: true,
  gratuity: true,
  bankPayoutFile: true,
  payslipPublishing: true,
  emailPayslips: true,
  approvalWorkflow: true,
};

type StepTogglesProps = {
  draft: SetupDraft;
  updateDraft: (p: Partial<SetupDraft>) => void;
  goNext: () => void;
  goBack: () => void;
};

export function StepToggles({ draft, updateDraft, goNext, goBack }: StepTogglesProps) {
  const [overrides, setOverrides] = useState<Partial<Record<ToggleKey, boolean>>>(
    draft.toggleOverrides ?? {},
  );
  const [pendingToggle, setPendingToggle] = useState<ToggleKey | null>(null);
  const [pendingValue, setPendingValue] = useState(false);

  const { data: impactData } = useToggleImpact(pendingToggle ?? "", !!pendingToggle);

  function getEffectiveValue(key: ToggleKey): boolean {
    if (key in overrides) return overrides[key] ?? false;
    return DEFAULT_TOGGLES[key] ?? false;
  }

  function handleToggleChange(key: ToggleKey, newValue: boolean) {
    if (RISKY_TOGGLES.has(key) && !newValue) {
      setPendingToggle(key);
      setPendingValue(newValue);
    } else {
      const next = { ...overrides, [key]: newValue };
      setOverrides(next);
      updateDraft({ toggleOverrides: next });
    }
  }

  function handleConfirmToggle() {
    if (!pendingToggle) return;
    const next = { ...overrides, [pendingToggle]: pendingValue };
    setOverrides(next);
    updateDraft({ toggleOverrides: next });
    setPendingToggle(null);
  }

  function handleCancelToggle() {
    setPendingToggle(null);
  }

  function handleContinue() {
    updateDraft({ toggleOverrides: overrides });
    goNext();
  }

  const pendingMeta = pendingToggle ? TOGGLE_META[pendingToggle] : null;

  return (
    <div className="space-y-4">
      <div className="space-y-6">
        {TOGGLE_GROUPS.map((group, gIdx) => (
          <div key={group.id}>
            {gIdx > 0 && <Separator className="mb-6" />}
            <div className="mb-3">
              <p className="text-sm font-semibold text-foreground">{group.label}</p>
              <p className="text-xs text-muted-foreground">{group.description}</p>
            </div>
            <div className="divide-y divide-border">
              {(group.keys as readonly ToggleKey[]).map((key) => {
                const meta = TOGGLE_META[key];
                return (
                  <ToggleRow
                    key={key}
                    id={`toggle-${key}`}
                    label={meta?.label ?? key}
                    description={meta?.description}
                    checked={getEffectiveValue(key)}
                    onCheckedChange={(v) => handleToggleChange(key, v)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <NavButtons onBack={goBack} onNext={handleContinue} />

      <AlertDialog open={!!pendingToggle} onOpenChange={(open) => !open && handleCancelToggle()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Disable {pendingMeta?.label ?? pendingToggle}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {impactData ? (
                <>
                  This will affect {impactData.affectedEmployeeCount} employee
                  {impactData.affectedEmployeeCount !== 1 ? "s" : ""}.
                  {impactData.affectedStatutoryCodes.length > 0 && (
                    <> Statutory codes affected: {impactData.affectedStatutoryCodes.join(", ")}.</>
                  )}
                </>
              ) : (
                "Disabling a statutory compliance feature may have legal implications."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelToggle}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmToggle}>Yes, disable</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
