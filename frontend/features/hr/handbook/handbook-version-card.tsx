"use client";

import { useCallback } from "react";
import { format } from "date-fns";
import { FileText, Pencil, Globe } from "lucide-react";
import { Trash2Icon, ExternalLinkIcon, EyeOffIcon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";

interface HandbookVersion {
  id: number;
  version: string;
  title: string;
  changelog: string | null;
  documentUrl: string | null;
  publishedAt: string | null;
  publishedBy: string | null;
  createdAt: string;
}

interface HandbookVersionCardProps {
  version: HandbookVersion;
  onPublish: (id: number) => void;
  onUnpublish: (id: number) => void;
  onEdit: (version: HandbookVersion) => void;
  onDelete: (id: number) => void;
  isUpdating: boolean;
}

export function HandbookVersionCard({
  version: v,
  onPublish,
  onUnpublish,
  onEdit,
  onDelete,
  isUpdating,
}: HandbookVersionCardProps) {
  const isPublished = !!v.publishedAt;

  const handlePublish = useCallback(() => onPublish(v.id), [v.id, onPublish]);
  const handleUnpublish = useCallback(() => onUnpublish(v.id), [v.id, onUnpublish]);
  const handleEdit = useCallback(() => onEdit(v), [v, onEdit]);
  const handleDelete = useCallback(() => onDelete(v.id), [v.id, onDelete]);
  const handleDocLinkClick = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);
  const { iconRef: extLinkRef, hoverHandlers: extLinkHoverHandlers } = useAnimatedIcon();

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card shadow-sm overflow-hidden border-l-4",
        isPublished ? "border-l-emerald-500" : "border-l-amber-500"
      )}
    >
      <div className="p-4 flex items-center gap-3">
        <div
          className={cn(
            "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
            isPublished
              ? "bg-emerald-100 dark:bg-emerald-950/40"
              : "bg-amber-100 dark:bg-amber-950/40"
          )}
        >
          <FileText
            className={cn(
              "h-3.5 w-3.5",
              isPublished
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400"
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground truncate">
              {v.title || `Version ${v.version}`}
            </p>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-primary/10 text-foreground border-primary/20 shrink-0">
              v{v.version}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
                isPublished
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800"
                  : "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800"
              )}
            >
              {isPublished ? "PUBLISHED" : "DRAFT"}
            </span>
          </div>
          <div className="flex gap-3 text-[10px] text-muted-foreground mt-1 flex-wrap items-center">
            {v.changelog && (
              <span className="line-clamp-1 max-w-[280px]">{v.changelog}</span>
            )}
            {v.documentUrl && (
              <a
                href={v.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-primary hover:text-primary/80 hover:underline transition-colors duration-200"
                onClick={handleDocLinkClick}
                {...extLinkHoverHandlers}
              >
                <ExternalLinkIcon ref={extLinkRef} size={10} />
                View Document
              </a>
            )}
            {v.publishedAt && (
              <span>Published {format(new Date(v.publishedAt), "MMM d, yyyy")}</span>
            )}
            {v.createdAt && (
              <span>Created {format(new Date(v.createdAt), "MMM d, yyyy")}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isPublished && (
            <Button
              size="sm"
              variant="ghost"
              className="w-8 p-0 hover:bg-muted transition-colors duration-200"
              onClick={handleEdit}
              disabled={isUpdating}
              aria-label="Edit version"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {!isPublished ? (
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1.5 transition-colors duration-200"
              onClick={handlePublish}
              disabled={isUpdating}
            >
              <Globe className="h-3 w-3" />
              Publish
            </Button>
          ) : (
            <AnimatedIconButton
              icon={EyeOffIcon}
              iconSize={12}
              iconClassName="mr-1"
              size="sm"
              variant="outline"
              className="text-xs gap-1.5 transition-colors duration-200"
              onClick={handleUnpublish}
              disabled={isUpdating}
            >
              Unpublish
            </AnimatedIconButton>
          )}
          <AnimatedIconButton
            icon={Trash2Icon}
            iconSize={14}
            size="sm"
            variant="ghost"
            className="w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors duration-200"
            onClick={handleDelete}
            aria-label="Delete version"
          />
        </div>
      </div>
    </div>
  );
}
