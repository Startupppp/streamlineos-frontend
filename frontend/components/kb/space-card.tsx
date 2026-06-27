import Link from "next/link";
import { BookOpen, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { KbSpace, KbAudience } from "@/types/kb";

const AUDIENCE_BADGE: Record<
  KbAudience,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  internal: { label: "Internal", variant: "secondary" },
  public: { label: "Public", variant: "default" },
  mixed: { label: "Mixed", variant: "outline" },
};

interface SpaceCardProps {
  space: KbSpace;
}

export function SpaceCard({ space }: SpaceCardProps) {
  const audience = AUDIENCE_BADGE[space.audience];
  const articleCount = space.articleCount ?? 0;

  return (
    <Link
      href={`/knowledge-base/spaces/${space.id}`}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="h-full hover:border-primary/40 group-focus-visible:border-primary/40 transition-colors">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{space.name}</p>
              <Badge variant={audience.variant} className="mt-1 text-[10px]">
                {audience.label}
              </Badge>
            </div>
          </div>

          <p className="text-xs text-muted-foreground line-clamp-2 min-h-8">
            {space.description?.trim() || "No description provided."}
          </p>

          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="tabular-nums">{articleCount}</span>
            <span>{articleCount === 1 ? "article" : "articles"}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
