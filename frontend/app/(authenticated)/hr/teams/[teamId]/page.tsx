"use client";

import { use, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Pencil, Trash2, Crown } from "lucide-react";

import { PageWrapper, PageSection } from "@/components/ui/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { HrSheet } from "@/features/hr/hr-sheet";

import { useOrgTeams, useUpdateOrgTeam, useDeleteOrgTeam } from "@/hooks/api/org-hierarchy";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useHrEmployees } from "@/hooks/api/hr/employees";
import { getErrorMessage } from "@/lib/get-error-message";
import { resolveImageUrl } from "@/lib/utils";
import type { Employee } from "@/types/hr";
import type { NodeStatus } from "@/types/org-hierarchy";

const STATUS_STYLES: Record<NodeStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  DISABLED: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  ARCHIVED: "bg-muted text-muted-foreground border-border",
};

const editSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
  capacity: z.string().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

function resolveEmployees(data: Employee[] | { data: Employee[]; pagination: unknown } | undefined): Employee[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.data;
}

export default function TeamDetailPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = use(params);
  const router = useRouter();

  const { data: teams, isLoading: teamsLoading, isError: teamsError, refetch: refetchTeams } = useOrgTeams();
  const { data: employeesRaw, isLoading: employeesLoading } = useHrEmployees({ limit: 200 });

  const updateTeam = useUpdateOrgTeam();
  const deleteTeam = useDeleteOrgTeam();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const team = useMemo(() => teams?.data?.find((t) => t.id === teamId) ?? null, [teams, teamId]);
  const employees = useMemo(() => resolveEmployees(employeesRaw as Employee[] | { data: Employee[]; pagination: unknown } | undefined), [employeesRaw]);

  const leadEmployee = useMemo(
    () => (team?.leadUserId ? employees.find((e) => e.id === team.leadUserId) ?? null : null),
    [team, employees],
  );

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      capacity: "",
    },
  });

  const handleEditOpen = useCallback(() => {
    if (!team) return;
    form.reset({
      name: team.name,
      code: team.code,
      description: team.description ?? "",
      capacity: team.capacity != null ? String(team.capacity) : "",
    });
    setEditOpen(true);
  }, [team, form]);

  const handleEditClose = useCallback((open: boolean) => {
    setEditOpen(open);
  }, []);

  const handleEditSubmit = useCallback(() => {
    form.handleSubmit(async (values) => {
      const payload: Record<string, unknown> = {
        name: values.name,
        code: values.code,
        description: values.description ?? null,
      };
      if (values.capacity !== undefined && values.capacity !== "") {
        const parsed = parseInt(values.capacity, 10);
        if (!isNaN(parsed)) payload.capacity = parsed;
      } else {
        payload.capacity = null;
      }
      try {
        await updateTeam.mutateAsync({ id: teamId, ...payload });
        toast.success("Team updated");
        setEditOpen(false);
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    })();
  }, [form, updateTeam, teamId]);

  const handleDeleteOpen = useCallback(() => {
    setDeleteOpen(true);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    setDeleteOpen(false);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    try {
      await deleteTeam.mutateAsync(teamId);
      toast.success("Team deleted");
      router.push("/hr/org-chart");
    } catch (err) {
      toast.error(getErrorMessage(err));
      setDeleteOpen(false);
    }
  }, [deleteTeam, teamId, router]);

  const handleRetry = useCallback(() => {
    refetchTeams();
  }, [refetchTeams]);

  const isLoading = teamsLoading || employeesLoading;

  if (isLoading) {
    return (
      <PageWrapper title="Team" variant="display">
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-36 w-full rounded-xl" />
            <Skeleton className="h-36 w-full rounded-xl" />
          </div>
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </PageWrapper>
    );
  }

  if (teamsError) {
    return (
      <PageWrapper title="Team" variant="display">
        <EmptyState
          illustrationPreset="alert"
          title="Failed to load team"
          description="Something went wrong while fetching team data."
          action={{ label: "Retry", onClick: handleRetry }}
        />
      </PageWrapper>
    );
  }

  if (!team) {
    return (
      <PageWrapper title="Team not found">
        <EmptyState
          illustration={<EmptyTeamIllustration className="h-32 w-32" />}
          title="Team not found"
          description="This team doesn't exist or has been removed."
          action={{ label: "Back to Org Chart", href: "/hr/org-chart" }}
        />
      </PageWrapper>
    );
  }

  const leadName = leadEmployee
    ? (leadEmployee.name ?? leadEmployee.firstName ?? leadEmployee.email)
    : null;

  return (
    <>
      <PageWrapper
        title={team.name}
        badge={team.code}
        subtitle={team.description ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/hr/org-chart">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Org Chart
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleEditOpen}>
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={handleDeleteOpen}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete
            </Button>
          </div>
        }
      >
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          <PageSection title="Team Info">
            <Card className="rounded-xl border border-border">
              <CardContent className="p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Status</p>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-semibold ${STATUS_STYLES[team.status]}`}
                  >
                    {team.status}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Code</p>
                  <p className="text-sm font-mono font-medium text-foreground">{team.code}</p>
                </div>

                <div className="space-y-0.5">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Capacity</p>
                  <p className="text-sm font-medium text-foreground">
                    {team.capacity != null ? team.capacity : <span className="text-muted-foreground">—</span>}
                  </p>
                </div>

                {team.departmentId && (
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Department ID</p>
                    <p className="text-sm font-mono text-foreground truncate">{team.departmentId}</p>
                  </div>
                )}

                {team.description && (
                  <div className="sm:col-span-2 lg:col-span-3 space-y-0.5">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Description</p>
                    <p className="text-sm text-foreground leading-relaxed">{team.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </PageSection>

          {team.leadUserId && (
            <PageSection title="Team Lead">
              <Card className="rounded-xl border border-border">
                <CardContent className="p-4">
                  {leadEmployee ? (
                    <Link
                      href={`/hr/employees/${leadEmployee.id}`}
                      className="flex items-center gap-3 group w-fit"
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={resolveImageUrl(leadEmployee.image)} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                            {(leadName ?? "?")[0]?.toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-400 flex items-center justify-center">
                          <Crown className="h-2.5 w-2.5 text-white" />
                        </span>
                      </div>
                      <div className="min-w-0">
                        <TruncatedText text={leadName ?? leadEmployee.email} className="text-sm font-semibold group-hover:text-primary transition-colors" />
                        {leadEmployee.designation && (
                          <TruncatedText text={leadEmployee.designation} className="text-xs text-muted-foreground" />
                        )}
                        <Badge variant="outline" className="text-[10px] mt-0.5">{leadEmployee.role}</Badge>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Crown className="h-4 w-4 text-amber-400" />
                      <span>Lead assigned (ID: {team.leadUserId})</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </PageSection>
          )}

          <PageSection title="Members">
            <Card className="rounded-xl border border-border border-dashed">
              <CardContent className="p-6">
                <EmptyState
                  illustrationPreset="team"
                  title="Member list coming soon"
                  description="Team membership is managed via the org chart. Visit the org chart to see reporting structure and team assignments."
                  action={{ label: "View Org Chart", href: "/hr/org-chart" }}
                  compact
                />
              </CardContent>
            </Card>
          </PageSection>
        </div>
      </PageWrapper>

      <HrSheet
        open={editOpen}
        onOpenChange={handleEditClose}
        title="Edit Team"
        description="Update team name, code, description, and capacity."
        onSubmit={handleEditSubmit}
        isPending={updateTeam.isPending}
        submitLabel="Save Changes"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              placeholder="e.g. Frontend Squad"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-code">Code</Label>
            <Input
              id="edit-code"
              placeholder="e.g. FE-SQUAD"
              {...form.register("code")}
            />
            {form.formState.errors.code && (
              <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              placeholder="Brief description of the team's purpose…"
              rows={3}
              {...form.register("description")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-capacity">Capacity</Label>
            <Input
              id="edit-capacity"
              type="number"
              min={1}
              placeholder="e.g. 10"
              {...form.register("capacity")}
            />
            <p className="text-[11px] text-muted-foreground">Maximum number of members this team can hold.</p>
          </div>
        </div>
      </HrSheet>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete team?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{team.name}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteTeam.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTeam.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
