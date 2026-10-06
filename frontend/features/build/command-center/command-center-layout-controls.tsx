"use client";

import { useCallback, useState } from "react";
import { Check, LayoutGrid, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { cn } from "@/lib/utils";
import type { WidgetType } from "./dashboard-layout";
import { WIDGET_CATALOG } from "./widget-catalog";

interface WidgetPickerProps {
  availableTypes: readonly WidgetType[];
  placedTypes: ReadonlySet<WidgetType>;
  onAdd: (type: WidgetType) => void;
}

interface WidgetPickerItemProps {
  type: WidgetType;
  placed: boolean;
  onAdd: (type: WidgetType) => void;
  onClose: () => void;
}

function WidgetPickerItem({ type, placed, onAdd, onClose }: WidgetPickerItemProps) {
  const { title, description, icon: Icon } = WIDGET_CATALOG[type];
  const handleClick = useCallback(() => {
    onAdd(type);
    onClose();
  }, [onAdd, onClose, type]);
  return (
    <li>
      <button
        type="button"
        disabled={placed}
        onClick={handleClick}
        className={cn(
          "flex w-full items-start gap-3 rounded-md px-2.5 py-2 text-left transition-colors",
          "hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:cursor-default disabled:hover:bg-transparent",
        )}
      >
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">{title}</span>
          <span className="block text-xs text-muted-foreground">{description}</span>
        </span>
        {placed ? (
          <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-micro text-muted-foreground">
            <Check className="h-3 w-3" aria-hidden="true" />
            Added
          </span>
        ) : (
          <Plus className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        )}
      </button>
    </li>
  );
}

function WidgetPicker({ availableTypes, placedTypes, onAdd }: WidgetPickerProps) {
  const [open, setOpen] = useState(false);
  const remaining = availableTypes.filter((type) => !placedTypes.has(type)).length;
  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <ResponsivePopover open={open} onOpenChange={setOpen}>
      <ResponsivePopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add widget
          {remaining > 0 ? (
            <span className="rounded bg-muted px-1.5 text-micro text-muted-foreground">{remaining}</span>
          ) : null}
        </Button>
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent
        align="end"
        className="w-80 p-1"
        title="Add widget"
        description="Choose a widget to add to your Command Center."
      >
        <ul className="flex flex-col" aria-label="Available widgets">
          {availableTypes.map((type) => (
            <WidgetPickerItem
              key={type}
              type={type}
              placed={placedTypes.has(type)}
              onAdd={onAdd}
              onClose={handleClose}
            />
          ))}
        </ul>
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}

interface CommandCenterLayoutControlsProps extends WidgetPickerProps {
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onReset: () => void;
}

export function CommandCenterLayoutControls({
  editing,
  onEditingChange,
  onReset,
  availableTypes,
  placedTypes,
  onAdd,
}: CommandCenterLayoutControlsProps) {
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const handleStartEditing = useCallback(() => onEditingChange(true), [onEditingChange]);
  const handleDoneEditing = useCallback(() => onEditingChange(false), [onEditingChange]);
  const handleOpenConfirmReset = useCallback(() => setConfirmResetOpen(true), []);

  if (!editing) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground"
        onClick={handleStartEditing}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Customize
      </Button>
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
      <p className="mr-auto hidden text-xs text-muted-foreground md:block">
        Drag widgets to move them, pull an edge to resize, or use each widget&apos;s menu.
      </p>
      <WidgetPicker availableTypes={availableTypes} placedTypes={placedTypes} onAdd={onAdd} />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground"
        onClick={handleOpenConfirmReset}
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset
      </Button>
      <Button type="button" size="sm" className="gap-1.5" onClick={handleDoneEditing}>
        <Check className="h-3.5 w-3.5" />
        Done
      </Button>
      <ConfirmDialog
        open={confirmResetOpen}
        onOpenChange={setConfirmResetOpen}
        title="Reset your Command Center?"
        description="Your widgets go back to the default arrangement. Widgets you added or removed are reset too."
        confirmLabel="Reset layout"
        destructive
        onConfirm={onReset}
      />
    </div>
  );
}
