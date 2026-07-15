"use client";

import { useState, useCallback } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Plus, MoreHorizontal, Play, Pause, Trash2, History } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import { AutomationsIllustration } from "@/components/illustrations";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCrmAutomationRules,
  useEnableCrmAutomationRule,
  useDisableCrmAutomationRule,
  useDeleteCrmAutomationRule,
  useAutomationEvents,
} from "@/hooks/api/crm";
import type { CrmAutomationRule } from "@/types/crm";
import { cn } from "@/lib/utils";

function buildColumns(
  eventMap: Record<string, string>,
  onToggle: (rule: CrmAutomationRule) => void,
  onOpenBuilder: (id: number) => void,
  onDeleteRequest: (id: number) => void,
): DataTableColumn<CrmAutomationRule>[] {
  return [
    {
      key: "name",
      header: "Name",
      cell: (row): ReactNode => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{row.name}</span>
            {row.isDraft && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-500/30">
                Draft
              </Badge>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">v{row.version}</div>
        </div>
      ),
    },
    {
      key: "trigger",
      header: "Trigger",
      cell: (row): ReactNode => (
        <span className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
          "bg-primary/10 text-foreground border border-primary/30",
        )}>
          {eventMap[row.trigger] ?? row.trigger}
        </span>
      ),
    },
    {
      key: "runs",
      header: "Runs",
      className: "hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
      cell: (row): ReactNode => (
        <span className="text-xs text-muted-foreground">{row.executionCount}</span>
      ),
    },
    {
      key: "lastRun",
      header: "Last Run",
      className: "hidden lg:table-cell",
      headerClassName: "hidden lg:table-cell",
      cell: (row): ReactNode => (
        <span className="text-xs text-muted-foreground">
          {row.lastRunAt
            ? new Date(row.lastRunAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
            : "—"
          }
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row): ReactNode => {
        const handleToggleClick = (e: React.MouseEvent) => { e.stopPropagation(); onToggle(row); };
        return (
          <div onClick={handleToggleClick}>
            <Switch
              checked={row.isActive}
              onCheckedChange={() => onToggle(row)}
              aria-label={row.isActive ? "Disable automation" : "Enable automation"}
            />
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      cell: (row): ReactNode => {
        const handleActionsClick = (e: React.MouseEvent) => { e.stopPropagation(); };
        const handleEdit = () => onOpenBuilder(row.id);
        const handleToggleItem = () => onToggle(row);
        const handleDelete = () => onDeleteRequest(row.id);
        return (
          <div onClick={handleActionsClick}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-7 text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={handleEdit}>
                  <Play className="h-3.5 w-3.5 mr-2" />
                  Open Builder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleEdit}>
                  <History className="h-3.5 w-3.5 mr-2" />
                  Run History
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleToggleItem}>
                  {row.isActive ? (
                    <><Pause className="h-3.5 w-3.5 mr-2" />Disable</>
                  ) : (
                    <><Play className="h-3.5 w-3.5 mr-2" />Enable</>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}

export default function AutomationsPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useCrmAutomationRules();
  const { data: eventsData } = useAutomationEvents();
  const enableRule = useEnableCrmAutomationRule();
  const disableRule = useDisableCrmAutomationRule();
  const deleteRule = useDeleteCrmAutomationRule();

  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const rules = data?.rules ?? [];
  const eventMap = Object.fromEntries(
    (eventsData?.events ?? []).map((e) => [e.key, e.label]),
  );

  const handleToggle = useCallback(
    (rule: CrmAutomationRule) => {
      if (rule.isActive) {
        disableRule.mutate(rule.id, {
          onSuccess: () => toast.success("Automation disabled"),
          onError: (err) => toast.error(getErrorMessage(err)),
        });
      } else {
        enableRule.mutate(rule.id, {
          onSuccess: () => toast.success("Automation enabled"),
          onError: (err) => toast.error(getErrorMessage(err)),
        });
      }
    },
    [enableRule, disableRule],
  );

  const handleDeleteRequest = useCallback((id: number) => setDeleteTargetId(id), []);
  const handleDeleteCancel = useCallback(() => setDeleteTargetId(null), []);
  const handleAlertOpenChange = useCallback((open: boolean) => { if (!open) setDeleteTargetId(null); }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTargetId === null) return;
    deleteRule.mutate(deleteTargetId, {
      onSuccess: () => {
        toast.success("Automation deleted");
        setDeleteTargetId(null);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
        setDeleteTargetId(null);
      },
    });
  }, [deleteRule, deleteTargetId]);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleCreate = useCallback(() => router.push("/crm/settings/automations/new"), [router]);
  const handleOpenBuilder = useCallback((id: number) => router.push(`/crm/settings/automations/${id}`), [router]);
  const handleRowClick = useCallback((rule: CrmAutomationRule) => handleOpenBuilder(rule.id), [handleOpenBuilder]);
  const getRuleKey = useCallback((rule: CrmAutomationRule) => String(rule.id), []);

  const columns = buildColumns(eventMap, handleToggle, handleOpenBuilder, handleDeleteRequest);

  return (
    <>
      <AlertDialog open={deleteTargetId !== null} onOpenChange={handleAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Automation</AlertDialogTitle>
            <AlertDialogDescription>
              This automation will be permanently deleted and will no longer run on future triggers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
              disabled={deleteRule.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PageWrapper
        title="Automations"
        subtitle="Trigger actions automatically based on CRM events"
        actions={
          <Button onClick={handleCreate} className="text-xs px-3">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Automation
          </Button>
        }
      >
        {isError ? (
          <EmptyState
            title="Failed to load automations"
            description="Could not fetch automation rules."
            action={{ label: "Retry", onClick: handleRetry }}
            className={CONTENT_FILL_PANEL}
          />
        ) : rules.length === 0 && !isLoading ? (
          <EmptyState
            className={CONTENT_FILL_PANEL}
            illustration={<AutomationsIllustration />}
            title="No automations yet"
            description="Create your first automation to trigger actions on CRM events automatically."
            action={{ label: "New Automation", onClick: handleCreate }}
          />
        ) : (
          <DataTable
            data={rules}
            columns={columns}
            getRowKey={getRuleKey}
            onRowClick={handleRowClick}
            isLoading={isLoading}
            rowClassName={() => "cursor-pointer"}
            className="flex-1 min-h-0"
          />
        )}
      </PageWrapper>
    </>
  );
}
