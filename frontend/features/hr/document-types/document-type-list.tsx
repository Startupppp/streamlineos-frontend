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
import { TruncatedText } from "@/components/ui/truncated-text";
import type { HrDocumentType } from "@/hooks/api/hr/document-types";

interface DocumentTypeListProps {
  items: HrDocumentType[];
  canManageDocuments: boolean;
  onEdit: (documentType: HrDocumentType) => void;
  onDeactivate: (documentType: HrDocumentType) => void;
  onReactivate: (documentType: HrDocumentType) => void;
  onCreateClick: () => void;
}

export function DocumentTypeList({
  items,
  canManageDocuments,
  onEdit,
  onDeactivate,
  onReactivate,
  onCreateClick,
}: DocumentTypeListProps) {
  const columns = useMemo<DataTableColumn<HrDocumentType>[]>(() => {
    const actionsColumn: DataTableColumn<HrDocumentType> = {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      cell: (documentType) => {
        const isActive = documentType.isActive !== false;
        function handleEdit() { onEdit(documentType); }
        function handleDeactivate() { onDeactivate(documentType); }
        function handleReactivate() { onReactivate(documentType); }
        return (
          <TooltipProvider>
            <div className="flex items-center justify-end gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-7 p-0 hover:bg-muted transition-colors duration-200"
                    onClick={handleEdit}
                    aria-label={`Edit ${documentType.name}`}
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
                      className="w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors duration-200"
                      onClick={handleDeactivate}
                      aria-label={`Deactivate ${documentType.name}`}
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
                      className="w-7 p-0 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors duration-200"
                      onClick={handleReactivate}
                      aria-label={`Reactivate ${documentType.name}`}
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
        cell: (documentType) => {
          const isActive = documentType.isActive !== false;
          return (
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "h-2.5 w-2.5 rounded-full shrink-0",
                  isActive
                    ? documentType.isMandatory
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                    : "bg-muted-foreground/30",
                )}
              />
              <div>
                <p className="text-sm font-semibold text-foreground">{documentType.name}</p>
                {documentType.description && (
                  <TruncatedText text={documentType.description} className="text-[11px] text-muted-foreground mt-0.5" />
                )}
              </div>
            </div>
          );
        },
      },
      {
        key: "mandatory",
        header: "Mandatory",
        cell: (documentType) =>
          documentType.isMandatory ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-700">
              Required
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
              Optional
            </span>
          ),
      },
      {
        key: "status",
        header: "Status",
        cell: (documentType) => {
          const isActive = documentType.isActive !== false;
          return isActive ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-700">
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
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
        cell: (documentType) => <>{documentType.sortOrder ?? "—"}</>,
      },
      {
        key: "applicableRoles",
        header: "Applicable Roles",
        cell: (documentType) => (
          <div className="flex flex-wrap gap-1">
            {(documentType.applicableRoles ?? []).length === 0 ? (
              <span className="text-xs text-muted-foreground">All roles</span>
            ) : (
              (documentType.applicableRoles ?? []).map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded-full border bg-muted text-muted-foreground border-border"
                >
                  {role}
                </span>
              ))
            )}
          </div>
        ),
      },
      ...(canManageDocuments ? [actionsColumn] : []),
    ];
  }, [canManageDocuments, onEdit, onDeactivate, onReactivate]);

  const emptyState = (
    <EmptyState
      illustration={<EmptyUploadIllustration className="h-40 w-40" />}
      title="No document types configured"
      description="Add document types to define what employees must submit during onboarding."
      action={
        canManageDocuments
          ? { label: "Add Document Type", onClick: onCreateClick }
          : undefined
      }
    />
  );

  return (
    <DataTable
      data={items}
      columns={columns}
      getRowKey={(documentType) => documentType.id}
      emptyState={emptyState}
      minWidth="640px"
      className="flex-1 min-h-0"
    />
  );
}
