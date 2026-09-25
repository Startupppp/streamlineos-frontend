"use client";

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyMailIllustration } from "@/components/illustrations";
import {
  PAGE_BODY_EMPTY_CLASS,
  PAGE_BODY_SKELETON_CLASS,
} from "@/components/ui/content-fill-panel";
import { useMotionVariants } from "@/lib/motion-variants";
import type { HrAnnouncement } from "@/hooks/api/hr/announcements";
import { AnnouncementCard } from "@/features/hr/announcements/announcement-card";
import { getErrorMessage } from "@/lib/get-error-message";

interface AnnouncementsBodyProps {
  isLoading: boolean;
  isError: boolean;
  /** The failed read's error, so the message and request reference reach the user (FE-41). */
  error?: unknown;
  list: HrAnnouncement[];
  canManage: boolean;
  onRetry: () => void;
  onNew: () => void;
  onEdit: (a: HrAnnouncement) => void;
  onDelete: (id: number) => void;
  onMarkRead: (id: number) => void;
}

export function AnnouncementsBody({
  isLoading,
  isError,
  error,
  list,
  canManage,
  onRetry,
  onNew,
  onEdit,
  onDelete,
  onMarkRead,
}: AnnouncementsBodyProps) {
  const { staggerContainer } = useMotionVariants();
  if (isLoading) {
    return (
      <div className={PAGE_BODY_SKELETON_CLASS}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="h-3 w-32 max-w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        className={PAGE_BODY_EMPTY_CLASS}
        title="Failed to load announcements"
        description={getErrorMessage(error)}
        error={error}
        onRetry={onRetry}
      />
    );
  }

  if (list.length === 0) {
    return (
      <EmptyState
        illustration={<EmptyMailIllustration className="h-full w-full" />}
        title="No announcements yet"
        description={
          canManage
            ? "Create your first announcement to keep the team informed."
            : "Check back later for company news and updates."
        }
        action={
          canManage ? { label: "New Announcement", onClick: onNew } : undefined
        }
        className={PAGE_BODY_EMPTY_CLASS}
      />
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="min-h-0 flex-1 space-y-3 overflow-y-auto"
    >
      {list.map((announcement) => (
        <AnnouncementCard
          key={announcement.id}
          announcement={announcement}
          canManage={canManage}
          onEdit={onEdit}
          onDelete={onDelete}
          onMarkRead={onMarkRead}
        />
      ))}
    </motion.div>
  );
}
