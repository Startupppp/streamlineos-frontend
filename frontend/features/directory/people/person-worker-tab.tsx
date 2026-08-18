"use client";

import { useCallback, useMemo, useState } from "react";
import { BriefcaseBusiness, LockKeyhole } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { Separator } from "@/components/ui/separator";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";
import {
  useWorkerEngagements,
  useWorkers,
} from "@/hooks/api/directory/workers";
import { cn } from "@/lib/utils";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import type { OrganizationPerson } from "@/types/directory/people";
import type { Worker, WorkerEngagement } from "@/types/directory/workers";
import { WorkerFormDialog } from "../workers/worker-form-dialog";
import { formatPersonDate } from "./person-detail-formatters";
import {
  PersonTabContentSkeleton,
  PersonTabState,
} from "./person-detail-tab-state";

const ENGAGEMENT_COLUMNS: DataTableColumn<WorkerEngagement>[] = [
  {
    key: "type",
    header: "Type",
    cell: (engagement) => (
      <span className="text-sm capitalize">
        {engagement.workerType.replace(/_/g, " ").toLowerCase()}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (engagement) => (
      <SemanticBadge
        tone={engagement.status === "ACTIVE" ? "success" : "neutral"}
        label={engagement.status}
      />
    ),
  },
  {
    key: "period",
    header: "Period",
    cell: (engagement) => (
      <span className="text-sm text-muted-foreground tabular-nums">
        {formatPersonDate(engagement.startsOn)}
        {engagement.endsOn
          ? ` â€“ ${formatPersonDate(engagement.endsOn)}`
          : " â€“ present"}
      </span>
    ),
  },
  {
    key: "designation",
    header: "Designation",
    cell: (engagement) => (
      <span className={cn("text-sm text-muted-foreground", TEXT_ONE_LINE)}>
        {engagement.designation ?? "â€”"}
      </span>
    ),
  },
];

function WorkerSummary({ worker }: { worker: Worker }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <SemanticBadge
        tone={worker.status === "ACTIVE" ? "success" : "neutral"}
        label={worker.status}
      />
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

export function PersonWorkerTab({
  person,
}: {
  person: OrganizationPerson;
}) {
  const canViewWorkers = useCan("workforce:workers:view");
  const canManageWorkers = useCan("workforce:workers:manage");
  const [createWorkerOpen, setCreateWorkerOpen] = useState(false);

  const { data: workersPage, isLoading: workersLoading } = useWorkers({
    limit: 1,
    organizationPersonId: person.organizationPersonId,
  });

  const worker = useMemo(
    () =>
      (workersPage?.data ?? []).find(
        (workerRecord) =>
          workerRecord.organizationPersonId === person.organizationPersonId,
      ) ?? null,
    [person.organizationPersonId, workersPage?.data],
  );

  const { data: engagements, isLoading: engagementsLoading } =
    useWorkerEngagements(worker?.workerId ?? "");

  const handleOpenCreateWorker = useCallback(() => {
    setCreateWorkerOpen(true);
  }, []);

  const handleCreateWorkerChange = useCallback((nextOpen: boolean) => {
    setCreateWorkerOpen(nextOpen);
  }, []);

  if (!canViewWorkers) {
    return (
      <PersonTabState
        icon={LockKeyhole}
        title="Workforce access required"
        description="You need workforce permissions to view worker records and engagements."
      />
    );
  }

  if (workersLoading) return <PersonTabContentSkeleton />;

  if (!worker) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <PersonTabState
          icon={BriefcaseBusiness}
          title="No worker record"
          description="Create a worker record only when this person participates in payroll, HR, attendance, or another workforce process. Their directory record remains independent."
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
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
      <WorkerSummary worker={worker} />
      <Separator />
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Engagements
        </p>
        {engagementsLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (engagements ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No engagements recorded yet.
          </p>
        ) : (
          <DataTable
            data={engagements ?? []}
            columns={ENGAGEMENT_COLUMNS}
            getRowKey={(engagement) => engagement.workerEngagementId}
            minWidth="520px"
          />
        )}
      </div>
    </div>
  );
}
