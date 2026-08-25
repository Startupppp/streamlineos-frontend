"use client";

import { useState, useCallback } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { motion } from "framer-motion";
import { Plus, Pencil } from "lucide-react";
import { EyeIcon } from "@animateicons/react/lucide";
import { StateIllustration } from "@/components/illustrations";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";
import { useHrPolicies, useSeedDefaultPolicies , useOrgPolicyConflicts } from "@/hooks/api/hr/policies";
import { getErrorMessage } from "@/lib/get-error-message";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import {
  HR_POLICY_TYPES,
  HR_POLICY_STATUSES,
  POLICY_TYPE_LABELS,
} from "@/types/hr/policies";
import type { HrPolicy, HrPolicyType, HrPolicyStatus } from "@/types/hr/policies";
import { PolicyUpsertSheet } from "@/features/hr/policies/policy-upsert-sheet";
import { PolicyPreviewDialog } from "@/features/hr/policies/policy-preview-dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { TruncatedText } from "@/components/ui/truncated-text";

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  active: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  archived: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
};

export default function HrPoliciesPage() {
  const canView = useCan("hr:policies:view");
  const canManage = useCan("hr:policies:manage");
  const { data: orgConflicts } = useOrgPolicyConflicts();
  const conflictCount = orgConflicts?.conflicts.length ?? 0;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [typeFilter, setTypeFilter] = useState<HrPolicyType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<HrPolicyStatus | "all">("all");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editPolicy, setEditPolicy] = useState<HrPolicy | undefined>();
  const [previewPolicyId, setPreviewPolicyId] = useState<number | null>(null);

  const seed = useSeedDefaultPolicies();

  const { data, isLoading, isError, refetch } = useHrPolicies({
    page,
    limit: 20,
    search: debouncedSearch.trim() || undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleOpenCreate = useCallback(() => {
    setEditPolicy(undefined);
    setSheetOpen(true);
  }, []);

  const handleOpenEdit = useCallback((policy: HrPolicy) => {
    setEditPolicy(policy);
    setSheetOpen(true);
  }, []);

  const handleSeedDefaults = useCallback(() => {
    seed.mutate(undefined, {
      onSuccess: (res) => {
        if (res.seeded) {
          toast.success(`${res.count} default policies created`);
        } else {
          toast.info("Policies already exist — no defaults seeded");
        }
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [seed]);

  const columns = [
    {
      key: "name",
      header: "Name",
      cell: (row: HrPolicy) => (
        <div className="min-w-0">
          <TruncatedText text={row.name} className="text-sm font-medium" />
          {row.description && (
            <TruncatedText text={row.description} className="text-xs text-muted-foreground" />
          )}
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (row: HrPolicy) => (
        <span className="text-xs text-muted-foreground">
          {POLICY_TYPE_LABELS[row.policyType]}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: HrPolicy) => (
        <Badge
          variant="outline"
          className={`text-xs px-2 py-0.5 ${STATUS_BADGE[row.status] ?? ""}`}
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: "version",
      header: "Version",
      cell: (row: HrPolicy) => (
        <span className="text-xs font-mono text-muted-foreground">v{row.version}</span>
      ),
    },
    {
      key: "effective",
      header: "Effective",
      cell: (row: HrPolicy) => (
        <span className="text-xs text-muted-foreground">
          {row.effectiveFrom}
          {row.effectiveTo ? ` → ${row.effectiveTo}` : ""}
        </span>
      ),
    },
    {
      key: "scopes",
      header: "Scopes",
      cell: (row: HrPolicy) => (
        <span className="text-xs text-muted-foreground">{row.scopes.length}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row: HrPolicy) => (
        <div className="flex items-center gap-1 justify-end">
          <TooltipIconButton
            icon={EyeIcon}
            label="Preview"
            className="w-7"
            onClick={() => setPreviewPolicyId(row.id)}
          />
          {canManage && (
            <TooltipIconButton
              label="Edit"
              className="w-7"
              onClick={() => handleOpenEdit(row)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </TooltipIconButton>
          )}
        </div>
      ),
    },
  ];

  if (!canView) {
    return (
      <PageWrapper title="HR Policies" subtitle="Configure HR rules and compliance policies">
        <NoPermissionState
          permission="hr:policies:view"
          title="Access Restricted"
          description="You don't have permission to view HR policies. HR Admin role is required."
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="HR Policies"
      subtitle="Configure and manage HR rules, scopes, and compliance"
      actions={
        canManage ? (
          <div className="flex items-center gap-2">
            <LoadingButton
              variant="outline"
              size="sm"
              className="text-xs"
              isPending={seed.isPending}
              onClick={handleSeedDefaults}
            >
              Seed Defaults
            </LoadingButton>
            <Button size="sm" className="text-xs gap-1" onClick={handleOpenCreate}>
              <Plus className="h-3.5 w-3.5" />
              New Policy
            </Button>
          </div>
        ) : undefined
      }
      filters={
        <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
        <SearchInput placeholder="Search policies..." value={search} onValueChange={handleSearchChange} />
          <Select
            value={typeFilter}
            onValueChange={(v) => {
              setTypeFilter(v as HrPolicyType | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className={cn("w-40", FILTER_SELECT_TRIGGER)}>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Types</SelectItem>
              {HR_POLICY_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="text-xs">
                  {POLICY_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as HrPolicyStatus | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className={cn("w-32", FILTER_SELECT_TRIGGER)}>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Status</SelectItem>
              {HR_POLICY_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="text-xs capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      {conflictCount > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-status-warning-rule bg-status-warning-surface px-3 py-2 text-xs text-status-warning-ink">
          <span className="font-semibold">{conflictCount} policy conflict{conflictCount === 1 ? "" : "s"} detected.</span>
          <span>Resolve overlapping scopes and dates before activating drafts.</span>
        </div>
      )}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="flex flex-1 min-h-0 flex-col py-4"
      >
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Failed to load policies.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : data?.data.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center py-12">
            <StateIllustration preset="documents" className="h-28 w-28" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">No policies found</p>
              <p className="text-xs text-muted-foreground">
                {search || typeFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your filters."
                  : "Create your first policy or seed the defaults to get started."}
              </p>
            </div>
            {canManage && !search && typeFilter === "all" && statusFilter === "all" && (
              <div className="flex items-center gap-2 mt-1">
                <LoadingButton
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  isPending={seed.isPending}
                  onClick={handleSeedDefaults}
                >
                  Seed Defaults
                </LoadingButton>
                <Button size="sm" className="text-xs gap-1" onClick={handleOpenCreate}>
                  <Plus className="h-3.5 w-3.5" />
                  New Policy
                </Button>
              </div>
            )}
          </div>
        ) : (
          <DataTable
            className="flex-1 min-h-0"
            data={data?.data ?? []}
            columns={columns}
            getRowKey={(row) => String(row.id)}
            pagination={{
              mode: "server",
              page,
              pageSize: 20,
              total: data?.total ?? 0,
              onPageChange: setPage,
            }}
          />
        )}
      </motion.div>

      <PolicyUpsertSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        policy={editPolicy}
      />

      {previewPolicyId !== null && (
        <PolicyPreviewDialog
          policyId={previewPolicyId}
          open={previewPolicyId !== null}
          onOpenChange={(v) => {
            if (!v) setPreviewPolicyId(null);
          }}
        />
      )}
    </PageWrapper>
  );
}
