"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon, XIcon, EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import Link from "next/link";
import {
  usePortfolio,
  useUpdatePortfolio,
  useDeletePortfolio,
  useLinkPortfolioProject,
  useUnlinkPortfolioProject,
  useProjects,
} from "@/hooks/api/build";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PortfolioStatusBadge, PortfolioHealthBadge } from "./portfolio-status-badge";
import { PortfolioFormSheet } from "./portfolio-form-sheet";
import type { UpdatePortfolioInput } from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_PANEL,
  PM_ROW,
} from "@/features/build/shared/pm-chrome";
import { TEXT_ONE_LINE, TEXT_BODY } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";

function UnlinkProjectButton({
  projectName,
  projectId,
  isPending,
  onUnlink,
}: {
  projectName: string;
  projectId: number;
  isPending: boolean;
  onUnlink: (id: number) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  function handleClick() {
    onUnlink(projectId);
  }
  return (
    <Button
      variant="ghost"
      size="icon"
      className="w-7 shrink-0"
      onClick={handleClick}
      disabled={isPending}
      aria-label={`Unlink ${projectName}`}
      {...hoverHandlers}
    >
      <XIcon ref={iconRef} size={14} />
    </Button>
  );
}

function LinkProjectButton({
  disabled,
  isPending,
  onClick,
}: {
  disabled: boolean;
  isPending: boolean;
  onClick: () => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <LoadingButton
      size="sm"
      className="gap-1 text-xs"
      onClick={onClick}
      disabled={disabled}
      isPending={isPending}
      loadingText="Linking…"
      {...hoverHandlers}
    >
      <PlusIcon ref={iconRef} size={12} /> Link
    </LoadingButton>
  );
}

function PortfolioActionsButton() {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button variant="outline" size="sm" className="gap-1.5 text-xs" {...hoverHandlers}>
      <EllipsisIcon ref={iconRef} size={14} /> Actions
    </Button>
  );
}

interface Props {
  portfolioId: number;
}

function DetailSkeleton() {
  return (
    <PmPageShell>
      <div className={cn(PM_PANEL, "space-y-3 p-4")}>
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className={cn(PM_PANEL, "space-y-2 p-2")}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    </PmPageShell>
  );
}

