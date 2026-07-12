"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, MoreHorizontal, Play, Pause, Trash2, History } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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

const listVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18 } },
};

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
          <Button onClick={handleCreate} className="h-8 text-xs px-3">
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
          />
        ) : isLoading ? (
          <AutomationsSkeleton />
        ) : rules.length === 0 ? (
          <EmptyState
            className="min-h-[50vh] border-0 bg-transparent"
            illustration={<AutomationsIllustration />}
            title="No automations yet"
            description="Create your first automation to trigger actions on CRM events automatically."
            action={{ label: "New Automation", onClick: handleCreate }}
          />
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Trigger</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden md:table-cell">Runs</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden lg:table-cell">Last Run</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Status</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <AnimatePresence>
                <motion.tbody
                  className="divide-y divide-border"
                  variants={listVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {rules.map((rule) => (
                    <AutomationRow
                      key={rule.id}
                      rule={rule}
                      eventLabel={eventMap[rule.trigger] ?? rule.trigger}
                      onToggle={handleToggle}
                      onEdit={handleOpenBuilder}
                      onDeleteRequest={handleDeleteRequest}
                    />
                  ))}
                </motion.tbody>
              </AnimatePresence>
            </table>
          </div>
        )}
      </PageWrapper>
    </>
  );
}

interface RowProps {
  rule: CrmAutomationRule;
  eventLabel: string;
  onToggle: (rule: CrmAutomationRule) => void;
  onEdit: (id: number) => void;
  onDeleteRequest: (id: number) => void;
}

function AutomationRow({ rule, eventLabel, onToggle, onEdit, onDeleteRequest }: RowProps) {
  const handleToggle = useCallback(() => onToggle(rule), [onToggle, rule]);
  const handleEdit = useCallback(() => onEdit(rule.id), [onEdit, rule.id]);
  const handleDelete = useCallback(() => onDeleteRequest(rule.id), [onDeleteRequest, rule.id]);

  return (
    <motion.tr
      variants={itemVariants}
      className="hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={handleEdit}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{rule.name}</span>
          {rule.isDraft && (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-amber-600 border-amber-300">
              Draft
            </Badge>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">v{rule.version}</div>
      </td>
      <td className="px-4 py-3">
        <span className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
          "bg-blue-50 text-blue-700 border border-blue-200",
        )}>
          {eventLabel}
        </span>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-xs text-muted-foreground">{rule.executionCount}</span>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="text-xs text-muted-foreground">
          {rule.lastRunAt
            ? new Date(rule.lastRunAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
            : "—"
          }
        </span>
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <Switch
          checked={rule.isActive}
          onCheckedChange={handleToggle}
          aria-label={rule.isActive ? "Disable automation" : "Enable automation"}
        />
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
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
            <DropdownMenuItem onClick={handleToggle}>
              {rule.isActive ? (
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
      </td>
    </motion.tr>
  );
}

function AutomationsSkeleton() {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-4 py-2.5 text-left"><Skeleton className="h-3 w-20" /></th>
            <th className="px-4 py-2.5 text-left"><Skeleton className="h-3 w-16" /></th>
            <th className="px-4 py-2.5 text-left hidden md:table-cell"><Skeleton className="h-3 w-10" /></th>
            <th className="px-4 py-2.5 text-left hidden lg:table-cell"><Skeleton className="h-3 w-14" /></th>
            <th className="px-4 py-2.5 text-left"><Skeleton className="h-3 w-12" /></th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <tr key={i}>
              <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
              <td className="px-4 py-3"><Skeleton className="h-5 w-24 rounded-full" /></td>
              <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-8" /></td>
              <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-20" /></td>
              <td className="px-4 py-3"><Skeleton className="h-5 w-9 rounded-full" /></td>
              <td className="px-4 py-3"><Skeleton className="h-6 w-6 rounded" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
