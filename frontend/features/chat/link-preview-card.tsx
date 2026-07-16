"use client";

import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLinkPreview } from "@/hooks/api";
import { TruncatedText } from "@/components/ui/truncated-text";

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
          <Image
            src={data.image}
            alt={data.title ?? ""}
            width={64}
            height={64}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="flex-1 min-w-0 p-2.5">
        {data.siteName && (
          <TruncatedText text={data.siteName} className={cn("text-[10px] font-medium mb-0.5", isOwn ? "text-white/60" : "text-muted-foreground")} />
        )}
        {data.title && (
          <TruncatedText text={data.title} className={cn("text-[12px] font-semibold", isOwn ? "text-white" : "text-foreground")} />
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
