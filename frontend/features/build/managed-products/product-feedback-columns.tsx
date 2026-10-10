"use client";

import { ArrowRightCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/ui/data-table";
import { BUILD_FILTER_ALL } from "@/features/build/shared/use-build-list-filters";
import type { PaginatedFeedbucketSubmissions } from "@/types/feedbucket";
import {
  STATUS_LABELS,
  STATUS_VARIANTS,
  TYPE_LABELS,
  TYPE_VARIANTS,
  formatSubmissionAge,
} from "@/features/build/feedbucket/feedbucket-constants";

export type SubmissionRow = PaginatedFeedbucketSubmissions["data"][number];

export const TYPE_OPTIONS = [
  "bug",
  "idea",
  "feature",
  "question",
  "praise",
  "other",
] as const;

export const STATUS_OPTIONS_VALUES = [
  "open",
  "in_progress",
  "resolved",
  "archived",
] as const;

export const TYPE_FILTER_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All types" },
  { value: "bug", label: "Bug" },
  { value: "idea", label: "Idea" },
  { value: "feature", label: "Feature" },
  { value: "question", label: "Question" },
  { value: "praise", label: "Praise" },
  { value: "other", label: "Other" },
];

export const STATUS_FILTER_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "archived", label: "Archived" },
];

export const LINKED_FILTER_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All" },
  { value: "linked", label: "Linked to ticket" },
  { value: "unlinked", label: "Not linked" },
];

export const DUPLICATE_FILTER_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All submissions" },
  { value: "true", label: "Duplicates only" },
  { value: "false", label: "Not duplicates" },
];

export const SOURCE_CHANNEL_FILTER_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All channels" },
  { value: "widget", label: "Widget" },
  { value: "email", label: "Email" },
  { value: "support", label: "Support" },
  { value: "sales", label: "Sales" },
  { value: "interview", label: "Interview" },
  { value: "survey", label: "Survey" },
  { value: "public_portal", label: "Public portal" },
  { value: "manual", label: "Manual" },
  { value: "import", label: "Import" },
];

export const SENTIMENT_FILTER_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All sentiments" },
  { value: "positive", label: "Positive" },
  { value: "neutral", label: "Neutral" },
  { value: "negative", label: "Negative" },
  { value: "mixed", label: "Mixed" },
];

export const CONSENT_FILTER_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All consent" },
  { value: "granted", label: "Granted" },
  { value: "denied", label: "Denied" },
  { value: "unknown", label: "Unknown" },
];

export const LINKED_OPP_FILTER_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All" },
  { value: "true", label: "Linked to opportunity" },
  { value: "false", label: "Not linked" },
];

export const FILTER_DEFINITIONS = [
  { param: "type", options: [...TYPE_OPTIONS] },
  { param: "status", options: [...STATUS_OPTIONS_VALUES] },
  { param: "linked", options: ["linked", "unlinked"] as const },
  { param: "assigneeId" },
  { param: "duplicate", options: ["true", "false"] as const },
  { param: "from" },
  { param: "to" },
  { param: "sourceChannel" },
  { param: "theme" },
  { param: "sentiment" },
  { param: "consentStatus" },
  { param: "linkedToOpportunity", options: ["true", "false"] as const },
  { param: "segment" },
  { param: "crmOrganizationId" },
  { param: "submission" },
] as const;

export const FEEDBACK_SKELETON_HEADERS = [
  "",
  "Type",
  "Message",
  "Status",
  "Age",
] as const;


const CHANNEL_LABELS: Record<string, string> = {
  widget: "Widget",
  email: "Email",
  support: "Support",
  sales: "Sales",
  interview: "Interview",
  survey: "Survey",
  public_portal: "Portal",
  manual: "Manual",
  import: "Import",
};

const SENTIMENT_TONE: Record<string, string> = {
  positive: "text-success",
  neutral: "text-muted-foreground",
  negative: "text-destructive",
  mixed: "text-warning",
};

export const FEEDBACK_COLUMNS: DataTableColumn<SubmissionRow>[] = [
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
    header: "Request",
    cell: (row) => (
      <span className="max-w-xs text-sm text-foreground line-clamp-2">
        {row.message}
      </span>
    ),
  },
  {
    key: "channel",
    header: "Channel",
    cell: (row) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {CHANNEL_LABELS[row.sourceChannel] ?? row.sourceChannel}
      </span>
    ),
    className: "w-[90px] hidden md:table-cell",
  },
  {
    key: "customer",
    header: "Customer",
    cell: (row) => {
      const name = row.customer?.name ?? row.segment;
      if (!name) return null;
      return (
        <span className="text-xs text-muted-foreground whitespace-nowrap truncate max-w-[120px]">
          {name}
        </span>
      );
    },
    className: "w-[130px] hidden lg:table-cell",
  },
  {
    key: "frequency",
    header: "Freq",
    cell: (row) => (
      <span className="text-xs font-mono tabular-nums text-muted-foreground">
        {row.duplicateCount + 1}
      </span>
    ),
    className: "w-[60px] text-right hidden md:table-cell",
  },
  {
    key: "tags",
    header: "Theme / Sentiment",
    cell: (row) => (
      <div className="flex flex-wrap gap-1">
        {row.theme && (
          <Badge variant="secondary" className="text-xs">
            {row.theme}
          </Badge>
        )}
        {row.sentiment && (
          <span className={`text-xs ${SENTIMENT_TONE[row.sentiment] ?? "text-muted-foreground"}`}>
            {row.sentiment}
          </span>
        )}
      </div>
    ),
    className: "hidden lg:table-cell w-[160px]",
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
    key: "linked",
    header: "Linked",
    cell: (row) => {
      const ticket = row.linkedTicketKey ?? null;
      const oppCount = row.opportunityIds?.length ?? 0;
      if (!ticket && oppCount === 0) return null;
      return (
        <div className="flex flex-col gap-0.5">
          {ticket && <span className="text-xs font-mono text-muted-foreground">{ticket}</span>}
          {oppCount > 0 && <span className="text-xs text-muted-foreground">{oppCount} opp{oppCount !== 1 ? "s" : ""}</span>}
        </div>
      );
    },
    className: "w-[100px] hidden xl:table-cell",
  },
  {
    key: "age",
    header: "Age",
    cell: (row) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatSubmissionAge(row.createdAt)}
      </span>
    ),
    className: "hidden sm:table-cell w-[100px] text-right",
  },
];

export function buildFeedbackColumnsWithActions(opts: {
  canRouteToIntake: boolean;
  onRouteToIntake: (row: SubmissionRow) => void;
}): DataTableColumn<SubmissionRow>[] {
  if (!opts.canRouteToIntake) return FEEDBACK_COLUMNS;
  return [
    ...FEEDBACK_COLUMNS,
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <Button
          variant="ghost"
          size="sm"
          aria-label="Route to Intake"
          data-testid="route-to-intake-btn"
          data-submission-id={row.id}
          onClick={(e) => {
            e.stopPropagation();
            opts.onRouteToIntake(row);
          }}
        >
          <ArrowRightCircle className="h-4 w-4 mr-1" />
          Intake
        </Button>
      ),
      className: "w-[100px] text-right",
    },
  ];
}

