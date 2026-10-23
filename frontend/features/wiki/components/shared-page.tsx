"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { WikiPageCollectionTable, collectionCountSubtitle } from "./wiki-page-collection-table";
import type { KbPageCollectionItem } from "@/hooks/api/kb/page-collection";
import type { DataTableColumn } from "@/components/ui/data-table.types";
import { kbFormatDate } from "@/features/wiki/lib/kb-date-utils";
import { KB_ACCESS_LABELS } from "./kb-collection-badges";
import { useOrgMembersByIds } from "@/hooks/api/organization";
import { getUserDisplayName } from "@/lib/person-display";
import { useKbSpaces } from "@/hooks/api/kb/spaces";

const SHARED_WITH_ME_PARAMS = { sharedWithMe: "1" as const };

function buildSharedColumns(
  userIdToName: Map<string, string>,
  spaceNameById: Map<number, string>,
): DataTableColumn<KbPageCollectionItem>[] {
  return [
    {
      key: "shared_by",
      header: "Shared by",
      cell: (row) => {
        const sharerId = row.sharedBy?.userId ?? null;
        if (sharerId === null) return "—";
        return userIdToName.get(sharerId) ?? "—";
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
          {row.sharedBy?.expiresAt != null
            ? kbFormatDate(row.sharedBy.expiresAt)
            : "Never"}
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
  const [documentCountLabel, setDocumentCountLabel] = useState<string | null>(null);

  const sharerUserIds = [
    ...new Set(
      rows
        .map((r) => r.sharedBy?.userId ?? null)
        .filter((id): id is string => id !== null),
    ),
  ];

  const { data: sharersPage } = useOrgMembersByIds(sharerUserIds);
  const { data: spacesPage } = useKbSpaces();

  const userIdToName = new Map<string, string>();
  for (const member of sharersPage?.data ?? []) {
    userIdToName.set(
      member.userId,
      getUserDisplayName({ name: member.name, email: member.email }),
    );
  }

  const spaceNameById = new Map<number, string>();
  for (const space of spacesPage?.data ?? []) {
    spaceNameById.set(space.id, space.name);
  }

  const sharedColumns = buildSharedColumns(userIdToName, spaceNameById);

  function handleRowsChange(nextRows: readonly KbPageCollectionItem[]) {
    setRows(nextRows);
  }

  return (
    <PageWrapper
      title="Shared with me"
      subtitle={collectionCountSubtitle("Files explicitly shared with you", documentCountLabel)}
    >
      <WikiPageCollectionTable
        fixedParams={SHARED_WITH_ME_PARAMS}
        additionalColumns={sharedColumns}
        emptyTitle="Nothing shared with you"
        emptyDescription="Files explicitly shared with your account will appear here."
        accessLostTitle="Your access may have changed"
        accessLostDescription="Some files you had access to may no longer be shared with you."
        onRowsChange={handleRowsChange}
        onDocumentCountLabelChange={setDocumentCountLabel}
      />
    </PageWrapper>
  );
}
