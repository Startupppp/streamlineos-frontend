import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";

interface BlogContentProps {
  html: string;
  className?: string;
}

export function BlogContent({ html, className }: BlogContentProps) {
  return (
    <div
      className={cn(
        "prose blog-prose prose-lg max-w-none dark:prose-invert",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  );
}
