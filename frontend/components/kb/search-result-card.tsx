import Link from "next/link";
import { format } from "date-fns";
import { FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { KbSearchResult, KbArticleStatus } from "@/types/kb";

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

interface SearchResultCardProps {
  result: KbSearchResult;
  spaceName?: string;
}

export function SearchResultCard({ result, spaceName }: SearchResultCardProps) {
  const href =
    result.spaceId !== null
      ? `/knowledge-base/spaces/${result.spaceId}/articles/${result.id}`
      : null;
  const summary = result.snippet ?? result.excerpt;

  return (
    <Card className="transition-colors hover:border-primary/40">
      <CardContent className="py-3">
        <div className="min-w-0 flex-1">
          {spaceName && (
            <div className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <FolderOpen className="h-3 w-3 shrink-0" />
              <span className="truncate">{spaceName}</span>
            </div>
          )}
          {href ? (
            <Link
              href={href}
              className="block truncate text-sm font-medium hover:underline"
            >
              {result.title}
            </Link>
          ) : (
            <span className="block truncate text-sm font-medium">{result.title}</span>
          )}
          {summary && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {summary}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={STATUS_VARIANT[result.status]} className="text-[10px]">
              {STATUS_LABEL[result.status]}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              Updated {format(new Date(result.updatedAt), "MMM d, yyyy")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
