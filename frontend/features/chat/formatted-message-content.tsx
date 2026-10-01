import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTicketSearch } from "@/hooks/api/build/ticket-search";
import { getTicketDetailHref } from "@/components/shared/format-ticket-key";

/**
 * URLs are a token of their own only so a key inside one (`…/browse/ACP-52`) is
 * not linkified; they still render as plain text. Code spans are tokens already.
 *
 * The three emphasis forms are listed longest-first and match LAZILY, and the two
 * `*` forms deliberately allow a `*` inside. They used to be `\*\*[^*]+\*\*` and
 * `\*[^*]+\*` — "no asterisk inside" — so any nested emphasis matched no token at
 * all and fell through to the plain-text branch: `***text***` and
 * `**bold with *italic* inside**` rendered their own markers on screen, which is
 * what the composer's Bold → Italic → Code sequence produces (CHAT-S04). Nested
 * content is re-tokenised by `renderInline`.
 */
const INLINE_TOKEN_PATTERN = /(\*\*\*[\s\S]+?\*\*\*|\*\*[\s\S]+?\*\*|\*[\s\S]+?\*|`[^`]+`|https?:\/\/[^\s<>"']+|@[^\s@]+(?:\s[^\s@]+)*|\b[A-Z][A-Z0-9]+-\d+\b)/g;

/**
 * How deep emphasis may nest before the rest is left as text.
 *
 * Each level strips at least one marker pair, so the recursion is already bounded by
 * the length of the line; the cap is here so a pathological line of markers cannot
 * turn into a deep React tree.
 */
const MAX_INLINE_DEPTH = 4;
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

function renderInlinePart(
  part: string,
  key: number,
  isOwn: boolean,
  depth: number,
): React.ReactNode {
  if (part.startsWith("***") && part.endsWith("***") && part.length > 6) {
    return (
      <strong key={key}>
        <em>{renderInline(part.slice(3, -3), isOwn, depth + 1)}</em>
      </strong>
    );
  }
  if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
    return <strong key={key}>{renderInline(part.slice(2, -2), isOwn, depth + 1)}</strong>;
  }
  if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
    return <em key={key}>{renderInline(part.slice(1, -1), isOwn, depth + 1)}</em>;
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

/**
 * One pass of inline tokenising. Called on a whole line, and again on the inside of
 * each emphasis span so nesting renders rather than printing its markers.
 */
function renderInline(text: string, isOwn: boolean, depth: number): React.ReactNode {
  if (depth >= MAX_INLINE_DEPTH) return text;
  return text
    .split(INLINE_TOKEN_PATTERN)
    .map((part, index) => renderInlinePart(part, index, isOwn, depth));
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
      result.push(
        <span key={i} className="block break-words break-all">
          {renderInline(line, isOwn, 0)}
        </span>,
      );
    }
    i++;
  }
  return result;
}
