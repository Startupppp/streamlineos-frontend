"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PageSection } from "@/components/ui/page-wrapper";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ToggleRow } from "@/features/payroll/shared";
import { useCreatePolicyVersion, useToggleImpact, usePayrollPolicyCurrent } from "@/hooks/api/payroll";
import {
  TOGGLE_GROUPS,
  TOGGLE_META,
  RISKY_TOGGLES,
} from "@/features/payroll/setup/lib/constants";
import type { PolicyRow, VersionRow } from "@/types/payroll/setup";

type PendingChange = { key: string; newValue: boolean };

const versionSchema = z.object({
  effectiveFrom: z.string().min(1, "Required"),
  reason: z.string().min(1, "Reason is required").max(500),
});
type VersionForm = z.infer<typeof versionSchema>;

type ToggleSettingsSectionProps = {
  policy: PolicyRow;
  activeVersion: VersionRow | null;
};

export function ToggleSettingsSection({ policy, activeVersion }: ToggleSettingsSectionProps) {
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [showSheet, setShowSheet] = useState(false);

  const createVersion = useCreatePolicyVersion();
  const impactQuery = useToggleImpact(pending?.key ?? "", (showAlert || showSheet) && !!pending);
  const { data: currentData } = usePayrollPolicyCurrent();
  const statutoryPack = currentData?.statutoryPack ?? null;
  const isNonIN = policy.country !== "IN";

  const { register, handleSubmit, reset, formState: { errors } } = useForm<VersionForm>({
    resolver: zodResolver(versionSchema),
    defaultValues: { effectiveFrom: "", reason: "" },
  });

  const toggles = activeVersion?.toggles;

  function handleToggleChange(key: string, newValue: boolean) {
    setPending({ key, newValue });
    if (RISKY_TOGGLES.has(key) && !newValue) {
      setShowAlert(true);
    } else {
      setShowSheet(true);
    }
  }

  function handleAlertConfirm() {
    setShowAlert(false);
    setShowSheet(true);
  }

  function handleAlertCancel() {
    setPending(null);
    setShowAlert(false);
  }

  function handleSheetClose(open: boolean) {
    if (!open) {
      setShowSheet(false);
      setPending(null);
      reset();
    }
  }

  function onVersionSubmit(data: VersionForm) {
    if (!pending) return;
    createVersion.mutate(
      {
        policyId: policy.id,
        toggleOverrides: { [pending.key]: pending.newValue },
        effectiveFrom: data.effectiveFrom,
        reason: data.reason,
      },
      {
        onSuccess: () => {
          toast.success("Policy version created — changes take effect from the selected month.");
          setShowSheet(false);
          setPending(null);
          reset();
        },
        onError: () => toast.error("Failed to create policy version"),
      },
    );
  }

  const impactData = impactQuery.data;

  return (
    <>
      <div className="space-y-6">
        {isNonIN && statutoryPack ? (
          <>
            <PageSection
              title="Statutory Pack"
              description={`${policy.country} statutory compliance items`}
            >
              <div className="divide-y divide-border rounded-lg border border-border">
                {statutoryPack.items.map((item) => (
                  <div key={item.key} className="flex items-center justify-between px-4 py-3 gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium leading-snug">{item.label ?? item.key}</p>
                    </div>
                    <span
                      className={
                        item.enabled
                          ? "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border bg-slate-100 text-slate-500 border-slate-200"
                      }
                    >
                      {item.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                ))}
              </div>
              {statutoryPack.complianceChecklist.length > 0 && (
                <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="text-xs font-semibold text-blue-700 mb-1.5">Compliance Checklist</p>
                  <div className="space-y-1">
                    {statutoryPack.complianceChecklist.map((cl) => (
                      <div key={cl.key}>
                        <p className="text-xs font-medium text-blue-800">{cl.label}</p>
                        <p className="text-[11px] text-blue-600">{cl.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </PageSection>
            {TOGGLE_GROUPS.filter((g) => g.id !== "statutory").map((group) => (
              <PageSection key={group.id} title={group.label} description={group.description}>
                <div className="divide-y divide-border rounded-lg border border-border px-4">
                  {group.keys.map((key) => {
                    const meta = TOGGLE_META[key];
                    return (
                      <ToggleRow
                        key={key}
                        id={`toggle-${key}`}
                        label={meta?.label ?? key}
                        description={meta?.description}
                        checked={toggles?.[key] ?? false}
                        onCheckedChange={(val) => handleToggleChange(key, val)}
                        disabled={createVersion.isPending}
                      />
                    );
                  })}
                </div>
              </PageSection>
            ))}
          </>
        ) : (
          TOGGLE_GROUPS.map((group) => (
            <PageSection key={group.id} title={group.label} description={group.description}>
              <div className="divide-y divide-border rounded-lg border border-border px-4">
                {group.keys.map((key) => {
                  const meta = TOGGLE_META[key];
                  return (
                    <ToggleRow
                      key={key}
                      id={`toggle-${key}`}
                      label={meta?.label ?? key}
                      description={meta?.description}
                      checked={toggles?.[key] ?? false}
                      onCheckedChange={(val) => handleToggleChange(key, val)}
                      disabled={createVersion.isPending}
                    />
                  );
                })}
              </div>
            </PageSection>
          ))
        )}
      </div>

      <AlertDialog open={showAlert} onOpenChange={(open) => { if (!open) handleAlertCancel(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable {TOGGLE_META[pending?.key ?? ""]?.label ?? pending?.key}?</AlertDialogTitle>
            <AlertDialogDescription>
              This is a statutory setting. Disabling it may affect compliance obligations.
              {impactData && impactData.affectedEmployeeCount > 0 && (
                <span className="block mt-2 font-medium text-destructive">
                  {impactData.affectedEmployeeCount} employee{impactData.affectedEmployeeCount !== 1 ? "s" : ""} will be affected.
                  {impactData.affectedStatutoryCodes.length > 0 && ` Codes: ${impactData.affectedStatutoryCodes.join(", ")}.`}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleAlertCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAlertConfirm}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={showSheet} onOpenChange={handleSheetClose}>
        <SheetContent side="right" className="p-0 flex flex-col w-full sm:max-w-md">
          <SheetHeader className="px-6 py-4 border-b shrink-0">
            <SheetTitle>Create Policy Version</SheetTitle>
            <SheetDescription>
              Changes to{" "}
              <span className="font-medium">
                {TOGGLE_META[pending?.key ?? ""]?.label ?? pending?.key}
              </span>{" "}
              will be applied via a new policy version.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit(onVersionSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
              {impactData && (
                <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Impact Preview</p>
                  <p className="text-xs text-foreground">
                    <span className="font-medium">{impactData.affectedEmployeeCount}</span>
                    {" "}employee{impactData.affectedEmployeeCount !== 1 ? "s" : ""} affected
                  </p>
                  {impactData.affectedStatutoryCodes.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Statutory codes: {impactData.affectedStatutoryCodes.join(", ")}
                    </p>
                  )}
                  {impactData.affectedEmployeeCount === 0 && (
                    <p className="text-xs text-muted-foreground">No employees currently affected by this toggle.</p>
                  )}
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs">Effective From (YYYY-MM)</Label>
                <Input
                  {...register("effectiveFrom")}
                  placeholder="2026-08"
                  className="h-8 text-sm font-mono"
                />
                {errors.effectiveFrom && (
                  <p className="text-xs text-destructive">{errors.effectiveFrom.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Reason</Label>
                <Textarea
                  {...register("reason")}
                  placeholder="Why is this change being made?"
                  className="text-sm resize-none"
                  rows={3}
                />
                {errors.reason && (
                  <p className="text-xs text-destructive">{errors.reason.message}</p>
                )}
              </div>
            </div>
            <SheetFooter className="px-6 py-4 border-t shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSheetClose(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createVersion.isPending}>
                {createVersion.isPending ? "Saving…" : "Create Version"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
