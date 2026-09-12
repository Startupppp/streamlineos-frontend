"use client";

import Link from "next/link";
import { CalendarClock, HardHat, MapPin, Phone, StickyNote } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { useCan } from "@/hooks/api/access";
import { useProject } from "@/hooks/api/inventory/projects";
import { ProjectStatusBadge } from "./requirement-status";
import { RequirementRow } from "./requirement-row";
import { RequirementAddSheet } from "./requirement-add-sheet";

const ZONE_LABEL: Record<string, string> = {
  HYD_NORTH: "Hyderabad North",
  HYD_SOUTH: "Hyderabad South",
  HYD_EAST: "Hyderabad East",
  HYD_WEST: "Hyderabad West",
};

function DetailSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

/**
 * B1 — one site, and what it is waiting for.
 *
 * The header answers "where and when"; the list answers "is it covered". Nothing
 * on this page asks the reader to add quantities up: every line shows required,
 * reserved, delivered and short side by side, because the arithmetic done in
 * somebody's head at 6am is the arithmetic that goes wrong.
 */
export function ProjectDetailClient({ projectId }: { projectId: number }) {
  const canRead = useCan("inventory:projects:read");
  const { data, isLoading, error, refetch } = useProject(projectId);

  if (!canRead)
    return (
      <PageWrapper title="Project" backHref="/inventory/projects">
        <NoPermissionState
          permission="inventory:projects:read"
          title="Project unavailable"
          description="Construction projects need inventory project access."
          className="flex-1"
        />
      </PageWrapper>
    );

  if (isLoading)
    return (
      <PageWrapper title="Loading project…" backHref="/inventory/projects">
        <DetailSkeleton />
      </PageWrapper>
    );

  if (error)
    return (
      <PageWrapper title="Project" backHref="/inventory/projects">
        <ErrorState
          title="Could not load this project"
          description="The site and its material requirements could not be retrieved."
          onRetry={() => void refetch()}
        />
      </PageWrapper>
    );

  if (!data)
    return (
      <PageWrapper title="Project" backHref="/inventory/projects">
        <InventoryEmptyState
          title="Project not found"
          description="This site may have been archived, or the link may be out of date."
          action={{ label: "Back to Projects", href: "/inventory/projects" }}
          className="flex-1"
        />
      </PageWrapper>
    );

  const atRisk = data.requirements.filter((r) => r.coverage?.atRisk).length;
  const open = data.requirements.filter(
    (r) => !["FULFILLED", "CANCELLED"].includes(r.status),
  ).length;

  return (
    <PageWrapper
      title={data.name}
      subtitle={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono">{data.code}</span>
          <ProjectStatusBadge status={data.status} />
          {data.zone ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {ZONE_LABEL[data.zone] ?? data.zone}
            </span>
          ) : null}
        </span>
      }
      backHref="/inventory/projects"
      backLabel="All projects"
      actions={<RequirementAddSheet projectId={projectId} projectZone={data.zone} />}
    >
      <div className="space-y-4">
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-dense text-muted-foreground">Site address</p>
              <p className="text-sm text-foreground">{data.siteAddress ?? "—"}</p>
              {data.city ? <p className="text-dense text-muted-foreground">{data.city}</p> : null}
            </div>
            <div>
              <p className="text-dense text-muted-foreground">Site contact</p>
              <p className="text-sm text-foreground">{data.siteContactName ?? "—"}</p>
              {data.siteContactPhone ? (
                <a
                  href={`tel:${data.siteContactPhone.replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-1 text-dense text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Phone className="h-3 w-3" aria-hidden="true" />
                  {data.siteContactPhone}
                </a>
              ) : null}
            </div>
            <div>
              <p className="text-dense text-muted-foreground">Dates</p>
              <p className="inline-flex items-center gap-1 text-sm text-foreground">
                <CalendarClock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                {data.startsOn ?? "—"} → {data.endsOn ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-dense text-muted-foreground">Material lines</p>
              <p className="text-sm text-foreground">
                <span className="tabular-nums font-medium">{open}</span> open
                {atRisk > 0 ? (
                  <span className="text-status-danger-ink">
                    {" "}· <span className="tabular-nums font-medium">{atRisk}</span> at risk
                  </span>
                ) : null}
              </p>
            </div>
          </CardContent>
        </Card>

        {data.notes ? (
          <Card>
            <CardContent className="flex gap-3 p-4">
              <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">{data.notes}</p>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <HardHat className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              Material required on site
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {data.requirements.length === 0 ? (
              <InventoryEmptyState
                compact
                title="Nothing requested yet"
                description="Add the material this site needs, then hold it out of the dark store that will serve it."
              />
            ) : (
              <ul className="space-y-2">
                {data.requirements.map((r) => (
                  <RequirementRow key={r.id} requirement={r} projectId={projectId} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <p className="text-dense text-muted-foreground">
          Reservations against this site appear in{" "}
          <Link
            href="/inventory/stock"
            className="underline hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            stock levels
          </Link>{" "}
          as committed quantity, and every hold and release is recorded in the inventory audit trail.
        </p>
      </div>
    </PageWrapper>
  );
}
