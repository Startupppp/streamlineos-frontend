"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useManagedProductProjects, type LinkedProjectRow } from "@/hooks/api/build/managed-product-projects";
import { useRouteFeedbucketToIntake } from "@/hooks/api/build/intake-mutations";

type RouteMutation = ReturnType<typeof useRouteFeedbucketToIntake>;

export interface IntakeRouteSubmission {
  id: number;
  message: string;
  widget?: { projectId?: number | null; defaultProjectId?: number | null } | null;
}

function routeSubmission(
  mutation: RouteMutation,
  input: { submissionId: number; projectId: number; projectChosen?: boolean },
  onDone?: () => void,
) {
  mutation.mutate(input, {
    onSuccess: (result) => {
      toast.success(result.created ? "Routed to Intake" : "Already in Intake");
      onDone?.();
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}

export function useRouteToIntake() {
  const mutation = useRouteFeedbucketToIntake();
  const [target, setTarget] = useState<IntakeRouteSubmission | null>(null);

  const handleRouteToIntake = useCallback(
    (row: IntakeRouteSubmission) => {
      const projectId = row.widget?.projectId ?? row.widget?.defaultProjectId;
      if (projectId) {
        routeSubmission(mutation, { submissionId: row.id, projectId });
        return;
      }
      setTarget(row);
    },
    [mutation],
  );

  const handleTargetOpenChange = useCallback((open: boolean) => {
    if (!open) setTarget(null);
  }, []);

  return { mutation, target, handleRouteToIntake, handleTargetOpenChange };
}

interface ProjectOptionProps {
  project: LinkedProjectRow;
  selected: boolean;
  onSelect: (id: number) => void;
}

function ProjectOption({ project, selected, onSelect }: ProjectOptionProps) {
  const handleClick = useCallback(() => onSelect(project.id), [onSelect, project.id]);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={handleClick}
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors",
        selected ? "border-primary bg-primary/5 text-foreground" : "border-border hover:bg-muted",
      )}
    >
      <span className="line-clamp-1">{project.name}</span>
      <span className="font-mono text-xs text-muted-foreground">{project.key}</span>
    </button>
  );
}

interface RouteToIntakeDialogProps {
  managedProductId: number;
  submission: IntakeRouteSubmission;
  mutation: RouteMutation;
  onOpenChange: (open: boolean) => void;
}

export function RouteToIntakeDialog({
  managedProductId,
  submission,
  mutation,
  onOpenChange,
}: RouteToIntakeDialogProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data, isLoading } = useManagedProductProjects({ managedProductId, limit: 100 });
  const projects = useMemo(() => data?.data ?? [], [data]);

  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);
  const handleConfirm = useCallback(() => {
    if (selectedId === null) return;
    routeSubmission(
      mutation,
      { submissionId: submission.id, projectId: selectedId, projectChosen: true },
      handleClose,
    );
  }, [handleClose, mutation, selectedId, submission.id]);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Route to Intake</DialogTitle>
          <DialogDescription>
            This feedback was captured on the product. Choose the linked project whose Intake queue should triage it.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-3">
        <p className="line-clamp-3 text-pretty rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground">{submission.message}</p>
        <div role="radiogroup" aria-label="Project" className="flex max-h-64 flex-col gap-1 overflow-y-auto">
          {isLoading ? (
            <p className="py-2 text-sm text-muted-foreground">Loading projects…</p>
          ) : projects.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              No projects are linked to this product yet.{" "}
              <Link
                href={`/build/managed-products/${managedProductId}/projects`}
                className="text-primary hover:underline"
              >
                Link a project
              </Link>
            </p>
          ) : (
            projects.map((project) => (
              <ProjectOption
                key={project.id}
                project={project}
                selected={selectedId === project.id}
                onSelect={setSelectedId}
              />
            ))
          )}
        </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <LoadingButton
            type="button"
            disabled={selectedId === null}
            isPending={mutation.isPending}
            onClick={handleConfirm}
          >
            Route
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
