"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isApiError } from "@/lib/api-envelope";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { useCanState } from "@/hooks/api/access";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { usePortalPreview } from "@/hooks/api/build/client-portal-management";
import { useProjectClientGrants } from "@/hooks/api/portal-access/grants";

interface PortalPreviewSectionProps {
  projectId: number;
}

const NO_GRANT_SELECTED = "__none__";

export function PortalPreviewSection({ projectId }: PortalPreviewSectionProps) {
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | undefined>(undefined);
  const canViewState = useCanState("build:portal:view");

  const { data: grantsPage, isLoading: grantsLoading } = useProjectClientGrants({
    projectId,
    state: "active",
    limit: 50,
  });

  const activeGrants = grantsPage?.data ?? [];
  const resolvedMembershipId = selectedMembershipId ?? activeGrants[0]?.portalMembershipId;

  const { data, isLoading, isError, error } = usePortalPreview(projectId, resolvedMembershipId);

  function handleGrantChange(value: string) {
    setSelectedMembershipId(value === NO_GRANT_SELECTED ? undefined : value);
  }

  function grantLabel(portalMembershipId: string): string {
    const grant = activeGrants.find((g) => g.portalMembershipId === portalMembershipId);
    if (!grant) return portalMembershipId;
    const first = grant.contactFirstName ?? "";
    const last = grant.contactLastName ?? "";
    const name = `${first} ${last}`.trim();
    return name.length > 0 ? name : portalMembershipId;
  }

  if (canViewState === "denied") {
    return <NoPermissionState compact className={CONTENT_FILL_PANEL} />;
  }

  if (grantsLoading || isLoading) {
    return (
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (isError || !data) {
    if (isApiError(error) && error.status === 404) {
      return (
        <EmptyState
          illustrationPreset="projects"
          title="No portal published yet"
          description="Publish the client portal to preview what clients see. Grants alone do not open the client view until the portal is published."
          compact
          className={CONTENT_FILL_PANEL}
        />
      );
    }
    return (
      <EmptyState
        illustrationPreset="projects"
        title="Preview unavailable"
        description="Unable to load the client view of this project."
        compact
        className={CONTENT_FILL_PANEL}
      />
    );
  }

  const isEmpty = data.milestones.length === 0 && data.tasks.length === 0;

  return (
    <div className="flex flex-col gap-3 p-4">
      {activeGrants.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs text-muted-foreground">Previewing as</span>
          <Select
            value={resolvedMembershipId ?? NO_GRANT_SELECTED}
            onValueChange={handleGrantChange}
          >
            <SelectTrigger className="h-7 w-48 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {activeGrants.map((g) => (
                <SelectItem key={g.portalMembershipId} value={g.portalMembershipId}>
                  {grantLabel(g.portalMembershipId)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isEmpty ? (
        <EmptyState
          illustrationPreset="ticket"
          title="Nothing visible to clients yet"
          description="Toggle visibility on tickets and milestones to populate the client view."
          compact
          className={CONTENT_FILL_PANEL}
        />
      ) : (
        <>
          {data.milestones.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Milestones
              </p>
              <div className="flex flex-col gap-1">
                {data.milestones.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <span>{m.name}</span>
                    <Badge variant="outline" className="text-micro">
                      {m.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
          {data.tasks.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Tasks
              </p>
              <div className="flex flex-col gap-1">
                {data.tasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <span>
                      #{t.ticketNumber} {t.title}
                    </span>
                    <Badge variant="outline" className="text-micro">
                      {t.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
