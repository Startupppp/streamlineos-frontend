"use client";

import { useOrgHeadcount } from "@/hooks/api/hr/hr-org";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";

interface Props {
  groupBy: "department" | "location" | "role";
}

export function HeadcountStats({ groupBy }: Props) {
  const { data, isLoading } = useOrgHeadcount(groupBy);

  if (isLoading) {
    return (
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  const total = data.reduce((sum, g) => sum + g.count, 0);

  return (
    <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 mb-4">
      <Card className="rounded-xl border border-border bg-primary text-primary-foreground shadow-sm">
        <CardContent className="p-3 flex items-center gap-3">
          <Users className="h-5 w-5 shrink-0 opacity-80" />
          <div>
            <p className="text-xl font-bold tabular-nums">{total}</p>
            <p className="text-[11px] font-medium uppercase tracking-wider opacity-80">
              Total
            </p>
          </div>
        </CardContent>
      </Card>
      {data.slice(0, 7).map((group) => (
        <Card
          key={String(group.groupId ?? group.groupName)}
          className="rounded-xl border border-border bg-card shadow-sm"
        >
          <CardContent className="p-3">
            <p className="text-xl font-bold tabular-nums text-foreground">
              {group.count}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {group.groupName ?? "Unknown"}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
