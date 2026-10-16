"use client";

import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { resolveImageUrl } from "@/lib/utils";
import { getInitials } from "@/lib/format-utils";
import { formatDateTimeInOrgTz } from "@/lib/date-utils";
import { useOrgTimeZone } from "@/hooks/api/org-display";
import { actionBadgeClass } from "./audit-log-constants";
import type { AuditLogRow } from "@/hooks/api/audit-log";

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-micro font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        {label}
      </p>
      {children}
    </div>
  );
}

interface SettingChange {
  field: string;
  from: string;
  to: string;
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return typeof value === "string" ? value : JSON.stringify(value);
}

function readChanges(metadata: AuditLogRow["metadata"]): SettingChange[] {
  const changes = metadata?.changes;
  if (typeof changes !== "object" || changes === null) return [];
  const rows: SettingChange[] = [];
  for (const [field, change] of Object.entries(changes)) {
    if (typeof change !== "object" || change === null || !("from" in change) || !("to" in change)) continue;
    rows.push({ field, from: displayValue(change.from), to: displayValue(change.to) });
  }
  return rows;
}

export function LogDetailSheet({ log, onClose }: { log: AuditLogRow; onClose: () => void }) {
  const orgTz = useOrgTimeZone();
  const changes = readChanges(log.metadata);
  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="flex flex-col p-0 sm:max-w-[420px]">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Event Details
          </SheetTitle>
        </SheetHeader>
        <SheetBody className="px-6 py-5 space-y-4">
          <DetailField label="Action">
            <Badge variant="outline" className={`text-xs ${actionBadgeClass(log.action)}`}>
              {log.action}
            </Badge>
          </DetailField>
          <DetailField label="User">
            <div className="flex items-center gap-2.5">
              <Avatar className="w-7">
                <AvatarImage src={resolveImageUrl(log.userImage)} />
                <AvatarFallback className="text-micro">{getInitials(log.userName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight truncate">{log.userName ?? "Unknown"}</p>
                <p className="text-xs text-muted-foreground truncate">{log.userEmail}</p>
              </div>
            </div>
          </DetailField>
          {log.targetType && (
            <DetailField label="Target">
              <p className="text-sm font-medium capitalize">{log.targetType}</p>
            </DetailField>
          )}
          <DetailField label="Timestamp">
            <p className="text-sm">{formatDateTimeInOrgTz(log.createdAt, orgTz)}</p>
          </DetailField>
          {log.ipAddress && (
            <DetailField label="IP Address">
              <p className="text-sm font-mono">{log.ipAddress}</p>
            </DetailField>
          )}
          {changes.length > 0 && (
            <DetailField label="Changes">
              <ul className="space-y-1.5 text-sm">
                {changes.map((change) => (
                  <li key={change.field} className="wrap-break-word">
                    <span className="font-mono text-xs text-muted-foreground">{change.field}</span>
                    <span className="block">
                      <span className="text-muted-foreground line-through">{change.from}</span>
                      {" → "}
                      <span className="font-medium">{change.to}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </DetailField>
          )}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <DetailField label="Metadata">
              <pre className="text-dense bg-muted/60 rounded-md p-3 border text-foreground overflow-y-auto overflow-x-hidden whitespace-pre-wrap wrap-break-word max-h-none h-[calc(100dvh-360px)] min-h-[120px]">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </DetailField>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
