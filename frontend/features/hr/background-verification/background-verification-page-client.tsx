"use client";

import { useState, useCallback } from "react";
import {
  useBackgroundVerifications,
  useUpdateBackgroundVerification,
  type BackgroundVerification,
} from "@/hooks/api/hr";
import { useBgvComplianceDashboard, type BgvComplianceRow } from "@/hooks/api/hr/recruitment";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Plus,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Pencil,
  Building2,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { getInitials } from "@/lib/format-utils";
import { useCan } from "@/hooks/api/access";
import { InitiateBgvSheet } from "@/features/hr/background-verification/initiate-bgv-sheet";
import { EditVerificationSheet } from "@/features/hr/background-verification/edit-verification-sheet";

function getStatusConfig(s: string | null) {
  if (s === "PASSED") {
    return {
      badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30",
      icon: <CheckCircle2 className="h-2.5 w-2.5" />,
      label: "Clear",
    };
  }
  if (s === "FAILED") {
    return {
      badge: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300 border-rose-200 dark:border-rose-500/30",
      icon: <ShieldAlert className="h-2.5 w-2.5" />,
      label: "Flagged",
    };
  }
  if (s === "IN_PROGRESS") {
    return {
      badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 border-amber-200 dark:border-amber-500/30",
      icon: <Clock className="h-2.5 w-2.5" />,
      label: "In Progress",
    };
  }
  return {
    badge: "bg-muted text-muted-foreground border-border",
    icon: <ShieldCheck className="h-2.5 w-2.5" />,
    label: "Pending",
  };
}

function ComplianceDashboard() {
  const { data: rows, isLoading } = useBgvComplianceDashboard();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <EmptyState
        illustrationPreset="chart"
        title="No candidate BgV data yet"
        description="Candidate background verification data will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row: BgvComplianceRow) => (
        <Card
          key={row.jobPostingId}
          className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden"
        >
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-foreground">{row.jobTitle}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4 space-y-2">
            <div className="flex items-center gap-2">
              <Progress value={row.clearedPct} className="flex-1 h-2 bg-muted [&>div]:bg-emerald-500" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums w-10 text-right">
                {row.clearedPct}%
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-[11px]">
              <span className="text-muted-foreground">
                Total: <span className="font-medium text-foreground">{row.total}</span>
              </span>
              <span className="text-emerald-600 dark:text-emerald-300">
                Cleared: <span className="font-medium">{row.cleared}</span>
              </span>
              <span className="text-amber-600 dark:text-amber-300">
                Pending: <span className="font-medium">{row.pending}</span>
              </span>
              <span className="text-blue-600 dark:text-blue-300">
                Initiated: <span className="font-medium">{row.initiated}</span>
              </span>
              <span className="text-rose-600 dark:text-rose-300">
                Failed: <span className="font-medium">{row.failed}</span>
              </span>
              <span className="text-muted-foreground">
                Not initiated: <span className="font-medium">{row.notInitiated}</span>
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function buildBgvColumns(
  onUpdateStatus: (id: number, status: string) => void,
  onOpenEdit: (bgv: BackgroundVerification) => void,
  isPending: boolean,
  canManage: boolean,
): DataTableColumn<BackgroundVerification>[] {
  return [
    {
      key: "employee",
      header: "Employee",
      cell: (bgv) => {
        const employeeName = bgv.user?.name ?? bgv.user?.email ?? "Employee";
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
                {getInitials(bgv.user?.name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium whitespace-nowrap">{employeeName}</span>
          </div>
        );
      },
    },
    {
      key: "type",
      header: "Type",
      cell: (bgv) => (
        <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-muted text-foreground border-border">
          {bgv.type}
        </span>
      ),
    },
    {
      key: "vendor",
      header: "Vendor",
      cell: (bgv) =>
        bgv.provider ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-primary/10 text-foreground border-primary/20">
            <Building2 className="h-2.5 w-2.5" />
            {bgv.provider}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "reference",
      header: "Reference",
      cell: (bgv) => (
        <span className="text-xs text-muted-foreground">{bgv.referenceNumber ?? "—"}</span>
      ),
    },
    {
      key: "initiated",
      header: "Initiated",
      cell: (bgv) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {bgv.createdAt ? format(new Date(bgv.createdAt), "MMM d, yyyy") : "—"}
        </span>
      ),
      sortable: true,
      sortValue: (bgv) => (bgv.createdAt ? new Date(bgv.createdAt).getTime() : 0),
    },
    {
      key: "status",
      header: "Status",
      cell: (bgv) => {
        const statusCfg = getStatusConfig(bgv.status);
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
              statusCfg.badge,
            )}
          >
            {statusCfg.icon}
            {statusCfg.label}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      headerClassName: "text-right",
      className: "text-right",
      cell: (bgv) => canManage ? (
        <div className="flex gap-1 justify-end">
          {(bgv.status === "PENDING" || bgv.status === "IN_PROGRESS") && (
            <>
              <LoadingButton
                size="sm"
                className="gap-1 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(bgv.id, "PASSED");
                }}
                isPending={isPending}
              >
                <CheckCircle2 className="h-3 w-3" />
                Pass
              </LoadingButton>
              <LoadingButton
                size="sm"
                variant="outline"
                className="gap-1 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(bgv.id, "FAILED");
                }}
                isPending={isPending}
              >
                <XCircle className="h-3 w-3" />
                Fail
              </LoadingButton>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="w-7 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onOpenEdit(bgv);
            }}
            aria-label="Edit verification"
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
      ) : null,
    },
  ];
}

