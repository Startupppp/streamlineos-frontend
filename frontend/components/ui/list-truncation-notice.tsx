import { cn } from "@/lib/utils";

interface ListTruncationNoticeProps {
  shown: number;
  hint?: string;
  className?: string;
}

/**
 * A capped list that renders nothing about its cap lies about completeness: the
 * entry the reader is looking for is simply absent, and nothing says so.
 */
export function ListTruncationNotice({
  shown,
  hint = "Keep typing to narrow the list.",
  className,
}: ListTruncationNoticeProps) {
  return (
    <p
      role="status"
      className={cn(
        "border-t border-border/40 px-3 py-2 text-dense text-muted-foreground",
        className,
      )}
    >
      {`Showing the first ${shown}. ${hint}`}
    </p>
  );
}
