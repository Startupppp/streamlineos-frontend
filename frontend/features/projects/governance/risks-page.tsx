"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Plus, ShieldAlert, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useProjectRisks, useCreateRisk, useUpdateRisk, useDeleteRisk } from "@/hooks/api/projects";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import type { Risk, RiskStatus, RiskProbability, RiskImpact, CreateRiskInput, UpdateRiskInput } from "@/types/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonTable } from "@/components/shared/skeletons/skeleton-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getErrorMessage } from "@/lib/get-error-message";
import { getRiskSeverity } from "./risk-severity";
import { RiskMatrix } from "./risk-matrix";
import { RiskFormSheet } from "./risk-form-sheet";

const LEVEL_LABEL: Record<"low" | "medium" | "high", string> = { low: "Low", medium: "Medium", high: "High" };
const LEVEL_STYLE: Record<"low" | "medium" | "high", string> = {
  low: "text-slate-600 border-slate-200",
  medium: "text-amber-600 border-amber-200",
  high: "text-red-600 border-red-200",
};
const STATUS_LABEL: Record<RiskStatus, string> = {
  open: "Open", mitigating: "Mitigating", monitoring: "Monitoring", accepted: "Accepted", closed: "Closed",
};
const STATUS_STYLE: Record<RiskStatus, string> = {
  open: "text-blue-600 border-blue-200",
  mitigating: "text-amber-600 border-amber-200",
  monitoring: "text-violet-600 border-violet-200",
  accepted: "text-slate-500 border-slate-200",
  closed: "text-emerald-600 border-emerald-200",
};
const STATUS_OPTS = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "mitigating", label: "Mitigating" },
  { value: "monitoring", label: "Monitoring" },
  { value: "accepted", label: "Accepted" },
  { value: "closed", label: "Closed" },
];

interface RisksPageProps { projectId: number }

