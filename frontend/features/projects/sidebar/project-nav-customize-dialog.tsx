"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MAX_VISIBLE_NAV_ITEMS,
  type ProjectNavGroup,
  type ProjectNavItem,
} from "./project-nav-config";

interface ProjectNavCustomizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalog: ProjectNavGroup[];
  visibleIds: string[];
  setVisibleIds: (ids: string[]) => void;
  resetToDefault: () => void;
  isDefault: boolean;
}

function CustomizeNavRow({
  item,
  checked,
  onToggle,
}: {
  item: ProjectNavItem;
  checked: boolean;
  onToggle: (id: string, next: boolean) => void;
}) {
  const Icon = item.icon;

  const handleCheckedChange = useCallback(
    (next: boolean) => {
      onToggle(item.id, next);
    },
    [item.id, onToggle],
  );

  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/60">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
        {item.label}
      </span>
      <Switch
        checked={checked}
        onCheckedChange={handleCheckedChange}
        aria-label={`Show ${item.label} in sidebar`}
      />
    </label>
  );
}

export function ProjectNavCustomizeDialog({
  open,
  onOpenChange,
  catalog,
  visibleIds,
  setVisibleIds,
  resetToDefault,
  isDefault,
}: ProjectNavCustomizeDialogProps) {
  const handleToggle = useCallback(
    (id: string, next: boolean) => {
      if (next) {
        if (visibleIds.includes(id)) return;
        if (visibleIds.length >= MAX_VISIBLE_NAV_ITEMS) {
          toast.error(`You can pin up to ${MAX_VISIBLE_NAV_ITEMS} items`);
          return;
        }
        setVisibleIds([...visibleIds, id]);
        return;
      }
      if (visibleIds.length <= 1) {
        toast.error("Keep at least one item in the sidebar");
        return;
      }
      setVisibleIds(visibleIds.filter((itemId) => itemId !== id));
    },
    [setVisibleIds, visibleIds],
  );

  const handleReset = useCallback(() => {
    resetToDefault();
    toast.success("Navigation reset to default");
  }, [resetToDefault]);

  const handleDone = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0">
        <DialogHeader className="border-b border-border/60 px-4 py-3">
          <DialogTitle className="text-base">Customize navigation</DialogTitle>
          <DialogDescription className="text-xs">
            Choose which tools stay in the sidebar. Everything else stays under
            More ({visibleIds.length}/{MAX_VISIBLE_NAV_ITEMS} pinned).
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[min(60vh,420px)]">
          <div className="space-y-3 p-3">
            {catalog.map((group) => (
              <div key={group.id}>
                <p className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
                  {group.label}
                </p>
                <div className="space-y-0.5 rounded-lg border border-border/50 bg-muted/20 p-1">
                  {group.items.map((item) => (
                    <CustomizeNavRow
                      key={item.id}
                      item={item}
                      checked={visibleIds.includes(item.id)}
                      onToggle={handleToggle}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-row items-center justify-between gap-2 border-t border-border/60 px-4 py-3 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={handleReset}
            disabled={isDefault}
          >
            Reset to default
          </Button>
          <Button type="button" size="sm" className="h-8" onClick={handleDone}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
