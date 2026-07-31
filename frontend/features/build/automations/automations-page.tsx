"use client";

import { useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGrid, StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { AutomationsIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  PmPageShell,
  PmSection,
  PmStaggerList,
  PM_FILL_PANEL,
} from "@/features/build/shared/pm-chrome";
import {
  useAutomations,
  useCreateAutomation,
  useUpdateAutomation,
  useDeleteAutomation,
  type ProjectAutomation,
} from "@/hooks/api/build/automations";
import { formSchema, type FormValues } from "./automation-schema";
import { AutomationCard } from "./automation-card";
import { NewAutomationButton } from "./new-automation-button";
import { AutomationSheet } from "./automation-sheet";

interface AutomationsPageProps {
  projectId: number;
}

export function AutomationsPage({ projectId }: AutomationsPageProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<ProjectAutomation | null>(null);

  const { data: automations = [], isLoading, isError, refetch } = useAutomations(projectId);
  const createAutomation = useCreateAutomation(projectId);
  const updateAutomation = useUpdateAutomation(projectId);
  const deleteAutomation = useDeleteAutomation(projectId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      triggerEvent: "",
      conditions: [],
      actions: [{ type: "set_status", value: "" }],
      isActive: true,
    },
  });

  const {
    fields: conditionFields,
    append: appendCondition,
    remove: removeCondition,
  } = useFieldArray({ control: form.control, name: "conditions" });

  const {
    fields: actionFields,
    append: appendAction,
    remove: removeAction,
  } = useFieldArray({ control: form.control, name: "actions" });

  const handleEdit = useCallback(
    (automation: ProjectAutomation) => {
      setEditingAutomation(automation);
      form.reset({
        name: automation.name,
        triggerEvent: automation.triggerEvent,
        conditions: automation.conditions,
        actions: automation.actions,
        isActive: automation.isActive,
      });
      setSheetOpen(true);
    },
    [form],
  );

  const handleOpenNew = useCallback(() => {
    setEditingAutomation(null);
    form.reset({
      name: "",
      triggerEvent: "",
      conditions: [],
      actions: [{ type: "set_status", value: "" }],
      isActive: true,
    });
    setSheetOpen(true);
  }, [form]);

  const handleToggle = useCallback(
    (id: number, isActive: boolean) => {
      updateAutomation.mutate(
        { id, isActive },
        { onError: (e) => toast.error(getErrorMessage(e)) },
      );
    },
    [updateAutomation],
  );

  const handleDelete = useCallback(
    (id: number) => {
      deleteAutomation.mutate(id, {
        onSuccess: () => toast.success("Automation deleted"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [deleteAutomation],
  );

  const handleSubmit = useCallback(
    (values: FormValues) => {
      if (editingAutomation) {
        updateAutomation.mutate(
          { id: editingAutomation.id, ...values },
          {
            onSuccess: () => {
              setSheetOpen(false);
              toast.success("Automation updated");
            },
            onError: (e) => toast.error(getErrorMessage(e)),
          },
        );
      } else {
        createAutomation.mutate(values, {
          onSuccess: () => {
            setSheetOpen(false);
            toast.success("Automation created");
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        });
      }
    },
    [editingAutomation, createAutomation, updateAutomation],
  );

  const handleCloseSheet = useCallback(() => setSheetOpen(false), []);
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleAppendCondition = useCallback(() => {
    appendCondition({ field: "status", operator: "equals", value: "" });
  }, [appendCondition]);

  const handleAppendAction = useCallback(() => {
    appendAction({ type: "set_status", value: "" });
  }, [appendAction]);

  return (
    <PageWrapper
      title="Automations"
      subtitle="Automate repetitive actions with if-then rules"
      actions={<NewAutomationButton onClick={handleOpenNew} />}
    >
      <PmPageShell>
        {isLoading ? (
          <PmSection index={0} className="flex min-h-0 flex-1 flex-col gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </PmSection>
        ) : isError ? (
          <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
            <ErrorState
              title="Could not load automations"
              description="Failed to load automations."
              onRetry={handleRetry}
              className="flex-1"
            />
          </PmSection>
        ) : automations.length === 0 ? (
          <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
            <EmptyState
              className={PM_FILL_PANEL}
              illustration={<AutomationsIllustration className="h-32 w-32" />}
              title="No automations yet"
              description="Automate repetitive work — assign tickets, change statuses, and more with if-then rules."
              action={{ label: "Create Automation", onClick: handleOpenNew }}
            />
          </PmSection>
        ) : (
          <>
            <PmSection index={0} className="shrink-0">
              <StatCardGrid cols={2} className="mb-1">
                <StatCard
                  label="Active"
                  value={automations.filter((a) => a.isActive).length}
                  icon={Zap}
                  tone="emerald"
                />
                <StatCard
                  label="Inactive"
                  value={automations.filter((a) => !a.isActive).length}
                  icon={Zap}
                  tone="default"
                />
              </StatCardGrid>
            </PmSection>

            <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
              <PmStaggerList className="space-y-2.5" role="list" aria-label="Automations">
                <AnimatePresence initial={false}>
                  {automations.map((auto) => (
                    <AutomationCard
                      key={auto.id}
                      automation={auto}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                    />
                  ))}
                </AnimatePresence>
              </PmStaggerList>
            </PmSection>
          </>
        )}
      </PmPageShell>

      <AutomationSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editingAutomation={editingAutomation}
        form={form}
        conditionFields={conditionFields}
        actionFields={actionFields}
        onAppendCondition={handleAppendCondition}
        onRemoveCondition={removeCondition}
        onAppendAction={handleAppendAction}
        onRemoveAction={removeAction}
        onSubmit={handleSubmit}
        onClose={handleCloseSheet}
        projectId={projectId}
        createIsPending={createAutomation.isPending}
        updateIsPending={updateAutomation.isPending}
      />
    </PageWrapper>
  );
}
