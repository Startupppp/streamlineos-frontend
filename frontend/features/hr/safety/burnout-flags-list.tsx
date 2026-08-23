"use client";

import { useMemo } from "react";
import { useBurnoutFlags } from "@/hooks/api/hr/safety";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Loader2, AlertTriangle } from "lucide-react";
import { useOrgMembersByIds } from "@/hooks/api/organization";
import { getUserDisplayName, type NamedUser } from "@/lib/person-display";

export function BurnoutFlagsList() {
  const { data, isLoading } = useBurnoutFlags();

  const userIds = useMemo(
    () => [...new Set((data ?? []).map((f) => f.userId))],
    [data],
  );
  const { data: membersData } = useOrgMembersByIds(userIds);

  const memberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of membersData?.data ?? []) {
      map.set(member.userId, { name: member.name, email: member.email });
    }
    return map;
  }, [membersData]);

  return (
    <Card className="p-4 bg-card border border-border rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-orange-500" />
        <p className="text-sm font-semibold text-foreground">Burnout Risk Signals</p>
        <p className="text-xs text-muted-foreground ml-auto">Last 7 days</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-20">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : !data?.length ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          No burnout signals detected
        </p>
      ) : (
        <div className="space-y-2">
          {data.map((flag) => (
            <div
              key={flag.userId}
              className="flex items-center justify-between gap-2 rounded-lg border bg-orange-50 border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/30 px-3 py-2 min-w-0"
            >
              <div className="min-w-0 flex-1">
                <TruncatedText text={getUserDisplayName(memberById.get(flag.userId))} className="text-xs font-medium text-foreground" />
                <p className="text-xs text-muted-foreground">
                  {flag.checkCount} check-in{flag.checkCount !== 1 ? "s" : ""}
                </p>
              </div>
              <Badge variant="outline" className="text-orange-700 border-orange-300 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30 text-xs">
                Avg {flag.avgScore.toFixed(1)} / 10
              </Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
