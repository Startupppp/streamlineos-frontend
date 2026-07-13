"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, X, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { usePortfolio, useUpdatePortfolio, useDeletePortfolio, useLinkPortfolioProject, useUnlinkPortfolioProject, useProjects } from "@/hooks/api/projects";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PortfolioStatusBadge, PortfolioHealthBadge } from "./portfolio-status-badge";
import { PortfolioFormSheet } from "./portfolio-form-sheet";
import type { UpdatePortfolioInput } from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";

type PortfolioTab = "projects" | "programs";
const PORTFOLIO_TABS = ["projects", "programs"] as const;

interface Props {
  portfolioId: number;
}

export function PortfolioDetailPage({ portfolioId }: Props) {
  const canManage = useCan("projects:portfolios:manage");

  const [activeTab, setActiveTab] = useState<PortfolioTab>("projects");
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
    if (!userId) return "â€”";
    const m = members.find((x) => x.userId === userId);
    return m?.name ?? m?.email ?? "Unknown";
  }

  const linkedIds = useMemo(() => new Set((data?.projects ?? []).map((p) => p.id)), [data?.projects]);
  const availableProjects = useMemo(
    () => (allProjectsRes?.data ?? []).filter((p) => !linkedIds.has(p.id)),
    [allProjectsRes?.data, linkedIds],
  );

  function handleEdit(input: UpdatePortfolioInput & { id: number }) {
    updatePortfolio.mutate(input, {
      onSuccess: () => { toast.success("Portfolio updated"); setEditOpen(false); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleDeleteConfirm() {
    deletePortfolio.mutate(portfolioId, {
      onSuccess: () => { toast.success("Portfolio deleted"); window.location.href = "/projects/portfolios"; },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleLink() {
    if (!linkProjectId) return;
    linkProject.mutate(parseInt(linkProjectId, 10), {
      onSuccess: () => { toast.success("Project linked"); setLinkProjectId(""); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleUnlink(projectId: number) {
    unlinkProject.mutate(projectId, {
      onSuccess: () => toast.success("Project unlinked"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleTabChange(v: string) {
    const tab = PORTFOLIO_TABS.find((t) => t === v);
    if (tab) setActiveTab(tab);
  }

  if (isLoading) {
    return (
      <PageWrapper title="Portfolio" eyebrow="Portfolio" backHref="/projects/portfolios">
        <div className="px-4 pb-4"><DataTableSkeleton rows={4} columns={3} /></div>
      </PageWrapper>
    );
  }

  if (isError || !data) {
    return (
      <PageWrapper title="Portfolio" eyebrow="Portfolio" backHref="/projects/portfolios">
        <ErrorState className="flex-1" onRetry={() => void refetch()} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={data.name}
      eyebrow="Portfolio"
      backHref="/projects/portfolios"
      actions={canManage ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <MoreHorizontal className="h-3.5 w-3.5" /> Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit Portfolio</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>Delete Portfolio</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : undefined}
    >
      <div className="px-4 pb-4 space-y-6">
        <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-border">
          <PortfolioStatusBadge status={data.status} />
          <PortfolioHealthBadge health={data.health} />
          <span className="text-sm text-muted-foreground">Owner: <span className="text-foreground">{memberName(data.ownerId)}</span></span>
        </div>

        {data.strategicGoal && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Strategic Goal</p>
            <p className="text-sm text-foreground">{data.strategicGoal}</p>
          </div>
        )}

        {data.description && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</p>
            <p className="text-sm text-muted-foreground">{data.description}</p>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="projects">
              Linked Projects
              {data.projects.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">{data.projects.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="programs">
              Programs
              {data.programs.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">{data.programs.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects">
            <div className="space-y-3">
              {canManage && availableProjects.length > 0 && (
                <div className="flex items-center gap-2">
                  <Select value={linkProjectId} onValueChange={setLinkProjectId}>
                    <SelectTrigger className="h-7 w-48 text-xs"><SelectValue placeholder="Link a project…" /></SelectTrigger>
                    <SelectContent>
                      {availableProjects.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="h-7 text-xs gap-1" onClick={handleLink} disabled={!linkProjectId || linkProject.isPending}>
                    <Plus className="h-3 w-3" /> Link
                  </Button>
                </div>
              )}
              {data.projects.length === 0 ? (
                <EmptyState illustrationPreset="projects" title="No linked projects" description="Link projects to this portfolio to track them here." compact />
              ) : (
                <div className="rounded-lg border border-border divide-y divide-border/50">
                  {data.projects.map((proj) => (
                    <div key={proj.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-xs text-muted-foreground shrink-0">{proj.key}</span>
                        <Link href={`/projects/${proj.id}`} className="text-sm font-medium text-foreground hover:text-primary truncate">{proj.name}</Link>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 shrink-0">{proj.status}</Badge>
                      </div>
                      {canManage && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleUnlink(proj.id)} disabled={unlinkProject.isPending}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="programs">
            {data.programs.length === 0 ? (
              <EmptyState illustrationPreset="projects" title="No programs" description="Programs in this portfolio will appear here." compact />
            ) : (
              <div className="rounded-lg border border-border divide-y divide-border/50">
                {data.programs.map((prog) => (
                  <div key={prog.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30">
                    <Link href={`/projects/programs/${prog.id}`} className="text-sm font-medium text-foreground hover:text-primary">{prog.name}</Link>
                    <PortfolioStatusBadge status={prog.status} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <PortfolioFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        defaultValues={data}
        onSubmitCreate={() => undefined}
        onSubmitEdit={handleEdit}
        isPending={updatePortfolio.isPending}
        members={members}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{data.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. Projects will not be deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