export function RisksPage({ projectId }: RisksPageProps) {
  const canManage = useCan("projects:risks:manage");

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [matrixCell, setMatrixCell] = useState<{ probability: RiskProbability; impact: RiskImpact } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editRisk, setEditRisk] = useState<Risk | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Risk | null>(null);

  const { data, isLoading, isError, refetch } = useProjectRisks(projectId, {
    status: statusFilter !== "all" ? statusFilter : undefined,
  });
  const { data: membersRes } = useOrgMembers(1, 100);
  const members = useMemo(() => membersRes?.data ?? [], [membersRes]);

  const createRisk = useCreateRisk(projectId);
  const updateRisk = useUpdateRisk(projectId);
  const deleteRisk = useDeleteRisk(projectId);

  function memberName(userId: string | null): string {
    if (!userId) return "—";
    const m = members.find((x) => x.userId === userId);
    return m?.name ?? m?.email ?? userId;
  }

  const allRisks = useMemo(() => data ?? [], [data]);
  const openCount = allRisks.filter((r) => r.status === "open").length;
  const highCritCount = allRisks.filter((r) => {
    const { label } = getRiskSeverity(r.probability, r.impact);
    return label === "High" || label === "Critical";
  }).length;
  const closedCount = allRisks.filter((r) => r.status === "closed").length;

  const displayed = useMemo(() => {
    let items = allRisks;
    if (matrixCell) {
      items = items.filter((r) => r.probability === matrixCell.probability && r.impact === matrixCell.impact);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((r) => r.title.toLowerCase().includes(q) || `risk-${r.riskNumber}`.includes(q));
    }
    return items;
  }, [allRisks, matrixCell, search]);

  function handleCreate(input: CreateRiskInput) {
    createRisk.mutate(input, {
      onSuccess: () => { toast.success("Risk added"); setSheetOpen(false); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleUpdate(input: UpdateRiskInput & { id: number }) {
    updateRisk.mutate(input, {
      onSuccess: () => { toast.success("Risk updated"); setEditRisk(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteRisk.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Risk deleted"); setDeleteTarget(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleCellClick(probability: RiskProbability, impact: RiskImpact) {
    setMatrixCell((prev) =>
      prev?.probability === probability && prev?.impact === impact ? null : { probability, impact },
    );
  }

  const columns: DataTableColumn<Risk>[] = [
    {
      key: "riskNumber", header: "ID", className: "w-20",
      cell: (row) => <span className="font-mono text-xs text-muted-foreground">RISK-{row.riskNumber}</span>,
    },
    {
      key: "title", header: "Title", sortable: true, sortValue: (r) => r.title,
      cell: (row) => <span className="font-medium text-foreground truncate max-w-[200px] block">{row.title}</span>,
    },
    {
      key: "probability", header: "Probability",
      cell: (row) => (
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${LEVEL_STYLE[row.probability]}`}>
          {LEVEL_LABEL[row.probability]}
        </Badge>
      ),
    },
    {
      key: "impact", header: "Impact",
      cell: (row) => (
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${LEVEL_STYLE[row.impact]}`}>
          {LEVEL_LABEL[row.impact]}
        </Badge>
      ),
    },
    {
      key: "severity", header: "Severity",
      cell: (row) => {
        const s = getRiskSeverity(row.probability, row.impact);
        return <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${s.className}`}>{s.label}</Badge>;
      },
    },
    {
      key: "ownerId", header: "Owner",
      cell: (row) => <span className="text-muted-foreground text-sm">{memberName(row.ownerId)}</span>,
    },
    {
      key: "status", header: "Status",
      cell: (row) => (
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${STATUS_STYLE[row.status]}`}>
          {STATUS_LABEL[row.status]}
        </Badge>
      ),
    },
    {
      key: "actions", header: "", className: "w-10",
      cell: (row) => {
        if (!canManage) return null;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditRisk(row)}>Edit</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(row)}>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const isFiltered = statusFilter !== "all" || !!search.trim() || !!matrixCell;

  return (
    <PageWrapper
      title="Risk Register"
      eyebrow="Project"
      subtitle="Identify, assess, and mitigate project risks"
      actions={
        canManage ? (
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setSheetOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> New Risk
          </Button>
        ) : undefined
      }
    >
      <div className="px-4 pb-4 space-y-4">
        <StatCardGrid cols={3}>
          <StatCard label="Open" value={openCount} icon={ShieldAlert} tone="blue" isLoading={isLoading} />
          <StatCard label="High / Critical" value={highCritCount} icon={AlertTriangle} tone="red" isLoading={isLoading} />
          <StatCard label="Closed" value={closedCount} icon={CheckCircle2} tone="emerald" isLoading={isLoading} />
        </StatCardGrid>

        {!isLoading && !isError && (
          <RiskMatrix risks={allRisks} onCellClick={handleCellClick} selectedCell={matrixCell} />
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            className="h-8 text-xs w-52"
            placeholder="Search risks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {isFiltered && (
            <Button size="sm" variant="ghost" className="h-8 text-xs"
              onClick={() => { setStatusFilter("all"); setSearch(""); setMatrixCell(null); }}>
              Clear
            </Button>
          )}
        </div>

        {isLoading ? (
          <SkeletonTable rows={5} columns={8} />
        ) : isError ? (
          <ErrorState className="flex-1" onRetry={() => void refetch()} />
        ) : displayed.length === 0 ? (
          <EmptyState
            illustrationPreset="alert"
            title={isFiltered ? "No matching risks" : "No risks logged"}
            description={
              isFiltered
                ? "Try adjusting your filters or clearing the matrix selection."
                : "Log risks to track probability, impact, and mitigation plans."
            }
            action={
              isFiltered
                ? { label: "Clear filters", onClick: () => { setStatusFilter("all"); setSearch(""); setMatrixCell(null); } }
                : canManage ? { label: "New Risk", onClick: () => setSheetOpen(true) } : undefined
            }
          />
        ) : (
          <DataTable data={displayed} columns={columns} getRowKey={(row) => row.id} minWidth="780px" />
        )}
      </div>

      <RiskFormSheet
        open={sheetOpen || !!editRisk}
        onOpenChange={(open) => { if (!open) { setSheetOpen(false); setEditRisk(null); } }}
        mode={editRisk ? "edit" : "create"}
        defaultValues={editRisk ?? undefined}
        onSubmitCreate={handleCreate}
        onSubmitEdit={handleUpdate}
        isPending={createRisk.isPending || updateRisk.isPending}
        members={members}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this risk?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
