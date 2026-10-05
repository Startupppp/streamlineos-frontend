"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { XIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  useTeamProjects,
  useAddTeamProject,
  useRemoveTeamProject,
} from "@/hooks/api/build/teams";
import { useCan, useCanState } from "@/hooks/api/access";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  PmPanel,
  PmSection,
  PM_ROW,
} from "@/components/pm-chrome";
import type { TeamProject } from "@/hooks/api/build/teams";
import { AddProjectPicker } from "./add-project-picker";

function ProjectStatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ");
  return (
    <Badge variant="secondary" className="shrink-0 px-1.5 py-0.5 text-micro capitalize">
      {label}
    </Badge>
  );
}

interface RemoveProjectButtonProps {
  project: TeamProject;
  onRemove: (id: number) => void;
  isPending: boolean;
}

function RemoveProjectButton({
  project,
  onRemove,
  isPending,
}: RemoveProjectButtonProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleClick = useCallback(() => onRemove(project.id), [project.id, onRemove]);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="w-7 shrink-0"
      onClick={handleClick}
      disabled={isPending}
      aria-label={`Remove ${project.name} from team`}
      {...hoverHandlers}
    >
      <XIcon ref={iconRef} size={14} />
    </Button>
  );
}

interface TeamProjectsSectionProps {
  teamId: number;
}

export function TeamProjectsSection({ teamId }: TeamProjectsSectionProps) {
  const canManage = useCan("build:teams:manage");
  const canViewState = useCanState("build:teams:view");
  const [removeTarget, setRemoveTarget] = useState<TeamProject | null>(null);

  const { data: teamProjects = [], isLoading } = useTeamProjects(teamId);
  const addProject = useAddTeamProject(teamId);
  const removeProject = useRemoveTeamProject(teamId);

  const assignedIds = useMemo(() => teamProjects.map((p) => p.id), [teamProjects]);

  function handleAdd(projectId: number) {
    addProject.mutate(projectId, {
      onSuccess: () => toast.success("Project added to team"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleRemoveRequest(id: number) {
    const target = teamProjects.find((p) => p.id === id);
    if (target) setRemoveTarget(target);
  }

  function handleRemoveConfirm() {
    if (!removeTarget) return;
    removeProject.mutate(removeTarget.id, {
      onSuccess: () => {
        toast.success(`${removeTarget.name} removed from team`);
        setRemoveTarget(null);
      },
      onError: (e) => {
        toast.error(getErrorMessage(e));
        setRemoveTarget(null);
      },
    });
  }

  function handleRemoveCancel() {
    setRemoveTarget(null);
  }

  function handleRemoveConfirmOpenChange(open: boolean) {
    if (!open) handleRemoveCancel();
  }

  if (canViewState === "denied") return null;

  const effectiveLoading = isLoading || canViewState === "loading";

  return (
    <>
      <PmSection index={2} className="space-y-3">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <p className="text-dense font-medium uppercase tracking-wider text-muted-foreground">
            Projects{teamProjects.length > 0 ? ` (${teamProjects.length})` : ""}
          </p>
          {canManage ? (
            <AddProjectPicker
              teamId={teamId}
              assignedProjectIds={assignedIds}
              isPending={addProject.isPending}
              onAdd={handleAdd}
            />
          ) : null}
        </div>

        {effectiveLoading ? (
          <PmPanel className="space-y-2 p-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </PmPanel>
        ) : teamProjects.length === 0 ? (
          <PmPanel className="flex items-center justify-center p-4">
            <EmptyState
              illustrationPreset="projects"
              title="No projects yet"
              description="Add projects to this team so members get access."
              compact
            />
          </PmPanel>
        ) : (
          <PmPanel>
            {teamProjects.map((project) => (
              <div key={project.id} className={PM_ROW}>
                <span className="font-mono text-micro text-muted-foreground shrink-0">
                  {project.key}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {project.name}
                </span>
                <ProjectStatusBadge status={project.status} />
                {canManage ? (
                  <RemoveProjectButton
                    project={project}
                    onRemove={handleRemoveRequest}
                    isPending={removeProject.isPending}
                  />
                ) : null}
              </div>
            ))}
          </PmPanel>
        )}
      </PmSection>

      <ConfirmDialog
        open={removeTarget !== null}
        onOpenChange={handleRemoveConfirmOpenChange}
        title={`Remove "${removeTarget?.name ?? ""}"?`}
        description="This will remove the project from the team. Team members will lose the access they gained through this team."
        confirmLabel="Remove"
        destructive
        isPending={removeProject.isPending}
        onConfirm={handleRemoveConfirm}
      />
    </>
  );
}
