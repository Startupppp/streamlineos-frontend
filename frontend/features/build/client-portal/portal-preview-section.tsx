"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { isApiError } from "@/lib/api-envelope";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { usePortalPreview } from "@/hooks/api/build/client-portal-management";

interface PortalPreviewSectionProps {
  projectId: number;
}

export function PortalPreviewSection({ projectId }: PortalPreviewSectionProps) {
  const { data, isLoading, isError, error } = usePortalPreview(projectId);

  if (isLoading) {
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

  const isEmpty =
    data.milestones.length === 0 &&
    data.tasks.length === 0 &&
    data.attachments.length === 0 &&
    data.comments.length === 0;

  if (isEmpty) {
    return (
      <EmptyState
        illustrationPreset="ticket"
        title="Nothing visible to clients yet"
        description="Toggle visibility on tickets and milestones to populate the client view."
        compact
        className={CONTENT_FILL_PANEL}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
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
    </div>
  );
}
