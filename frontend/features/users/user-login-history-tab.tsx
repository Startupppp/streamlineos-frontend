"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useUserLoginHistory } from "@/hooks/api/users";
import {
  History,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";

interface UserLoginHistoryTabProps {
  userId: string;
}

function parseUserAgent(ua: string | null): string {
  if (!ua) return "Unknown";
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Safari")) return "Safari";
  return "Unknown browser";
}

export function UserLoginHistoryTab({ userId }: UserLoginHistoryTabProps) {
  const [page, setPage] = useState(1);
  const [successFilter, setSuccessFilter] = useState<boolean | undefined>(
    undefined,
  );

  const { data, isLoading } = useUserLoginHistory(userId, {
    page,
    limit: 15,
    success: successFilter,
  });

  const entries = data?.data ?? [];
  const pagination = data?.pagination;

  if (isLoading) {
    return (
      <div className="space-y-2 pt-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center gap-2">
        <Button
          variant={successFilter === undefined ? "secondary" : "outline"}
          size="sm"
          className="h-7 text-xs"
          onClick={() => {
            setSuccessFilter(undefined);
            setPage(1);
          }}
        >
          All
        </Button>
        <Button
          variant={successFilter === true ? "secondary" : "outline"}
          size="sm"
          className="h-7 text-xs"
          onClick={() => {
            setSuccessFilter(true);
            setPage(1);
          }}
        >
          <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
          Successful
        </Button>
        <Button
          variant={successFilter === false ? "secondary" : "outline"}
          size="sm"
          className="h-7 text-xs"
          onClick={() => {
            setSuccessFilter(false);
            setPage(1);
          }}
        >
          <XCircle className="h-3 w-3 mr-1 text-red-500" />
          Failed
        </Button>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          compact
          illustration={
            <History className="h-10 w-10 text-muted-foreground/40" />
          }
          title="No login history"
          description="No login events recorded for this user."
        />
      ) : (
        <div className="space-y-1.5">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 rounded-md border px-3 py-2.5 text-xs"
            >
              <div className="mt-0.5">
                {entry.success ? (
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{entry.event}</span>
                  {entry.failureReason && (
                    <Badge
                      variant="destructive"
                      className="text-[10px] h-4 px-1"
                    >
                      {entry.failureReason}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-muted-foreground">
                  {entry.ipAddress && (
                    <span className="font-mono">{entry.ipAddress}</span>
                  )}
                  <span>{parseUserAgent(entry.userAgent)}</span>
                  {(entry.city || entry.country) && (
                    <span>
                      {[entry.city, entry.country].filter(Boolean).join(", ")}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-muted-foreground shrink-0 mt-0.5">
                {format(new Date(entry.createdAt), "MMM d, HH:mm")}
              </span>
            </div>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span>{pagination.total} events</span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="px-1">
              {page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() =>
                setPage((p) => Math.min(pagination.totalPages, p + 1))
              }
              disabled={page === pagination.totalPages}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
