"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { WikiPageCollectionTable } from "./wiki-page-collection-table";
import type { KbPageCollectionItem } from "@/hooks/api/kb/page-collection";
import type { DataTableColumn } from "@/components/ui/data-table.types";
import { kbFormatDate } from "@/features/wiki/lib/kb-date-utils";
import { KB_ACCESS_LABELS } from "./kb-collection-badges";

const SHARED_WITH_ME_PARAMS = { sharedWithMe: "1" as const };

const SHARED_COLUMNS: DataTableColumn<KbPageCollectionItem>[] = [
  {
    key: "shared_by",
    header: "Shared by",
    cell: (row) =>
      row.sharedBy !== null
        ? `Member #${row.sharedBy.membershipId ?? "?"}`
        : "—",
  },
  {
    key: "shared_at",
    header: "Shared",
    cell: (row) => (
      <span className="tabular-nums text-muted-foreground text-sm">
        {row.sharedBy !== null ? kbFormatDate(row.sharedBy.at) : "—"}
      </span>
    ),
  },
  {
    key: "access_level",
    header: "Access",
    cell: (row) =>
      row.sharedBy !== null
        ? (KB_ACCESS_LABELS[row.sharedBy.access] ?? row.sharedBy.access)
        : "—",
  },
];

export default function SharedPage() {
  return (
    <PageWrapper
      title="Shared with me"
      subtitle="Pages explicitly shared with you"
    >
      <WikiPageCollectionTable
        fixedParams={SHARED_WITH_ME_PARAMS}
        additionalColumns={SHARED_COLUMNS}
        emptyTitle="Nothing shared with you"
        emptyDescription="Pages explicitly shared with your account will appear here."
        accessLostTitle="Your access may have changed"
        accessLostDescription="Some pages you had access to may no longer be shared with you."
      />
    </PageWrapper>
  );
}
