"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "@animateicons/react/lucide";
import { AppSheet, ErrorState, NoPermissionState } from "@/components/shared";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { downloadCsv } from "@/features/inventory/lib";
import {
  useSimulateReplenishment,
  type SimulationResult,
} from "@/hooks/api/inventory/planning";
import { SimulatorOutcomes } from "./simulator-outcomes";
import { SimulatorScenarioFields } from "./simulator-scenario-fields";
import {
  DEFAULT_SIMULATOR_VALUES,
  MAX_SCENARIOS,
  emptyScenario,
  simulatorSchema,
  toSimulateInput,
  type SimulatorFormValues,
} from "./simulator-schema";

const FORM_ID = "replenishment-simulator-form";

function exportOutcomes(result: SimulationResult, variantSku: string): void {
  const rows = [result.baseline, ...result.scenarios]
    .filter((outcome): outcome is NonNullable<typeof outcome> => outcome !== null)
    .map((outcome) => [
      outcome.label,
      outcome.serviceLevel,
      outcome.demandMean,
      outcome.leadTimeWeeks,
      outcome.safetyStock,
      outcome.reorderPoint,
      outcome.deltaSafetyStock,
      outcome.deltaReorderPoint,
    ]);

  const slug = variantSku.replace(/[^a-zA-Z0-9_-]+/g, "-");
  downloadCsv(
    `replenishment-simulation-${slug}-${new Date().toISOString().slice(0, 10)}.csv`,
    [
      "Scenario",
      "Service level",
      "Weekly demand",
      "Lead time (weeks)",
      "Safety stock",
      "Reorder point",
      "Delta safety stock",
      "Delta reorder point",
    ],
    rows,
  );
}

interface ReplenishmentSimulatorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productVariantId: number | null;
  productName: string;
  variantSku: string;
}

export function ReplenishmentSimulatorSheet({
  open,
  onOpenChange,
  productVariantId,
  productName,
  variantSku,
}: ReplenishmentSimulatorSheetProps) {
  const canManage = useCan("inventory:replenishment:manage");
  const simulate = useSimulateReplenishment();

  const form = useForm<SimulatorFormValues>({
    resolver: zodResolver(simulatorSchema),
    defaultValues: DEFAULT_SIMULATOR_VALUES,
  });
  const scenarios = useFieldArray({ control: form.control, name: "scenarios" });

  function handleClose(): void {
    onOpenChange(false);
  }

  function handleAddScenario(): void {
    scenarios.append(emptyScenario(`Scenario ${scenarios.fields.length + 1}`));
  }

  function handleRemoveScenario(index: number): void {
    scenarios.remove(index);
  }

  function handleExport(): void {
    if (simulate.data) exportOutcomes(simulate.data, variantSku);
  }

  function handleRetry(): void {
    void form.handleSubmit(onSubmit)();
  }

  function onSubmit(values: SimulatorFormValues): void {
    if (productVariantId === null) return;
    simulate.mutate(toSimulateInput(productVariantId, values));
  }

  const canExport = simulate.data?.applicable === true;

  const footer = canManage ? (
    <div className="grid w-full grid-flow-col auto-cols-fr gap-2">
      <Button variant="outline" type="button" onClick={handleClose}>
        Close
      </Button>
      <Button variant="outline" type="button" disabled={!canExport} onClick={handleExport}>
        Export CSV
      </Button>
      <LoadingButton
        type="submit"
        form={FORM_ID}
        isPending={simulate.isPending}
        loadingText="Running…"
      >
        Run simulation
      </LoadingButton>
    </div>
  ) : undefined;

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Replenishment simulator"
      description={`${productName} · ${variantSku}`}
      footer={footer}
      className="sm:max-w-xl"
    >
      {!canManage ? (
        <NoPermissionState
          permission="inventory:replenishment:manage"
          title="The simulator is restricted"
          description="What-if replenishment reads the same policy engine as reorder proposals, and needs the same permission."
        />
      ) : (
        <div className="space-y-4">
          <p className="text-dense leading-relaxed text-muted-foreground">
            Read-only. Every figure is recomputed from the measured position under the assumptions
            you set; nothing here moves stock or writes a purchase order. Leave a field blank to
            keep the measured value.
          </p>

          <Form {...form}>
            <form id={FORM_ID} onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField
                control={form.control}
                name="serviceLevelPercent"
                render={({ field }) => (
                  <FormItem className="max-w-48">
                    <FormLabel className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
                      Base service level %
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        inputMode="decimal"
                        className="font-mono tabular-nums"
                        placeholder="95"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {scenarios.fields.map((entry, index) => (
                <SimulatorScenarioFields
                  key={entry.id}
                  form={form}
                  index={index}
                  canRemove={scenarios.fields.length > 1}
                  onRemove={handleRemoveScenario}
                />
              ))}

              <AnimatedIconButton
                icon={PlusIcon}
                iconClassName="mr-1.5"
                type="button"
                variant="outline"
                size="sm"
                disabled={scenarios.fields.length >= MAX_SCENARIOS}
                onClick={handleAddScenario}
              >
                Add scenario
              </AnimatedIconButton>
            </form>
          </Form>

          {simulate.isError ? (
            <ErrorState
              compact
              title="The simulation did not run"
              description={getErrorMessage(simulate.error)}
              onRetry={handleRetry}
            />
          ) : null}

          {simulate.data ? (
            <>
              <Separator />
              <SimulatorOutcomes result={simulate.data} />
            </>
          ) : null}
        </div>
      )}
    </AppSheet>
  );
}
