import sanitizeHtml from "sanitize-html";
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
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html, { allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2", "h3"]), allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, "*": ["class", "style", "id"] } }) }}
    />
  );
}
