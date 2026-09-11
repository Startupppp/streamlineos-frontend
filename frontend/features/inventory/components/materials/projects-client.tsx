"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, CalendarClock, MapPin, Search } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useMotionVariants } from "@/lib/motion-variants";
import { useCan } from "@/hooks/api/access";
import { useProjects, useAtRiskRequirements, type ProjectStatus } from "@/hooks/api/inventory/projects";
import { ProjectCreateSheet } from "./project-create-sheet";
import { ProjectStatusBadge, RISK_COPY } from "./requirement-status";

const ZONE_LABEL: Record<string, string> = {
  HYD_NORTH: "North",
  HYD_SOUTH: "South",
  HYD_EAST: "East",
  HYD_WEST: "West",
};

const STATUSES: readonly ProjectStatus[] = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"];

function isProjectStatus(value: string): value is ProjectStatus {
  return STATUSES.some((status) => status === value);
}

function ProjectCard({ p, index }: { p: ReturnType<typeof useProjects>["data"] extends { items: (infer T)[] } | undefined ? T : never; index: number }) {
  const { fadeUp } = useMotionVariants();
  return (
    <motion.li variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: Math.min(index, 8) * 0.03 }} className="list-none">
      <Link
        href={`/inventory/projects/${p.id}`}
        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Card className="h-full transition-colors hover:bg-accent">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{p.name}</p>
                <p className="mt-0.5 font-mono text-dense text-muted-foreground">{p.code}</p>
              </div>
              <ProjectStatusBadge status={p.status} />
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-dense text-muted-foreground">
              {p.zone ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  Hyderabad {ZONE_LABEL[p.zone] ?? p.zone}
                </span>
              ) : null}
              {p.endsOn ? (
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" aria-hidden="true" />
                  Due {p.endsOn}
                </span>
              ) : null}
              {p.siteContactName ? <span>Contact {p.siteContactName}</span> : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
              <Badge variant="outline" className="h-5 text-micro">
                {p.openRequirements} open line{p.openRequirements === 1 ? "" : "s"}
              </Badge>
              {p.overdueRequirements > 0 ? (
                <Badge
                  variant="outline"
                  className="h-5 gap-1 border-status-danger-rule text-micro text-status-danger-ink"
                >
                  <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
                  {p.overdueRequirements} past its date
                </Badge>
              ) : null}
              <span className="ml-auto inline-flex items-center gap-1 text-dense font-medium text-foreground">
                View Site
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.li>
  );
}

function AtRiskStrip() {
  const { data, isLoading } = useAtRiskRequirements(6);
  if (isLoading || !data || data.length === 0) return null;
  return (
    <Card className="border-status-danger-rule bg-status-danger-surface">
      <CardContent className="space-y-2 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <AlertTriangle className="h-3.5 w-3.5 text-status-danger-ink" aria-hidden="true" />
          {data.length} site requirement{data.length === 1 ? "" : "s"} at risk
        </p>
        <ul className="space-y-1.5">
          {data.map((r) => (
            <li key={r.id} className="text-dense">
              <Link
                href={`/inventory/projects/${r.projectId}`}
                className="text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="font-medium">{r.projectCode}</span>
                <span className="text-muted-foreground"> · {r.productName} </span>
                <span className="font-mono text-muted-foreground">{r.variantSku}</span>
                <span className="text-muted-foreground">
                  {" "}— short <span className="tabular-nums">{r.shortfallQty}</span>
                  {r.requiredBy ? `, needed ${r.requiredBy}` : ""}
                  {r.riskReason ? ` — ${RISK_COPY[r.riskReason].toLowerCase()}` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function ProjectsClient() {
  const canRead = useCan("inventory:projects:read");
  const params = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "ALL">("ALL");
  const [zone, setZone] = useState<string>("ALL");
  const debounced = useDebouncedValue(search, 300);

  const filters = useMemo(
    () => ({
      search: debounced || undefined,
      status: status === "ALL" ? undefined : status,
      zone: zone === "ALL" ? undefined : zone,
      limit: 24,
    }),
    [debounced, status, zone],
  );
  const { data, isLoading, error, refetch } = useProjects(filters);
  const showRiskFirst = params.get("risk") === "at-risk";

  function handleStatusChange(value: string): void {
    setStatus(isProjectStatus(value) ? value : "ALL");
  }

  if (!canRead)
    return (
      <PageWrapper title="Construction Projects" subtitle="What each site needs, and whether it is covered.">
        <NoPermissionState
          permission="inventory:projects:read"
          title="Projects unavailable"
          description="Construction projects need inventory project access."
          className="flex-1"
        />
      </PageWrapper>
    );

  const items = data?.items ?? [];

  return (
    <PageWrapper
      title="Construction Projects"
      subtitle="What each site needs, and whether it is covered."
      actions={<ProjectCreateSheet />}
      filters={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by site name or code"
              aria-label="Search projects"
              className="h-9 pl-8"
            />
          </div>
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-9 w-full sm:w-[150px]" aria-label="Filter by stage">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All stages</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase().replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={zone} onValueChange={setZone}>
            <SelectTrigger className="h-9 w-full sm:w-[150px]" aria-label="Filter by zone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All zones</SelectItem>
              {Object.entries(ZONE_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  Hyderabad {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div className="space-y-4">
        {showRiskFirst ? <AtRiskStrip /> : null}

        {isLoading ? (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="list-none">
                <Skeleton className="h-40 w-full rounded-xl" />
              </li>
            ))}
          </ul>
        ) : error ? (
          <ErrorState
            title="Could not load projects"
            description="The project list could not be retrieved."
            onRetry={() => void refetch()}
          />
        ) : items.length === 0 ? (
          <InventoryEmptyState
            title={debounced || status !== "ALL" || zone !== "ALL" ? "No sites match those filters" : "No construction projects yet"}
            description={
              debounced || status !== "ALL" || zone !== "ALL"
                ? "Clear the search or widen the filters to see more sites."
                : "Add a site to record what it needs and hold material for it out of the dark store that will serve it."
            }
            className="flex-1"
          />
        ) : (
          <>
            {!showRiskFirst ? <AtRiskStrip /> : null}
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {items.map((p, i) => (
                <ProjectCard key={p.id} p={p} index={i} />
              ))}
            </ul>
            <p className="text-dense text-muted-foreground">
              Showing {items.length} of {data?.total ?? items.length} site{(data?.total ?? 0) === 1 ? "" : "s"}
              {(data?.totalPages ?? 1) > 1 ? ` · page ${data?.page} of ${data?.totalPages}` : ""}
            </p>
          </>
        )}
      </div>
    </PageWrapper>
  );
}
