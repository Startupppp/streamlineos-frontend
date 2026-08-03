"use client";

import { memo, useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/common/use-mobile";
import { cn } from "@/lib/utils";
import type { AllWorkTicket } from "@/types/projects";

const PRIORITY_ORDER = ["URGENT", "HIGH", "MEDIUM", "LOW"] as const;
const PRIORITY_LABELS: Record<string, string> = {
  URGENT: "Urgent",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};
const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "bg-red-500",
  HIGH: "bg-orange-400",
  MEDIUM: "bg-amber-400",
  LOW: "bg-blue-400",
};

interface GroupRow {
  key: string;
  label: string;
  count: number;
  color?: string | null;
}

interface SidebarRowProps {
  row: GroupRow;
  isActive: boolean;
  onToggle: (key: string) => void;
  colorDotClass?: string;
}

const SidebarRow = memo(function SidebarRow({
  row,
  isActive,
  onToggle,
  colorDotClass,
}: SidebarRowProps) {
  function handleClick() {
    onToggle(row.key);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-foreground hover:bg-muted/60",
      )}
    >
      {colorDotClass ? (
        <span className={cn("h-2 w-2 shrink-0 rounded-full", colorDotClass)} />
      ) : row.color ? (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: row.color }}
        />
      ) : null}
      <span className="min-w-0 flex-1 truncate">{row.label}</span>
      <span
        className={cn(
          "shrink-0 rounded px-1 py-0.5 text-[10px] font-medium tabular-nums",
          isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        {row.count}
      </span>
    </button>
  );
});

interface GroupingSidebarBodyProps {
  tickets: AllWorkTicket[] | undefined;
  isLoading: boolean;
  className?: string;
}

