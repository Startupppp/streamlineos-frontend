"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { usePrograms, usePortfolios, useCreateProgram, useUpdateProgram, useDeleteProgram } from "@/hooks/api/projects";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PortfolioStatusBadge, PortfolioHealthBadge } from "./portfolio-status-badge";
import { ProgramFormSheet } from "./program-form-sheet";
import type { Program, CreateProgramInput, UpdateProgramInput } from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";

const STATUS_OPTS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export function ProgramsPage() {
  const canManage = useCan("projects:programs:manage");

  const [statusFilter, setStatusFilter] = useState("all");
  const [portfolioFilter, setPortfolioFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Program | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null);

  const { data, isLoading, isError, refetch } = usePrograms({
    status: statusFilter !== "all" ? statusFilter : undefined,
    portfolioId: portfolioFilter !== "all" ? parseInt(portfolioFilter, 10) : undefined,
  });
  const { data: portfoliosData } = usePortfolios();
  const { data: membersRes } = useOrgMembers(1, 100);
  const members = useMemo(() => membersRes?.data ?? [], [membersRes]);
  const portfolios = useMemo(() => portfoliosData ?? [], [portfoliosData]);

  const createProgram = useCreateProgram();
  const updateProgram = useUpdateProgram();
  const deleteProgram = useDeleteProgram();

  function memberName(userId: string | null): string {
    if (!userId) return "—";
    const m = members.find((x) => x.userId === userId);
    return m?.name ?? m?.email ?? userId;
  }

  function portfolioName(portfolioId: number | null): string {
    if (!portfolioId) return "—";
    return portfolios.find((p) => p.id === portfolioId)?.name ?? "—";
  }

  const displayed = useMemo(() => {
    if (!search.trim()) return data ?? [];
    const q = search.toLowerCase();
    return (data ?? []).filter((p) => p.name.toLowerCase().includes(q));
  }, [data, search]);

  function handleCreate(input: CreateProgramInput) {
    createProgram.mutate(input, {
      onSuccess: () => { toast.success("Program created"); setSheetOpen(false); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleEdit(input: UpdateProgramInput & { id: number }) {
    updateProgram.mutate(input, {
      onSuccess: () => { toast.success("Program updated"); setEditTarget(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteProgram.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Program deleted"); setDeleteTarget(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  const columns: DataTableColumn<Program>[] = [
    {
      key: "name", header: "Name", sortable: true, sortValue: (r) => r.name,
      cell: (row) => (
        <Link href={`/projects/programs/${row.id}`} className="font-medium text-foreground hover:text-primary truncate max-w-[200px] block">
          {row.name}
        </Link>
      ),
    },
    {
      key: "portfolioId", header: "Portfolio",
      cell: (row) => <span className="text-muted-foreground text-sm">{portfolioName(row.portfolioId)}</span>,
    },
    { key: "status", header: "Status", cell: (row) => <PortfolioStatusBadge status={row.status} /> },
    { key: "health", header: "Health", cell: (row) => <PortfolioHealthBadge health={row.health} /> },
    {
      key: "ownerId", header: "Owner",
      cell: (row) => <span className="text-muted-foreground text-sm">{memberName(row.ownerId)}</span>,
    },
    {
      key: "projectCount", header: "Projects", className: "w-20",
      cell: (row) => <span className="tabular-nums text-muted-foreground">{row.projectCount ?? 0}</span>,
    },
    {
      key: "actions", header: "", className: "w-10",
      cell: (row) => {
        if (!canManage) return null;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditTarget(row)}>Edit</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(row)}>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const isFiltered = statusFilter !== "all" || portfolioFilter !== "all" || !!search.trim();
  const filtersBar = (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>{STATUS_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={portfolioFilter} onValueChange={setPortfolioFilter}>
        <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="All portfolios" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All portfolios</SelectItem>
          {portfolios.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input className="h-8 text-xs w-48" placeholder="Search programs…" value={search} onChange={(e) => setSearch(e.target.value)} />
      {isFiltered && (
        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setStatusFilter("all"); setPortfolioFilter("all"); setSearch(""); }}>Clear</Button>
      )}
    </div>
  );

  return (
    <PageWrapper
      title="Programs"
      eyebrow="Projects"
      subtitle="Organize projects into programs under a portfolio"
      filters={filtersBar}
      actions={canManage ? (
        <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setSheetOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> New Program
        </Button>
      ) : undefined}
    >
      {isLoading ? (
        <SkeletonTable rows={5} columns={7} />
      ) : isError ? (
        <ErrorState className="flex-1" onRetry={() => void refetch()} />
      ) : displayed.length === 0 ? (
        <EmptyState
          illustrationPreset="projects"
          title={isFiltered ? "No matching programs" : "No programs yet"}
          description={isFiltered ? "Try adjusting your filters." : "Create a program to group related projects under a portfolio."}
          action={isFiltered
            ? { label: "Clear filters", onClick: () => { setStatusFilter("all"); setPortfolioFilter("all"); setSearch(""); } }
            : canManage ? { label: "New Program", onClick: () => setSheetOpen(true) } : undefined}
          className="flex-1 min-h-[40vh]"
        />
      ) : (
        <DataTable data={displayed} columns={columns} getRowKey={(row) => row.id} minWidth="820px" />
      )}

      <ProgramFormSheet
        open={sheetOpen || !!editTarget}
        onOpenChange={(open) => { if (!open) { setSheetOpen(false); setEditTarget(null); } }}
        mode={editTarget ? "edit" : "create"}
        defaultValues={editTarget ?? undefined}
        onSubmitCreate={handleCreate}
        onSubmitEdit={handleEdit}
        isPending={createProgram.isPending || updateProgram.isPending}
        members={members}
        portfolios={portfolios}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this program?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. Projects will not be deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
