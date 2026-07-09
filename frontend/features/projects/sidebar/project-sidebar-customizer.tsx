"use client";

import { useCallback } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

interface CustomizerItem {
  label: string;
}

interface CustomizerSection {
  label: string;
  items: CustomizerItem[];
}

interface ProjectSidebarCustomizerProps {
  sections: CustomizerSection[];
  hiddenItems: ReadonlySet<string>;
  onToggleItem: (itemLabel: string) => void;
  onReset: () => void;
  collapsed: boolean;
}

function SectionRow({
  itemLabel,
  hidden,
  onToggleItem,
}: {
  itemLabel: string;
  hidden: boolean;
  onToggleItem: (label: string) => void;
}) {
  const handleCheckedChange = useCallback(
    (_checked: boolean) => {
      onToggleItem(itemLabel);
    },
    [itemLabel, onToggleItem],
  );

  return (
    <div className="flex items-center justify-between py-1.5">
      <span
        className={
          hidden ? "text-sm text-muted-foreground/60" : "text-sm text-foreground"
        }
      >
        {itemLabel}
      </span>
      <Switch
        checked={!hidden}
        onCheckedChange={handleCheckedChange}
        aria-label={`${hidden ? "Show" : "Hide"} ${itemLabel}`}
      />
    </div>
  );
}

export function ProjectSidebarCustomizer({
  sections,
  hiddenItems,
  onToggleItem,
  onReset,
  collapsed,
}: ProjectSidebarCustomizerProps) {
  const hasHidden = hiddenItems.size > 0;

  const trigger = collapsed ? (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground hover:text-foreground mx-auto"
      aria-label="Customize sidebar"
    >
      <SlidersHorizontal className="h-3.5 w-3.5" />
    </Button>
  ) : (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 w-full justify-start gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground font-normal"
      aria-label="Customize sidebar"
    >
      <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
      Customize
    </Button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Customize Sidebar</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {sections.map((section, si) => (
            <div key={section.label}>
              {si > 0 && <div className="border-t my-2" />}
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">
                {section.label}
              </p>
              {section.items.map((item) => (
                <SectionRow
                  key={item.label}
                  itemLabel={item.label}
                  hidden={hiddenItems.has(item.label)}
                  onToggleItem={onToggleItem}
                />
              ))}
            </div>
          ))}
        </div>

        {hasHidden && (
          <div className="border-t pt-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-foreground"
              onClick={onReset}
            >
              Reset to default
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
