"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import { Variable, Trash2, Link2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
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
import {
  useGlobalVariables,
  useDeleteGlobalVariable,
  type WorkflowVariable,
} from "@/hooks/api/workflows";

const VALUE_TYPE_CLASS: Record<string, string> = {
  string: "bg-blue-50 text-blue-700 border-blue-200",
  number: "bg-purple-50 text-purple-700 border-purple-200",
  boolean: "bg-green-50 text-green-700 border-green-200",
  object: "bg-amber-50 text-amber-700 border-amber-200",
  array: "bg-orange-50 text-orange-700 border-orange-200",
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

  const badgeClass = VALUE_TYPE_CLASS[variable.valueType] ?? "bg-slate-100 text-slate-600 border-slate-200";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.22, ease: "easeOut", delay: index * 0.04 }}
    >
      <Card className="bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
              <Variable className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-sm font-semibold font-mono text-foreground">{variable.key}</code>
                <Badge variant="outline" className={`text-[10px] border ${badgeClass}`}>
                  {variable.valueType}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <Link
                  href={`/workflows/${variable.workflowId}`}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-violet-600 transition-colors"
                >
                  <Link2 className="h-3 w-3" />
                  {variable.workflowName}
                </Link>
                <span className="text-[11px] text-muted-foreground">
                  Added {format(new Date(variable.createdAt), "MMM d, yyyy")}
                </span>
              </div>
              {variable.defaultValue !== null && variable.defaultValue !== undefined && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Default: <code className="font-mono">{JSON.stringify(variable.defaultValue)}</code>
                </p>
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
              onClick={handleDelete}
              aria-label="Delete variable"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function VariablesManagerPage() {
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
        <LoadingState variant="list" rows={5} />
      ) : isError ? (
        <ErrorState title="Failed to load variables" onRetry={handleRetry} className="flex-1" />
      ) : list.length === 0 ? (
        <div className="flex flex-1 min-h-[60vh]">
          <EmptyState
            illustration={<Variable className="h-12 w-12 text-muted-foreground/40" />}
            title="No variables defined"
            description="Variables are defined in the workflow builder when creating or editing workflow versions."
            action={{ label: "Go to Workflows", href: "/workflows" }}
            className="w-full"
          />
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
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
