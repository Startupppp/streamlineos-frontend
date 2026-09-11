"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useCan } from "@/hooks/api/access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyMailIllustration } from "@/components/illustrations";
import {
  useAnnouncements,
  useDeleteAnnouncement,
  type Announcement,
} from "@/hooks/api/dashboard";
import { getErrorMessage } from "@/lib/get-error-message";
import { Megaphone, X, Pin, Plus, RefreshCw } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const AnnouncementCreateForm = dynamic(
  () =>
    import("./announcement-create-form").then((m) => ({
      default: m.AnnouncementCreateForm,
    })),
  { ssr: false },
);

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

  const { data, isLoading, error, refetch } = useAnnouncements();
  const deleteMutation = useDeleteAnnouncement();

  const [showForm, setShowForm] = useState(false);

  const handleRetry = () => void refetch();
  const handleToggleForm = () => setShowForm((v) => !v);
  const handleFormCancel = () => setShowForm(false);
  const handleFormSuccess = () => setShowForm(false);

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
        {isAdmin && showForm && (
          <AnnouncementCreateForm
            onCancel={handleFormCancel}
            onSuccess={handleFormSuccess}
          />
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
          <div className="space-y-2">
            <p role="alert" className="text-sm text-destructive">
              {getErrorMessage(error)}
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="flex items-center gap-1 text-xs text-status-warning-ink hover:opacity-80 transition-opacity"
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              Retry
            </button>
          </div>
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
