"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Pin, Pencil, Globe, Users, Building2, Tag, ChevronDown, ChevronUp } from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Badge } from "@/components/ui/badge";
import { TruncatedText } from "@/components/ui/truncated-text";
import { fadeUp } from "@/lib/motion-variants";
import type { HrAnnouncement } from "@/hooks/api/hr/announcements";

const TARGET_TYPE_ICONS: Record<HrAnnouncement["targetType"], React.ReactNode> = {
  ALL: <Globe className="h-3 w-3" />,
  DEPARTMENT: <Users className="h-3 w-3" />,
  BRANCH: <Building2 className="h-3 w-3" />,
  ROLE: <Tag className="h-3 w-3" />,
};

const TARGET_TYPE_LABELS: Record<HrAnnouncement["targetType"], string> = {
  ALL: "Everyone",
  DEPARTMENT: "Department",
  BRANCH: "Branch",
  ROLE: "Role",
};

export const STATUS_COLORS: Record<HrAnnouncement["status"], string> = {
  DRAFT: "bg-muted text-muted-foreground border-border",
  SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  PUBLISHED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  EXPIRED: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
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
  const [expanded, setExpanded] = useState(false);

  const handleToggleExpand = useCallback(() => {
    if (!expanded) onMarkRead(announcement.id);
    setExpanded((prev) => !prev);
  }, [expanded, announcement.id, onMarkRead]);

  const handleEdit = useCallback(() => onEdit(announcement), [announcement, onEdit]);
  const handleDelete = useCallback(() => onDelete(announcement.id), [announcement.id, onDelete]);

  return (
    <motion.div
      variants={fadeUp}
      className={`bg-card border border-border rounded-lg shadow-sm p-5 transition-shadow duration-200 hover:shadow-md ${
        announcement.isPinned ? "border-l-4 border-l-amber-400" : ""
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-foreground text-xs font-bold shrink-0">
          {getInitials(announcement.authorId)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              {announcement.isPinned && (
                <Pin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              )}
              <TruncatedText text={announcement.title} className="text-sm font-semibold text-foreground leading-tight" />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {canManage && (
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {announcement.readCount} reads
                </span>
              )}
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_COLORS[announcement.status]}`}
              >
                {announcement.status}
              </span>
              {canManage && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 text-muted-foreground hover:text-foreground"
                    onClick={handleEdit}
                    aria-label="Edit announcement"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <AnimatedIconButton
                    icon={Trash2Icon}
                    iconSize={14}
                    variant="ghost"
                    size="icon"
                    className="w-7 text-muted-foreground hover:text-destructive"
                    onClick={handleDelete}
                    aria-label="Delete announcement"
                  />
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[11px] text-muted-foreground">{formatDate(announcement.createdAt)}</span>
            <Badge
              variant="outline"
              className="h-5 gap-1 text-[10px] px-1.5 font-normal text-muted-foreground"
            >
              {TARGET_TYPE_ICONS[announcement.targetType]}
              {TARGET_TYPE_LABELS[announcement.targetType]}
            </Badge>
          </div>

          <div className="mt-3">
            <p
              className={`text-sm text-muted-foreground leading-relaxed ${
                expanded ? "" : "line-clamp-2"
              }`}
            >
              {announcement.content}
            </p>
            <Button
              type="button"
              variant="link"
              onClick={handleToggleExpand}
              className="mt-1.5 h-auto p-0 gap-1 text-[11px] font-medium"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Read more
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
