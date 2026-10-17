"use client";

import { BUILD_FILTER_ALL } from "@/features/build/shared/use-build-list-filters";
import type { PaginatedFeedbucketSubmissions } from "@/types/feedbucket";

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
  { value: "feedbucket", label: "Feedbucket" },
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
  { param: "ticket" },
  { param: "ticketProject" },
] as const;

export const FEEDBACK_SKELETON_HEADERS = [
  "",
  "Type",
  "Message",
  "Status",
  "Age",
  "Updated",
] as const;
