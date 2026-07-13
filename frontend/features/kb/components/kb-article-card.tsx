"use client";

import { Eye, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { KbArticleListItem, KbArticleStatus, KbArticleVisibility } from "@/hooks/api/support/kb";

const STATUS_VARIANT: Record<KbArticleStatus, "secondary" | "default" | "outline"> = {
  draft: "secondary",
  published: "default",
  archived: "outline",
};

const STATUS_LABEL: Record<KbArticleStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

const VISIBILITY_LABEL: Record<KbArticleVisibility, string> = {
  public: "Public",
  internal: "Internal",
};

export interface KbArticleCardProps {
  article: KbArticleListItem;
  categoryName: string | undefined;
  onNavigate: (id: number) => void;
  onDelete: (article: KbArticleListItem) => void;
}

export function KbArticleCard({ article, categoryName, onNavigate, onDelete }: KbArticleCardProps) {
  function handleNavigate() {
    onNavigate(article.id);
  }
  function handleDelete() {
    onDelete(article);
  }
  return (
    <Card className="hover:border-brand-core/40 transition-colors">
      <CardContent className="py-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <button
              type="button"
              onClick={handleNavigate}
              className="text-left font-medium text-sm hover:underline truncate block w-full"
            >
              {article.title}
            </button>
            {article.excerpt && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {article.excerpt}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant={STATUS_VARIANT[article.status]} className="text-[10px]">
                {STATUS_LABEL[article.status]}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {VISIBILITY_LABEL[article.visibility]}
              </Badge>
              {categoryName && (
                <span className="text-[11px] text-muted-foreground">{categoryName}</span>
              )}
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Eye className="h-3 w-3" /> {article.views}
              </span>
              {article.updatedAt && (
                <span className="text-[11px] text-muted-foreground">
                  {format(new Date(article.updatedAt), "MMM d, yyyy")}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={handleNavigate}
              aria-label="Edit article"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={handleDelete}
              aria-label="Delete article"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
