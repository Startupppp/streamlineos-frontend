"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AppSheet } from "@/components/shared/app-sheet";
import { useCreateKbSourceNote } from "@/hooks/api/kb/sources";
import { getErrorMessage } from "@/lib/api-client";

interface KbNoteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KbNoteSheet({ open, onOpenChange }: KbNoteSheetProps) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const createNote = useCreateKbSourceNote();

  function reset() {
    setTitle("");
    setText("");
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
  }

  function handleClose() {
    reset();
    onOpenChange(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleSave() {
    const trimmedTitle = title.trim();
    const trimmedText = text.trim();
    if (!trimmedTitle || !trimmedText) return;
    createNote.mutate(
      { title: trimmedTitle, text: trimmedText },
      {
        onSuccess: () => {
          toast.success("Note added");
          handleClose();
        },
        onError: (error) => toast.error("Failed to add note", { description: getErrorMessage(error) }),
      },
    );
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Add note"
      description="Paste or type content for the AI to learn from."
      footer={
        <div className="grid w-full grid-cols-2 gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={createNote.isPending || !title.trim() || !text.trim()}
          >
            {createNote.isPending ? "Saving…" : "Save note"}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <Input
          placeholder="Note title"
          value={title}
          onChange={handleTitleChange}
          className="h-8 text-sm"
        />
        <Textarea
          placeholder="Paste or type the content you want the AI to learn…"
          value={text}
          onChange={handleTextChange}
          rows={6}
          className="text-sm"
        />
      </div>
    </AppSheet>
  );
}
