import type { DataTableColumn } from "@/components/ui/data-table";
import type { SubmissionRow } from "../product-feedback-columns";
import { buildFeedbackColumnsWithActions } from "../product-feedback-columns";
import {
  ChannelBadge,
  FrequencyBadge,
  SentimentBadge,
  ThemeBadge,
} from "./feedback-signal-badges";

function ChannelCell(row: SubmissionRow) {
  return <ChannelBadge channel={row.sourceChannel} />;
}

function FrequencyCell(row: SubmissionRow) {
  return (
    <span className="inline-flex justify-end">
      <FrequencyBadge duplicateCount={row.duplicateCount} />
    </span>
  );
}

function TagsCell(row: SubmissionRow) {
  if (!row.theme && !row.sentiment) return null;
  return (
    <div className="flex flex-wrap gap-1">
      <ThemeBadge theme={row.theme} />
      <SentimentBadge sentiment={row.sentiment} />
    </div>
  );
}

function withSignalCells(
  columns: DataTableColumn<SubmissionRow>[],
): DataTableColumn<SubmissionRow>[] {
  return columns.map((column) => {
    if (column.key === "channel") return { ...column, cell: ChannelCell };
    if (column.key === "frequency") return { ...column, cell: FrequencyCell };
    if (column.key === "tags") return { ...column, cell: TagsCell };
    return column;
  });
}

export function buildCraftedFeedbackColumns(opts: {
  canRouteToIntake: boolean;
  onRouteToIntake: (row: SubmissionRow) => void;
}): DataTableColumn<SubmissionRow>[] {
  return withSignalCells(buildFeedbackColumnsWithActions(opts));
}
