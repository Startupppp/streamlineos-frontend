"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useProjectRoster } from "@/hooks/api/build/roster";
import {
  getUserDisplayName,
  getUserInitials,
} from "@/lib/person-display";
import { resolveImageUrl } from "@/lib/utils";
import { matchesAccessSearch } from "./access-search";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-dense font-medium uppercase tracking-wider text-muted-foreground">
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
  search?: string;
}

export function TeamRosterSection({ projectId, search = "" }: TeamRosterSectionProps) {
  const { data, isLoading, isError, error, refetch } = useProjectRoster(projectId);

  if (isLoading) {
    return <RosterSkeleton />;
  }

  if (isError) {
    return (
      <ErrorState
        compact
        title="Couldn't load the roster"
        description={getErrorMessage(error)}
        onRetry={() => void refetch()}
      />
    );
  }

  const teams = data?.teams ?? [];
  const members = data?.members ?? [];
  const filteredTeams = teams.filter((team) =>
    matchesAccessSearch(search, [team.name, team.key]),
  );
  const filteredMembers = members.filter((member) =>
    matchesAccessSearch(search, [
      getUserDisplayName(member),
      member.email,
    ]),
  );
  const hasSearch = Boolean(search.trim());

  return (
    <div className="space-y-5">
      <div>
        <SectionLabel>Teams</SectionLabel>
        {filteredTeams.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {hasSearch ? (
              "No teams match your search."
            ) : (
              <>
                No teams assigned yet.{" "}
                <span className="text-xs">
                  Assign this project from a team&rsquo;s detail page.
                </span>
              </>
            )}
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {filteredTeams.map((team) => (
              <Badge key={team.id} variant="secondary" className="gap-1 text-xs font-normal">
                <span className="font-mono text-micro opacity-60">{team.key}</span>
                {team.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionLabel>
          Effective members ({filteredMembers.length})
        </SectionLabel>
        {filteredMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {hasSearch
              ? "No effective members match your search."
              : "No members have access via teams yet."}
          </p>
        ) : (
          <div className="divide-y divide-border">
            {filteredMembers.map((member) => {
              const displayName = getUserDisplayName(member);
              const initials = getUserInitials(member);
              return (
                <div key={member.id} className="flex items-center gap-2.5 py-2">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={resolveImageUrl(member.image)} />
                    <AvatarFallback className="text-micro">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {displayName}
                    </p>
                    <p className="truncate text-dense text-muted-foreground">
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
