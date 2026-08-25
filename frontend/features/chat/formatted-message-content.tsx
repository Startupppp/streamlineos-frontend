import { cn } from "@/lib/utils";

const INLINE_TOKEN_PATTERN = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|@[^\s@]+(?:\s[^\s@]+)*)/g;

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
