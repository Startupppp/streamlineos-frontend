import Link from "next/link";
import { format } from "date-fns";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { KbArticleListItem, KbArticleStatus } from "@/types/kb";

const STATUS_VARIANT: Record<KbArticleStatus, "secondary" | "default" | "outline"> = {
  draft: "secondary",
  in_review: "outline",
  published: "default",
  archived: "outline",
};

const STATUS_LABEL: Record<KbArticleStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  published: "Published",
  archived: "Archived",
};

interface ArticleRowProps {
  article: KbArticleListItem;
  spaceId: number;
}

export function ArticleRow({ article, spaceId }: ArticleRowProps) {
  return (
    <Card className="transition-colors hover:border-primary/40">
      <CardContent className="py-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <Link
              href={`/knowledge-base/spaces/${spaceId}/articles/${article.id}`}
              className="block truncate text-sm font-medium hover:underline"
            >
              {article.title}
            </Link>
            {article.excerpt && (
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {article.excerpt}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={STATUS_VARIANT[article.status]} className="text-[10px]">
                {STATUS_LABEL[article.status]}
              </Badge>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <ThumbsUp className="h-3 w-3" /> {article.helpfulCount}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <ThumbsDown className="h-3 w-3" /> {article.notHelpfulCount}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Updated {format(new Date(article.updatedAt), "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
