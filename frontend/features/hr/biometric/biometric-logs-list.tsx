"use client";

import { ScanFace } from "lucide-react";
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
import { useBiometricLogs } from "@/hooks/api/hr/biometric";
import { format } from "date-fns";

export function BiometricLogsList() {
  const { data: logs, isLoading } = useBiometricLogs();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!logs?.length) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 h-64 gap-3 text-center">
        <ScanFace className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">No punch logs</p>
        <p className="text-xs text-muted-foreground/70">Biometric punch records will appear here after syncing</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/80 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/80">
            <TableHead className="text-xs font-semibold">Device</TableHead>
            <TableHead className="text-xs font-semibold">Employee</TableHead>
            <TableHead className="text-xs font-semibold">Punch Time</TableHead>
            <TableHead className="text-xs font-semibold">Type</TableHead>
            <TableHead className="text-xs font-semibold">Processed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="text-sm">Device #{log.deviceId}</TableCell>
              <TableCell className="text-sm">{log.userId ?? "—"}</TableCell>
              <TableCell className="text-sm">{format(new Date(log.punchTime), "dd MMM yyyy, HH:mm")}</TableCell>
              <TableCell>
                <Badge
                  variant={log.punchType === "IN" ? "default" : "secondary"}
                  className="text-[11px]"
                >
                  {log.punchType}
                </Badge>
              </TableCell>
              <TableCell>
                <span className={`text-xs font-medium ${log.processed ? "text-emerald-600" : "text-amber-600"}`}>
                  {log.processed ? "Yes" : "Pending"}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
