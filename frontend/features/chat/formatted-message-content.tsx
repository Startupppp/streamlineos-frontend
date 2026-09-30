import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTicketSearch } from "@/hooks/api/build/ticket-search";
import { getTicketDetailHref } from "@/components/shared/format-ticket-key";

/**
 * URLs are a token of their own only so a key inside one (`…/browse/ACP-52`) is
 * not linkified; they still render as plain text. Code spans are tokens already.
 */
const INLINE_TOKEN_PATTERN = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|https?:\/\/[^\s<>"']+|@[^\s@]+(?:\s[^\s@]+)*|\b[A-Z][A-Z0-9]+-\d+\b)/g;
const TICKET_KEY_PATTERN = /^[A-Z][A-Z0-9]+-\d+$/;

/**
 * A key only becomes a link once the org's ticket search returns that exact key,
 * so `UTF-8` or `SHA-256` stay text and a key the reader cannot see never links.
 */
function TicketKeyLink({ ticketKey, isOwn }: { ticketKey: string; isOwn: boolean }) {
  const { data } = useTicketSearch(ticketKey, { staleTime: 5 * 60_000 });
  const match = data?.find(
    (t) => `${t.projectKey}-${t.ticketNumber}`.toUpperCase() === ticketKey,
  );
  if (!match) return <span className="break-words break-all">{ticketKey}</span>;
  return (
    <Link
      href={getTicketDetailHref(match.projectId, match.projectKey, match.ticketNumber)}
      className={cn(
        "font-mono underline underline-offset-2",
        isOwn ? "text-primary-foreground" : "text-primary",
      )}
    >
      {ticketKey}
    </Link>
  );
}

function renderInlinePart(part: string, key: number, isOwn: boolean): React.ReactNode {
  if (part.startsWith("**") && part.endsWith("**")) {
    return <strong key={key}>{part.slice(2, -2)}</strong>;
  }
  if (part.startsWith("*") && part.endsWith("*")) {
    return <em key={key}>{part.slice(1, -1)}</em>;
  }
  if (part.startsWith("`") && part.endsWith("`")) {
    return (
      <code
        key={key}
        className={cn(
          "font-mono text-xs px-1.5 py-0.5 rounded break-all",
          isOwn ? "bg-primary-foreground/15 text-primary-foreground" : "bg-muted",
        )}
      >
        {part.slice(1, -1)}
      </code>
    );
  }
  if (TICKET_KEY_PATTERN.test(part)) {
    return <TicketKeyLink key={key} ticketKey={part} isOwn={isOwn} />;
  }
  if (part.startsWith("@")) {
    return (
      <span
        key={key}
        className={cn(
          "font-semibold rounded px-0.5 break-all",
          isOwn ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary",
        )}
      >
        {part}
      </span>
    );
  }
  return (
    <span key={key} className="break-words break-all">
      {part}
    </span>
  );
}

export function renderFormattedContent(content: string, isOwn: boolean): React.ReactNode {
  const lines = content.split("\n");
  const result: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      result.push(
        <pre
          key={i}
          className={cn(
            "font-mono text-xs rounded-lg p-2.5 mt-1.5 max-w-full overflow-x-auto whitespace-pre scrollbar-hide",
            isOwn ? "bg-primary-foreground/15 text-primary-foreground" : "bg-muted text-foreground",
          )}
        >
          {codeLines.join("\n")}
        </pre>,
      );
    } else {
      const parts = line.split(INLINE_TOKEN_PATTERN);
      result.push(
        <span key={i} className="block break-words break-all">
          {parts.map((part, j) => renderInlinePart(part, j, isOwn))}
        </span>,
      );
    }
    i++;
  }
  return result;
}
