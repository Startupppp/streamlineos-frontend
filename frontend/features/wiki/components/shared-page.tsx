"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { WikiPageCollectionTable } from "./wiki-page-collection-table";
import type { KbPageCollectionItem } from "@/hooks/api/kb/page-collection";
import type { DataTableColumn } from "@/components/ui/data-table.types";
import { kbFormatDate } from "@/features/wiki/lib/kb-date-utils";
import { KB_ACCESS_LABELS } from "./kb-collection-badges";
import { useOrgMembersByIds } from "@/hooks/api/organization";
import { getUserDisplayName } from "@/lib/person-display";
import { useKbSpaces } from "@/hooks/api/kb/spaces";

const SHARED_WITH_ME_PARAMS = { sharedWithMe: "1" as const };

function buildSharedColumns(
  membershipToName: Map<number, string>,
  spaceNameById: Map<number, string>,
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
      key: "expires",
      header: "Expires",
      cell: (row) => (
        <span className="tabular-nums text-muted-foreground text-sm">
          {row.sharedBy?.expiresAt != null ? kbFormatDate(row.sharedBy.expiresAt) : "Never"}
        </span>
      ),
    },
    {
      key: "location",
      header: "Location",
      cell: (row) => {
        if (row.spaceId !== null) {
          return spaceNameById.get(row.spaceId) ?? "Team folder";
        }
        return "My files";
      },
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

  const ownerUserIds = [...new Set(rows.map((r) => r.ownerUserId).filter((id): id is string => id !== null))];

  const { data: ownersPage } = useOrgMembersByIds(ownerUserIds);
  const { data: spacesPage } = useKbSpaces();

  const membershipToName = new Map<number, string>();
  for (const member of ownersPage?.data ?? []) {
    membershipToName.set(member.membershipId, getUserDisplayName({ name: member.name, email: member.email }));
  }

  const spaceNameById = new Map<number, string>();
  for (const space of spacesPage?.data ?? []) {
    spaceNameById.set(space.id, space.name);
  }

  const sharedColumns = buildSharedColumns(membershipToName, spaceNameById);

  function handleRowsChange(nextRows: readonly KbPageCollectionItem[]) {
    setRows(nextRows);
  }

  return (
    <PageWrapper
      title="Shared with me"
      subtitle="Files explicitly shared with you"
    >
      <WikiPageCollectionTable
        fixedParams={SHARED_WITH_ME_PARAMS}
        additionalColumns={sharedColumns}
        emptyTitle="Nothing shared with you"
        emptyDescription="Files explicitly shared with your account will appear here."
        accessLostTitle="Your access may have changed"
        accessLostDescription="Some files you had access to may no longer be shared with you."
        onRowsChange={handleRowsChange}
      />
    </PageWrapper>
  );
}
