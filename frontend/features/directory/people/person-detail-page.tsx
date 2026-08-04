"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Mail, Phone, Pencil, UserPlus } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { usePerson } from "@/hooks/api/directory/people";
import {
  useWorkerEngagements,
  useWorkers,
} from "@/hooks/api/directory/workers";
import { useUser } from "@/hooks/api/users";
import { useCan } from "@/hooks/api/access";
import { PersonFormDialog } from "./person-form-dialog";
import { WorkerFormDialog } from "../workers/worker-form-dialog";
import { UserMembershipSection } from "@/features/users/user-membership-section";
import { UserModuleAccessSection } from "@/features/users/user-module-access-section";
import { UserStatusBadge } from "@/features/users/user-status-badge";
import { formatRoleLabel } from "@/features/users/user-invite-roles";
import type { OrganizationPerson } from "@/types/directory/people";
import type { Worker, WorkerEngagement } from "@/types/directory/workers";
import { cn } from "@/lib/utils";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";

interface PersonDetailPageProps {
  organizationPersonId: string;
}

function displayName(person: OrganizationPerson): string {
  if (person.displayName) return person.displayName;
  return `${person.firstName} ${person.lastName}`.trim();
}

function personInitials(person: OrganizationPerson): string {
  const name = displayName(person);
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <Skeleton className="h-9 w-full max-w-md" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

function ProfileFields({ person }: { person: OrganizationPerson }) {
  const rows: { label: string; value: string | null }[] = [
    { label: "Work email", value: person.workEmail },
    { label: "Personal email", value: person.personalEmail },
    { label: "Phone", value: person.phone },
    { label: "WhatsApp", value: person.whatsappNumber },
    { label: "Timezone", value: person.timezone },
    { label: "Preferred name", value: person.preferredName },
  ];

  return (
    <div className="space-y-3">
      {rows.map(({ label, value }) =>
        value ? (
          <div key={label} className="flex flex-col gap-0.5 border-b border-border/60 py-2 last:border-0">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
            <span className={cn("text-sm text-foreground", TEXT_ONE_LINE)}>{value}</span>
          </div>
        ) : null,
      )}
      {person.bio ? (
        <div className="pt-2">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Bio</span>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{person.bio}</p>
        </div>
      ) : null}
    </div>
  );
}

function PersonMembershipTab({ person }: { person: OrganizationPerson }) {
  const canViewMembers = useCan("settings:view");
  const canInvite = useCan("settings:organization:manage");
  const linkedUserId = person.userId;
  const { data: user, isLoading } = useUser(linkedUserId ?? "", {
    enabled: !!linkedUserId && canViewMembers,
  });

  if (!canViewMembers) {
    return (
      <EmptyState
        title="Membership details unavailable"
        description="You need organization settings access to view login and role information."
        className="flex-1"
      />
    );
  }

  if (!linkedUserId) {
    return (
      <EmptyState
        illustrationPreset="team"
        title="No login linked"
        description="This person exists in the directory only. Invite them as a member to grant sign-in, roles, and module access."
        className="flex-1"
        action={
          canInvite
            ? {
                label: "Invite to organization",
                href: "/users",
              }
            : undefined
        }
      />
    );
  }

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (!user) {
    return (
      <EmptyState
        title="Membership not found"
        description="The linked account could not be loaded. It may have been removed."
        className="flex-1"
      />
    );
  }

  const isActive = user.userStatus ? user.userStatus === "active" : user.isActive;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
          {formatRoleLabel(user.role)}
        </Badge>
        <UserStatusBadge
          isActive={isActive}
          isDeleted={user.userStatus === "archived"}
        />
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mail className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate text-foreground">{user.email}</span>
        </div>
        {user.phone ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span className="text-foreground">{user.phone}</span>
          </div>
        ) : null}
      </div>
      <Separator />
      <UserMembershipSection userId={user.id} />
      {canInvite ? (
        <Button variant="outline" size="sm" className="text-xs" asChild>
          <Link href="/users">Open in Members</Link>
        </Button>
      ) : null}
    </div>
  );
}

