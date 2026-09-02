"use client";

import { useCallback, useMemo, useState } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { toast } from "sonner";
import { Plus, Database } from "lucide-react";
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
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { getErrorMessage } from "@/lib/get-error-message";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useCan } from "@/hooks/api/access";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { useHrTemplates, useSeedHrTemplateDefaults } from "@/hooks/api/hr/hr-templates";
import { KindBadge, StatusBadge } from "@/features/hr/templates/template-kind-badge";
import { TemplateUpsertSheet } from "@/features/hr/templates/template-upsert-sheet";
import { TemplateLifecycleActions } from "@/features/hr/templates/template-lifecycle-actions";
import { TemplatePreviewDialog } from "@/features/hr/templates/template-preview-dialog";
import {
  HR_TEMPLATE_KINDS,
  HR_TEMPLATE_STATUSES,
  KIND_LABELS,
  STATUS_LABELS,
  type HrTemplateListItem,
  type HrTemplateKind,
  type HrTemplateStatus,
} from "@/types/hr/templates";

const ALL_SENTINEL = "all";

function buildTemplateColumns(
  onEdit: (t: HrTemplateListItem) => void,
): DataTableColumn<HrTemplateListItem>[] {
  return [
    {
      key: "name",
      header: "Name",
      cell: (t) => (
        <div>
          <p className="font-medium text-label text-foreground">{t.name}</p>
          {t.description && (
            <TruncatedText text={t.description} className="text-dense text-muted-foreground max-w-xs mt-0.5" />
          )}
        </div>
      ),
      sortable: true,
      sortValue: (t) => t.name,
    },
    {
      key: "kind",
      header: "Kind",
      cell: (t) => <KindBadge kind={t.kind} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (t) => <StatusBadge status={t.status} />,
    },
    {
      key: "version",
      header: "Version",
      cell: (t) => <span className="text-dense font-mono text-muted-foreground">v{t.version}</span>,
    },
    {
      key: "updatedAt",
      header: "Updated",
      cell: (t) => (
        <span className="text-dense text-muted-foreground">
          {t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "text-right",
      className: "text-right",
      cell: (t) => (
        <div className="flex items-center gap-1 justify-end">
          {(t.kind === "letter" || t.kind === "email") && (
            <TemplatePreviewDialog template={t} />
          )}
          <TemplateLifecycleActions template={t} />
          {(t.status === "draft" || t.status === "review") && (
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(t); }}>
              Edit
            </Button>
          )}
        </div>
      ),
    },
  ];
}

export function TemplatesSettingsPage() {
  const canView = useCan("hr:templates:view");
  const canManage = useCan("hr:templates:manage");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [kind, setKind] = useState<HrTemplateKind | "all">(ALL_SENTINEL);
  const [status, setStatus] = useState<HrTemplateStatus | "all">(ALL_SENTINEL);
  const [upsertOpen, setUpsertOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<HrTemplateListItem | undefined>(undefined);
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([undefined]);
  const page = cursorHistory.length;
  const cursor = cursorHistory.at(-1);

  const params = useMemo(
    () => ({
      ...(kind !== ALL_SENTINEL && { kind }),
      ...(status !== ALL_SENTINEL && { status }),
      ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
      cursor,
      limit: 50,
    }),
    [kind, status, debouncedSearch, cursor],
  );

  const { data, isLoading, isFetching, isError } = useHrTemplates(params);
  const seedDefaults = useSeedHrTemplateDefaults();

  const handleOpenCreate = useCallback(() => {
    setEditingTemplate(undefined);
    setUpsertOpen(true);
  }, []);

  const handleOpenEdit = useCallback((template: HrTemplateListItem) => {
    setEditingTemplate(template);
    setUpsertOpen(true);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setUpsertOpen(false);
    setEditingTemplate(undefined);
  }, []);

  const handleSeed = useCallback(() => {
    seedDefaults.mutate(undefined, {
      onSuccess: (r) =>
        r.seeded ? toast.success(`Seeded ${r.count} default templates`) : toast.info("Templates already exist"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [seedDefaults]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setCursorHistory([undefined]);
  }, []);

  const handlePreviousPage = useCallback(() => {
    setCursorHistory((history) => history.length > 1 ? history.slice(0, -1) : history);
  }, []);

  const handleNextPage = useCallback(() => {
    const nextCursor = data?.pagination.nextCursor;
    if (nextCursor) setCursorHistory((history) => [...history, nextCursor]);
  }, [data?.pagination.nextCursor]);

  const templates = data?.data ?? [];
  const total = data?.total ?? 0;

  if (!canView) {
    return (
      <PageWrapper title="HR Templates" subtitle="Unified template library for checklists, letters, reviews, surveys, and more.">
        <NoPermissionState
          permission="hr:templates:view"
          title="Access Restricted"
          description="You don't have permission to view HR templates. HR Admin role is required."
        />
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        title="HR Templates"
        subtitle="Unified template library for checklists, letters, reviews, surveys, and more."
        actions={
          canManage ? (
          <div className="flex items-center gap-2">
            <LoadingButton
              variant="outline"
              size="sm"
              isPending={seedDefaults.isPending}
              loadingText="Seeding..."
              onClick={handleSeed}
              className="gap-1.5"
            >
              <Database className="h-3.5 w-3.5" />
              Seed Defaults
            </LoadingButton>
            <Button size="sm" className="gap-1.5" onClick={handleOpenCreate}>
              <Plus className="h-3.5 w-3.5" />
              New Template
            </Button>
          </div>
          ) : undefined
        }
        filters={
          <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
            <div className="relative">
              <SearchInput
                placeholder="Search templates..."
                value={search}
                onValueChange={handleSearchChange}
               />
            </div>
            <Select value={kind} onValueChange={(v) => { setKind(v as HrTemplateKind | "all"); setCursorHistory([undefined]); }}>
              <SelectTrigger className={cn("w-44", FILTER_SELECT_TRIGGER)}>
                <SelectValue placeholder="All Kinds" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SENTINEL}>All Kinds</SelectItem>
                {HR_TEMPLATE_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>{KIND_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => { setStatus(v as HrTemplateStatus | "all"); setCursorHistory([undefined]); }}>
              <SelectTrigger className={cn("w-36", FILTER_SELECT_TRIGGER)}>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SENTINEL}>All Statuses</SelectItem>
                {HR_TEMPLATE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {total > 0 && (
              <span className="text-dense text-muted-foreground ml-auto">{total} template{total !== 1 ? "s" : ""}</span>
            )}
          </div>
        }
      >
        <DataTable<HrTemplateListItem>
          className="flex-1 min-h-0"
          data={templates}
          columns={buildTemplateColumns(handleOpenEdit)}
          getRowKey={(t) => t.id}
          isLoading={isLoading}
          emptyState={
            isError ? (
              <EmptyState
                illustrationPreset="alert"
                title="Failed to load templates"
                description="Could not fetch templates. Please try again."
              />
            ) : (
              <EmptyState
                illustrationPreset="documents"
                title="No templates yet"
                description="Create your first template or seed default templates to get started."
                action={{ label: "New Template", onClick: handleOpenCreate }}
              />
            )
          }
        />
        {data && (page > 1 || data.pagination.hasMore) ? (
          <CursorPageControls
            page={page}
            hasNext={data.pagination.hasMore}
            disabled={isFetching}
            onPrevious={handlePreviousPage}
            onNext={handleNextPage}
            className="mt-3"
          />
        ) : null}
      </PageWrapper>

      <TemplateUpsertSheet
        open={upsertOpen}
        onClose={handleCloseSheet}
        template={editingTemplate}
      />
    </>
  );
}
