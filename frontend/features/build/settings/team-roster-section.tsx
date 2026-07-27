"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectRoster } from "@/hooks/api/build/roster";
import {
  getUserDisplayName,
  getUserInitials,
} from "@/features/build/shared/resolve-user-name";
import { resolveImageUrl } from "@/lib/utils";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

function RosterSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-20 rounded-full" />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 py-1">
            <Skeleton className="h-7 w-7 rounded-full shrink-0" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2.5 w-36" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TeamRosterSectionProps {
  projectId: number;
}

export function TeamRosterSection({ projectId }: TeamRosterSectionProps) {
  const { data, isLoading } = useProjectRoster(projectId);

  if (isLoading) {
    return <RosterSkeleton />;
  }

  const teams = data?.teams ?? [];
  const members = data?.members ?? [];

  return (
    <div className="space-y-5">
      <div>
        <SectionLabel>Teams</SectionLabel>
        {teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No teams assigned yet.{" "}
            <span className="text-xs">
              Assign this project from a team&rsquo;s detail page.
            </span>
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {teams.map((team) => (
              <Badge key={team.id} variant="secondary" className="gap-1 text-xs font-normal">
                <span className="font-mono text-[10px] opacity-60">{team.key}</span>
                {team.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionLabel>
          Effective members ({members.length})
        </SectionLabel>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No members have access via teams yet.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {members.map((member) => {
              const displayName = getUserDisplayName(member);
              const initials = getUserInitials(member);
              return (
                <div key={member.id} className="flex items-center gap-2.5 py-2">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={resolveImageUrl(member.image)} />
                    <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {displayName}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {member.email}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
