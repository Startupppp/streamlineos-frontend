"use client";

import { useCallback } from "react";
import { format } from "date-fns";
import { FileText, Pencil } from "lucide-react";
import { Trash2Icon, ExternalLinkIcon, EyeOffIcon, GlobeIcon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { TruncatedText } from "@/components/ui/truncated-text";
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
  /** hr:handbook:manage — PATCH/DELETE /hr/handbook/:id. */
  canManage: boolean;
}

export function HandbookVersionCard({
  version: v,
  onPublish,
  onUnpublish,
  onEdit,
  onDelete,
  isUpdating,
  canManage,
}: HandbookVersionCardProps) {
  const isPublished = !!v.publishedAt;

  const handlePublish = useCallback(() => onPublish(v.id), [v.id, onPublish]);
  const handleUnpublish = useCallback(() => onUnpublish(v.id), [v.id, onUnpublish]);
  const handleEdit = useCallback(() => onEdit(v), [v, onEdit]);
  const handleDelete = useCallback(() => onDelete(v.id), [v.id, onDelete]);
  const handleDocLinkClick = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);
  const { iconRef: extLinkRef, hoverHandlers: extLinkHoverHandlers } = useAnimatedIcon();
  const { iconRef: publishIconRef, hoverHandlers: publishHoverHandlers } = useAnimatedIcon();
  const { iconRef: unpublishIconRef, hoverHandlers: unpublishHoverHandlers } = useAnimatedIcon();

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-card/90 shadow-sm overflow-hidden border-l-4",
        isPublished ? "border-l-status-success-rule" : "border-l-status-warning-rule"
      )}
    >
      <div className="p-4 flex items-center gap-3">
        <div
          className={cn(
            "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
            isPublished
              ? "bg-status-success-surface"
              : "bg-status-warning-surface"
          )}
        >
          <FileText
            className={cn(
              "h-3.5 w-3.5",
              isPublished
                ? "text-status-success-ink"
                : "text-status-warning-ink"
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground truncate">
              {v.title || `Version ${v.version}`}
            </p>
            <span className="inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border bg-primary/10 text-foreground border-primary/20 shrink-0">
              v{v.version}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border shrink-0",
                isPublished
                  ? "bg-status-success-surface text-status-success-ink border-status-success-rule"
                  : "bg-status-warning-surface text-status-warning-ink border-status-warning-rule"
              )}
            >
              {isPublished ? "PUBLISHED" : "DRAFT"}
            </span>
          </div>
          <div className="flex gap-3 text-micro text-muted-foreground mt-1 flex-wrap items-center">
            {v.changelog && (
              <TruncatedText text={v.changelog} className="max-w-[280px] text-micro text-muted-foreground" />
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

        {canManage && (
        <div className="flex items-center gap-1.5 shrink-0">
          {!isPublished && (
            <Button
              size="sm"
              variant="ghost"
              className="w-8 p-0 hover:bg-muted transition-colors duration-200"
              onClick={handleEdit}
              disabled={isUpdating}
              aria-label={`Edit ${v.title || `version ${v.version}`}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {!isPublished ? (
            <LoadingButton
              size="sm"
              variant="outline"
              className="text-xs gap-1.5 transition-colors duration-200"
              onClick={handlePublish}
              isPending={isUpdating}
              {...publishHoverHandlers}
            >
              <GlobeIcon ref={publishIconRef} size={12} />
              Publish
            </LoadingButton>
          ) : (
            <LoadingButton
              size="sm"
              variant="outline"
              className="text-xs gap-1.5 transition-colors duration-200"
              onClick={handleUnpublish}
              isPending={isUpdating}
              {...unpublishHoverHandlers}
            >
              <EyeOffIcon ref={unpublishIconRef} size={12} />
              Unpublish
            </LoadingButton>
          )}
          <AnimatedIconButton
            icon={Trash2Icon}
            iconSize={14}
            size="sm"
            variant="ghost"
            className="w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors duration-200"
            onClick={handleDelete}
            aria-label={`Delete ${v.title || `version ${v.version}`}`}
          />
        </div>
        )}
      </div>
    </div>
  );
}
