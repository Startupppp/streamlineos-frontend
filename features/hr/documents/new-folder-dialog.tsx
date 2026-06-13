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
    if (!/[a-zA-Z0-9]/.test(trimmed)) { toast.error("Folder name must contain at least one letter or digit"); return; }
    if (/\s{2,}/.test(trimmed)) { toast.error("Folder name cannot have consecutive spaces"); return; }
    if (/[<>:"/\\|?*]/.test(trimmed)) { toast.error("Folder name contains invalid special characters"); return; }
    if (existingTabs.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("A folder with this name already exists");
      return;
    }
    onConfirm(trimmed);
  }, [folderName, existingTabs, onConfirm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-primary" />
            Create New Folder
          </DialogTitle>
          <DialogDescription>
            Create a folder to organize your documents. Documents can be assigned to this folder
            by category or tag.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              placeholder="e.g., Onboarding, Compliance 2026..."
              value={folderName}
              onChange={(e) => onFolderNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onFolderNameChange("");
            }}
          >
            Cancel
          </Button>
          <Button disabled={!folderName.trim()} onClick={handleCreate}>
            Create Folder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
