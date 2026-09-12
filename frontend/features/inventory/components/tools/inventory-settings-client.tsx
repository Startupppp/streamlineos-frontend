"use client";

import * as React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";
import { useInventorySettings, useUpdateInventorySettings } from "@/hooks/api/inventory/admin";
import { getErrorMessage } from "@/lib/get-error-message";
import type { InventorySettings } from "@/hooks/api/inventory/admin";
import { InventorySettingsForm } from "./inventory-settings-form";
import { NumberSequencesCard } from "./number-sequences-card";
import { SettingsHealthCard } from "./settings-health-card";
import { WebhooksSettingsCard } from "./webhooks-settings-card";
import { InventoryMetricsCard } from "./inventory-metrics-card";
import { ShelfLifeRulesCard } from "./shelf-life-rules-card";

const settingsSchema = z.object({
  allowNegativeStock: z.boolean(),
  allowBackorders: z.boolean(),
  reservationStrategy: z.enum(["MANUAL", "AUTO_ON_CONFIRM", "FEFO", "FIFO"]),
  defaultCostingMethod: z.enum(["FIFO", "LIFO", "WEIGHTED_AVG", "STANDARD"]),
  expiryReservationPolicy: z.enum(["BLOCK", "WARN", "ALLOW"]),
  inspectionOnReceipt: z.boolean(),
  inspectionOnReturn: z.boolean(),
  // Decimal strings, as the endpoint stores and accepts them. The bounds are the
  // ones the numeric schema enforced, checked on the parsed value.
  overReceiptTolerancePct: z.string().refine(function isPercent(value) {
    const n = Number(value);
    return value.trim() !== "" && Number.isFinite(n) && n >= 0 && n <= 100;
  }, "Enter a percentage between 0 and 100."),
  requirePoApproval: z.boolean(),
  adjustmentApprovalThreshold: z.string().nullable().refine(function isThreshold(value) {
    if (value === null) return true;
    const n = Number(value);
    return value.trim() !== "" && Number.isFinite(n) && n >= 0;
  }, "Enter a threshold of zero or more."),
  autoReserveOnConfirm: z.boolean(),
  allowPartialShipment: z.boolean(),
  packageRequiredForShipping: z.boolean(),
  packWarehouse: z.boolean(),
  packKirana: z.boolean(),
  packPharmacy: z.boolean(),
  packGst: z.boolean(),
}).refine(
  function atLeastOnePack(values) {
    return values.packWarehouse || values.packKirana || values.packPharmacy || values.packGst;
  },
  {
    message: "Keep at least one pack enabled — warehouse, kirana, pharmacy or gst.",
    path: ["packWarehouse"],
  },
);

type SettingsFormValues = z.infer<typeof settingsSchema>;

/** The loaded settings as form values, field by field rather than by cast. */
function toFormValues(settings: InventorySettings): SettingsFormValues {
  return {
    allowNegativeStock: settings.allowNegativeStock,
    allowBackorders: settings.allowBackorders,
    reservationStrategy: settings.reservationStrategy,
    defaultCostingMethod: settings.defaultCostingMethod,
    expiryReservationPolicy: settings.expiryReservationPolicy,
    inspectionOnReceipt: settings.inspectionOnReceipt,
    inspectionOnReturn: settings.inspectionOnReturn,
    overReceiptTolerancePct: settings.overReceiptTolerancePct,
    requirePoApproval: settings.requirePoApproval,
    adjustmentApprovalThreshold: settings.adjustmentApprovalThreshold,
    autoReserveOnConfirm: settings.autoReserveOnConfirm,
    allowPartialShipment: settings.allowPartialShipment,
    packageRequiredForShipping: settings.packageRequiredForShipping,
    packWarehouse: settings.packWarehouse,
    packKirana: settings.packKirana,
    packPharmacy: settings.packPharmacy,
    packGst: settings.packGst,
  };
}

function SettingsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map(function renderSkeleton(_, i) {
        return <Skeleton key={i} className="h-32 w-full rounded-xl" />;
      })}
    </div>
  );
}

export function InventorySettingsClient() {
  const canManage = useCan("inventory:settings:manage");
  const { data: settings, isLoading, isError, error, refetch } = useInventorySettings();
  const updateMutation = useUpdateInventorySettings();

  const methods = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
  });

  const { formState: { isDirty }, reset, handleSubmit } = methods;

  React.useEffect(
    function populateForm() {
      if (settings) {
        reset(toFormValues(settings));
      }
    },
    [settings, reset],
  );

  if (!canManage) {
    // G8. This used to render "Access Denied" through the *empty* component —
    // the same illustration and layout the screen shows when a list has no rows.
    // Denied and empty are different answers and must not look alike, which is
    // what `NoPermissionState` exists to say; it also names the key, so the
    // reader can ask for the right thing.
    return (
      <PageWrapper title="Settings" subtitle="">
        <NoPermissionState permission="inventory:settings:manage" className="flex-1" />
      </PageWrapper>
    );
  }

  async function onSubmit(values: SettingsFormValues): Promise<void> {
    try {
      await updateMutation.mutateAsync(values);
      toast.success("Settings saved.");
      reset(values);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function handleDiscard(): void {
    reset();
  }

  function handleRetry(): void {
    void refetch();
  }

  return (
    <PageWrapper title="Settings" subtitle="Configure stock policies, procurement rules, and system sequences.">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {isLoading ? (
            <SettingsLoadingSkeleton />
          ) : isError ? (
            <ErrorState
              title="Couldn't load inventory settings"
              description={getErrorMessage(error)}
              onRetry={handleRetry}
            />
          ) : (
            <InventorySettingsForm />
          )}

          {isDirty && (
            <div className="sticky bottom-4 z-10 flex justify-end">
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card shadow-md px-4 py-2.5">
                <span className="text-sm text-muted-foreground">You have unsaved changes</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDiscard}
                >
                  Discard
                </Button>
                <LoadingButton type="submit" size="sm" isPending={updateMutation.isPending} loadingText="Saving…">
                  Save changes
                </LoadingButton>
              </div>
            </div>
          )}
        </form>
      </FormProvider>

      <div className="space-y-4">
        <NumberSequencesCard />
        <ShelfLifeRulesCard />
        <SettingsHealthCard />
        <InventoryMetricsCard />
        <WebhooksSettingsCard />
      </div>
      </div>
    </PageWrapper>
  );
}
