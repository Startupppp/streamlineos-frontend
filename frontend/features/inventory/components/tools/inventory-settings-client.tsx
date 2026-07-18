"use client";

import * as React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
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

const settingsSchema = z.object({
  allowNegativeStock: z.boolean(),
  allowBackorders: z.boolean(),
  reservationStrategy: z.enum(["MANUAL", "AUTO_ON_CONFIRM", "FEFO", "FIFO"]),
  defaultCostingMethod: z.enum(["FIFO", "LIFO", "WEIGHTED_AVG", "STANDARD"]),
  expiryReservationPolicy: z.enum(["BLOCK", "WARN", "ALLOW"]),
  inspectionOnReceipt: z.boolean(),
  inspectionOnReturn: z.boolean(),
  overReceiptTolerancePct: z.number().min(0).max(100),
  requirePoApproval: z.boolean(),
  adjustmentApprovalThreshold: z.number().min(0),
  autoReserveOnConfirm: z.boolean(),
  allowPartialShipment: z.boolean(),
  packageRequiredForShipping: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

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
  const { data: settings, isLoading } = useInventorySettings();
  const updateMutation = useUpdateInventorySettings();

  const methods = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
  });

  const { formState: { isDirty }, reset, handleSubmit } = methods;

  React.useEffect(
    function populateForm() {
      if (settings) {
        reset(settings as SettingsFormValues);
      }
    },
    [settings, reset],
  );

  if (!canManage) {
    return (
      <PageWrapper title="Settings" subtitle="">
        <InventoryEmptyState
          title="Access Denied"
          description="You don't have permission to manage inventory settings."
        />
      </PageWrapper>
    );
  }

  async function onSubmit(values: SettingsFormValues) {
    try {
      await updateMutation.mutateAsync(values as InventorySettings);
      toast.success("Settings saved.");
      reset(values);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <PageWrapper title="Settings" subtitle="Configure stock policies, procurement rules, and system sequences.">
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {isLoading ? (
            <SettingsLoadingSkeleton />
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
                  onClick={() => reset()}
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

      <div className="mt-6 space-y-6">
        <NumberSequencesCard />
        <SettingsHealthCard />
        <WebhooksSettingsCard />
      </div>
    </PageWrapper>
  );
}
