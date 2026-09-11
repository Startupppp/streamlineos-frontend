"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useCreateAnnouncement } from "@/hooks/api/dashboard";
import { toast } from "sonner";

interface AnnouncementCreateFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export function AnnouncementCreateForm({
  onCancel,
  onSuccess,
}: AnnouncementCreateFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const createMutation = useCreateAnnouncement();

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setTitle(e.target.value);
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setContent(e.target.value);
  const handlePinnedChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setIsPinned(e.target.checked);

  const handleCancel = () => {
    setTitle("");
    setContent("");
    setIsPinned(false);
    onCancel();
  };

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;
    createMutation.mutate(
      { title: title.trim(), content: content.trim(), isPinned },
      {
        onSuccess: () => {
          setTitle("");
          setContent("");
          setIsPinned(false);
          onSuccess();
          toast.success("Announcement posted");
        },
        onError: () => toast.error("Failed to post announcement"),
      },
    );
  };

  return (
    <div className="space-y-2 rounded-lg border border-status-warning-rule bg-status-warning-surface p-3">
      <Input
        placeholder="Title"
        value={title}
        onChange={handleTitleChange}
        maxLength={200}
        className="text-sm bg-transparent border-status-warning-rule focus-visible:ring-status-warning-rule"
        aria-label="Announcement title"
      />
      <Textarea
        placeholder="Write an announcement..."
        value={content}
        onChange={handleContentChange}
        className="text-sm min-h-[72px] resize-none bg-transparent border-status-warning-rule focus-visible:ring-status-warning-rule"
        aria-label="Announcement content"
      />
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={handlePinnedChange}
            className="rounded border-status-warning-rule text-status-warning-ink focus:ring-status-warning-rule"
            aria-label="Pin this announcement"
          />
          <span className="text-xs text-status-warning-ink">Pin</span>
        </label>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="px-2 text-xs"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="px-3 text-xs bg-status-warning-fill hover:bg-status-warning-fill-hover text-white"
            onClick={handleSubmit}
            disabled={
              createMutation.isPending || !title.trim() || !content.trim()
            }
            aria-label="Post announcement"
          >
            {createMutation.isPending ? "Posting..." : "Post"}
          </Button>
        </div>
      </div>
    </div>
  );
}
