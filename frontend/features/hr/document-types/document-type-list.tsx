"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyUploadIllustration } from "@/components/illustrations";
import { Pencil, PowerOff, Power } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

interface DocumentType {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  isMandatory: boolean | null;
  isActive: boolean | null;
  sortOrder: number | null;
  applicableRoles: string[] | null;
  createdAt: string | null;
}

interface DocumentTypeListProps {
  items: DocumentType[];
  isHROrCEO: boolean;
  onEdit: (dt: DocumentType) => void;
  onDeactivate: (dt: DocumentType) => void;
  onReactivate: (dt: DocumentType) => void;
  onCreateClick: () => void;
}

export function DocumentTypeList({
  items,
  isHROrCEO,
  onEdit,
  onDeactivate,
  onReactivate,
  onCreateClick,
}: DocumentTypeListProps) {
  const columns = useMemo<DataTableColumn<DocumentType>[]>(() => {
    const actionsColumn: DataTableColumn<DocumentType> = {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      cell: (dt) => {
        const isActive = dt.isActive !== false;
        function handleEdit() { onEdit(dt); }
        function handleDeactivate() { onDeactivate(dt); }
        function handleReactivate() { onReactivate(dt); }
        return (
          <TooltipProvider>
            <div className="flex items-center justify-end gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 hover:bg-muted transition-colors duration-200"
                    onClick={handleEdit}
                    aria-label={`Edit ${dt.name}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>
              {isActive ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors duration-200"
                      onClick={handleDeactivate}
                      aria-label={`Deactivate ${dt.name}`}
                    >
                      <PowerOff className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Deactivate</TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors duration-200"
                      onClick={handleReactivate}
                      aria-label={`Reactivate ${dt.name}`}
                    >
                      <Power className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reactivate</TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
        );
      },
    };

    return [
      {
        key: "name",
        header: "Name",
        cell: (dt) => {
          const isActive = dt.isActive !== false;
          return (
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "h-2.5 w-2.5 rounded-full shrink-0",
                  isActive
                    ? dt.isMandatory
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                    : "bg-slate-300 dark:bg-slate-600",
                )}
              />
              <div>
                <p className="text-sm font-semibold text-foreground">{dt.name}</p>
                {dt.description && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                    {dt.description}
                  </p>
                )}
              </div>
            </div>
          );
        },
      },
      {
        key: "mandatory",
        header: "Mandatory",
        cell: (dt) =>
          dt.isMandatory ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700">
              Required
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-700">
              Optional
            </span>
          ),
      },
      {
        key: "status",
        header: "Status",
        cell: (dt) => {
          const isActive = dt.isActive !== false;
          return isActive ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700">
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-700">
              Inactive
            </span>
          );
        },
      },
      {
        key: "sortOrder",
        header: "Sort Order",
        headerClassName: "text-center",
        className: "text-center text-sm text-muted-foreground tabular-nums",
        cell: (dt) => <>{dt.sortOrder ?? "—"}</>,
      },
      {
        key: "applicableRoles",
        header: "Applicable Roles",
        cell: (dt) => (
          <div className="flex flex-wrap gap-1">
            {(dt.applicableRoles ?? []).length === 0 ? (
              <span className="text-xs text-muted-foreground">All roles</span>
            ) : (
              (dt.applicableRoles ?? []).map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded-full border bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-700"
                >
                  {r}
                </span>
              ))
            )}
          </div>
        ),
      },
      ...(isHROrCEO ? [actionsColumn] : []),
    ];
  }, [isHROrCEO, onEdit, onDeactivate, onReactivate]);

  const emptyState = (
    <EmptyState
      illustration={<EmptyUploadIllustration className="h-40 w-40" />}
      title="No document types configured"
      description="Add document types to define what employees must submit during onboarding."
      action={
        isHROrCEO
          ? { label: "Add Document Type", onClick: onCreateClick }
          : undefined
      }
    />
  );

  return (
    <DataTable
      data={items}
      columns={columns}
      getRowKey={(dt) => dt.id}
      emptyState={emptyState}
      minWidth="640px"
    />
  );
}