function GroupingSidebarBody({
  tickets,
  isLoading,
  className,
}: GroupingSidebarBodyProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const labelsParam = searchParams.get("labels") ?? "";
  const priorityParam = searchParams.get("priority") ?? "";
  const projectIdsParam = searchParams.get("projectIds") ?? "";

  const selectedLabels = useMemo(
    () => labelsParam.split(",").filter(Boolean),
    [labelsParam],
  );
  const selectedPriorities = useMemo(
    () => priorityParam.split(",").filter(Boolean),
    [priorityParam],
  );
  const selectedProjects = useMemo(
    () => projectIdsParam.split(",").filter(Boolean),
    [projectIdsParam],
  );

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const toggleMulti = useCallback(
    (key: string, current: string[], value: string) => {
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      setParam(key, next.join(","));
    },
    [setParam],
  );

  function handleToggleLabel(id: string) {
    toggleMulti("labels", selectedLabels, id);
  }

  function handleTogglePriority(p: string) {
    toggleMulti("priority", selectedPriorities, p);
  }

  function handleToggleProject(id: string) {
    toggleMulti("projectIds", selectedProjects, id);
  }

  const labelGroups = useMemo<GroupRow[]>(() => {
    if (!tickets) return [];
    const counts = new Map<string, { label: string; color: string | null; count: number }>();
    for (const t of tickets) {
      if (!t.labels || t.labels.length === 0) continue;
      for (const l of t.labels) {
        const existing = counts.get(String(l.id));
        if (existing) {
          existing.count += 1;
        } else {
          counts.set(String(l.id), { label: l.name, color: l.color, count: 1 });
        }
      }
    }
    return Array.from(counts.entries())
      .map(([key, v]) => ({ key, label: v.label, count: v.count, color: v.color }))
      .sort((a, b) => b.count - a.count);
  }, [tickets]);

  const priorityGroups = useMemo<GroupRow[]>(() => {
    if (!tickets) return [];
    const counts = new Map<string, number>();
    for (const t of tickets) {
      const p = t.priority ?? "LOW";
      counts.set(p, (counts.get(p) ?? 0) + 1);
    }
    return PRIORITY_ORDER.filter((p) => counts.has(p)).map((p) => ({
      key: p,
      label: PRIORITY_LABELS[p] ?? p,
      count: counts.get(p) ?? 0,
    }));
  }, [tickets]);

  const projectGroups = useMemo<GroupRow[]>(() => {
    if (!tickets) return [];
    const counts = new Map<string, { name: string; key: string; count: number }>();
    for (const t of tickets) {
      const existing = counts.get(String(t.projectId));
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(String(t.projectId), {
          name: t.projectName,
          key: t.projectKey,
          count: 1,
        });
      }
    }
    return Array.from(counts.entries())
      .map(([id, v]) => ({ key: id, label: `${v.key} — ${v.name}`, count: v.count }))
      .sort((a, b) => b.count - a.count);
  }, [tickets]);

  return (
    <div className={cn("flex h-full min-h-0 flex-col gap-2 overflow-hidden", className)}>
      <div className="border-b border-border/50 px-3 py-2">
        <span className="text-xs font-semibold text-foreground">Group by</span>
      </div>

      <Tabs defaultValue="priority" className="flex min-h-0 flex-1 flex-col">
        <div className="px-2">
          <TabsList>
            <TabsTrigger value="priority">
              Priority
            </TabsTrigger>
            <TabsTrigger value="labels">
              Labels
            </TabsTrigger>
            <TabsTrigger value="projects">
              Projects
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          <TabsContent value="priority" className="mt-1 space-y-0.5">
            {isLoading ? (
              <GroupingSkeleton />
            ) : priorityGroups.length === 0 ? (
              <EmptyGroup label="No tickets" />
            ) : (
              priorityGroups.map((row) => (
                <SidebarRow
                  key={row.key}
                  row={row}
                  isActive={selectedPriorities.includes(row.key)}
                  onToggle={handleTogglePriority}
                  colorDotClass={PRIORITY_COLORS[row.key]}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="labels" className="mt-1 space-y-0.5">
            {isLoading ? (
              <GroupingSkeleton />
            ) : labelGroups.length === 0 ? (
              <EmptyGroup label="No labels" />
            ) : (
              labelGroups.map((row) => (
                <SidebarRow
                  key={row.key}
                  row={row}
                  isActive={selectedLabels.includes(row.key)}
                  onToggle={handleToggleLabel}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="projects" className="mt-1 space-y-0.5">
            {isLoading ? (
              <GroupingSkeleton />
            ) : projectGroups.length === 0 ? (
              <EmptyGroup label="No projects" />
            ) : (
              projectGroups.map((row) => (
                <SidebarRow
                  key={row.key}
                  row={row}
                  isActive={selectedProjects.includes(row.key)}
                  onToggle={handleToggleProject}
                />
              ))
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

interface GroupingSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tickets: AllWorkTicket[] | undefined;
  isLoading: boolean;
}

export const GroupingSidebar = memo(function GroupingSidebar({
  open,
  onOpenChange,
  tickets,
  isLoading,
}: GroupingSidebarProps) {
  const isMobile = useIsMobile();

  const bodyProps = {
    tickets,
    isLoading,
  };

  return (
    <>
      <Drawer
        open={isMobile && open}
        onOpenChange={onOpenChange}
        shouldScaleBackground={false}
      >
        <DrawerContent
          className={cn(
            "flex max-h-[min(92dvh,40rem)] flex-col gap-0 overflow-hidden rounded-t-xl border border-border bg-card p-0 shadow-lg",
            "pb-[max(0.5rem,env(safe-area-inset-bottom))]",
            "motion-reduce:transition-none",
            "[&>[data-slot=drawer-handle]]:mt-2 [&>[data-slot=drawer-handle]]:mb-1 [&>[data-slot=drawer-handle]]:h-1.5 [&>[data-slot=drawer-handle]]:w-10 [&>[data-slot=drawer-handle]]:bg-muted-foreground/25",
          )}
        >
          <DrawerHeader className="sr-only">
            <DrawerTitle>Group by</DrawerTitle>
          </DrawerHeader>
          {isMobile ? (
            <GroupingSidebarBody {...bodyProps} className="min-h-0 flex-1" />
          ) : null}
        </DrawerContent>
      </Drawer>

      {open ? (
        <aside
          className="hidden h-full min-w-56 w-60 shrink-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-card/85 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-card/75 md:flex"
          aria-label="Group by"
        >
          {!isMobile ? <GroupingSidebarBody {...bodyProps} /> : null}
        </aside>
      ) : null}
    </>
  );
});

function GroupingSkeleton() {
  return (
    <div className="space-y-1.5 py-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-7 w-full rounded-md" />
      ))}
    </div>
  );
}

function EmptyGroup({ label }: { label: string }) {
  return (
    <p className="py-4 text-center text-xs text-muted-foreground">{label}</p>
  );
}
