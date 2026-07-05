"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SaveViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewName: string;
  onViewNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  isSaving: boolean;
  activeLayout: string;
}

export function SaveViewDialog({
  open,
  onOpenChange,
  viewName,
  onViewNameChange,
  onSave,
  isSaving,
  activeLayout,
}: SaveViewDialogProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") onSave();
    },
    [onSave],
  );

  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);

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
          <p className="text-xs text-muted-foreground">
            Saves current layout ({activeLayout}) and active filters.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button size="sm" onClick={onSave} disabled={!viewName.trim() || isSaving}>
              {isSaving ? "Saving..." : "Save view"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
