"use client";

import { useState } from "react";
import { History, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { useLoginHistory } from "@/lib/api/hooks/auth";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SuccessFilter = "all" | "success" | "failure";

function LoginHistorySkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-60 gap-3 text-muted-foreground">
      <History className="h-10 w-10 opacity-30" />
      <p className="text-sm">No login history found</p>
    </div>
  );
}

export default function LoginHistoryPage() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<SuccessFilter>("all");

  const successParam =
    filter === "success" ? true : filter === "failure" ? false : undefined;

  const { data, isLoading } = useLoginHistory({ page, success: successParam });

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <PageWrapper
      title="Login History"
      subtitle="A record of all sign-in events for your account."
      filters={
        <div className="flex items-center gap-1">
          {(["all", "success", "failure"] as SuccessFilter[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "secondary" : "ghost"}
              size="sm"
              className="capitalize h-7 px-2.5 text-xs"
              onClick={() => {
                setFilter(f);
                setPage(1);
              }}
            >
              {f}
            </Button>
          ))}
        </div>
      }
    >
      {isLoading ? (
        <LoginHistorySkeleton />
      ) : !data || data.data.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>User Agent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {format(new Date(entry.createdAt), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="font-medium">{entry.event}</TableCell>
                  <TableCell>
                    {entry.success ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200/60">
                        Success
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Failed</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {entry.ipAddress ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {entry.userAgent ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
