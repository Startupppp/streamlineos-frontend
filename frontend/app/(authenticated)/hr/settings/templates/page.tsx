"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Database } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { getErrorMessage } from "@/lib/get-error-message";
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
  type HrTemplate,
  type HrTemplateKind,
  type HrTemplateStatus,
} from "@/types/hr/templates";

const ALL_SENTINEL = "all";

function buildTemplateColumns(
  onEdit: (t: HrTemplate) => void,
): DataTableColumn<HrTemplate>[] {
  return [
    {
      key: "name",
      header: "Name",
      cell: (t) => (
        <div>
          <p className="font-medium text-[13px] text-foreground">{t.name}</p>
          {t.description && (
            <p className="text-[11px] text-muted-foreground truncate max-w-xs mt-0.5">{t.description}</p>
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
      cell: (t) => <span className="text-[11px] font-mono text-muted-foreground">v{t.version}</span>,
    },
    {
      key: "updatedAt",
      header: "Updated",
      cell: (t) => (
        <span className="text-[11px] text-muted-foreground">
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

export default function HrTemplatesPage() {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<HrTemplateKind | "all">(ALL_SENTINEL);
  const [status, setStatus] = useState<HrTemplateStatus | "all">(ALL_SENTINEL);
  const [upsertOpen, setUpsertOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<HrTemplate | undefined>(undefined);
  const [page, setPage] = useState(1);

  const params = useMemo(
    () => ({
      ...(kind !== ALL_SENTINEL && { kind }),
      ...(status !== ALL_SENTINEL && { status }),
      ...(search.trim() && { search: search.trim() }),
      page,
      limit: 50,
    }),
    [kind, status, search, page],
  );

  const { data, isLoading, isError } = useHrTemplates(params);
  const seedDefaults = useSeedHrTemplateDefaults();

  const handleOpenCreate = useCallback(() => {
    setEditingTemplate(undefined);
    setUpsertOpen(true);
  }, []);

  const handleOpenEdit = useCallback((template: HrTemplate) => {
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

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  const templates = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <>
      <PageWrapper
        title="HR Templates"
        subtitle="Unified template library for checklists, letters, reviews, surveys, and more."
        actions={
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
        }
        filters={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Input
                placeholder="Search templates..."
                value={search}
                onChange={handleSearchChange}
                className="h-8 w-56 pl-3 text-xs"
              />
            </div>
            <Select value={kind} onValueChange={(v) => { setKind(v as HrTemplateKind | "all"); setPage(1); }}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue placeholder="All Kinds" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SENTINEL}>All Kinds</SelectItem>
                {HR_TEMPLATE_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>{KIND_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => { setStatus(v as HrTemplateStatus | "all"); setPage(1); }}>
              <SelectTrigger className="h-8 w-36 text-xs">
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
              <span className="text-[11px] text-muted-foreground ml-auto">{total} template{total !== 1 ? "s" : ""}</span>
            )}
          </div>
        }
      >
        <DataTable<HrTemplate>
          data={templates}
          columns={buildTemplateColumns(handleOpenEdit)}
          getRowKey={(t) => t.id}
          isLoading={isLoading}
          pagination={
            total > 50
              ? {
                  mode: "server",
                  page,
                  pageSize: 50,
                  total,
                  onPageChange: setPage,
                }
              : undefined
          }
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
      </PageWrapper>

      <TemplateUpsertSheet
        open={upsertOpen}
        onClose={handleCloseSheet}
        template={editingTemplate}
      />
    </>
  );
}
