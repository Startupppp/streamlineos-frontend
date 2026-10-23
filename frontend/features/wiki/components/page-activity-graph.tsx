"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import { cn } from "@/lib/utils";

const GRANT_ACTION_PREFIX = "kb.page_grant.";

interface PageActivityEntry {
  id: number;
  action: string;
  at: string;
  actor: { name: string } | null;
}

function activityLabel(action: string): string {
  const isGrant = action.startsWith(GRANT_ACTION_PREFIX);
  const verb = action.slice(action.lastIndexOf(".") + 1).replaceAll("_", " ");
  const label = isGrant ? `access ${verb}` : verb;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function ActivityNode({
  entry,
  isFirst,
  isLast,
}: {
  entry: PageActivityEntry;
  isFirst: boolean;
  isLast: boolean;
}) {
  const actorName = entry.actor?.name ?? null;

  return (
    <li className="grid grid-cols-[1rem_minmax(0,1fr)]">
      <div className="relative flex justify-center">
        {isFirst ? null : (
          <span
            aria-hidden
            className="absolute left-1/2 top-0 h-2.5 w-px -translate-x-1/2 bg-muted-foreground/40"
          />
        )}
        {isLast ? null : (
          <span
            aria-hidden
            className="absolute bottom-0 left-1/2 top-2.5 w-px -translate-x-1/2 bg-muted-foreground/40"
          />
        )}
        <span
          aria-hidden
          className={cn(
            "relative z-[1] mt-[5px] size-2.5 rounded-full border-2 bg-background",
            isFirst ? "border-primary bg-primary" : "border-muted-foreground/70",
          )}
        />
      </div>
      <div className={cn("min-w-0 pl-2", isLast ? "pb-0" : "pb-4")}>
        <p className="text-xs font-medium leading-5 text-foreground">
          {activityLabel(entry.action)}
        </p>
        <p className="text-xs leading-5 text-muted-foreground">
          {actorName ? (
            <>
              {actorName}
              <span aria-hidden> · </span>
            </>
          ) : null}
          <span className="tabular-nums">{kbTimeAgo(entry.at)}</span>
        </p>
      </div>
    </li>
  );
}

export function PageActivityGraph({ entries }: { entries: PageActivityEntry[] }) {
  return (
    <ScrollArea className="max-h-72">
      <ul className="flex flex-col pr-3">
        {entries.map((entry, index) => (
          <ActivityNode
            key={entry.id}
            entry={entry}
            isFirst={index === 0}
            isLast={index === entries.length - 1}
          />
        ))}
      </ul>
    </ScrollArea>
  );
}
