"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RenameViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
  onRename: (name: string) => void;
  isSaving: boolean;
}

export function RenameViewDialog({
  open,
  onOpenChange,
  currentName,
  onRename,
  isSaving,
}: RenameViewDialogProps) {
  const [name, setName] = useState(currentName);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value),
    [],
  );

  const submit = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === currentName) return;
    onRename(trimmed);
  }, [name, currentName, onRename]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") submit();
    },
    [submit],
  );

  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-3 p-4 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename view</DialogTitle>
          <DialogDescription>
            Change the name of this saved view. Its filters and layout stay as
            they are.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="rename-view-name" className="text-sm">
              View name
            </Label>
            <Input
              id="rename-view-name"
              value={name}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              className="mt-1.5"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <LoadingButton
              size="sm"
              onClick={submit}
              disabled={!name.trim() || name.trim() === currentName}
              isPending={isSaving}
              loadingText="Saving..."
            >
              Save
            </LoadingButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
