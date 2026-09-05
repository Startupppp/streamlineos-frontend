"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import type { RfTask } from "@/hooks/api/inventory/rf-queue";

/**
 * NEO-5 / T09 — one tap per task, shared by the per-kind RF queues.
 *
 * `/inventory/rf/pick` and `/inventory/rf/putaway` are the same list of the same
 * shape filtered to one task type, and writing it twice is how two screens for
 * one operator drift apart. The list is a `<ul>` of links, deliberately: a
 * picker reads one line, taps it, and is on the task. There is no column header
 * to explain the row, because the row says what it is.
 *
 * Not shared with `/inventory/rf` itself. That screen mixes three task kinds and
 * carries a per-kind badge this one does not need — every row here is the same
 * kind, and repeating it on every line would be noise on a 375px screen.
 */
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
