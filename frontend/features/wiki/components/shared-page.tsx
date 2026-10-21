"use client";

import { useCallback, useMemo, useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { WikiPageCollectionTable } from "./wiki-page-collection-table";
import type { KbPageCollectionItem } from "@/hooks/api/kb/page-collection";
import type { DataTableColumn } from "@/components/ui/data-table.types";
import { kbFormatDate } from "@/features/wiki/lib/kb-date-utils";
import { KB_ACCESS_LABELS } from "./kb-collection-badges";
import { useOrgMembersByIds } from "@/hooks/api/organization";
import { getUserDisplayName } from "@/lib/person-display";

const SHARED_WITH_ME_PARAMS = { sharedWithMe: "1" as const };

function buildSharedColumns(
  membershipToName: Map<number, string>,
): DataTableColumn<KbPageCollectionItem>[] {
  return [
    {
      key: "shared_by",
      header: "Shared by",
      cell: (row) => {
        if (row.sharedBy === null) return "—";
        const mid = row.sharedBy.membershipId;
        if (mid === null) return "—";
        const name = membershipToName.get(mid);
        return name ?? "—";
      },
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
}

export default function SharedPage() {
  const [rows, setRows] = useState<readonly KbPageCollectionItem[]>([]);

  const ownerUserIds = useMemo(
    () =>
      [...new Set(rows.map((r) => r.ownerUserId).filter((id): id is string => id !== null))],
    [rows],
  );

  const { data: ownersPage } = useOrgMembersByIds(ownerUserIds);

  const membershipToName = useMemo(() => {
    const map = new Map<number, string>();
    for (const member of ownersPage?.data ?? []) {
      map.set(member.membershipId, getUserDisplayName({ name: member.name, email: member.email }));
    }
    return map;
  }, [ownersPage]);

  const sharedColumns = useMemo(
    () => buildSharedColumns(membershipToName),
    [membershipToName],
  );

  const handleRowsChange = useCallback((nextRows: readonly KbPageCollectionItem[]) => {
    setRows(nextRows);
  }, []);

  return (
    <PageWrapper
      title="Shared with me"
      subtitle="Pages explicitly shared with you"
    >
      <WikiPageCollectionTable
        fixedParams={SHARED_WITH_ME_PARAMS}
        additionalColumns={sharedColumns}
        emptyTitle="Nothing shared with you"
        emptyDescription="Pages explicitly shared with your account will appear here."
        accessLostTitle="Your access may have changed"
        accessLostDescription="Some pages you had access to may no longer be shared with you."
        onRowsChange={handleRowsChange}
      />
    </PageWrapper>
  );
}
