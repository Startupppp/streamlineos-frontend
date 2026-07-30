"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2Icon, LinkIcon } from "@animateicons/react/lucide";
import { useProjects, useLinkProjectToProduct } from "@/hooks/api/build";
import { useCan } from "@/hooks/api/access";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

interface Props {
  managedProductId: number;
}

export function LinkedProjectsSection({ managedProductId }: Props) {
  const canUpdate = useCan("build:managed-products:update");
  const canViewProjects = useCan("build:view");

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const { data: projectsRes, isLoading } = useProjects(
    { limit: 100, status: "ALL" },
    { enabled: canViewProjects },
  );

  const linkProject = useLinkProjectToProduct();

  const allProjects = useMemo(() => projectsRes?.data ?? [], [projectsRes]);

  const linkedProjects = useMemo(
    () => allProjects.filter((p) => (p.managedProductId ?? null) === managedProductId),
    [allProjects, managedProductId],
  );

  const linkableProjects = useMemo(
    () => allProjects.filter((p) => (p.managedProductId ?? null) !== managedProductId),
    [allProjects, managedProductId],
  );

  function handleLink() {
    const pid = Number(selectedProjectId);
    if (!pid) return;
    linkProject.mutate(
      { projectId: pid, managedProductId },
      {
        onSuccess: () => {
          toast.success("Project linked to this product");
          setSelectedProjectId("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleUnlink(projectId: number) {
    linkProject.mutate(
      { projectId, managedProductId: null },
      {
        onSuccess: () => toast.success("Project unlinked"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  const { iconRef: linkIconRef, hoverHandlers: linkHoverHandlers } = useAnimatedIcon();

  function handleSelectChange(value: string) {
    setSelectedProjectId(value);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Linked Projects</p>
          <p className="text-xs text-muted-foreground">
            Delivery projects that implement this managed product (strategy)
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] text-muted-foreground">
          Delivery
        </Badge>
      </div>

      {canUpdate ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2">
          <Select value={selectedProjectId} onValueChange={handleSelectChange}>
            <SelectTrigger className="flex-1 text-xs">
              <SelectValue placeholder="Select a project to link…" />
            </SelectTrigger>
            <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
              {linkableProjects.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-muted-foreground">{p.key}</span>
                    <span>{p.name}</span>
                  </span>
                </SelectItem>
              ))}
              {linkableProjects.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  No projects available to link
                </div>
              )}
            </SelectContent>
          </Select>
          <LoadingButton
            size="sm"
            className="gap-1 text-xs"
            isPending={linkProject.isPending}
            loadingText="Linking…"
            disabled={!selectedProjectId}
            onClick={handleLink}
            {...linkHoverHandlers}
          >
            <LinkIcon ref={linkIconRef} className="size-3.5" aria-hidden />
            Link
          </LoadingButton>
        </div>
      ) : null}

      <div className="min-h-0">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-md" />
            ))}
          </div>
        ) : linkedProjects.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No projects linked yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {linkedProjects.map((p) => (
              <li key={p.id} className="flex items-center gap-2 py-2">
                <Badge
                  variant="outline"
                  className={cn("px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground")}
                >
                  {p.key}
                </Badge>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{p.name}</span>
                {p.status ? (
                  <Badge variant="outline" className="px-1.5 py-0.5 text-[10px] capitalize">
                    {p.status.toLowerCase().replace("_", " ")}
                  </Badge>
                ) : null}
                {canUpdate ? (
                  <AnimatedIconButton
                    icon={Trash2Icon}
                    variant="ghost"
                    size="icon"
                    className="w-7 text-muted-foreground hover:text-destructive"
                    aria-label={`Unlink ${p.name}`}
                    onClick={() => handleUnlink(p.id)}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
