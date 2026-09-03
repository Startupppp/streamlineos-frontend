"use client";

import { memo, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getUserDisplayName, getUserInitials, type NamedUser } from "@/lib/person-display";
import { resolveImageUrl } from "@/lib/utils";
import { formatMoneyCompact } from "@/lib/format-utils";
import { useOrgDisplay } from "@/hooks/api/org-display";

export type MemberBreakdownRow = { userId: string; hours: number; cost: number };

const MemberBreakdownCell = memo(function MemberBreakdownCell({
  displayName,
  initials,
  email,
  image,
}: {
  displayName: string;
  initials: string;
  email: string | null;
  image?: string | null;
}) {
  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-6 w-6 shrink-0">
        <AvatarImage src={resolveImageUrl(image)} />
        <AvatarFallback className="text-micro bg-primary/10 text-primary font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <TruncatedText text={displayName} className="text-sm font-medium" />
        {email ? (
          <TruncatedText text={email} className="text-dense text-muted-foreground" />
        ) : null}
      </div>
    </div>
  );
});

interface UseMemberCostColumnsParams {
  resolveMemberUser: (userId: string) => NamedUser | null;
  resolveMemberImage: (userId: string) => string | null | undefined;
}

export function useMemberCostColumns({
  resolveMemberUser,
  resolveMemberImage,
}: UseMemberCostColumnsParams): DataTableColumn<MemberBreakdownRow>[] {
  const display = useOrgDisplay();
  return useMemo((): DataTableColumn<MemberBreakdownRow>[] => [
    {
      key: "member",
      header: "Member",
      cell: (row) => {
        const user = resolveMemberUser(row.userId);
        return (
          <MemberBreakdownCell
            displayName={user ? getUserDisplayName(user) : "Unknown"}
            initials={user ? getUserInitials(user) : "?"}
            email={user?.email ?? null}
            image={resolveMemberImage(row.userId)}
          />
        );
      },
    },
    {
      key: "hours",
      header: "Hours",
      className: "text-right w-[120px]",
      headerClassName: "text-right",
      cell: (row) => (
        <span className="font-mono text-sm text-muted-foreground whitespace-nowrap">
          {row.hours.toFixed(1)} hrs
        </span>
      ),
    },
    {
      key: "cost",
      header: "Cost",
      className: "text-right w-[120px]",
      headerClassName: "text-right",
      cell: (row) => (
        <span className="font-mono text-sm font-medium whitespace-nowrap">{formatMoneyCompact(row.cost, display)}</span>
      ),
    },
  ], [resolveMemberUser, resolveMemberImage, display]);
}
