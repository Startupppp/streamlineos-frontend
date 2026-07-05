"use client";

import { useState, useEffect, useRef, memo } from "react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useToggleImpact, usePreviewPolicy } from "@/hooks/api/payroll";
import { TOGGLE_GROUPS, TOGGLE_META, RISKY_TOGGLES } from "@/features/payroll/setup/lib/constants";
import type { SetupDraft } from "@/features/payroll/setup/lib/draft";
import type { ToggleKey, StatutoryPackPreview, StatutoryPackItem } from "@/types/payroll/setup";

const KIND_STYLES: Record<string, string> = {
  EMPLOYEE_DEDUCTION: "bg-slate-100 text-slate-700 border border-slate-200",
  EMPLOYER_CONTRIBUTION: "bg-blue-50 text-blue-700 border border-blue-200",
  WITHHOLDING: "bg-amber-50 text-amber-700 border border-amber-200",
};

const KIND_LABELS: Record<string, string> = {
  EMPLOYEE_DEDUCTION: "Employee deduction",
  EMPLOYER_CONTRIBUTION: "Employer contribution",
  WITHHOLDING: "Withholding",
};

const PackItemRow = memo(function PackItemRow({ item }: { item: StatutoryPackItem }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">{item.label}</span>
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${KIND_STYLES[item.kind] ?? "bg-slate-100 text-slate-600"}`}
          >
            {KIND_LABELS[item.kind] ?? item.kind}
          </span>
        </div>
        {item.note && (
          <p className="text-xs text-muted-foreground mt-0.5">{item.note}</p>
        )}
      </div>
      <span
        className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
          item.enabled
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-slate-100 text-slate-500 border-slate-200"
        }`}
      >
        {item.enabled ? "Active" : "Inactive"}
      </span>
    </div>
  );
});

function PackStatutorySection({ pack }: { pack: StatutoryPackPreview }) {
  const [checklistOpen, setChecklistOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-3">
          <p className="text-sm font-semibold text-foreground">
            {pack.countryName} Statutory Pack
          </p>
          <p className="text-xs text-muted-foreground">
            Configured from country defaults · {pack.items.filter((i) => i.enabled).length} of {pack.items.length} items active
          </p>
        </div>
        <div className="divide-y divide-border rounded-lg border border-border">
          {pack.items.map((item) => (
            <PackItemRow key={item.key} item={item} />
          ))}
        </div>
      </div>
      {pack.complianceChecklist.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setChecklistOpen((v) => !v)}
            className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/30 transition-colors"
          >
            <span>Compliance checklist ({pack.complianceChecklist.length} items)</span>
            <span className="text-muted-foreground text-xs">{checklistOpen ? "▲" : "▼"}</span>
          </button>
          {checklistOpen && (
            <div className="border-t border-border divide-y divide-border">
              {pack.complianceChecklist.map((cl) => (
                <div key={cl.key} className="px-4 py-2.5">
                  <p className="text-xs font-medium text-foreground">{cl.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{cl.detail}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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

  const country = draft.profile?.country ?? "IN";
  const isNonIN = country !== "IN";
  const packPreview = usePreviewPolicy();
  const packCalledRef = useRef(false);

  useEffect(() => {
    if (!isNonIN) return;
    if (packCalledRef.current) return;
    packCalledRef.current = true;
    packPreview.mutate({ country });
  }, []);

  function getEffectiveValue(key: ToggleKey): boolean {
    if (key in overrides) return overrides[key] ?? false;
    return draft.templateDefaultToggles?.[key] ?? false;
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
      {isNonIN ? (
        <>
          {packPreview.isPending && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          )}
          {!packPreview.isPending && packPreview.data?.statutoryPack && (
            <PackStatutorySection pack={packPreview.data.statutoryPack} />
          )}
          {!packPreview.isPending && !packPreview.data?.statutoryPack && !packPreview.isError && (
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
          )}
        </>
      ) : (
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
      )}

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