export function BackgroundVerificationPageClient() {
  const canManage = useCan("hr:sensitive:manage");
  const canViewEmployees = useCan("hr:employees:view");
  const canInitiate = canManage && canViewEmployees;
  const { data: items, isLoading, isError, error, refetch } = useBackgroundVerifications();
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);
  const update = useUpdateBackgroundVerification();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editBgv, setEditBgv] = useState<BackgroundVerification | null>(null);

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);

  const handleOpenEdit = useCallback((bgv: BackgroundVerification) => {
    setEditBgv(bgv);
  }, []);

  const handleCloseEdit = useCallback(() => {
    setEditBgv(null);
  }, []);

  const handleUpdateStatus = useCallback(
    (id: number, status: string) => {
      update.mutate(
        { id, status },
        {
          onSuccess: () => toast.success("Status updated"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [update],
  );

  if (isError) {
    return (
      <PageWrapper
        title="Background Verification"
        subtitle="Initiate, track employee background checks, and view candidate compliance">
        <EmptyState
          illustrationPreset="alert"
          title="Failed to load verifications"
          description={getErrorMessage(error)}
          action={{ label: "Retry", onClick: handleRetry }}
        />
      </PageWrapper>
    );
  }

  const pendingCount = items?.filter((b) => b.status === "PENDING").length ?? 0;
  const inProgressCount = items?.filter((b) => b.status === "IN_PROGRESS").length ?? 0;
  const passedCount = items?.filter((b) => b.status === "PASSED").length ?? 0;
  const failedCount = items?.filter((b) => b.status === "FAILED").length ?? 0;

  return (
    <PageWrapper
      title="Background Verification"
      subtitle="Initiate, track employee background checks, and view candidate compliance"
      actions={
        canInitiate ? (
          <Button size="sm" className="gap-1.5" onClick={handleOpenSheet}>
            <Plus className="h-3.5 w-3.5" />
            Initiate BGV
          </Button>
        ) : undefined
      }
    >
      {items && items.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border bg-muted text-muted-foreground border-border">
            <ShieldCheck className="h-3 w-3" />
            {pendingCount} Pending
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30">
            <Clock className="h-3 w-3" />
            {inProgressCount} In Progress
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30">
            <CheckCircle2 className="h-3 w-3" />
            {passedCount} Cleared
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30">
            <ShieldAlert className="h-3 w-3" />
            {failedCount} Flagged
          </span>
        </div>
      )}
      <Tabs defaultValue="employee-bgv">
        <TabsList className="mb-4 bg-muted/60">
          <TabsTrigger value="employee-bgv">Employee BGV</TabsTrigger>
          <TabsTrigger value="candidate-compliance">Candidate Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="employee-bgv">
          <DataTable<BackgroundVerification>
            className="flex-1 min-h-0"
            data={items ?? []}
            columns={buildBgvColumns(
              handleUpdateStatus,
              handleOpenEdit,
              update.isPending,
              canManage,
            )}
            getRowKey={(bgv) => bgv.id}
            isLoading={isLoading}
            emptyState={
              <EmptyState
                illustrationPreset="security"
                title="No background verifications initiated"
                description={
                  canInitiate
                    ? "Initiate background checks for employees to track their verification status."
                    : "Background checks will appear here after an authorized HR administrator initiates one."
                }
              />
            }
          />
        </TabsContent>

        <TabsContent value="candidate-compliance">
          <div className="mb-3">
            <p className="text-sm text-muted-foreground">
              BgV completion rate per job posting — percentage of candidates with cleared background
              verification.
            </p>
          </div>
          <ComplianceDashboard />
        </TabsContent>
      </Tabs>

      <InitiateBgvSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      <EditVerificationSheet bgv={editBgv} onClose={handleCloseEdit} />
    </PageWrapper>
  );
}
