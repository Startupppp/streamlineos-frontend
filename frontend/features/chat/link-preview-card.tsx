"use client";

import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLinkPreview } from "@/lib/api/hooks";

function extractFirstUrl(content: string): string | null {
  const match = content.match(/https?:\/\/[^\s<>"']+/);
  return match?.[0] ?? null;
}

export function LinkPreviewCard({ content, isOwn }: { content: string; isOwn: boolean }) {
  const url = extractFirstUrl(content);
  const { data, isLoading } = useLinkPreview(url);

  if (!url || isLoading || !data || (!data.title && !data.description && !data.image)) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "mt-2 flex gap-3 rounded-xl border overflow-hidden transition-colors max-w-[320px]",
        isOwn
          ? "bg-white/10 border-white/15 hover:bg-white/20"
          : "bg-background border-border/50 hover:bg-muted/30 shadow-sm",
      )}
    >
      {data.image && (
        <div className="h-16 w-16 shrink-0 overflow-hidden">
          <img
            src={data.image}
            alt={data.title ?? ""}
            className="h-full w-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}
      <div className="flex-1 min-w-0 p-2.5">
        {data.siteName && (
          <p className={cn("text-[10px] font-medium mb-0.5 truncate", isOwn ? "text-white/60" : "text-muted-foreground")}>
            {data.siteName}
          </p>
        )}
        {data.title && (
          <p className={cn("text-[12px] font-semibold line-clamp-1", isOwn ? "text-white" : "text-foreground")}>
            {data.title}
          </p>
        )}
        {data.description && (
          <p className={cn("text-[11px] line-clamp-2 mt-0.5", isOwn ? "text-white/70" : "text-muted-foreground")}>
            {data.description}
          </p>
        )}
      </div>
      <ExternalLink className={cn("h-3 w-3 shrink-0 mt-2.5 mr-2.5", isOwn ? "text-white/40" : "text-muted-foreground/40")} />
    </a>
  );
}
