"use client";

import { Eye, Pencil } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Trash2Icon } from "@animateicons/react/lucide";
import type { KbArticleListItem, KbArticleStatus, KbArticleVisibility } from "@/hooks/api/support/kb";
import { TruncatedText } from "@/components/ui/truncated-text";

const STATUS_VARIANT: Record<KbArticleStatus, "secondary" | "default" | "outline"> = {
  draft: "secondary",
  in_review: "secondary",
  published: "default",
  archived: "outline",
};

const STATUS_LABEL: Record<KbArticleStatus, string> = {
  draft: "Draft",
  in_review: "In review",
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
    <Card className="hover:border-primary/40 transition-colors">
      <CardContent className="py-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <button
              type="button"
              onClick={handleNavigate}
              className="text-left font-medium text-sm hover:underline block w-full min-w-0"
            >
              <TruncatedText text={article.title} />
            </button>
            {article.excerpt && (
              <TruncatedText text={article.excerpt} className="text-xs text-muted-foreground mt-0.5" />
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant={STATUS_VARIANT[article.status]} className="text-micro">
                {STATUS_LABEL[article.status]}
              </Badge>
              <Badge variant="outline" className="text-micro">
                {VISIBILITY_LABEL[article.visibility]}
              </Badge>
              {categoryName && (
                <span className="text-dense text-muted-foreground">{categoryName}</span>
              )}
              <span className="flex items-center gap-1 text-dense text-muted-foreground">
                <Eye className="h-3 w-3" /> {article.views}
              </span>
              {article.updatedAt && (
                <span className="text-dense text-muted-foreground">
                  {format(new Date(article.updatedAt), "MMM d, yyyy")}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              className="w-7"
              onClick={handleNavigate}
              aria-label="Edit article"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <AnimatedIconButton
              size="icon"
              variant="ghost"
              className="w-7 text-destructive hover:text-destructive"
              onClick={handleDelete}
              aria-label="Delete article"
              icon={Trash2Icon}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
