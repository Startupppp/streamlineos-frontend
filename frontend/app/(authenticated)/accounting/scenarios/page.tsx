"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

const KIND_CLASSES: Record<string, string> = {
  CONSERVATIVE: "bg-primary/5 text-foreground border-primary/20",
  EXPECTED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  AGGRESSIVE: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  CUSTOM: "bg-muted text-muted-foreground border-border",
};

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

interface ScenarioCardProps {
  scenario: Scenario;
  canManage: boolean;
  onEdit: (s: Scenario) => void;
  onDelete: (s: Scenario) => void;
}

function ScenarioCard({ scenario, canManage, onEdit, onDelete }: ScenarioCardProps) {
  function handleEdit(): void {
    onEdit(scenario);
  }
  function handleDelete(): void {
    onDelete(scenario);
  }
  return (
    <Card className="bg-card border border-border rounded-xl shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="font-medium text-sm">{scenario.name}</p>
            {scenario.isDefault && (
              <span className="text-[10px] text-muted-foreground">Default</span>
            )}
          </div>
          <Badge variant="outline" className={KIND_CLASSES[scenario.kind] ?? ""}>
            {scenario.kind}
          </Badge>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>Collection rate: {scenario.assumptions.collectionRatePct}%</p>
          <p>Pay delay: {scenario.assumptions.payDelayDays} days</p>
          <p>Revenue growth: {scenario.assumptions.revenueGrowthPct}%</p>
          <p>Planned spend items: {scenario.assumptions.plannedSpend.length}</p>
        </div>
        {canManage && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
            <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={handleEdit}>
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ScenariosPage() {
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
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="size-4 mr-1" />
              Add Scenario
            </Button>
          </div>
        ) : undefined
      }
    >
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
