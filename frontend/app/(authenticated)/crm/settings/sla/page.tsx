"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Clock, Shield, XCircle } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { CONTENT_FILL_PANEL, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { RecordList, asRecordValues } from "@/components/renderer";
import { DensityToggle, useDensity } from "@/components/renderer/density-toggle";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { RecordRowActions } from "@/features/crm/settings/shared/record-row-actions";
import { SlaPolicySheet } from "@/features/crm/settings/sla-policy-sheet";
import { useCan } from "@/hooks/api/access";
import {
  useDeleteSlaPolicy,
  useSlaBreachedLeads,
  useSlaPolicies,
  useSlaReport,
  type SlaPolicy,
} from "@/hooks/api/crm-settings";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  SLA_BREACH_LAYOUT,
  SLA_POLICY_LAYOUT,
} from "@/lib/renderer/crm/settings/sla-policy-layout";

/**
 * SLA policies, and what they are costing.
 *
 * Two generated lists: the policies themselves, and the leads that missed one.
 * The breach list used to be a second hand-written `DataTableColumn[]` with its
 * own date formatting and its own red; described as a record type it is the same
 * renderer as everything else, and clicking a row goes to the lead rather than
 * relying on one cell happening to be a link.
 */
export default function SlaPage() {
  const router = useRouter();
  const policyLayout = useTenantLayout(SLA_POLICY_LAYOUT);
  const breachLayout = useTenantLayout(SLA_BREACH_LAYOUT);
  const [density, setDensity] = useDensity();
  const canManage = useCan("crm:sla:manage");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SlaPolicy | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SlaPolicy | null>(null);

  const { data, isLoading, isError, refetch } = useSlaPolicies();
  const report = useSlaReport();
  const breaches = useSlaBreachedLeads({ limit: 10 });
  const deletePolicy = useDeleteSlaPolicy();

  const policies = useMemo(() => data ?? [], [data]);
  const breachedLeads = useMemo(() => breaches.data ?? [], [breaches.data]);

  const handleOpenCreate = useCallback(() => {
    setEditTarget(null);
    setSheetOpen(true);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) setEditTarget(null);
  }, []);

  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deletePolicy.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Policy deleted");
        setDeleteTarget(null);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setDeleteTarget(null);
      },
    });
  }, [deletePolicy, deleteTarget]);

  const handleBreachClick = useCallback(
    (row: Record<string, unknown>) => router.push(`/crm/leads/${String(row.id)}`),
    [router],
  );

  const rowActions = useCallback(
    (row: Record<string, unknown>) => {
      const policy = policies.find((candidate) => candidate.id === row.id);
      if (!policy || !canManage) return null;
      return (
        <RecordRowActions
          editLabel={`Edit ${policy.name}`}
          deleteLabel={`Delete ${policy.name}`}
          onEdit={() => {
            setEditTarget(policy);
            setSheetOpen(true);
          }}
          onDelete={() => setDeleteTarget(policy)}
        />
      );
    },
    [policies, canManage],
  );

  const complianceRate = report.data?.complianceRate ?? 0;

  return (
    <PageWrapper
      title="Service levels"
      subtitle="How fast the team promises to answer, and whether it did."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <DensityToggle density={density} onChange={setDensity} />
        </div>
      }
      actions={
        canManage ? (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={16}
            iconClassName="mr-1.5"
            size="sm"
            onClick={handleOpenCreate}
          >
            New policy
          </AnimatedIconButton>
        ) : undefined
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-gap-section">
        {!canManage ? (
          <NoPermissionState
            permission="crm:sla:manage"
            className={CONTENT_FILL_PANEL}
            description="Response-time commitments are set by your sales operations team."
          />
        ) : (
          <>
            {report.isLoading ? (
              <StatCardGridSkeleton count={4} />
            ) : report.data ? (
              <StatCardGrid cols={4}>
                <StatCard label="Policies" value={policies.length} icon={Shield} tone="blue" />
                <StatCard
                  label="Met"
                  value={report.data.compliant}
                  icon={CheckCircle2}
                  tone="emerald"
                />
                <StatCard
                  label="Breached (30d)"
                  value={report.data.breached}
                  icon={XCircle}
                  tone="red"
                />
                <StatCard
                  label="Compliance"
                  value={`${complianceRate}%`}
                  icon={Clock}
                  tone={complianceRate >= 80 ? "emerald" : complianceRate >= 50 ? "amber" : "red"}
                />
              </StatCardGrid>
            ) : null}

            {isLoading ? (
              <DataTableSkeleton
                rows={8}
                columns={policyLayout.list.columns.length}
                className="flex-1"
              />
            ) : isError ? (
              <ErrorState
                title="Couldn't load SLA policies"
                description="The policy list didn't load. Check your connection and try again."
                onRetry={handleRetry}
                className={CONTENT_FILL_PANEL}
              />
            ) : policies.length === 0 ? (
              <EmptyState
                illustrationPreset="security"
                title="No service levels set"
                description="A policy puts a clock on a lead: how long the team has to answer it, and how long to finish it."
                action={{ label: "New policy", onClick: handleOpenCreate }}
                className={CONTENT_FILL_PANEL}
              />
            ) : (
              <RecordList
                layout={policyLayout}
                rows={asRecordValues(policies)}
                getRowKey={(row) => String(row.id)}
                actions={rowActions}
                density={density}
                minWidth="820px"
                className={CONTENT_FILL_PANEL}
              />
            )}

            <section className="flex shrink-0 flex-col gap-gap-toolbar">
              <h2 className="text-sm font-semibold">Missed in the last 30 days</h2>
              {breaches.isLoading ? (
                <DataTableSkeleton rows={4} columns={breachLayout.list.columns.length} />
              ) : breaches.isError ? (
                <ErrorState
                  title="Couldn't load recent breaches"
                  description="The breach list didn't load. Check your connection and try again."
                  onRetry={() => void breaches.refetch()}
                />
              ) : breachedLeads.length === 0 ? (
                <EmptyState
                  compact
                  illustrationPreset="security"
                  title="Nothing was missed"
                  description="Every lead was answered and resolved inside its policy window."
                />
              ) : (
                <RecordList
                  layout={breachLayout}
                  rows={asRecordValues(breachedLeads)}
                  getRowKey={(row) => String(row.id)}
                  onRowClick={handleBreachClick}
                  density={density}
                  minWidth="520px"
                />
              )}
            </section>
          </>
        )}
      </div>

      <SlaPolicySheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        policy={editTarget}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteOpenChange}
        title="Delete this policy?"
        description={
          deleteTarget
            ? `${deleteTarget.name} will be deleted and leads and deals will stop being measured against it. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete policy"
        destructive
        isPending={deletePolicy.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