export function PortfolioDetailPage({ portfolioId }: Props) {
  const canManage = useCan("build:portfolios:manage");
  const router = useRouter();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [linkProjectId, setLinkProjectId] = useState("");

  const { data, isLoading, isError, refetch } = usePortfolio(portfolioId);
  const { data: allProjectsRes } = useProjects({ limit: 200 });
  const { data: membersRes } = useOrgMembers(1, 100);
  const members = useMemo(() => membersRes?.data ?? [], [membersRes]);

  const updatePortfolio = useUpdatePortfolio();
  const deletePortfolio = useDeletePortfolio();
  const linkProject = useLinkPortfolioProject(portfolioId);
  const unlinkProject = useUnlinkPortfolioProject(portfolioId);

  function memberName(userId: string | null): string {
    if (!userId) return "—";
    const m = members.find((x) => x.userId === userId);
    return m?.name ?? m?.email ?? "Unknown";
  }

  const linkedIds = useMemo(
    () => new Set((data?.projects ?? []).map((p) => p.id)),
    [data?.projects],
  );
  const availableProjects = useMemo(
    () => (allProjectsRes?.data ?? []).filter((p) => !linkedIds.has(p.id)),
    [allProjectsRes?.data, linkedIds],
  );

  function handleEdit(input: UpdatePortfolioInput & { id: number }) {
    updatePortfolio.mutate(input, {
      onSuccess: () => {
        toast.success("Portfolio updated");
        setEditOpen(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleDeleteConfirm() {
    deletePortfolio.mutate(portfolioId, {
      onSuccess: () => {
        toast.success("Portfolio deleted");
        router.push("/build/portfolios");
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleLink() {
    if (!linkProjectId) return;
    linkProject.mutate(parseInt(linkProjectId, 10), {
      onSuccess: () => {
        toast.success("Project linked");
        setLinkProjectId("");
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleUnlink(projectId: number) {
    unlinkProject.mutate(projectId, {
      onSuccess: () => toast.success("Project unlinked"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleOpenEdit() {
    setEditOpen(true);
  }

  function handleOpenDelete() {
    setDeleteOpen(true);
  }

  function handleRetry() {
    void refetch();
  }

  function handleUnlinkClick(projectId: number) {
    handleUnlink(projectId);
  }

  if (isLoading) {
    return (
      <PageWrapper title="Portfolio" backHref="/build/portfolios">
        <DetailSkeleton />
      </PageWrapper>
    );
  }

  if (isError || !data) {
    return (
      <PageWrapper title="Portfolio" backHref="/build/portfolios">
        <PmPageShell withGlow={false}>
          <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
            <ErrorState className="flex-1" onRetry={handleRetry} />
          </PmSection>
        </PmPageShell>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={data.name}
      backHref="/build/portfolios"
      actions={
        canManage ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <PortfolioActionsButton />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleOpenEdit}>Edit Portfolio</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={handleOpenDelete}>
                Delete Portfolio
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : undefined
      }
    >
      <PmPageShell>
        <PmSection index={0}>
          <PmPanel className="space-y-4 p-4">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <PortfolioStatusBadge status={data.status} />
              <PortfolioHealthBadge health={data.health} />
              <span className="text-sm text-muted-foreground">
                Owner:{" "}
                <span className="text-foreground">{memberName(data.ownerId)}</span>
              </span>
            </div>

            {data.strategicGoal ? (
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Strategic Goal
                </p>
                <p className={cn(TEXT_BODY, "text-sm text-foreground")}>{data.strategicGoal}</p>
              </div>
            ) : null}

            {data.description ? (
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Description
                </p>
                <p className={cn(TEXT_BODY, "text-sm text-muted-foreground")}>{data.description}</p>
              </div>
            ) : null}
          </PmPanel>
        </PmSection>

        <PmSection index={1} className="space-y-3">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Linked Projects
              {data.projects.length > 0 ? ` (${data.projects.length})` : ""}
            </p>
            {canManage && availableProjects.length > 0 ? (
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Select value={linkProjectId} onValueChange={setLinkProjectId}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Link a project…" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProjects.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <LinkProjectButton
                  disabled={!linkProjectId}
                  isPending={linkProject.isPending}
                  onClick={handleLink}
                />
              </div>
            ) : null}
          </div>

          {data.projects.length === 0 ? (
            <PmPanel className="flex items-center justify-center p-4">
              <EmptyState
                illustrationPreset="projects"
                title="No linked projects"
                description="Link projects to this portfolio to track them here."
                compact
              />
            </PmPanel>
          ) : (
            <PmPanel>
              {data.projects.map((proj) => (
                <div key={proj.id} className={PM_ROW}>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {proj.key}
                  </span>
                  <Link
                    href={`/build/${proj.id}`}
                    className={cn(
                      TEXT_ONE_LINE,
                      "flex-1 text-sm font-medium text-foreground hover:text-primary",
                    )}
                    title={proj.name}
                  >
                    {proj.name}
                  </Link>
                  <Badge variant="outline" className="shrink-0 px-1.5 py-0.5 text-[10px]">
                    {proj.status}
                  </Badge>
                  {canManage ? (
                    <UnlinkProjectButton
                      projectName={proj.name}
                      projectId={proj.id}
                      isPending={unlinkProject.isPending}
                      onUnlink={handleUnlinkClick}
                    />
                  ) : null}
                </div>
              ))}
            </PmPanel>
          )}
        </PmSection>
      </PmPageShell>

      <PortfolioFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        defaultValues={data}
        onSubmitCreate={() => undefined}
        onSubmitEdit={handleEdit}
        isPending={updatePortfolio.isPending}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{data.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Projects will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={handleDeleteConfirm}
            >
              {deletePortfolio.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
