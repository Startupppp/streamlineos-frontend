"use client";

import { useState } from "react";
import { useCan } from "@/hooks/api/access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyMailIllustration } from "@/components/illustrations";
import {
  useAnnouncements,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  type Announcement,
} from "@/hooks/api/dashboard";
import { getErrorMessage } from "@/lib/get-error-message";
import { Megaphone, X, Pin, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AnnouncementItemProps {
  ann: Announcement;
  isAdmin: boolean;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

function AnnouncementItem({
  ann,
  isAdmin,
  onDelete,
  isDeleting,
}: AnnouncementItemProps) {
  const authorDisplay =
    ann.authorFirstName && ann.authorLastName
      ? `${ann.authorFirstName} ${ann.authorLastName}`
      : (ann.authorName ?? "Team");

  const handleDelete = () => onDelete(ann.id);

  return (
    <li
      className={cn(
        "relative rounded-lg border p-3 text-sm",
        ann.isPinned
          ? "border-status-warning-rule bg-status-warning-surface"
          : "border-status-warning-rule bg-card",
      )}
    >
      {ann.isPinned && (
        <Pin
          role="img"
          aria-label="Pinned"
          className="absolute top-2 right-2 h-3 w-3 text-status-warning-ink"
        />
      )}
      <p className="text-status-warning-ink leading-snug pr-4">
        {ann.content}
      </p>
      <div className="flex items-center justify-between mt-2 gap-2">
        <span className="text-dense text-status-warning-ink">
          {authorDisplay} · {format(parseISO(ann.createdAt), "MMM d, yyyy")}
        </span>
        {isAdmin && (
          <button
            type="button"
            onClick={handleDelete}
            className="text-status-warning-ink hover:text-status-warning-ink transition-colors"
            aria-label={`Delete announcement from ${authorDisplay}`}
            disabled={isDeleting}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
  );
}

export function AnnouncementsWidget() {
  const isAdmin = useCan("settings:manage");

  const { data, isLoading, error } = useAnnouncements();
  const createMutation = useCreateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);

  const handleToggleForm = () => setShowForm((v) => !v);
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setTitle(e.target.value);
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setContent(e.target.value);
  const handlePinnedChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setIsPinned(e.target.checked);
  const handleCancelForm = () => {
    setShowForm(false);
    setTitle("");
    setContent("");
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
          setShowForm(false);
          toast.success("Announcement posted");
        },
        onError: () => toast.error("Failed to post announcement"),
      },
    );
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id, {
      onError: () => toast.error("Failed to delete announcement"),
    });
  };

  return (
    <Card className="h-full flex flex-col bg-status-warning-surface border-status-warning-rule">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 shrink-0">
        <div className="flex items-center gap-2">
          <Megaphone
            className="h-4 w-4 text-status-warning-ink shrink-0"
            aria-hidden="true"
          />
          <CardTitle className="text-sm font-semibold text-status-warning-ink">
            Announcements
          </CardTitle>
        </div>
        {isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            className="px-2 text-status-warning-ink hover:text-status-warning-ink hover:bg-status-warning-surface"
            onClick={handleToggleForm}
            aria-label="Add announcement"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="ml-1 text-xs">Add</span>
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden space-y-3">
        {showForm && isAdmin && (
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
                <span className="text-xs text-status-warning-ink">
                  Pin
                </span>
              </label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-2 text-xs"
                  onClick={handleCancelForm}
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
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <Skeleton
                key={i}
                className="h-14 w-full rounded-lg bg-status-warning-surface"
              />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
        ) : !data?.length ? (
          <EmptyState
            illustration={<EmptyMailIllustration className="h-20 w-20" />}
            title="No announcements"
            description="Nothing to show yet."
            compact
          />
        ) : (
          <ul className="space-y-2 overflow-y-auto max-h-64">
            {data.map((ann) => (
              <AnnouncementItem
                key={ann.id}
                ann={ann}
                isAdmin={isAdmin}
                onDelete={handleDelete}
                isDeleting={deleteMutation.isPending}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