function PersonWorkerTab({ person }: { person: OrganizationPerson }) {
  const canViewWorkers = useCan("workforce:workers:view");
  const canManageWorkers = useCan("workforce:workers:manage");
  const [createWorkerOpen, setCreateWorkerOpen] = useState(false);

  const searchTerm = person.workEmail ?? person.firstName;
  const { data: workersPage, isLoading: workersLoading } = useWorkers({
    page: 1,
    limit: 100,
    search: searchTerm || undefined,
  });

  const worker = useMemo(
    () =>
      (workersPage?.data ?? []).find(
        (row) => row.organizationPersonId === person.organizationPersonId,
      ) ?? null,
    [workersPage?.data, person.organizationPersonId],
  );

  const { data: engagements, isLoading: engagementsLoading } = useWorkerEngagements(
    worker?.workerId ?? "",
  );

  const engagementColumns: DataTableColumn<WorkerEngagement>[] = [
    {
      key: "type",
      header: "Type",
      cell: (row) => (
        <span className="text-sm capitalize">{row.workerType.replace(/_/g, " ").toLowerCase()}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <SemanticBadge tone={row.status === "ACTIVE" ? "success" : "neutral"} label={row.status} />
      ),
    },
    {
      key: "period",
      header: "Period",
      cell: (row) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {formatDate(row.startsOn)}
          {row.endsOn ? ` – ${formatDate(row.endsOn)}` : " – present"}
        </span>
      ),
    },
    {
      key: "designation",
      header: "Designation",
      cell: (row) => (
        <span className={cn("text-sm text-muted-foreground", TEXT_ONE_LINE)}>
          {row.designation ?? "—"}
        </span>
      ),
    },
  ];

  const handleOpenCreateWorker = useCallback(() => {
    setCreateWorkerOpen(true);
  }, []);

  const handleCreateWorkerChange = useCallback((open: boolean) => {
    setCreateWorkerOpen(open);
  }, []);

  if (!canViewWorkers) {
    return (
      <EmptyState
        title="Workforce access required"
        description="You need workforce permissions to view worker records and engagements."
        className="flex-1"
      />
    );
  }

  if (workersLoading) {
    return <DetailSkeleton />;
  }

  if (!worker) {
    return (
      <>
        <EmptyState
          illustrationPreset="team"
          title="No worker record"
          description="Add a worker profile when this person participates in payroll, HRMS, or other workforce programs. Directory membership stays independent."
          className="flex-1"
          action={
            canManageWorkers
              ? { label: "Add worker", onClick: handleOpenCreateWorker }
              : undefined
          }
        />
        {createWorkerOpen ? (
          <WorkerFormDialog
            open={createWorkerOpen}
            onOpenChange={handleCreateWorkerChange}
            defaultOrganizationPersonId={person.organizationPersonId}
          />
        ) : null}
      </>
    );
  }

  return (
    <div className="space-y-4">
      <WorkerSummary worker={worker} />
      <Separator />
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Engagements
        </p>
        {engagementsLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (engagements ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No engagements recorded yet.</p>
        ) : (
          <DataTable
            data={engagements ?? []}
            columns={engagementColumns}
            getRowKey={(row) => row.workerEngagementId}
            minWidth="520px"
          />
        )}
      </div>
    </div>
  );
}

function WorkerSummary({ worker }: { worker: Worker }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <SemanticBadge tone={worker.status === "ACTIVE" ? "success" : "neutral"} label={worker.status} />
      {worker.workerNumber ? (
        <span className="text-muted-foreground">#{worker.workerNumber}</span>
      ) : null}
      {worker.isPayee ? (
        <Badge variant="outline" className="text-[10px]">
          Payee
        </Badge>
      ) : null}
    </div>
  );
}

