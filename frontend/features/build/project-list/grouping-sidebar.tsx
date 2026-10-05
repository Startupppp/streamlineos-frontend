"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/common/use-mobile";
import { cn } from "@/lib/utils";
import { PM_PANEL } from "@/components/pm-chrome";
import type { ProjectListItem } from "@/types/projects/projects";
import { GroupingSidebarBody } from "./grouping-sidebar-body";

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
