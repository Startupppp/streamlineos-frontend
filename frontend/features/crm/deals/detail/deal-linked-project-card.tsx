"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { ProjectCombobox } from "@/components/ui/project-combobox";
import { useCan } from "@/hooks/api/access";
import { useProject } from "@/hooks/api/build/projects";
import { useDealLinkedProject, useLinkDealProject } from "@/hooks/api/crm/deal-project-link";
import { getErrorMessage } from "@/lib/get-error-message";

interface DealLinkedProjectCardProps {
  dealId: number;
}

/**
 * The Build project delivering this deal (`GET /deals/:id/linked-project`), and
 * a picker to link one (`POST /deals/:id/link-project`). Linking replaces any
 * earlier link server-side, so "Change project" uses the same call.
 */
export function DealLinkedProjectCard({ dealId }: DealLinkedProjectCardProps) {
  const canLink = useCan("crm:deals:update");
  const canSeeProjects = useCan("build:view");
  const linked = useDealLinkedProject(dealId);
  const projectId = linked.data?.projectId ?? 0;
  const project = useProject(projectId, { throwOnError: false });
  const link = useLinkDealProject(dealId);
  const [selected, setSelected] = useState("");
  const [changing, setChanging] = useState(false);

  function handleLink() {
    const id = Number(selected);
    if (!Number.isInteger(id) || id <= 0) return;
    link.mutate(id, {
      onSuccess: () => {
        toast.success("Project linked to deal");
        setSelected("");
        setChanging(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleStartChange() {
    setChanging(true);
  }
  function handleCancelChange() {
    setChanging(false);
    setSelected("");
  }

  if (linked.access.denied) return null;
  const canPick = canLink && canSeeProjects;
  if (!linked.isLoading && !linked.data && !canPick) return null;

  return (
    <Card className="shadow-noir">
      <CardHeader>
        <CardTitle className="text-base">Delivery project</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {linked.isLoading ? (
          <Skeleton className="h-5 w-40" />
        ) : linked.data ? (
          <div className="flex min-w-0 items-center justify-between gap-2">
            <Link href={`/build/${linked.data.projectId}`} className="group flex min-w-0 items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <FolderKanban className="h-3.5 w-3.5" />
              </span>
              <span className="truncate text-sm font-medium group-hover:text-primary">
                {project.data ? `${project.data.key} · ${project.data.name}` : "Open project"}
              </span>
            </Link>
            {canPick && !changing ? (
              <Button type="button" variant="ghost" size="sm" className="shrink-0 px-2 text-xs" onClick={handleStartChange}>
                Change project
              </Button>
            ) : null}
          </div>
        ) : null}
        {!linked.isLoading && canPick && (!linked.data || changing) ? (
          <div className="flex flex-col gap-2">
            <ProjectCombobox value={selected} onChange={setSelected} placeholder="Choose a project…" />
            <div className="flex gap-2">
              <LoadingButton
                type="button"
                size="sm"
                variant="outline"
                isPending={link.isPending}
                disabled={!selected}
                onClick={handleLink}
              >
                {linked.data ? "Link instead" : "Link project"}
              </LoadingButton>
              {changing ? (
                <Button type="button" size="sm" variant="ghost" onClick={handleCancelChange}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
