"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, X, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useProgram, usePortfolios, useUpdateProgram, useDeleteProgram, useLinkProgramProject, useUnlinkProgramProject, useProjects } from "@/hooks/api/projects";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonTable } from "@/components/shared/skeletons/skeleton-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PortfolioStatusBadge, PortfolioHealthBadge } from "./portfolio-status-badge";
import { ProgramFormSheet } from "./program-form-sheet";
import type { UpdateProgramInput } from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";

interface Props {
  programId: number;
}

export function ProgramDetailPage({ programId }: Props) {
  const canManage = useCan("projects:programs:manage");

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [linkProjectId, setLinkProjectId] = useState("");

  const { data, isLoading, isError, refetch } = useProgram(programId);
  const { data: allProjectsRes } = useProjects({ limit: 200 });
  const { data: portfoliosData } = usePortfolios();
  const { data: membersRes } = useOrgMembers(1, 100);
  const members = useMemo(() => membersRes?.data ?? [], [membersRes]);
  const portfolios = useMemo(() => portfoliosData ?? [], [portfoliosData]);

  const updateProgram = useUpdateProgram();
  const deleteProgram = useDeleteProgram();
  const linkProject = useLinkProgramProject(programId);
  const unlinkProject = useUnlinkProgramProject(programId);

  function memberName(userId: string | null): string {
    if (!userId) return "â€”";
    const m = members.find((x) => x.userId === userId);
    return m?.name ?? m?.email ?? userId;
  }

  function portfolioName(portfolioId: number | null): string {
    if (!portfolioId) return "â€”";
    return portfolios.find((p) => p.id === portfolioId)?.name ?? "â€”";
  }

  const linkedIds = useMemo(() => new Set((data?.projects ?? []).map((p) => p.id)), [data?.projects]);
  const availableProjects = useMemo(
    () => (allProjectsRes?.data ?? []).filter((p) => !linkedIds.has(p.id)),
    [allProjectsRes?.data, linkedIds],
  );

  function handleEdit(input: UpdateProgramInput & { id: number }) {
    updateProgram.mutate(input, {
      onSuccess: () => { toast.success("Program updated"); setEditOpen(false); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleDeleteConfirm() {
    deleteProgram.mutate(programId, {
      onSuccess: () => { toast.success("Program deleted"); window.location.href = "/projects/programs"; },
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

  if (isLoading) {
    return (
      <PageWrapper title="Program" eyebrow="Program" backHref="/projects/programs">
        <div className="px-4 pb-4"><SkeletonTable rows={4} columns={3} /></div>
      </PageWrapper>
    );
  }

  if (isError || !data) {
    return (
      <PageWrapper title="Program" eyebrow="Program" backHref="/projects/programs">
        <ErrorState className="flex-1" onRetry={() => void refetch()} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={data.name}
      eyebrow="Program"
      backHref="/projects/programs"
      actions={canManage ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <MoreHorizontal className="h-3.5 w-3.5" /> Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit Program</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>Delete Program</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : undefined}
    >
      <div className="px-4 pb-4 space-y-6">
        <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-border">
          <PortfolioStatusBadge status={data.status} />
          <PortfolioHealthBadge health={data.health} />
          <span className="text-sm text-muted-foreground">Owner: <span className="text-foreground">{memberName(data.ownerId)}</span></span>
          {data.portfolioId && (
            <span className="text-sm text-muted-foreground">
              Portfolio:{" "}
              <Link href={`/projects/portfolios/${data.portfolioId}`} className="text-foreground hover:text-primary">
                {portfolioName(data.portfolioId)}
              </Link>
            </span>
          )}
        </div>

        {data.description && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</p>
            <p className="text-sm text-muted-foreground">{data.description}</p>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Linked Projects <span className="text-muted-foreground font-normal">({data.projects.length})</span></h2>
            {canManage && availableProjects.length > 0 && (
              <div className="flex items-center gap-2">
                <Select value={linkProjectId} onValueChange={setLinkProjectId}>
                  <SelectTrigger className="h-7 w-48 text-xs"><SelectValue placeholder="Link a projectâ€¦" /></SelectTrigger>
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
          </div>
          {data.projects.length === 0 ? (
            <EmptyState illustrationPreset="projects" title="No linked projects" description="Link projects to this program to track them here." compact />
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
      </div>

      <ProgramFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        defaultValues={data}
        onSubmitCreate={() => undefined}
        onSubmitEdit={handleEdit}
        isPending={updateProgram.isPending}
        members={members}
        portfolios={portfolios}
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
