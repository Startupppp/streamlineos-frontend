"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import type { RfTask } from "@/hooks/api/inventory/rf-queue";

export function RfQueueList({
  tasks,
  icon: Icon,
}: {
  tasks: readonly RfTask[];
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {tasks.map((task) => (
        <li key={`${task.kind}:${task.id}`}>
          <Link
            href={task.href}
            className="flex items-center gap-3 rounded-xl border border-border p-4 active:bg-muted"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-mono text-sm font-semibold">
                {task.reference}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {task.summary}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
