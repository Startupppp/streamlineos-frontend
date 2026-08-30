"use client";

import { useState, useCallback, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Pin,
  Pencil,
  Globe,
  Users,
  Building2,
  Tag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useMotionVariants } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import type { HrAnnouncement } from "@/hooks/api/hr/announcements";

const TARGET_TYPE_ICONS: Record<HrAnnouncement["targetType"], ReactNode> = {
  ALL: <Globe className="size-3 text-current" />,
  DEPARTMENT: <Users className="size-3 text-current" />,
  BRANCH: <Building2 className="size-3 text-current" />,
  ROLE: <Tag className="size-3 text-current" />,
};

const TARGET_TYPE_LABELS: Record<HrAnnouncement["targetType"], string> = {
  ALL: "Everyone",
  DEPARTMENT: "Department",
  BRANCH: "Branch",
  ROLE: "Role",
};

const STATUS_LABELS: Record<HrAnnouncement["status"], string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  PUBLISHED: "Published",
  EXPIRED: "Expired",
};

export const STATUS_COLORS: Record<HrAnnouncement["status"], string> = {
  DRAFT: "bg-muted text-muted-foreground border-border",
  SCHEDULED:
    "bg-status-info-surface text-status-info-ink border-status-info-rule",
  PUBLISHED:
    "bg-status-success-surface text-status-success-ink border-status-success-rule",
  EXPIRED:
    "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
};

const STATUS_ACCENT: Record<HrAnnouncement["status"], string> = {
  DRAFT: "border-l-muted-foreground/40",
  SCHEDULED: "border-l-blue-500 dark:border-l-blue-400",
  PUBLISHED: "border-l-emerald-500 dark:border-l-emerald-400",
  EXPIRED: "border-l-amber-500 dark:border-l-amber-400",
};

function getInitials(id: string): string {
  return id.slice(0, 2).toUpperCase();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export interface AnnouncementCardProps {
  announcement: HrAnnouncement;
  canManage: boolean;
  onEdit: (a: HrAnnouncement) => void;
  onDelete: (id: number) => void;
  onMarkRead: (id: number) => void;
}

export function AnnouncementCard({
  announcement,
  canManage,
  onEdit,
  onDelete,
  onMarkRead,
}: AnnouncementCardProps) {
  const { fadeUp } = useMotionVariants();
  const [expanded, setExpanded] = useState(false);
  const contentLong = announcement.content.length > 140;

  const handleToggleExpand = useCallback(() => {
    if (!expanded) onMarkRead(announcement.id);
    setExpanded((prev) => !prev);
  }, [expanded, announcement.id, onMarkRead]);

  const handleEdit = useCallback(() => onEdit(announcement), [announcement, onEdit]);
  const handleDelete = useCallback(() => onDelete(announcement.id), [announcement.id, onDelete]);

  return (
    <motion.div
      variants={fadeUp}
      className={cn(
        "rounded-xl border border-border border-l-[3px] bg-card px-3.5 py-3 shadow-sm transition-colors hover:border-border/80",
        STATUS_ACCENT[announcement.status],
      )}
    >
      <div className="flex gap-3">
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-micro font-semibold text-muted-foreground"
          aria-hidden
        >
          {getInitials(announcement.authorId)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              {announcement.isPinned ? (
                <Pin
                  className="size-3.5 shrink-0 text-status-warning-ink"
                  aria-label="Pinned"
                />
              ) : null}
              <TruncatedText
                text={announcement.title}
                className="text-sm font-semibold leading-snug text-foreground"
              />
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
              <span
                className={cn(
                  "inline-flex items-center rounded-md border px-1.5 py-0.5 text-micro font-medium",
                  STATUS_COLORS[announcement.status],
                )}
              >
                {STATUS_LABELS[announcement.status]}
              </span>
              {canManage ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-foreground"
                    onClick={handleEdit}
                    aria-label="Edit announcement"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <AnimatedIconButton
                    icon={Trash2Icon}
                    iconSize={14}
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={handleDelete}
                    aria-label="Delete announcement"
                  />
                </>
              ) : null}
            </div>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-dense text-muted-foreground">
            <time dateTime={announcement.createdAt}>
              {formatDate(announcement.createdAt)}
            </time>
            <span className="text-border" aria-hidden>
              ·
            </span>
            <span className="inline-flex items-center gap-1">
              {TARGET_TYPE_ICONS[announcement.targetType]}
              {TARGET_TYPE_LABELS[announcement.targetType]}
            </span>
            {canManage ? (
              <>
                <span className="text-border" aria-hidden>
                  ·
                </span>
                <span className="tabular-nums">{announcement.readCount} reads</span>
              </>
            ) : null}
          </div>

          <p
            className={cn(
              "mt-2 text-label leading-relaxed text-muted-foreground",
              !expanded && "line-clamp-2",
            )}
          >
            {announcement.content}
          </p>

          {contentLong || expanded ? (
            <button
              type="button"
              onClick={handleToggleExpand}
              className="mt-1 inline-flex items-center gap-0.5 text-dense font-medium text-primary hover:underline"
            >
              {expanded ? (
                <>
                  <ChevronUp className="size-3" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="size-3" />
                  Read more
                </>
              )}
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
