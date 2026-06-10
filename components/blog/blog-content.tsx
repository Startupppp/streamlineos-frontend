import { cn } from "@/lib/utils";

interface BlogContentProps {
  html: string;
  className?: string;
}

/**
 * Renders the article body. The HTML is produced by the TipTap editor, whose
 * schema only emits a fixed set of formatting nodes (no <script>), so it is safe
 * to render directly inside the typography container.
 */
export function BlogContent({ html, className }: BlogContentProps) {
  return (
    <div
      className={cn(
        "prose blog-prose prose-lg max-w-none dark:prose-invert",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
