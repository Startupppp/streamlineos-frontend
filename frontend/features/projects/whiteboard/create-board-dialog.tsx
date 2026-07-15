"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => void;
  isPending: boolean;
}

export function CreateBoardDialog({
  open,
  onOpenChange,
  onCreate,
  isPending,
}: CreateBoardDialogProps) {
  const [name, setName] = useState("");

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setName(event.target.value);
  }

  function handleSubmit() {
    if (!name.trim()) return;
    onCreate(name.trim());
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") handleSubmit();
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setName("");
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Board</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5 py-1">
          <Label>Board name</Label>
          <Input
            autoFocus
            placeholder="e.g. Sprint brainstorm"
            value={name}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !name.trim()}>
            {isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
