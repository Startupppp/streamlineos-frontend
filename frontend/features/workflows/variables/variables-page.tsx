"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import { Variable, Link2 } from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { motion, AnimatePresence } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import {
  useGlobalVariables,
  useDeleteGlobalVariable,
  type WorkflowVariable,
} from "@/hooks/api/workflows";

// A value's type is a taxonomy — an array is not a warning. `object` and
// `array` sit next to each other in the same list and read as one chip.
const VALUE_TYPE_CLASS: Record<string, string> = {
  string: "bg-primary/10 text-foreground border-primary/30",
  number: "bg-category-blue-surface text-category-blue-ink border-category-blue-rule",
  boolean: "bg-category-green-surface text-category-green-ink border-category-green-rule",
  object: "bg-category-amber-surface text-category-amber-ink border-category-amber-rule",
  array: "bg-category-orange-surface text-category-orange-ink border-category-orange-rule",
};

interface VariableCardProps {
  variable: WorkflowVariable;
  index: number;
  onDelete: (v: WorkflowVariable) => void;
}

function VariableCard({ variable, index, onDelete }: VariableCardProps) {
  function handleDelete() {
    onDelete(variable);
  }

  const badgeClass = VALUE_TYPE_CLASS[variable.valueType] ?? "bg-muted text-muted-foreground border-border";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.22, ease: "easeOut", delay: index * 0.04 }}
    >
      <Card className="bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Variable className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-sm font-semibold font-mono text-foreground">{variable.key}</code>
                <Badge variant="outline" className={`text-micro border ${badgeClass}`}>
                  {variable.valueType}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <Link
                  href={`/workflows/${variable.workflowId}`}
                  className="inline-flex items-center gap-1 text-dense text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Link2 className="h-3 w-3" />
                  {variable.workflowName}
                </Link>
                <span className="text-dense text-muted-foreground">
                  Added {format(new Date(variable.createdAt), "MMM d, yyyy")}
                </span>
              </div>
              {variable.defaultValue !== null && variable.defaultValue !== undefined && (
                <p className="text-dense text-muted-foreground mt-0.5">
                  Default: <code className="font-mono">{JSON.stringify(variable.defaultValue)}</code>
                </p>
              )}
            </div>
            <AnimatedIconButton
              icon={Trash2Icon}
              iconSize={14}
              size="icon"
              variant="ghost"
              className="w-8 text-destructive hover:text-destructive shrink-0"
              onClick={handleDelete}
              aria-label="Delete variable"
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function VariablesPage() {
  const { data: variables, isLoading, isError, refetch } = useGlobalVariables();
  const deleteVariable = useDeleteGlobalVariable();
  const [deleteTarget, setDeleteTarget] = useState<WorkflowVariable | null>(null);

  function handleDeleteTarget(variable: WorkflowVariable) {
    setDeleteTarget(variable);
  }

  function handleDeleteDialogChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    deleteVariable.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Variable deleted");
        setDeleteTarget(null);
      },
      onError: () => toast.error("Failed to delete variable"),
    });
  }

  function handleRetry() {
    void refetch();
  }

  const list = variables ?? [];

  return (
    <PageWrapper
      title="Variables Manager"
      subtitle="View and manage variables defined across your workflow versions"
    >
      {isLoading ? (
        <LoadingState variant="list" rows={12} />
      ) : isError ? (
        <ErrorState title="Failed to load variables" onRetry={handleRetry} className={CONTENT_FILL_PANEL} />
      ) : list.length === 0 ? (
        <EmptyState
          illustrationPreset="settings"
          title="No variables defined"
          description="Variables are defined in the workflow builder when creating or editing workflow versions."
          action={{ label: "Go to Workflows", href: "/workflows" }}
          className={CONTENT_FILL_PANEL}
        />
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="flex flex-1 min-h-0 flex-col gap-3">
            {list.map((variable, idx) => (
              <VariableCard
                key={variable.id}
                variable={variable}
                index={idx}
                onDelete={handleDeleteTarget}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete variable?</AlertDialogTitle>
            <AlertDialogDescription>
              <code className="text-xs font-mono">{deleteTarget?.key}</code> will be permanently
              removed from workflow version{" "}
              <span className="font-medium">{deleteTarget?.workflowName}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
