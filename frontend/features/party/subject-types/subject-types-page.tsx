"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { useCan } from "@/hooks/api/access";
import { useDeleteSubjectType, useSubjectTypes } from "@/hooks/api/party/subjects";
import { getErrorMessage } from "@/lib/get-error-message";
import type { SubjectType } from "@/types/party/subjects";
import { SubjectTypeFormSheet } from "./subject-type-form-sheet";

/**
 * What this organisation transacts, as configuration.
 *
 * Module configuration lives under the module's own settings rather than global
 * `/settings/*`, so this sits at `/crm/settings/subject-types` beside custom
 * fields.
 */
export function SubjectTypesPage() {
  const canManage = useCan("party:subject-types:manage");

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SubjectType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SubjectType | null>(null);

  const types = useSubjectTypes();
  const deleteType = useDeleteSubjectType();

  const rows = types.data?.data ?? [];

  function handleEditOpenChange(open: boolean) {
    if (!open) setEditTarget(null);
  }

  function handleDeleteOpenChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }

  function handleOpenCreate() {
    setCreateOpen(true);
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteType.mutate(deleteTarget.subjectTypeId, {
      onSuccess: () => {
        toast.success("Subject type retired");
        setDeleteTarget(null);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  if (types.isLoading)
    return (
      <PageWrapper title="Subject types" subtitle="What this organisation transacts">
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-20 w-full" />
          ))}
        </div>
      </PageWrapper>
    );

  if (types.isError)
    return (
      <PageWrapper title="Subject types" subtitle="What this organisation transacts">
        <ErrorState
          className={CONTENT_FILL_PANEL}
          title="Couldn't load subject types"
          onRetry={() => void types.refetch()}
        />
      </PageWrapper>
    );

  return (
    <PageWrapper
      title="Subject types"
      subtitle="What this organisation transacts"
      actions={
        canManage ? (
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-1.5 h-4 w-4" /> Declare type
          </Button>
        ) : undefined
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            className={CONTENT_FILL_PANEL}
            title="Nothing declared yet"
            description="Declare a property, a candidate, a shipment, a policy — whatever your business actually transacts. It becomes a record type with its own screens, with no engineer and no migration."
            action={canManage ? { label: "Declare type", onClick: handleOpenCreate } : undefined}
          />
        ) : (
          <ul className="flex flex-col gap-3 overflow-y-auto">
            {rows.map((type) => (
              <li
                key={type.subjectTypeId}
                className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium">{type.plural}</span>
                    <Badge variant="outline" className="h-5 shrink-0 px-2 py-0.5 font-mono text-micro">
                      {type.key}
                    </Badge>
                  </div>
                  <span className="text-label text-muted-foreground">
                    {type.fields.length} field{type.fields.length === 1 ? "" : "s"} · titled by{" "}
                    {type.fields.find((field) => field.name === type.titleField)?.label ??
                      type.titleField}
                  </span>
                </div>

                {canManage ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditTarget(type)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(type)}>
                      Retire
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {createOpen ? (
        <SubjectTypeFormSheet open={createOpen} onOpenChange={setCreateOpen} />
      ) : null}

      {editTarget ? (
        <SubjectTypeFormSheet
          open={!!editTarget}
          onOpenChange={handleEditOpenChange}
          type={editTarget}
        />
      ) : null}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteOpenChange}
        title={`Retire ${deleteTarget?.singular ?? "this type"}?`}
        description={`Existing ${deleteTarget?.plural.toLowerCase() ?? "records"} are kept — retiring the declaration only stops new ones being created. Nothing is deleted.`}
        confirmLabel="Retire type"
        isPending={deleteType.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
