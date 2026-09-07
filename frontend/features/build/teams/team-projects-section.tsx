"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { PlusIcon, XIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  useTeamProjects,
  useAddTeamProject,
  useRemoveTeamProject,
} from "@/hooks/api/build/teams";
import { useProjects } from "@/hooks/api/build/projects";
import { useCan } from "@/hooks/api/access";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { EmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  PmPanel,
  PmSection,
  PM_ROW,
} from "@/components/pm-chrome/pm-chrome";
import { cn } from "@/lib/utils";
import type { TeamProject } from "@/hooks/api/build/teams";

function ProjectStatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ");
  return (
    <Badge variant="secondary" className="shrink-0 px-1.5 py-0.5 text-micro capitalize">
      {label}
    </Badge>
  );
}

interface AddProjectPickerProps {
  teamId: number;
  assignedProjectIds: number[];
  isPending: boolean;
  onAdd: (projectId: number) => void;
}

function AddProjectPicker({
  assignedProjectIds,
  isPending,
  onAdd,
}: AddProjectPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const { data } = useProjects({ limit: 100 });
  const allProjects = useMemo(() => data?.data ?? [], [data]);

  const options = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allProjects.filter((p) => {
      if (assignedProjectIds.includes(p.id)) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q)
      );
    });
  }, [allProjects, assignedProjectIds, search]);

  const selectedProject = useMemo(
    () => (selectedId !== null ? allProjects.find((p) => p.id === selectedId) : undefined),
    [allProjects, selectedId],
  );

  function handleSelect(idStr: string) {
    setSelectedId(Number(idStr));
    setOpen(false);
    setSearch("");
  }

  function handleAdd() {
    if (selectedId === null) return;
    onAdd(selectedId);
    setSelectedId(null);
  }

  function handleSearchChange(v: string) {
    setSearch(v);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ResponsivePopover open={open} onOpenChange={setOpen}>
        <ResponsivePopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            size="sm"
            className={cn(
              "h-8 min-w-[180px] justify-start gap-1.5 text-xs font-normal",
              !selectedProject && "text-muted-foreground",
            )}
          >
            {selectedProject ? (
              <>
                <span className="font-mono text-micro text-muted-foreground">
                  {selectedProject.key}
                </span>
                <span className="truncate">{selectedProject.name}</span>
              </>
            ) : (
              "Pick a project…"
            )}
          </Button>
        </ResponsivePopoverTrigger>
        <ResponsivePopoverContent title="Select project" className="w-72 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by name or key…"
              className="text-xs"
              value={search}
              onValueChange={handleSearchChange}
            />
            <CommandList className="max-h-52 overflow-y-auto scrollbar-hide">
              <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">
                No projects available.
              </CommandEmpty>
              <CommandGroup>
                {options.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={String(p.id)}
                    onSelect={handleSelect}
                    className="gap-2"
                  >
                    <span className="font-mono text-micro text-muted-foreground shrink-0">
                      {p.key}
                    </span>
                    <span className="truncate text-xs">{p.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </ResponsivePopoverContent>
      </ResponsivePopover>
      <LoadingButton
        size="sm"
        className="gap-1 text-xs"
        disabled={selectedId === null}
        isPending={isPending}
        loadingText="Adding…"
        onClick={handleAdd}
        {...hoverHandlers}
      >
        <PlusIcon ref={iconRef} size={12} /> Add
      </LoadingButton>
    </div>
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

  return (
    <>
      <PmSection index={2} className="space-y-3">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <p className="text-dense font-semibold uppercase tracking-wider text-muted-foreground">
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

        {isLoading ? (
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
        onOpenChange={(o) => { if (!o) handleRemoveCancel(); }}
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
