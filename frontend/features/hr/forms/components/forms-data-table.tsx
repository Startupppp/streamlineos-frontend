"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
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
  draft: "bg-muted text-muted-foreground border-border dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  archived: "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
};

interface FormsDataTableProps {
  forms: HrForm[];
}

export function FormsDataTable({ forms }: FormsDataTableProps) {
  const activate = useActivateHrForm();
  const archive = useArchiveHrForm();
  const del = useDeleteHrForm();

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
        <Badge variant="outline" className={"text-[11px] " + (STATUS_COLORS[row.status] ?? "")}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "audience",
      header: "Audience",
      cell: (row) => (
        <Badge variant="outline" className="text-[11px]">
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
          <Badge variant="secondary" className="text-[11px]">
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
                <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
              </Link>
            </DropdownMenuItem>
            {row.status === "draft" && (
              <DropdownMenuItem onClick={() => handleActivate(row.id)}>
                <Play className="h-3.5 w-3.5 mr-2" /> Activate
              </DropdownMenuItem>
            )}
            {row.status === "active" && (
              <DropdownMenuItem onClick={() => handleArchive(row.id)}>
                <Archive className="h-3.5 w-3.5 mr-2" /> Archive
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href={"/hr/settings/forms/" + row.id + "/submissions"}>
                Submissions
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(row.id)}>
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <DataTable
      data={forms}
      columns={columns}
      getRowKey={(row) => row.id}
      emptyState={
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-muted-foreground">No forms yet. Create your first form to get started.</p>
        </div>
      }
    />
  );
}
