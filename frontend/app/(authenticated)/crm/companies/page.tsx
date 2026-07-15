"use client";

import { useState, useCallback, useTransition, useMemo, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Building2, GitMerge, Globe, Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyCompaniesIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useCrmOrganizations, useDeleteCrmOrganization } from "@/hooks/api/crm";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { CreateOrgDialog } from "@/features/crm/companies/create-org-dialog";
import { CompanyMergeDialog } from "@/features/crm/companies/detail/company-merge-dialog";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import type { CrmOrganization, DuplicateOrgPair } from "@/types/crm";

const PAGE_SIZE = 20;

function getHealthBadgeClasses(score: number | null): string {
  if (score === null || score === undefined)
    return "bg-muted text-muted-foreground border-border";
  if (score >= 70) return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30";
  if (score >= 40) return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30";
  return "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30";
}

export default function CompaniesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkMergeOpen, setBulkMergeOpen] = useState(false);

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const page = Number(searchParams.get("page")) || 1;

  const debouncedSearch = useDebouncedValue(search, 300);

  const deleteMutation = useDeleteCrmOrganization();

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (debouncedSearch === current) return;
    updateParams({ q: debouncedSearch || null, page: null });
  }, [debouncedSearch, searchParams, updateParams]);

  const { data, isLoading, isError, refetch } = useCrmOrganizations({
    search: debouncedSearch.trim() || undefined,
    limit: PAGE_SIZE,
    page,
  });

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleClearSelection = useCallback(() => setSelectedIds(new Set()), []);
  const handleBulkMerge = useCallback(() => setBulkMergeOpen(true), []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    [],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      updateParams({ page: newPage > 1 ? String(newPage) : null });
    },
    [updateParams],
  );

  const handleRequestDelete = useCallback((id: number) => setDeleteId(id), []);
  const handleDeleteDialogOpenChange = useCallback((open: boolean) => { if (!open) setDeleteId(null); }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteId === null) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Company deleted");
        setDeleteId(null);
      },
      onError: (e) => {
        toast.error(getErrorMessage(e));
        setDeleteId(null);
      },
    });
  }, [deleteId, deleteMutation]);

  const handleSelectionChange = useCallback((sel: Set<string | number>) => {
    const next = new Set<number>();
    sel.forEach((v) => next.add(Number(v)));
    setSelectedIds(next);
  }, []);

  const bulkMergePair = useMemo<DuplicateOrgPair | null>(() => {
    if (selectedIds.size !== 2) return null;
    const [id1, id2] = [...selectedIds];
    if (id1 === undefined || id2 === undefined) return null;
    const o1 = data?.organizations.find((o) => o.id === id1);
    const o2 = data?.organizations.find((o) => o.id === id2);
    if (!o1 || !o2) return null;
    return {
      org1: { id: o1.id, name: o1.name, domain: o1.domain },
      org2: { id: o2.id, name: o2.name, domain: o2.domain },
      matchReason: "name" as const,
    };
  }, [selectedIds, data?.organizations]);

  const columns: DataTableColumn<CrmOrganization>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (o) => o.name,
      cell: (o) => (
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0">
            {o.name[0]?.toUpperCase() ?? "?"}
          </div>
          <Link
            href={`/crm/companies/${o.id}`}
            className="font-medium truncate max-w-[140px] hover:text-primary hover:underline transition-colors"
          >
            {o.name}
          </Link>
        </div>
      ),
    },
    {
      key: "industry",
      header: "Industry",
      cell: (o) => (
        <span className="text-muted-foreground truncate block max-w-[120px]">
          {o.industry ?? "—"}
        </span>
      ),
    },
    {
      key: "domain",
      header: "Domain",
      cell: (o) =>
        o.domain ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Globe className="h-3 w-3 shrink-0" />
            <span className="truncate max-w-[100px]">{o.domain}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "size",
      header: "Size",
      cell: (o) =>
        o.size ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3 w-3 shrink-0" />
            <span>{o.size}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "health",
      header: "Health",
      cell: (o) => (
        <Badge
          variant="outline"
          className={cn("text-[9px] px-1.5 py-0 h-4", getHealthBadgeClasses(o.healthScore))}
        >
          {o.healthScore !== null ? `${o.healthScore}%` : "N/A"}
        </Badge>
      ),
    },
    {
      key: "website",
      header: "Website",
      cell: (o) =>
        o.website ? (
          <a
            href={o.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-primary hover:underline truncate max-w-[120px]"
          >
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{o.website.replace(/^https?:\/\//, "")}</span>
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-8",
      cell: (o) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={(e) => { e.stopPropagation(); handleRequestDelete(o.id); }}
          aria-label="Delete company"
        >
          Delete
        </Button>
      ),
    },
  ];

  const total = data?.totalCount ?? 0;

  if (isLoading) {
    return (
      <PageWrapper title="Companies" subtitle="Your company directory">
        <DataTableSkeleton rows={12} columns={6} className="flex-1" />
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Companies" subtitle="Your company directory">
        <ErrorState
          title="Failed to load companies"
          description="An error occurred while loading your companies."
          onRetry={handleRetry}
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        title="Companies"
        subtitle="Your company directory"
        actions={
          <>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Company
            </Button>
            <CreateOrgDialog open={createOpen} onOpenChange={setCreateOpen} />
          </>
        }
        filters={
          <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 lg:gap-3">
            <div className="relative min-w-0 flex-1 lg:max-w-md">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search companies..."
                value={search}
                onChange={handleSearchChange}
                className="h-8 w-full min-w-0 pl-8 text-xs"
              />
            </div>
          </div>
        }
      >
        <motion.div
          className="flex flex-1 min-h-0 flex-col space-y-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs">
              <span className="font-medium">{selectedIds.size} selected</span>
              <div className="ml-auto flex items-center gap-2">
                {selectedIds.size === 2 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleBulkMerge}
                  >
                    <GitMerge className="h-3.5 w-3.5 mr-1.5" />
                    Merge
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={handleClearSelection}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
          <motion.div variants={fadeUp} className="flex flex-col flex-1 min-h-0">
            <DataTable
              data={data?.organizations ?? []}
              columns={columns}
              getRowKey={(o) => o.id}
              selection={{ selected: selectedIds as Set<string | number>, onChange: handleSelectionChange }}
              pagination={{
                mode: "server",
                page,
                pageSize: PAGE_SIZE,
                total,
                onPageChange: handlePageChange,
              }}
              emptyState={
                <EmptyState
                  illustration={<EmptyCompaniesIllustration className="w-32 h-32" />}
                  title="No companies found"
                  description={
                    debouncedSearch
                      ? "No companies match your search."
                      : "Create your first company to get started."
                  }
                  action={
                    debouncedSearch
                      ? undefined
                      : { label: "New Company", onClick: handleOpenCreate }
                  }
                  className="border-0 bg-transparent min-h-[40vh]"
                />
              }
              minWidth="640px"
              className="flex-1 min-h-0"
            />
          </motion.div>
        </motion.div>
      </PageWrapper>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={handleDeleteDialogOpenChange}
        title="Delete company"
        description="Are you sure you want to delete this company? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />

      {bulkMergePair && (
        <CompanyMergeDialog
          pair={bulkMergePair}
          currentOrgId={bulkMergePair.org1.id}
          open={bulkMergeOpen}
          onOpenChange={(open) => {
            setBulkMergeOpen(open);
            if (!open) setSelectedIds(new Set());
          }}
          onMergeComplete={handleClearSelection}
        />
      )}
    </>
  );
}
