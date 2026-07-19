"use client";

import { useCallback } from "react";
import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export interface NewFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderName: string;
  onFolderNameChange: (name: string) => void;
  existingTabs: string[];
  onConfirm: (name: string) => void;
}

export function NewFolderDialog({
  open,
  onOpenChange,
  folderName,
  onFolderNameChange,
  existingTabs,
  onConfirm,
}: NewFolderDialogProps) {
  const handleCreate = useCallback(() => {
    const trimmed = folderName.trim();
    if (!trimmed) { toast.error("Folder name is required"); return; }
    if (trimmed.length < 2) { toast.error("Folder name must be at least 2 characters"); return; }
    if (trimmed.length > 100) { toast.error("Folder name must be at most 100 characters"); return; }
    if (!/[a-zA-Z]/.test(trimmed)) { toast.error("Folder name must contain at least one letter"); return; }
    if (/[<>:"/\\|?*{}[\]^~`]/.test(trimmed)) { toast.error("Folder name contains invalid special characters"); return; }
    if (existingTabs.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("A folder with this name already exists");
      return;
    }
    onConfirm(trimmed);
  }, [folderName, existingTabs, onConfirm]);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
    onFolderNameChange("");
  }, [onOpenChange, onFolderNameChange]);

  const handleFolderNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFolderNameChange(e.target.value);
    },
    [onFolderNameChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleCreate();
      }
    },
    [handleCreate],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-base">
            <div className="w-7 rounded-lg bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
              <FolderPlus className="h-3.5 w-3.5 text-amber-600 dark:text-amber-300" />
            </div>
            Create New Folder
          </DialogTitle>
          <DialogDescription className="text-xs">
            Organize your documents into folders by category or tag.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-1">
          <Label htmlFor="folder-name" className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            Folder Name
          </Label>
          <Input
            id="folder-name"
            placeholder="e.g., Onboarding, Compliance 2026..."
            value={folderName}
            onChange={handleFolderNameChange}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="flex-1" onClick={handleCancel}>
            Cancel
          </Button>
          <Button className="flex-1" disabled={!folderName.trim()} onClick={handleCreate}>
            Create Folder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
