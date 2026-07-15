"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCan } from "@/hooks/api/access";
import { useForms, useCreateForm } from "@/hooks/api/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_FILL_PANEL,
  PM_TOOLBAR,
} from "@/features/projects/shared/pm-chrome";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/features/projects/shared/text-overflow";
import { cn } from "@/lib/utils";
import { FORM_TYPE_LABELS, FORM_TYPES } from "./field-type-meta";
import type { ProjectForm } from "@/types/projects/forms";

const TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  ...FORM_TYPES.map((t) => ({ value: t, label: FORM_TYPE_LABELS[t] })),
];

const ACTIVE_OPTIONS = [
  { value: "all", label: "All forms" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

interface FormsListPageProps {
  projectId: number;
}

export function FormsListPage({ projectId }: FormsListPageProps) {
  const router = useRouter();
  const canManage = useCan("projects:forms:manage");

  const [typeFilter, setTypeFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");

  const isActiveParam =
    activeFilter === "active" ? true : activeFilter === "inactive" ? false : undefined;

  const formTypeValue = FORM_TYPES.find((t) => t === typeFilter);

  const { data, isLoading, isError, refetch } = useForms(projectId, {
    type: formTypeValue,
    isActive: isActiveParam,
  });

  const createForm = useCreateForm(projectId);

  function handleNewForm() {
    createForm.mutate(
      { name: "Untitled Form", fields: [], actions: [], isActive: false },
      {
        onSuccess: (form) => {
          toast.success("Form created");
          router.push(`/projects/${projectId}/forms/${form.id}`);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
  }

  function handleClearFilters() {
    setTypeFilter("all");
    setActiveFilter("all");
    setSearch("");
  }

  const filtered = (data ?? []).filter(
    (f) => !search.trim() || f.name.toLowerCase().includes(search.toLowerCase()),
  );
  const isFiltered = typeFilter !== "all" || activeFilter !== "all" || !!search.trim();

  const columns: DataTableColumn<ProjectForm>[] = [
    {
      key: "formNumber",
      header: "Form ID",
      cell: (row) => (
        <Link
          href={`/projects/${projectId}/forms/${row.id}`}
          className="font-mono text-xs font-semibold text-primary hover:underline"
        >
          FORM-{row.formNumber}
        </Link>
      ),
      className: "w-24",
    },
    {
      key: "name",
      header: "Name",
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <Link
          href={`/projects/${projectId}/forms/${row.id}`}
          className={cn("text-sm font-medium hover:underline", TEXT_ONE_LINE)}
        >
          {row.name}
        </Link>
      ),
      sortable: true,
      sortValue: (row) => row.name,
    },
    {
      key: "type",
      header: "Type",
      cell: (row) => (
        <Badge variant="outline" className="text-[10px] px-1.5">
          {FORM_TYPE_LABELS[row.type]}
        </Badge>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row) => (
        <Badge variant={row.isActive ? "default" : "secondary"} className="text-[10px] px-1.5">
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "fields",
      header: "Fields",
      cell: (row) => <span className="text-muted-foreground text-sm tabular-nums">{row.fields.length}</span>,
      className: "w-16",
    },
    {
      key: "isPublic",
      header: "",
      className: "w-20",
      cell: (row) =>
        row.isPublic ? (
          <Badge variant="outline" className="text-[10px] px-1.5 text-primary border-primary/30">
            Public
          </Badge>
        ) : null,
    },
  ];

  const filtersBar = (
    <div className={cn(PM_TOOLBAR, "sm:justify-start")}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={handleSearchChange}
          placeholder="Search…"
          className="h-8 w-36 text-xs"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={activeFilter} onValueChange={setActiveFilter}>
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTIVE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <PageWrapper
      title="Forms"
      subtitle="Build and manage data collection forms for your project"
      filters={filtersBar}
      actions={
        canManage ? (
          <LoadingButton
            size="sm"
            className="h-8 text-xs"
            onClick={handleNewForm}
            isPending={createForm.isPending}
            loadingText="Creating…"
          >
            New Form
          </LoadingButton>
        ) : undefined
      }
    >
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          {isLoading ? (
            <DataTableSkeleton rows={12} columns={6} className="flex-1" />
          ) : isError ? (
            <ErrorState className={PM_FILL_PANEL} onRetry={() => void refetch()} />
          ) : filtered.length === 0 ? (
            <EmptyState
                className={PM_FILL_PANEL}
                illustrationPreset="documents"
                title={isFiltered ? "No matching forms" : "No forms yet"}
                description={
                  isFiltered
                    ? "No forms match your current filters."
                    : "Create a form to collect structured data from your team or clients."
                }
                action={
                  isFiltered
                    ? { label: "Clear filters", onClick: handleClearFilters }
                    : canManage
                      ? { label: "New Form", onClick: handleNewForm }
                      : undefined
                }
              />
          ) : (
            <PmPanel className={PM_FILL_PANEL} solid>
              <DataTable
                data={filtered}
                columns={columns}
                getRowKey={(row) => row.id}
                minWidth="680px"
                className="min-h-0 flex-1 border-0"
              />
            </PmPanel>
          )}
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
