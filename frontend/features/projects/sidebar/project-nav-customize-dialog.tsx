"use client";

import { useCallback, useMemo } from "react";
import type { KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/ui/dialog";
import {
  SidebarAnimatedNavIcon,
  useAnimatedNavIconHover,
} from "@/components/layout/sidebar/sidebar-animated-nav";
import {
  isProjectNavPinned,
  type ProjectNavGroup,
  type ProjectNavItem,
} from "./project-nav-config";

interface ProjectNavCustomizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: ProjectNavGroup[];
  isVisible: (id: string) => boolean;
  setVisible: (id: string, visible: boolean) => void;
  reset: () => void;
  hasCustomizations: boolean;
}

export function ProjectNavCustomizeDialog({
  open,
  onOpenChange,
  groups,
  isVisible,
  setVisible,
  reset,
  hasCustomizations,
}: ProjectNavCustomizeDialogProps) {
  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  const handleDone = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const sections = useMemo(
    () => groups.filter((section) => section.items.length > 0),
    [groups],
  );

  const defaultOpen = useMemo(
    () => sections.map((section) => section.id),
    [sections],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(85dvh,640px)] flex-col gap-0 overflow-hidden p-0",
          "md:max-h-[min(85dvh,640px)] md:max-w-md md:p-0 md:pb-0",
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border/60 px-5 pb-3 pt-5 text-left">
          <DialogTitle>Customize sidebar</DialogTitle>
          <DialogDescription>
            Choose which tools appear under Build, Plan, Ship, and Collaborate.
            Issues stays pinned.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="px-3 py-2">
          <Accordion
            type="multiple"
            defaultValue={defaultOpen}
            className="px-1 py-1"
          >
            {sections.map((section) => (
              <AccordionItem
                key={section.id}
                value={section.id}
                className="border-border/50"
              >
                <AccordionTrigger className="px-2 py-2.5 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
                    {section.label}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-2 pt-0">
                  <div className="space-y-0.5">
                    {section.items.map((item) => (
                      <CustomizeRow
                        key={item.id}
                        item={item}
                        checked={isVisible(item.id)}
                        pinned={isProjectNavPinned(item.id)}
                        onCheckedChange={setVisible}
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </DialogBody>

        <DialogFooter className="shrink-0 border-t border-border/60 bg-background/40 px-5 py-3 sm:justify-between">
          <Button
            size="sm"
            type="button"
            variant="ghost"
            onClick={handleReset}
            disabled={!hasCustomizations}
            aria-disabled={!hasCustomizations}
            className="text-muted-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            Reset to default
          </Button>
          <Button type="button" size="sm" onClick={handleDone}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CustomizeRow({
  item,
  checked,
  pinned,
  onCheckedChange,
}: {
  item: ProjectNavItem;
  checked: boolean;
  pinned: boolean;
  onCheckedChange: (id: string, visible: boolean) => void;
}) {
  const { iconRef, animatedNavHoverHandlers } = useAnimatedNavIconHover();
  const Icon = item.icon;

  const handleCheckedChange = useCallback(
    (next: boolean) => {
      onCheckedChange(item.id, next);
    },
    [item.id, onCheckedChange],
  );

  const handleRowActivate = useCallback(() => {
    if (pinned) return;
    onCheckedChange(item.id, !checked);
  }, [checked, item.id, onCheckedChange, pinned]);

  const handleRowKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (pinned) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onCheckedChange(item.id, !checked);
      }
    },
    [checked, item.id, onCheckedChange, pinned],
  );

  return (
    <div
      role="button"
      tabIndex={pinned ? -1 : 0}
      onClick={handleRowActivate}
      onKeyDown={handleRowKeyDown}
      {...animatedNavHoverHandlers}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors",
        pinned
          ? "cursor-default opacity-90"
          : "cursor-pointer hover:bg-muted/60",
      )}
    >
      <SidebarAnimatedNavIcon
        icon={Icon}
        iconRef={iconRef}
        className="h-4 w-4 shrink-0 text-muted-foreground"
      />
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
        {item.label}
      </span>
      {pinned ? (
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
          Pinned
        </span>
      ) : null}
      <Switch
        checked={checked}
        disabled={pinned}
        onCheckedChange={handleCheckedChange}
        onClick={(event) => event.stopPropagation()}
        aria-label={
          pinned ? `${item.label} is pinned` : `Show ${item.label} in sidebar`
        }
      />
    </div>
  );
}
