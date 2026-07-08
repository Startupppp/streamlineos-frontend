"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyInboxIllustration } from "@/components/illustrations";
import { useFeedbucketSubmissions } from "@/hooks/api/feedbucket/use-feedbucket-submissions";
import { useFeedbucketWidgets } from "@/hooks/api/feedbucket/use-feedbucket-widgets";
import type {
  FeedbucketSubmission,
  FeedbucketSubmissionType,
  FeedbucketSubmissionStatus,
} from "@/types/feedbucket";

const TYPE_LABELS: Record<FeedbucketSubmissionType, string> = {
  bug: "Bug",
  idea: "Idea",
  feature: "Feature",
  question: "Question",
  praise: "Praise",
  other: "Other",
};

const TYPE_VARIANTS: Record<FeedbucketSubmissionType, "default" | "secondary" | "outline" | "destructive"> = {
  bug: "destructive",
  idea: "default",
  feature: "secondary",
  question: "secondary",
  praise: "default",
  other: "outline",
};

const STATUS_LABELS: Record<FeedbucketSubmissionStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  archived: "Archived",
};

const STATUS_VARIANTS: Record<FeedbucketSubmissionStatus, "default" | "secondary" | "outline"> = {
  open: "default",
  in_progress: "secondary",
  resolved: "outline",
  archived: "outline",
};

const PAGE_SIZE = 25;

function SubmissionThumbnail({ url }: { url: string | null }) {
  if (!url) {
    return <div className="h-10 w-14 rounded border border-border bg-muted flex-shrink-0" />;
  }
  return (
    <img
      src={url}
      alt="Screenshot"
      className="h-10 w-14 rounded border border-border object-cover flex-shrink-0"
    />
  );
}

function AssigneeCell({ submission }: { submission: FeedbucketSubmission }) {
  if (!submission.assignee) {
    return <span className="text-muted-foreground text-xs">Unassigned</span>;
  }
  const fullName = [submission.assignee.firstName, submission.assignee.lastName]
    .filter(Boolean)
    .join(" ");
  const name =
    submission.assignee.name || fullName || submission.assignee.email || "Unknown";
  return <span className="text-sm truncate max-w-[120px]">{name}</span>;
}

export function FeedbucketInboxTable() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [widgetFilter, setWidgetFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data: widgets } = useFeedbucketWidgets();

  const query = {
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    widgetId: widgetFilter !== "all" ? Number(widgetFilter) : undefined,
    type: typeFilter !== "all" ? (typeFilter as FeedbucketSubmissionType) : undefined,
    status: statusFilter !== "all" ? (statusFilter as FeedbucketSubmissionStatus) : undefined,
  };

  const { data, isLoading, isError, refetch } = useFeedbucketSubmissions(query);

  const columns: DataTableColumn<FeedbucketSubmission>[] = [
    {
      key: "screenshot",
      header: "",
      cell: (row) => <SubmissionThumbnail url={row.screenshotUrl} />,
      className: "w-[72px] pr-0",
    },
    {
      key: "type",
      header: "Type",
      cell: (row) => (
        <Badge variant={TYPE_VARIANTS[row.type]} className="text-xs">
          {TYPE_LABELS[row.type]}
        </Badge>
      ),
      className: "w-[90px]",
    },
    {
      key: "message",
      header: "Message",
      cell: (row) => (
        <span className="text-sm text-foreground line-clamp-2 max-w-xs">
          {row.message}
        </span>
      ),
    },
    {
      key: "widget",
      header: "Widget",
      cell: (row) => (
        <span className="text-sm text-muted-foreground truncate max-w-[120px]">
          {row.widget?.name ?? "—"}
        </span>
      ),
      className: "hidden md:table-cell",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant={STATUS_VARIANTS[row.status]} className="text-xs">
          {STATUS_LABELS[row.status]}
        </Badge>
      ),
      className: "w-[110px] hidden sm:table-cell",
    },
    {
      key: "assignee",
      header: "Assignee",
      cell: (row) => <AssigneeCell submission={row} />,
      className: "hidden lg:table-cell w-[140px]",
    },
    {
      key: "age",
      header: "Age",
      cell: (row) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
        </span>
      ),
      className: "hidden sm:table-cell w-[120px] text-right",
    },
  ];

  function handleRowClick(row: FeedbucketSubmission) {
    router.push(`/feedbucket/${row.id}`);
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
  }

  function handleWidgetChange(value: string) {
    setWidgetFilter(value);
    setPage(1);
  }

  function handleTypeChange(value: string) {
    setTypeFilter(value);
    setPage(1);
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <ErrorState description="Failed to load submissions." onRetry={refetch} className="m-4" />;
  }

  return (
    <div className="flex flex-col gap-3 p-4 sm:p-6">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search submissions…"
            value={search}
            onChange={handleSearchChange}
            className="pl-9 h-9"
          />
        </div>
        <Select value={widgetFilter} onValueChange={handleWidgetChange}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder="All Widgets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Widgets</SelectItem>
            {widgets?.map((w) => (
              <SelectItem key={w.id} value={String(w.id)}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={handleTypeChange}>
          <SelectTrigger className="h-9 w-[130px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {(["bug", "idea", "question", "praise", "other"] as FeedbucketSubmissionType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="h-9 w-[130px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {(["open", "in_progress", "resolved", "archived"] as FeedbucketSubmissionStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={data?.data ?? []}
        columns={columns}
        getRowKey={(row) => row.id}
        onRowClick={handleRowClick}
        pagination={{
          mode: "server",
          page,
          pageSize: PAGE_SIZE,
          total: data?.total ?? 0,
          onPageChange: setPage,
        }}
        emptyState={
          <EmptyState
            illustration={<EmptyInboxIllustration className="h-24 w-24" />}
            title="No submissions yet"
            description="Submissions from your feedback widgets will appear here."
            className="flex-1 py-16"
          />
        }
        rowClassName={() => "cursor-pointer"}
      />
    </div>
  );
}
