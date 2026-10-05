"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  useDeletePortfolio,
  useLinkPortfolioProject,
  usePortfolio,
  useUnlinkPortfolioProject,
  useUpdatePortfolio,
} from "@/hooks/api/build/portfolios";
import { useProjects } from "@/hooks/api/build/projects";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useBuildCursorPager } from "@/features/build/shared/use-build-cursor-pager";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PortfolioStatusBadge,
  PortfolioHealthBadge,
} from "./portfolio-status-badge";
import { PortfolioFormSheet } from "./portfolio-form-sheet";
import type { UpdatePortfolioInput } from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  PmPageShell,
  PmPanel,
  PmSection,
} from "@/components/pm-chrome";
import { TEXT_BODY } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
import {
  PortfolioActionsButton,
  DetailSkeleton,
} from "./portfolio-detail-helpers";
import { PortfolioLinkedProjectsSection } from "./portfolio-linked-projects-section";
import { PortfolioLinkedProgramsSection } from "./portfolio-linked-programs-section";

type Props = { portfolioId: number };

function PortfolioDetailContent({ portfolioId }: Props) {
  const canManage = useCan("build:portfolios:manage");
  const router = useRouter();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [linkProjectId, setLinkProjectId] = useState("");

  const projectsPager = useBuildCursorPager();
  const programsPager = useBuildCursorPager();
  const { data, isLoading, isError, error, refetch } = usePortfolio(
    portfolioId,
    {
      projectsCursor: projectsPager.cursor,
      programsCursor: programsPager.cursor,
    },
  );

  const linkedProjects = useMemo(
    () => data?.projects.data ?? [],
    [data?.projects.data],
  );
  const linkedPrograms = useMemo(
    () => data?.programs.data ?? [],
    [data?.programs.data],
  );

  const resolution = usePageState({
    permission: "build:portfolios:view",
    isLoading,
    isError,
    error,
    isEmpty: data === undefined,
  });
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
    () => new Set(linkedProjects.map((p) => p.id)),
    [linkedProjects],
  );
  const availableProjects = useMemo(
    () => (allProjectsRes?.data ?? []).filter((p) => !linkedIds.has(p.id)),
    [allProjectsRes?.data, linkedIds],
  );

  function handleEdit(input: UpdatePortfolioInput & { portfolioId: number }) {
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
        projectsPager.reset();
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleUnlink(projectId: number) {
    unlinkProject.mutate(projectId, {
      onSuccess: () => {
        toast.success("Project unlinked");
        projectsPager.reset();
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleRetry() {
    void refetch();
  }
  function handleProjectsNext() {
    projectsPager.goNext(data?.projects.pagination.nextCursor);
  }
  function handleProgramsNext() {
    programsPager.goNext(data?.programs.pagination.nextCursor);
  }
  function handleNoopCreate() {
    return undefined;
  }

  if (resolution.kind === "loading") {
    return (
      <PageWrapper title="Portfolio" backHref="/build/portfolios">
        <DetailSkeleton />
      </PageWrapper>
    );
  }

  if (resolution.kind !== "ready" || !data) {
    return (
      <PageWrapper title="Portfolio" backHref="/build/portfolios">
        <PmPageShell>
          <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
            <PageState
              resolution={resolution}
              loading={<DetailSkeleton />}
              onRetry={handleRetry}
            >
              {null}
            </PageState>
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
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                Edit Portfolio
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
              >
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
                <span className="text-foreground">
                  {memberName(data.ownerId)}
                </span>
              </span>
            </div>
            {data.strategicGoal ? (
              <div>
                <p className="mb-1 text-dense font-medium uppercase tracking-wider text-muted-foreground">
                  Strategic Goal
                </p>
                <p className={cn(TEXT_BODY, "text-sm text-foreground")}>
                  {data.strategicGoal}
                </p>
              </div>
            ) : null}
            {data.description ? (
              <div>
                <p className="mb-1 text-dense font-medium uppercase tracking-wider text-muted-foreground">
                  Description
                </p>
                <p className={cn(TEXT_BODY, "text-sm text-muted-foreground")}>
                  {data.description}
                </p>
              </div>
            ) : null}
          </PmPanel>
        </PmSection>

        <PortfolioLinkedProjectsSection
          linkedProjects={linkedProjects}
          canManage={canManage}
          availableProjects={availableProjects}
          linkProjectId={linkProjectId}
          onLinkProjectIdChange={setLinkProjectId}
          isLinkPending={linkProject.isPending}
          isUnlinkPending={unlinkProject.isPending}
          onLink={handleLink}
          onUnlink={handleUnlink}
          hasMore={data.projects.pagination.hasMore}
          pager={projectsPager}
          onNext={handleProjectsNext}
        />

        <PortfolioLinkedProgramsSection
          linkedPrograms={linkedPrograms}
          hasMore={data.programs.pagination.hasMore}
          pager={programsPager}
          onNext={handleProgramsNext}
        />
      </PmPageShell>

      <PortfolioFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        defaultValues={data}
        onSubmitCreate={handleNoopCreate}
        onSubmitEdit={handleEdit}
        isPending={updatePortfolio.isPending}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${data.name}"?`}
        description="This action cannot be undone. Projects will not be deleted."
        confirmLabel="Delete"
        destructive
        isPending={deletePortfolio.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}

export function PortfolioDetailPage({ portfolioId }: Props) {
  return <PortfolioDetailContent key={portfolioId} portfolioId={portfolioId} />;
}
