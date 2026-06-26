"use client";

import { useCallback } from "react";
import { format } from "date-fns";
import { FileText, Eye, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{v.title || `Version ${v.version}`}</p>
            <span className="text-xs text-muted-foreground">v{v.version}</span>
            <Badge variant={isPublished ? "default" : "secondary"} className="text-[10px]">
              {isPublished ? "PUBLISHED" : "DRAFT"}
            </Badge>
          </div>
          <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
            {v.changelog && <span className="line-clamp-1">{v.changelog}</span>}
            {v.documentUrl && (
              <a
                href={v.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-primary hover:underline"
                onClick={handleDocLinkClick}
              >
                <ExternalLink className="h-2.5 w-2.5" />
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
        <div className="flex gap-1.5 shrink-0">
          {!isPublished && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={handleEdit}
              disabled={isUpdating}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          {!isPublished && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={handlePublish}
              disabled={isUpdating}
            >
              Publish
            </Button>
          )}
          {isPublished && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={handleUnpublish}
              disabled={isUpdating}
            >
              <Eye className="h-3 w-3 mr-1" />
              Unpublish
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
