import { cn } from "@/lib/utils";

interface AiDraftTextProps {
  text: string;
  className?: string;
}

/**
 * Emphasis markers a model puts around a section label — `**Key Points:**`.
 *
 * Rendered rather than printed, because every model this app talks to writes its
 * section labels this way and this component is the display for all of them. The
 * alternative was `MarkdownContent` (react-markdown, already in the repo): correct,
 * but it would pull a markdown pipeline into every route that has an AI control, and
 * an AI draft is a handful of lines of emphasis and bullets, not a document.
 */
const EMPHASIS_PATTERN = /(\*\*[\s\S]+?\*\*|\*[\s\S]+?\*)/g;

function draftLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function isBulletLine(line: string): boolean {
  return /^[-•](\s+|$)/.test(line) || /^[-•][A-Za-z]/.test(line);
}

/**
 * A `*` opens a bullet only when it is not the first of a `**` pair.
 *
 * `stripBullet` used to run over every line of a list, and its `^[-*•]\s*` took the
 * first marker off `**Key Points Discussed:**` — which is how a section label reached
 * the screen as the broken `*Key Points Discussed:**` (CHAT-S05). A bullet is now
 * recognised before anything is removed, and `**` is never a bullet.
 */
function isStarBullet(line: string): boolean {
  if (!line.startsWith("*") || line.startsWith("**")) return false;
  return /^\*(\s+|[A-Za-z])/.test(line);
}

function stripBullet(line: string): string {
  if (isStarBullet(line)) return line.replace(/^\*\s*/, "");
  if (isBulletLine(line)) return line.replace(/^[-•]\s*/, "");
  return line;
}

function renderEmphasis(line: string, keyPrefix: string): React.ReactNode[] {
  return line.split(EMPHASIS_PATTERN).map((part, index) => {
    const key = `${keyPrefix}:${index}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    return <span key={key}>{part}</span>;
  });
}

export function AiDraftText({ text, className }: AiDraftTextProps) {
  const lines = draftLines(text);
  const bulletCount = lines.filter(
    (line) => isBulletLine(line) || isStarBullet(line),
  ).length;
  const asList = lines.length >= 2 && bulletCount >= 2;

  if (asList) {
    return (
      <ul
        className={cn(
          "list-disc space-y-2 pl-4 text-sm leading-relaxed text-pretty break-words text-foreground",
          className,
        )}
      >
        {lines.map((line, lineIndex) => (
          <li
            key={`${lineIndex}:${line}`}
            className={cn(
              "pl-0.5",
              // A section label is not one of the items under it.
              !isBulletLine(line) && !isStarBullet(line) && "list-none -ml-4 mt-3 first:mt-0",
            )}
          >
            {renderEmphasis(stripBullet(line), String(lineIndex))}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p
      className={cn(
        "whitespace-pre-wrap text-sm leading-relaxed text-pretty break-words text-foreground",
        className,
      )}
    >
      {lines.length > 1
        ? lines.map((line, lineIndex) => (
            <span key={`${lineIndex}:${line}`} className="block">
              {renderEmphasis(line, String(lineIndex))}
            </span>
          ))
        : renderEmphasis(text, "0")}
    </p>
  );
}
