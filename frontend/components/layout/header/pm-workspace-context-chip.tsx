"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Boxes, ChevronDown } from "lucide-react";
import { usePmWorkspaces } from "@/hooks/api/build/pm-workspaces";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  parsePmWorkspaceIdFromPath,
  withPmWorkspacePath,
} from "@/lib/build/pm-workspace-path";
import { cn } from "@/lib/utils";

interface PmWorkspaceContextChipProps {
  className?: string;
}

export function PmWorkspaceContextChip({ className }: PmWorkspaceContextChipProps) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const searchParams = useSearchParams();
  const isProductManagementRoute =
    pathname.startsWith("/build") || pathname.startsWith("/product-management");

  const { data } = usePmWorkspaces({
    limit: 20,
  });

  if (!isProductManagementRoute) return null;

  const workspaces = data?.data ?? [];
  const pathWorkspaceId = parsePmWorkspaceIdFromPath(pathname);
  const pathWorkspace = pathWorkspaceId
    ? workspaces.find((workspace) => workspace.pmWorkspaceId === pathWorkspaceId)
    : undefined;
  const defaultWorkspace =
    workspaces.find((workspace) => workspace.isDefault) ?? workspaces[0];
  const activeWorkspace = pathWorkspace ?? defaultWorkspace;
  const label = activeWorkspace?.name ?? "PM Workspace";

  function handleWorkspaceSelect(pmWorkspaceId: string) {
    if (pmWorkspaceId === activeWorkspace?.pmWorkspaceId) return;
    const search = searchParams.toString();
    const next = withPmWorkspacePath(pathname, search, pmWorkspaceId);
    router.push(next);
  }

  if (workspaces.length <= 1) {
    return (
      <div
        className={cn(
          "hidden lg:flex items-center gap-1.5 max-w-[11rem] rounded-md border border-sidebar-border bg-sidebar-accent/40 px-2 py-1 text-sidebar-foreground/80",
          className,
        )}
        title={`PM Workspace: ${label}`}
      >
        <Boxes className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate text-dense font-medium">{label}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "hidden lg:flex items-center gap-1 max-w-[12rem] rounded-md border border-sidebar-border bg-sidebar-accent/40 px-2 py-1 text-sidebar-foreground/80 hover:bg-sidebar-accent/60 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        aria-label={`PM Workspace: ${label}. Switch workspace.`}
      >
        <Boxes className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate text-dense font-medium">{label}</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[10rem]">
        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.pmWorkspaceId}
            className="text-xs"
            disabled={workspace.pmWorkspaceId === activeWorkspace?.pmWorkspaceId}
            onSelect={() => handleWorkspaceSelect(workspace.pmWorkspaceId)}
          >
            {workspace.name}
            {workspace.isDefault ? (
              <span className="ml-auto text-micro text-muted-foreground">Default</span>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
