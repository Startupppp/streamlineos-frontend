"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
 * a picker to link one (`POST /deals/:id/link-project`).
 *
 * Linking is offered only while nothing is linked: the backend stamps the deal
 * on the chosen project without clearing a previous one, so a "change" would
 * leave two projects claiming the deal.
 */
export function DealLinkedProjectCard({ dealId }: DealLinkedProjectCardProps) {
  const canLink = useCan("crm:deals:update");
  const canSeeProjects = useCan("build:view");
  const linked = useDealLinkedProject(dealId);
  const projectId = linked.data?.projectId ?? 0;
  const project = useProject(projectId, { throwOnError: false });
  const link = useLinkDealProject(dealId);
  const [selected, setSelected] = useState("");

  function handleLink() {
    const id = Number(selected);
    if (!Number.isInteger(id) || id <= 0) return;
    link.mutate(id, {
      onSuccess: () => {
        toast.success("Project linked to deal");
        setSelected("");
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
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
          <Link href={`/build/${linked.data.projectId}`} className="group flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FolderKanban className="h-3.5 w-3.5" />
            </span>
            <span className="truncate text-sm font-medium group-hover:text-primary">
              {project.data ? `${project.data.key} · ${project.data.name}` : "Open project"}
            </span>
          </Link>
        ) : (
          <div className="flex flex-col gap-2">
            <ProjectCombobox value={selected} onChange={setSelected} placeholder="Choose a project…" />
            <LoadingButton
              type="button"
              size="sm"
              variant="outline"
              isPending={link.isPending}
              disabled={!selected}
              onClick={handleLink}
            >
              Link project
            </LoadingButton>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
