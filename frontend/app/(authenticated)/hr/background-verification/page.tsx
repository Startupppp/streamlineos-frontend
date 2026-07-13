"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback, useMemo } from "react";
import {
  useBackgroundVerifications,
  useCreateBackgroundVerification,
  useUpdateBackgroundVerification,
  type BackgroundVerification,
} from "@/hooks/api/hr";
import { useHrEmployees } from "@/hooks/api/hr";
import { useBgvComplianceDashboard, type BgvComplianceRow } from "@/hooks/api/hr/recruitment";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { HrSheet } from "@/features/hr/hr-sheet";
import { DashboardGate } from "@/components/shared/dashboard-gate";
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
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import type { Employee } from "@/types/hr";
import { cn } from "@/lib/utils";

const BGV_TYPES = ["Identity", "Education", "Employment", "Criminal", "Address", "Credit"];

function getStatusConfig(s: string | null) {
  if (s === "PASSED") {
    return {
      badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      icon: <CheckCircle2 className="h-2.5 w-2.5" />,
      label: "Clear",
    };
  }
  if (s === "FAILED") {
    return {
      badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      icon: <ShieldAlert className="h-2.5 w-2.5" />,
      label: "Flagged",
    };
  }
  if (s === "IN_PROGRESS") {
    return {
      badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      icon: <Clock className="h-2.5 w-2.5" />,
      label: "In Progress",
    };
  }
  return {
    badge: "bg-muted text-muted-foreground dark:bg-slate-900/40 dark:text-slate-300 border-border dark:border-slate-800",
    icon: <ShieldCheck className="h-2.5 w-2.5" />,
    label: "Pending",
  };
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function ComplianceDashboard() {
  const { data: rows, isLoading } = useBgvComplianceDashboard();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <EmptyState
          illustrationPreset="chart"
          title="No candidate BgV data yet"
          description="Candidate background verification data will appear here."
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row: BgvComplianceRow) => (
        <Card key={row.jobPostingId} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-foreground">{row.jobTitle}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4 space-y-2">
            <div className="flex items-center gap-2">
              <Progress value={row.clearedPct} className="flex-1 h-2 bg-muted [&>div]:bg-emerald-500" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums w-10 text-right">
                {row.clearedPct}%
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-[11px]">
              <span className="text-muted-foreground">
                Total: <span className="font-medium text-foreground">{row.total}</span>
              </span>
              <span className="text-emerald-600 dark:text-emerald-400">
                Cleared: <span className="font-medium">{row.cleared}</span>
              </span>
              <span className="text-amber-600 dark:text-amber-400">
                Pending: <span className="font-medium">{row.pending}</span>
              </span>
              <span className="text-blue-600 dark:text-blue-400">
                Initiated: <span className="font-medium">{row.initiated}</span>
              </span>
              <span className="text-rose-600 dark:text-rose-400">
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
        <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-muted text-foreground dark:bg-slate-900/40 dark:text-slate-300 border-border dark:border-slate-800">
          {bgv.type}
        </span>
      ),
    },
    {
      key: "vendor",
      header: "Vendor",
      cell: (bgv) =>
        bgv.provider ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800">
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
      cell: (bgv) => <span className="text-xs text-muted-foreground">{bgv.referenceNumber ?? "—"}</span>,
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
      sortValue: (bgv) => bgv.createdAt ? new Date(bgv.createdAt).getTime() : 0,
    },
    {
      key: "status",
      header: "Status",
      cell: (bgv) => {
        const statusCfg = getStatusConfig(bgv.status);
        return (
          <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border", statusCfg.badge)}>
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
      cell: (bgv) => (
        <div className="flex gap-1 justify-end">
          {(bgv.status === "PENDING" || bgv.status === "IN_PROGRESS") && (
            <>
              <Button
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={(e) => { e.stopPropagation(); onUpdateStatus(bgv.id, "PASSED"); }}
                disabled={isPending}
              >
                <CheckCircle2 className="h-3 w-3" />
                Pass
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-xs"
                onClick={(e) => { e.stopPropagation(); onUpdateStatus(bgv.id, "FAILED"); }}
                disabled={isPending}
              >
                <XCircle className="h-3 w-3" />
                Fail
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={(e) => { e.stopPropagation(); onOpenEdit(bgv); }}
            aria-label="Edit verification"
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
  ];
}

function BGVContent() {
  const { data: items, isLoading, isError, refetch } = useBackgroundVerifications();
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const { data: employeesRaw } = useHrEmployees();
  const create = useCreateBackgroundVerification();
  const update = useUpdateBackgroundVerification();

  const employees = useMemo<Employee[]>(() => {
    if (Array.isArray(employeesRaw)) return employeesRaw;
    if (employeesRaw && "data" in employeesRaw) return employeesRaw.data;
    return [];
  }, [employeesRaw]);

  const employeeOptions = useMemo<ComboboxOption[]>(
    () =>
      employees
        .filter((e) => e.isActive)
        .map((e) => ({
          value: e.id,
          label:
            e.firstName && e.lastName
              ? `${e.firstName} ${e.lastName}`
              : (e.name ?? e.email),
          sublabel: e.designation ?? e.email,
        })),
    [employees],
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [type, setType] = useState("Identity");
  const [provider, setProvider] = useState("");
  const [refNumber, setRefNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [editBgv, setEditBgv] = useState<BackgroundVerification | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editResult, setEditResult] = useState("");
  const [editStatus, setEditStatus] = useState("");

  const resetForm = useCallback(() => {
    setUserId("");
    setType("Identity");
    setProvider("");
    setRefNumber("");
    setNotes("");
  }, []);

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) resetForm();
    setSheetOpen(open);
  }, [resetForm]);

  const handleProviderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setProvider(e.target.value), []);
  const handleRefNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setRefNumber(e.target.value), []);
  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value), []);
  const handleEditResultChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setEditResult(e.target.value), []);
  const handleEditNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setEditNotes(e.target.value), []);

  const handleOpenEdit = useCallback((bgv: BackgroundVerification) => {
    setEditBgv(bgv);
    setEditNotes(bgv.notes ?? "");
    setEditResult(bgv.result ?? "");
    setEditStatus(bgv.status ?? "PENDING");
  }, []);

  const handleCloseEdit = useCallback((open: boolean) => {
    if (!open) {
      setEditBgv(null);
      setEditNotes("");
      setEditResult("");
      setEditStatus("");
    }
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editBgv) return;
    update.mutate(
      {
        id: editBgv.id,
        status: editStatus || undefined,
        result: editResult || undefined,
        notes: editNotes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Check updated");
          setEditBgv(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [editBgv, editStatus, editResult, editNotes, update]);

  const handleCreate = useCallback(() => {
    if (!userId) { toast.error("Employee is required"); return; }
    create.mutate(
      {
        userId,
        type,
        provider: provider || undefined,
        referenceNumber: refNumber || undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Verification initiated");
          setSheetOpen(false);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [userId, type, provider, refNumber, notes, create, resetForm]);

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
        subtitle="Initiate, track employee background checks, and view candidate compliance"
      >
        <EmptyState
          illustrationPreset="alert"
          title="Failed to load verifications"
          description="Something went wrong. Please try again."
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
      badge={`${items?.length ?? 0} checks`}
      actions={
        <Button size="sm" className="h-8 gap-1.5" onClick={handleOpenSheet}>
          <Plus className="h-3.5 w-3.5" />
          Initiate BGV
        </Button>
      }
    >
      {items && items.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border bg-muted text-muted-foreground border-border dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            <ShieldCheck className="h-3 w-3" />
            {pendingCount} Pending
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800">
            <Clock className="h-3 w-3" />
            {inProgressCount} In Progress
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="h-3 w-3" />
            {passedCount} Cleared
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800">
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
            data={items ?? []}
            columns={buildBgvColumns(handleUpdateStatus, handleOpenEdit, update.isPending)}
            getRowKey={(bgv) => bgv.id}
            isLoading={isLoading}
            emptyState={
              <EmptyState
                illustrationPreset="security"
                title="No background verifications initiated"
                description="Initiate background checks for employees to track their verification status."
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

      <HrSheet
        open={!!editBgv}
        onOpenChange={handleCloseEdit}
        title="Edit Verification"
        onSubmit={handleSaveEdit}
        submitLabel="Save"
        isPending={update.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Status</label>
          <Select value={editStatus} onValueChange={setEditStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)]">
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="PASSED">Passed</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Result</label>
          <Input
            placeholder="Summary of findings..."
            value={editResult}
            onChange={handleEditResultChange}
            maxLength={500}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes</label>
          <Textarea
            placeholder="Additional notes..."
            value={editNotes}
            onChange={handleEditNotesChange}
            rows={3}
            maxLength={1000}
            className="resize-none w-full"
          />
        </div>
      </HrSheet>

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title="Initiate BGV"
        onSubmit={handleCreate}
        submitLabel="Initiate"
        isPending={create.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Employee <span className="text-destructive">*</span>
          </label>
          <Combobox
            options={employeeOptions}
            value={userId}
            onChange={setUserId}
            placeholder="Select employee…"
            searchPlaceholder="Search by name…"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Verification Type <span className="text-destructive">*</span>
          </label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)]">
              {BGV_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Provider / Agency</label>
          <Input
            placeholder="e.g., AuthBridge"
            value={provider}
            onChange={handleProviderChange}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Reference Number</label>
          <Input
            placeholder="Tracking reference"
            value={refNumber}
            onChange={handleRefNumberChange}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes</label>
          <Textarea
            placeholder="Additional notes..."
            value={notes}
            onChange={handleNotesChange}
            rows={2}
            maxLength={500}
            className="resize-none w-full"
          />
        </div>
      </HrSheet>
    </PageWrapper>
  );
}

export default function BackgroundVerificationPage() {
  return (
    <DashboardGate permission="hr:employees:update">
      <BGVContent />
    </DashboardGate>
  );
}
