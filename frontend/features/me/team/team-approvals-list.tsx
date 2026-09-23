"use client";

import Link from "next/link";
import { format, isBefore, parseISO } from "date-fns";
import { CalendarCheck, ClipboardList, Clock, Home as HomeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { ManagerHomeApproval } from "@/hooks/api/hr/manager-home-schema";

const KIND_ICON: Record<ManagerHomeApproval["kind"], typeof Clock> = {
  leave: CalendarCheck,
  wfh: HomeIcon,
  timesheet: Clock,
  workflow: ClipboardList,
};

const KIND_ACTION: Record<ManagerHomeApproval["kind"], string> = {
  leave: "Review leave",
  wfh: "Review request",
  timesheet: "Review timesheet",
  workflow: "Open approval",
};

interface TeamApprovalsListProps {
  items: ManagerHomeApproval[];
  now?: Date;
}

export function TeamApprovalsList({ items, now = new Date() }: TeamApprovalsListProps) {
  const danger = statusToneClasses("danger");
  if (items.length === 0) return <p className="text-dense text-muted-foreground">Nothing is waiting on your decision.</p>;
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => {
        const Icon = KIND_ICON[item.kind];
        const overdue = item.dueAt !== null && isBefore(parseISO(item.dueAt), now);
        return (
          <li key={`${item.kind}-${item.id}`} className="flex items-start gap-3 py-2.5">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">
                {item.subjectName ?? "Team member"}
                <span className="text-muted-foreground"> · {item.summary}</span>
              </p>
              <p className={cn("text-micro", overdue ? danger.ink : "text-muted-foreground")}>
                Requested {format(parseISO(item.requestedAt), "MMM d")}
                {item.dueAt ? ` · ${overdue ? "overdue since" : "due"} ${format(parseISO(item.dueAt), "MMM d, h:mm a")}` : ""}
              </p>
            </div>
            <Button size="sm" variant="outline" className="h-7 shrink-0 text-xs" asChild>
              <Link href={item.href}>{KIND_ACTION[item.kind]}</Link>
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
