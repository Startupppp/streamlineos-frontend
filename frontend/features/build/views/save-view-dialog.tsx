"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ViewVisibility = "private" | "shared";

export interface SaveViewMeta {
  visibility: ViewVisibility;
  displayOptions?: Record<string, unknown>;
}

interface SaveViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewName: string;
  onViewNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  isSaving: boolean;
  activeLayout: string;
  displayOptions?: Record<string, unknown>;
  onSaveWithMeta?: (meta: SaveViewMeta) => void;
}

export function SaveViewDialog({
  open,
  onOpenChange,
  viewName,
  onViewNameChange,
  onSave,
  isSaving,
  activeLayout,
  displayOptions,
  onSaveWithMeta,
}: SaveViewDialogProps) {
  const [visibility, setVisibility] = useState<ViewVisibility>("shared");

  const dispatchSave = useCallback(() => {
    if (onSaveWithMeta) {
      onSaveWithMeta({ visibility, displayOptions });
    } else {
      onSave();
    }
  }, [onSave, onSaveWithMeta, visibility, displayOptions]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") dispatchSave();
    },
    [dispatchSave],
  );

  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);

  const handleSave = useCallback(() => dispatchSave(), [dispatchSave]);

  const handleSetShared = useCallback(() => setVisibility("shared"), []);
  const handleSetPrivate = useCallback(() => setVisibility("private"), []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Save current view</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div>
            <Label htmlFor="save-view-name" className="text-sm">View name</Label>
            <Input
              id="save-view-name"
              value={viewName}
              onChange={onViewNameChange}
              onKeyDown={handleKeyDown}
              placeholder="My filtered view"
              className="mt-1.5"
              autoFocus
            />
          </div>
          <div>
            <Label className="text-sm">Visibility</Label>
            <div className="flex mt-1.5 rounded-md border border-border overflow-hidden">
              <button
                type="button"
                onClick={handleSetShared}
                className={cn(
                  "flex-1 py-1.5 text-xs font-medium transition-colors",
                  visibility === "shared"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted",
                )}
              >
                Shared
              </button>
              <button
                type="button"
                onClick={handleSetPrivate}
                className={cn(
                  "flex-1 py-1.5 text-xs font-medium transition-colors border-l border-border",
                  visibility === "private"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted",
                )}
              >
                Personal
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Saves current layout ({activeLayout}) and active filters.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </Button>
            <LoadingButton size="sm" onClick={handleSave} disabled={!viewName.trim()} isPending={isSaving} loadingText="Saving...">
              Save view
            </LoadingButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