function PersonModulesTab({ person }: { person: OrganizationPerson }) {
  const canViewMembers = useCan("settings:view");
  const linkedUserId = person.userId;
  const { data: user, isLoading } = useUser(linkedUserId ?? "", {
    enabled: !!linkedUserId && canViewMembers,
  });

  if (!canViewMembers) {
    return (
      <EmptyState
        title="Module assignments unavailable"
        description="Organization settings access is required to manage module assignments."
        className="flex-1"
      />
    );
  }

  if (!linkedUserId) {
    return (
      <EmptyState
        illustrationPreset="team"
        title="Link a member first"
        description="Module assignments apply to organization members with a login. Invite or link this person from the Membership tab."
        className="flex-1"
      />
    );
  }

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (!user) {
    return (
      <EmptyState
        title="Member not found"
        description="The linked account could not be loaded."
        className="flex-1"
      />
    );
  }

  const isActive = user.userStatus ? user.userStatus === "active" : user.isActive;

  return (
    <UserModuleAccessSection userId={user.id} isMemberActive={isActive} />
  );
}

export function PersonDetailPage({ organizationPersonId }: PersonDetailPageProps) {
  const canUpdate = useCan("directory:people:update");
  const canViewMembers = useCan("settings:view");
  const canViewWorkers = useCan("workforce:workers:view");
  const [editOpen, setEditOpen] = useState(false);

  const { data: person, isLoading, isError, refetch } = usePerson(organizationPersonId);

  const tabs = useMemo(() => {
    const items = [{ value: "profile", label: "Profile" }];
    if (canViewMembers) items.push({ value: "membership", label: "Membership" });
    if (canViewWorkers) items.push({ value: "worker", label: "Worker" });
    if (canViewMembers) items.push({ value: "modules", label: "Modules" });
    return items;
  }, [canViewMembers, canViewWorkers]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleOpenEdit = useCallback(() => {
    setEditOpen(true);
  }, []);

  const handleEditChange = useCallback((open: boolean) => {
    setEditOpen(open);
  }, []);

  const title = person ? displayName(person) : "Person";

  return (
    <PageWrapper
      title={title}
      subtitle={person?.workEmail ?? "Organization person"}
      backHref="/directory"
      actions={
        canUpdate && person ? (
          <Button size="sm" className="gap-1.5 text-xs" onClick={handleOpenEdit}>
            <Pencil className="h-3.5 w-3.5" />
            Edit profile
          </Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <DetailSkeleton />
      ) : isError ? (
        <ErrorState onRetry={handleRetry} />
      ) : !person ? (
        <EmptyState
          illustrationPreset="team"
          title="Person not found"
          description="This record may have been deleted or you may not have access."
          className="flex-1"
        />
      ) : (
        <Tabs defaultValue="profile" className="flex min-h-0 flex-1 flex-col gap-4">
          <TabsList className="w-full md:w-fit overflow-x-auto">
            {tabs.map(({ value, label }) => (
              <TabsTrigger key={value} value={value} className="min-w-fit">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="profile" className="mt-0 flex-1">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-14 w-14 shrink-0">
                  <AvatarImage src={person.avatarUrl ?? undefined} alt={title} />
                  <AvatarFallback className="text-sm font-semibold">
                    {personInitials(person)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-base truncate">{displayName(person)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Added {formatDate(person.createdAt)}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {person.userId ? (
                      <Badge variant="secondary" className="text-[10px] h-5">
                        Member linked
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-5 gap-1">
                        <UserPlus className="h-3 w-3" />
                        Directory only
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <Separator />
              <ProfileFields person={person} />
            </div>
          </TabsContent>

          {canViewMembers ? (
            <TabsContent value="membership" id="membership" className="mt-0 flex-1">
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <PersonMembershipTab person={person} />
              </div>
            </TabsContent>
          ) : null}

          {canViewWorkers ? (
            <TabsContent value="worker" className="mt-0 flex-1">
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <PersonWorkerTab person={person} />
              </div>
            </TabsContent>
          ) : null}

          {canViewMembers ? (
            <TabsContent value="modules" className="mt-0 flex-1">
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <PersonModulesTab person={person} />
              </div>
            </TabsContent>
          ) : null}
        </Tabs>
      )}

      {editOpen && person ? (
        <PersonFormDialog
          open={editOpen}
          onOpenChange={handleEditChange}
          mode="edit"
          defaultValues={person}
        />
      ) : null}
    </PageWrapper>
  );
}
