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
import { LoadingButton } from "@/components/ui/loading-button";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCan } from "@/hooks/api/access";
import { useForms, useCreateForm } from "@/hooks/api/build";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  PmPageShell,
  PmSection,
  PM_FILL_PANEL,
} from "@/components/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
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
  const canManage = useCan("build:forms:manage");

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
          router.push(`/build/${projectId}/forms/${form.id}`);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleSearchChange(value: string) {
    setSearch(value);
  }

  function handleClearFilters() {
    setTypeFilter("all");
    setActiveFilter("all");
    setSearch("");
  }

  function handleRetry() {
    void refetch();
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
          href={`/build/${projectId}/forms/${row.id}`}
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
          href={`/build/${projectId}/forms/${row.id}`}
          className="text-sm font-medium hover:underline min-w-0 block"
        >
          <TruncatedText text={row.name} />
        </Link>
      ),
      sortable: true,
      sortValue: (row) => row.name,
    },
    {
      key: "type",
      header: "Type",
      cell: (row) => (
        <Badge variant="outline" className="text-micro px-1.5">
          {FORM_TYPE_LABELS[row.type]}
        </Badge>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row) => (
        <Badge variant={row.isActive ? "default" : "secondary"} className="text-micro px-1.5">
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
          <Badge variant="outline" className="text-micro px-1.5 text-primary border-primary/30">
            Public
          </Badge>
        ) : null,
    },
  ];

  const filtersBar = (
    <div className={FILTER_TOOLBAR_ROW}>
      <SearchInput
        value={search}
        onValueChange={handleSearchChange}
        placeholder="Search…"
      />
      <Select value={typeFilter} onValueChange={setTypeFilter}>
        <SelectTrigger className="w-40">
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
        <SelectTrigger className="w-32">
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
            className="text-xs"
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
            <ErrorState className={PM_FILL_PANEL} onRetry={handleRetry} />
          ) : filtered.length === 0 ? (
            <EmptyState
              className={PM_FILL_PANEL}
              illustrationPreset="documents"
              title="No forms yet"
              description={isFiltered ? undefined : "Create a form to collect structured data from your team or clients."}
              filtersActive={isFiltered}
              onClearFilters={handleClearFilters}
              action={canManage && !isFiltered ? { label: "New Form", onClick: handleNewForm } : undefined}
            />
          ) : (
            <DataTable
                data={filtered}
                columns={columns}
                getRowKey={(row) => row.id}
                minWidth="680px"
                className={PM_FILL_PANEL}
              />
          )}
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
