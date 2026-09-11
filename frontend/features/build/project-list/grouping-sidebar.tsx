"use client";

import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/common/use-mobile";
import { cn, resolveImageUrl } from "@/lib/utils";
import { PM_PANEL } from "@/components/pm-chrome";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import {
  getColorSafe,
  healthDotColors,
  projectStatusColors,
  projectStatusDisplayLabels,
} from "@/lib/theme-constants";
import type { ProjectListItem } from "@/types/projects/projects";

interface GroupRow {
  key: string;
  label: string;
  count: number;
  meta?: React.ReactNode;
}

interface GroupingSidebarBodyProps {
  projects: ProjectListItem[];
  activeGroup: string | null;
  onGroupSelect: (key: string | null) => void;
  className?: string;
}

function GroupRowItem({
  row,
  active,
  onSelect,
}: {
  row: GroupRow;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-foreground hover:bg-muted",
      )}
    >
      {row.meta}
      <span className="min-w-0 flex-1 truncate">{row.label}</span>
      <span
        className={cn(
          "ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-micro tabular-nums",
          active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        {row.count}
      </span>
    </button>
  );
}

const STATUS_KEYS = ["ACTIVE", "PLANNING", "ON_HOLD", "COMPLETED", "ARCHIVED"] as const;

function GroupingSidebarBody({
  projects,
  activeGroup,
  onGroupSelect,
  className,
}: GroupingSidebarBodyProps) {
  const statusGroups = useMemo<GroupRow[]>(() => {
    const counts: Record<string, number> = {};
    for (const p of projects) {
      const s = p.status ?? "ACTIVE";
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return STATUS_KEYS.filter((s) => (counts[s] ?? 0) > 0).map((s) => ({
      key: `status:${s}`,
      label: projectStatusDisplayLabels[s] ?? s,
      count: counts[s] ?? 0,
      meta: (
        <span
          className={cn(
            "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-micro font-bold",
            getColorSafe(projectStatusColors, s),
          )}
        />
      ),
    }));
  }, [projects]);

  const healthGroups = useMemo<GroupRow[]>(() => {
    const counts: Record<string, number> = {};
    for (const p of projects) {
      counts[p.health] = (counts[p.health] ?? 0) + 1;
    }
    const keys = ["on_track", "at_risk", "off_track"] as const;
    const labels: Record<string, string> = {
      on_track: "On Track",
      at_risk: "At Risk",
      off_track: "Off Track",
    };
    const dotKeyMap: Record<string, string> = {
      on_track: "healthy",
      at_risk: "at_risk",
      off_track: "critical",
    };
    return keys.map((h) => ({
      key: `health:${h}`,
      label: labels[h],
      count: counts[h] ?? 0,
      meta: (
        <span
          className={cn(
            "inline-block h-2 w-2 shrink-0 rounded-full",
            getColorSafe(healthDotColors, dotKeyMap[h] ?? h),
          )}
        />
      ),
    }));
  }, [projects]);

  const leadGroups = useMemo<GroupRow[]>(() => {
    const map = new Map<string, { count: number; project: ProjectListItem }>();
    for (const p of projects) {
      if (!p.manager) continue;
      const existing = map.get(p.manager.id);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(p.manager.id, { count: 1, project: p });
      }
    }
    const rows: GroupRow[] = [];
    for (const [id, { count, project }] of map.entries()) {
      const name = getUserDisplayName(project.manager);
      const initials = getUserInitials(project.manager);
      rows.push({
        key: `lead:${id}`,
        label: name,
        count,
        meta: (
          <Avatar className="h-4 w-4 shrink-0">
            {project.manager?.image ? (
              <AvatarImage src={resolveImageUrl(project.manager.image)} alt={name} />
            ) : null}
            <AvatarFallback className="text-micro">{initials}</AvatarFallback>
          </Avatar>
        ),
      });
    }
    return rows.sort((a, b) => b.count - a.count);
  }, [projects]);

  const teamGroups = useMemo<GroupRow[]>(() => {
    const memberMap = new Map<string, { count: number; project: ProjectListItem }>();
    for (const p of projects) {
      for (const m of p.members) {
        const existing = memberMap.get(m.id);
        if (existing) {
          existing.count += 1;
        } else {
          memberMap.set(m.id, { count: 1, project: p });
        }
      }
    }
    const rows: GroupRow[] = [];
    for (const [id, { count, project }] of memberMap.entries()) {
      const member = project.members.find((m) => m.id === id);
      if (!member) continue;
      const name = getUserDisplayName(member);
      const initials = getUserInitials(member);
      rows.push({
        key: `member:${id}`,
        label: name,
        count,
        meta: (
          <Avatar className="h-4 w-4 shrink-0">
            {member.image ? (
              <AvatarImage src={resolveImageUrl(member.image)} alt={name} />
            ) : null}
            <AvatarFallback className="text-micro">{initials}</AvatarFallback>
          </Avatar>
        ),
      });
    }
    return rows.sort((a, b) => b.count - a.count);
  }, [projects]);

  function handleGroupClick(key: string) {
    onGroupSelect(activeGroup === key ? null : key);
  }

  return (
    <Tabs
      defaultValue="status"
      className={cn("flex min-h-0 flex-1 flex-col gap-0", className)}
    >
      <div className="flex shrink-0 items-center gap-1.5 border-b border-border px-2 py-2">
        <TabsList className="p-0.5">
          <TabsTrigger value="status" className="px-1.5">
            Status
          </TabsTrigger>
          <TabsTrigger value="health" className="px-1.5">
            Health
          </TabsTrigger>
          <TabsTrigger value="leads" className="px-1.5">
            Leads
          </TabsTrigger>
          <TabsTrigger value="teams" className="px-1.5">
            Teams
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <TabsContent value="status" className="m-0 space-y-0.5">
          {statusGroups.length > 0 ? (
            statusGroups.map((row) => (
              <GroupRowItem
                key={row.key}
                row={row}
                active={activeGroup === row.key}
                onSelect={() => handleGroupClick(row.key)}
              />
            ))
          ) : (
            <p className="py-4 text-center text-dense text-muted-foreground">No projects</p>
          )}
        </TabsContent>

        <TabsContent value="health" className="m-0 space-y-0.5">
          {healthGroups.length > 0 ? (
            healthGroups.map((row) => (
              <GroupRowItem
                key={row.key}
                row={row}
                active={activeGroup === row.key}
                onSelect={() => handleGroupClick(row.key)}
              />
            ))
          ) : (
            <p className="py-4 text-center text-dense text-muted-foreground">No projects</p>
          )}
        </TabsContent>

        <TabsContent value="leads" className="m-0 space-y-0.5">
          {leadGroups.length > 0 ? (
            leadGroups.map((row) => (
              <GroupRowItem
                key={row.key}
                row={row}
                active={activeGroup === row.key}
                onSelect={() => handleGroupClick(row.key)}
              />
            ))
          ) : (
            <p className="py-4 text-center text-dense text-muted-foreground">No leads assigned</p>
          )}
        </TabsContent>

        <TabsContent value="teams" className="m-0 space-y-0.5">
          {teamGroups.length > 0 ? (
            teamGroups.map((row) => (
              <GroupRowItem
                key={row.key}
                row={row}
                active={activeGroup === row.key}
                onSelect={() => handleGroupClick(row.key)}
              />
            ))
          ) : (
            <p className="py-4 text-center text-dense text-muted-foreground">No members</p>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
}

interface GroupingSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectListItem[];
  activeGroup: string | null;
  onGroupSelect: (key: string | null) => void;
  className?: string;
}

export function GroupingSidebar({
  open,
  onOpenChange,
  projects,
  activeGroup,
  onGroupSelect,
  className,
}: GroupingSidebarProps) {
  const isMobile = useIsMobile();

  const bodyProps = {
    projects,
    activeGroup,
    onGroupSelect,
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
            <DrawerTitle>Group projects by</DrawerTitle>
          </DrawerHeader>
          {isMobile ? (
            <GroupingSidebarBody {...bodyProps} className="min-h-0 flex-1" />
          ) : null}
        </DrawerContent>
      </Drawer>

      {open ? (
        <aside
          className={cn(
            PM_PANEL,
            "hidden min-w-56 w-60 shrink-0 flex-col overflow-hidden md:flex",
            className,
          )}
          aria-label="Group projects by"
        >
          {!isMobile ? <GroupingSidebarBody {...bodyProps} /> : null}
        </aside>
      ) : null}
    </>
  );
}
