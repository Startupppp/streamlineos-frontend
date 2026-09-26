"use client";

import { PmPageShell, PmPanel, PmSection, PM_ROW } from "@/components/pm-chrome";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MemberRoleSelect, RemoveMemberButton } from "./team-home-page";
import type { ProjectTeamMember } from "@/types/projects";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";

const STUB_MEMBERS: ProjectTeamMember[] = [
  { id: 1, userId: "1", firstName: "Alice", lastName: "Chen", email: "alice@example.com", role: "lead", image: null },
  { id: 2, userId: "2", firstName: "Bob", lastName: "Smith", email: "bob@example.com", role: "member", image: null },
  { id: 3, userId: "3", firstName: "Carol", lastName: "Davis", email: "carol@example.com", role: "member", image: null },
];

function TeamMembersKeyboardCase() {
  function handleRoleChange(_memberUserId: string, _role: "member" | "lead") {}
  function handleRemove(_userId: string) {}

  return (
    <section data-case-frame="team-members-keyboard" className="flex min-h-0 flex-col gap-3">
      <PmPanel role="list" aria-label="Team members">
        {STUB_MEMBERS.map((member) => {
          const displayName = getUserDisplayName({
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email,
          });
          const initials = getUserInitials({
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email,
          });
          return (
            <div key={member.userId} role="listitem" className={PM_ROW}>
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{displayName}</span>
                <span className="text-xs text-muted-foreground">{member.email}</span>
              </div>
              <MemberRoleSelect
                member={member}
                isPending={false}
                onRoleChange={handleRoleChange}
              />
              <RemoveMemberButton
                member={member}
                isPending={false}
                onRemove={handleRemove}
              />
            </div>
          );
        })}
      </PmPanel>
    </section>
  );
}

function TeamDetailLoadingCase() {
  return (
    <section data-case-frame="team-detail-loading" className="flex min-h-0 flex-col gap-3">
      <h2 className="text-sm font-medium">Loading — team detail</h2>
      <PmPanel className="space-y-3 p-4">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      </PmPanel>
      <PmPanel className="space-y-2 p-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </PmPanel>
    </section>
  );
}

export function TeamHomeGallery() {
  return (
    <div className="flex flex-col gap-8 p-4">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">
          Team detail surfaces
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Keyboard reachability, screen-reader roles, and responsive layout for the team member list.
          Tab navigates role select then remove button for each row.
        </p>
      </header>

      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          <TeamMembersKeyboardCase />
        </PmSection>
      </PmPageShell>

      <TeamDetailLoadingCase />
    </div>
  );
}
