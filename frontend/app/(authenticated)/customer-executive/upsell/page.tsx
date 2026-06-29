"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  useClientOpportunities,
  useCreateClientOpportunity,
  useUpdateClientOpportunity,
  useDeleteClientOpportunity,
  type CreateClientOpportunityInput,
} from "@/hooks/api/crm";
import {
  UpsellList,
  sumValues,
  formatInrShort,
  TrendingUp,
  IndianRupee,
  type OppStage,
} from "@/features/customer-executive/upsell/upsell-list";
import {
  UpsellFormSheet,
  DeleteOpportunityDialog,
  INITIAL_FORM,
  type CreateFormState,
} from "@/features/customer-executive/upsell/upsell-form";

export default function UpsellTrackerPage() {
  const { data: opps = [], isLoading } = useClientOpportunities();
  const { mutate: updateOpp } =
    useUpdateClientOpportunity();
  const { mutate: deleteOpp, isPending: isDeleting } =
    useDeleteClientOpportunity();
  const { mutate: createOpp, isPending: isCreating } =
    useCreateClientOpportunity();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<CreateFormState>(INITIAL_FORM);
  const [mutatingId, setMutatingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const totalCount = opps.length;
  const pipelineValue = sumValues(
    opps.filter((o) => !["won", "lost"].includes(o.stage))
  );
  const wonValue = sumValues(opps.filter((o) => o.stage === "won"));
  const wonCount = opps.filter((o) => o.stage === "won").length;
  const closedCount = opps.filter((o) =>
    ["won", "lost"].includes(o.stage)
  ).length;
  const winRate =
    closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0;

  const handleStageChange = useCallback(
    (id: number, stage: OppStage) => {
      setMutatingId(id);
      updateOpp({ id, stage }, { onSettled: () => setMutatingId(null) });
    },
    [updateOpp]
  );

  const handleDeleteRequest = useCallback((id: number) => setDeleteId(id), []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteId === null) return;
    setMutatingId(deleteId);
    deleteOpp(deleteId, {
      onSettled: () => {
        setMutatingId(null);
        setDeleteId(null);
      },
    });
  }, [deleteId, deleteOpp]);

  const handleDeleteCancel = useCallback(() => setDeleteId(null), []);

  const handleFormChange = useCallback(
    (updates: Partial<CreateFormState>) =>
      setForm((f) => ({ ...f, ...updates })),
    []
  );

  const handleCreate = useCallback(() => {
    if (!form.clientId || !form.title.trim()) return;
    const input: CreateClientOpportunityInput = {
      clientId: Number(form.clientId),
      title: form.title.trim(),
      type: form.type,
      stage: form.stage,
      value: form.value || undefined,
      expectedCloseDate: form.expectedCloseDate || undefined,
      notes: form.notes.trim() || undefined,
    };
    createOpp(input, {
      onSuccess: () => {
        setSheetOpen(false);
        setForm(INITIAL_FORM);
      },
    });
  }, [form, createOpp]);

  const handleSheetOpen = useCallback(() => setSheetOpen(true), []);
  const handleSheetCancel = useCallback(() => {
    setSheetOpen(false);
    setForm(INITIAL_FORM);
  }, []);

  return (
    <PageWrapper
      title="Upsell / Cross-sell Tracker"
      subtitle="Track upsell and cross-sell opportunities across the pipeline"
      actions={
        <Button size="sm" onClick={handleSheetOpen}>
          <Plus className="h-4 w-4 mr-1" />
          Add Opportunity
        </Button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Opportunities"
          value={totalCount}
          icon={TrendingUp}
          color="blue"
          index={0}
        />
        <StatCard
          label="Pipeline Value"
          value={formatInrShort(String(pipelineValue))}
          icon={IndianRupee}
          color="amber"
          index={1}
        />
        <StatCard
          label="Won Value"
          value={formatInrShort(String(wonValue))}
          icon={IndianRupee}
          color="green"
          index={2}
        />
        <StatCard
          label="Win Rate"
          value={`${winRate}%`}
          icon={TrendingUp}
          color="purple"
          index={3}
        />
      </div>

      <UpsellList
        opps={opps}
        isLoading={isLoading}
        mutatingId={mutatingId}
        onStageChange={handleStageChange}
        onDelete={handleDeleteRequest}
      />

      <UpsellFormSheet
        open={sheetOpen}
        form={form}
        isCreating={isCreating}
        onFormChange={handleFormChange}
        onSubmit={handleCreate}
        onCancel={handleSheetCancel}
      />

      <DeleteOpportunityDialog
        open={deleteId !== null}
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </PageWrapper>
  );
}
