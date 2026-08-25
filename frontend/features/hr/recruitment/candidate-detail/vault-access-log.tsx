"use client";

import { format } from "date-fns";
import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useVaultAccessLogs } from "@/hooks/api/hr/recruitment";
import { useSession } from "next-auth/react";
import { TruncatedText } from "@/components/ui/truncated-text";

interface VaultAccessLogProps {
  candidateId: number;
}

export function VaultAccessLog({ candidateId }: VaultAccessLogProps) {
  const { data: session } = useSession();
  const role = session?.user?.role as string | undefined;
  const isHr = role && ["FINAL", "HR", "ADMIN"].includes(role);

  const { data: logs, isLoading } = useVaultAccessLogs(isHr ? candidateId : 0);

  if (!isHr) return null;

  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-sm font-medium">Access Log</CardTitle>
        <span className="text-xs text-muted-foreground ml-auto">HR only</span>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        ) : !logs?.length ? (
          <p className="text-xs text-muted-foreground py-3 text-center">
            No access events recorded.
          </p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-2 py-1 text-xs">
                <Badge
                  variant={log.action === "DOWNLOAD" ? "default" : "secondary"}
                  className="text-micro px-1 py-0 shrink-0"
                >
                  {log.action}
                </Badge>
                <TruncatedText text={log.fileName} className="font-medium flex-1" />
                <span className="text-muted-foreground shrink-0">{log.accessorDisplayName}</span>
                <span className="text-muted-foreground shrink-0 tabular-nums">
                  {log.accessedAt ? format(new Date(log.accessedAt), "dd MMM, HH:mm") : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
