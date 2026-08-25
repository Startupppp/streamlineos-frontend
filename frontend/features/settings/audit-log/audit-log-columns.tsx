"use client";

import { format } from "date-fns";
import { InfoIcon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { type DataTableColumn } from "@/components/ui/data-table";
import { resolveImageUrl } from "@/lib/utils";
import { getInitials } from "@/lib/format-utils";
import { actionBadgeClass, formatActionLabel } from "./audit-log-constants";
import type { AuditLogRow } from "@/hooks/api/audit-log";

export const AUDIT_LOG_COLUMNS: DataTableColumn<AuditLogRow>[] = [
  {
    key: "createdAt",
    header: "Timestamp",
    cell: (log) => (
      <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
        {format(new Date(log.createdAt), "dd MMM, HH:mm:ss")}
      </span>
    ),
    className: "w-[170px]",
  },
  {
    key: "user",
    header: "User",
    cell: (log) => (
      <div className="flex items-center gap-2 min-w-[140px]">
        <Avatar className="h-6 w-6 shrink-0">
          <AvatarImage src={resolveImageUrl(log.userImage)} />
          <AvatarFallback className="text-micro">{getInitials(log.userName)}</AvatarFallback>
        </Avatar>
        <span className="text-label font-medium truncate max-w-[120px]">
          {log.userName ?? log.userEmail ?? "Unknown user"}
        </span>
      </div>
    ),
    className: "w-[190px]",
  },
  {
    key: "action",
    header: "Action",
    cell: (log) => (
      <Badge variant="outline" className={`text-dense ${actionBadgeClass(log.action)}`}>
        {formatActionLabel(log.action)}
      </Badge>
    ),
  },
  {
    key: "entity",
    header: "Entity",
    cell: (log) => (
      <span className="text-xs text-muted-foreground capitalize whitespace-nowrap">
        {log.targetType ?? "—"}
      </span>
    ),
    className: "w-[110px]",
  },
  {
    key: "ipAddress",
    header: "IP Address",
    cell: (log) => (
      <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
        {log.ipAddress ?? "—"}
      </span>
    ),
    className: "w-[110px]",
  },
  {
    key: "details",
    header: "",
    cell: () => (
      <AnimatedIconButton
        icon={InfoIcon}
        iconSize={14}
        variant="ghost"
        size="icon"
        className="w-7"
        aria-label="View details"
        iconClassName="text-muted-foreground"
      />
    ),
    className: "w-[50px]",
  },
];
