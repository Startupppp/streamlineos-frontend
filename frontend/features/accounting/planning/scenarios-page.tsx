"use client";

import { useState } from "react";
import { PlusIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
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
import { LoadingButton } from "@/components/ui/loading-button";
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import { LoadingState, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyReportIllustration } from "@/components/illustrations";
import {
  useScenarios,
  useCreateScenario,
  useUpdateScenario,
  useDeleteScenario,
  useSeedDefaultScenarios,
} from "@/hooks/api/accounting/planning";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  scenarioSchema,
  ScenarioFormFields,
  CREATE_DEFAULTS,
  type ScenarioForm,
} from "@/features/accounting/planning/scenario-form-fields";
import type { Scenario } from "@/types/accounting/planning";
import { ScenarioCard } from "@/features/accounting/planning/scenario-card";

function scenarioToForm(s: Scenario): ScenarioForm {
  return {
    name: s.name,
    kind: s.kind,
    isDefault: s.isDefault,
    collectionRatePct: s.assumptions.collectionRatePct,
    payDelayDays: s.assumptions.payDelayDays,
    revenueGrowthPct: s.assumptions.revenueGrowthPct,
    plannedSpend: s.assumptions.plannedSpend,
  };
}

export function ScenariosPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editScenario, setEditScenario] = useState<Scenario | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteScenario, setDeleteScenario] = useState<Scenario | null>(null);

  const canManage = useCan("accounting:forecast:manage");

  const scenariosQuery = useScenarios();
  const items = scenariosQuery.data?.items ?? [];

  const createMutation = useCreateScenario();
  const updateMutation = useUpdateScenario(editScenario?.id ?? 0);
  const deleteMutation = useDeleteScenario(deleteScenario?.id ?? 0);
  const seedMutation = useSeedDefaultScenarios();

  function handleOpenCreate(): void {
    setEditScenario(null);
    setSheetOpen(true);
  }

  function handleOpenEdit(scenario: Scenario): void {
    setEditScenario(scenario);
    setSheetOpen(true);
  }

  function handleOpenDelete(scenario: Scenario): void {
    setDeleteScenario(scenario);
    setDeleteDialogOpen(true);
  }

  function handleSheetChange(open: boolean): void {
    if (!createMutation.isPending && !updateMutation.isPending) {
      setSheetOpen(open);
      if (!open) setEditScenario(null);
    }
  }

  function handleFormSubmit(data: ScenarioForm): void {
    const assumptions = {
      collectionRatePct: data.collectionRatePct,
      payDelayDays: data.payDelayDays,
      revenueGrowthPct: data.revenueGrowthPct,
      plannedSpend: data.plannedSpend,
    };

    if (editScenario) {
      updateMutation.mutate(
        { name: data.name, kind: data.kind, assumptions },
        {
          onSuccess: () => {
            setSheetOpen(false);
            setEditScenario(null);
            toast.success("Scenario updated");
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    } else {
      createMutation.mutate(
        { name: data.name, kind: data.kind, assumptions },
        {
          onSuccess: () => {
            setSheetOpen(false);
            toast.success("Scenario created");
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    }
  }

  function handleDeleteConfirm(): void {
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setDeleteScenario(null);
        toast.success("Scenario deleted");
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleSeedDefaults(): void {
    seedMutation.mutate(undefined, {
      onSuccess: (data) =>
        toast.success(`Seeded ${data.seeded} default scenario(s)`),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleRetry(): void {
    void scenariosQuery.refetch();
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const defaultValues = editScenario ? scenarioToForm(editScenario) : CREATE_DEFAULTS;

  return (
    <PageWrapper
      title="Scenarios"
      subtitle="Cash flow planning scenarios"
      actions={
        canManage ? (
          <div className="flex items-center gap-2">
            <LoadingButton
              variant="outline"
              size="sm"
              isPending={seedMutation.isPending}
              loadingText="Seeding…"
              onClick={handleSeedDefaults}
            >
              Seed Defaults
            </LoadingButton>
            <AnimatedIconButton size="sm" icon={PlusIcon} iconSize={14} onClick={handleOpenCreate}>
              Add Scenario
            </AnimatedIconButton>
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-1 min-h-0 flex-col">
        {scenariosQuery.isLoading && <LoadingState variant="cards" rows={9} />}
        {scenariosQuery.error && (
          <ErrorState
            title="Failed to load scenarios"
            description={getErrorMessage(scenariosQuery.error)}
            onRetry={handleRetry}
          />
        )}

        {!scenariosQuery.isLoading && !scenariosQuery.error && items.length === 0 && (
          <EmptyState
            illustration={<EmptyReportIllustration />}
            title="No scenarios yet"
            description="Seed defaults or create a custom planning scenario."
            action={
              canManage
                ? { label: "Add Scenario", onClick: handleOpenCreate }
                : undefined
            }
          />
        )}

        {items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                canManage={canManage}
                onEdit={handleOpenEdit}
                onDelete={handleOpenDelete}
              />
            ))}
          </div>
        )}
      </div>

      <EntityFormSheet<ScenarioForm>
        key={editScenario?.id ?? "create"}
        open={sheetOpen}
        onOpenChange={handleSheetChange}
        title={editScenario ? "Edit Scenario" : "New Scenario"}
        description="Configure assumptions for this cash flow planning scenario."
        resolver={zodResolver(scenarioSchema)}
        defaultValues={defaultValues}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
        submitLabel={editScenario ? "Save Changes" : "Create Scenario"}
        resetOnOpen
      >
        {(form) => <ScenarioFormFields form={form} />}
      </EntityFormSheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scenario</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteScenario?.name}&rdquo;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
