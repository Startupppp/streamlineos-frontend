"use client";

import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { DataTable, type DataTableColumn, type DataTableProps } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Pencil, Trash2, Play, Archive } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import Link from "next/link";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useActivateHrForm, useArchiveHrForm, useDeleteHrForm } from "../hooks/use-hr-forms";
import type { HrForm } from "../lib/types";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  active: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  archived: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
};

interface FormsDataTableProps {
  forms: HrForm[];
  canManage: boolean;
  pagination: DataTableProps<HrForm>["pagination"];
}

type PendingConfirm = { kind: "archive" | "delete"; form: HrForm } | null;

export function FormsDataTable({ forms, canManage, pagination }: FormsDataTableProps) {
  const activate = useActivateHrForm();
  const archive = useArchiveHrForm();
  const del = useDeleteHrForm();
  const [confirm, setConfirm] = useState<PendingConfirm>(null);

  function handleConfirmOpenChange(open: boolean) {
    if (!open) setConfirm(null);
  }

  async function handleConfirm() {
    if (!confirm) return;
    if (confirm.kind === "delete") await handleDelete(confirm.form.id);
    else await handleArchive(confirm.form.id);
    setConfirm(null);
  }

  async function handleActivate(id: number) {
    try {
      await activate.mutateAsync(id);
      toast.success("Form activated");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleArchive(id: number) {
    try {
      await archive.mutateAsync(id);
      toast.success("Form archived");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleDelete(id: number) {
    try {
      await del.mutateAsync(id);
      toast.success("Form deleted");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const columns: DataTableColumn<HrForm>[] = [
    {
      key: "name",
      header: "Name",
      cell: (row) => (
        <div>
          <Link href={"/hr/settings/forms/" + row.id} className="font-medium text-foreground hover:text-primary transition-colors">
            {row.name}
          </Link>
          {row.description && (
            <TruncatedText text={row.description} className="text-xs text-muted-foreground mt-0.5" />
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant="outline" className={"text-dense " + (STATUS_COLORS[row.status] ?? "")}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "audience",
      header: "Audience",
      cell: (row) => (
        <Badge variant="outline" className="text-dense">
          {row.audience}
        </Badge>
      ),
    },
    {
      key: "fields",
      header: "Fields",
      cell: (row) => (
        <span className="text-muted-foreground">{row.schema.length}</span>
      ),
    },
    {
      key: "workflow",
      header: "Workflow",
      cell: (row) =>
        row.workflowObjectType ? (
          <Badge variant="secondary" className="text-dense">
            {row.workflowObjectType.replace(/_/g, " ")}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <AnimatedIconButton icon={EllipsisIcon} iconSize={16} variant="ghost" size="icon" className="w-7" aria-label="Form actions" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={"/hr/settings/forms/" + row.id}>
                <Pencil className="h-3.5 w-3.5 mr-2" /> {canManage ? "Edit" : "Open"}
              </Link>
            </DropdownMenuItem>
            {canManage && row.status === "draft" && (
              <DropdownMenuItem disabled={activate.isPending} onSelect={() => handleActivate(row.id)}>
                <Play className="h-3.5 w-3.5 mr-2" /> Activate
              </DropdownMenuItem>
            )}
            {canManage && row.status === "active" && (
              <DropdownMenuItem onSelect={() => setConfirm({ kind: "archive", form: row })}>
                <Archive className="h-3.5 w-3.5 mr-2" /> Archive
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href={"/hr/settings/forms/" + row.id + "/submissions"}>
                Submissions
              </Link>
            </DropdownMenuItem>
            {canManage && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onSelect={() => setConfirm({ kind: "delete", form: row })}>
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <>
      <DataTable
        className="flex-1 min-h-0"
        data={forms}
        columns={columns}
        getRowKey={(row) => row.id}
        pagination={pagination}
        emptyState={
          <EmptyState className="border-0 bg-transparent min-h-[40vh]" title="No forms yet." description={canManage ? "Create your first form to get started." : undefined} />
        }
      />
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={handleConfirmOpenChange}
        title={confirm?.kind === "delete" ? "Delete this form?" : "Archive this form?"}
        description={
          confirm?.kind === "delete"
            ? `"${confirm.form.name}" and its configuration are removed. This cannot be undone.`
            : `"${confirm?.form.name ?? ""}" stops accepting submissions.`
        }
        confirmLabel={confirm?.kind === "delete" ? "Delete" : "Archive"}
        destructive
        keepOpenOnConfirm
        isPending={del.isPending || archive.isPending}
        onConfirm={handleConfirm}
      />
    </>
  );
}
