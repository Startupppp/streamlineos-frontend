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
          "font-mono text-[12px] px-1.5 py-0.5 rounded",
          isOwn ? "bg-black/20 text-white/90" : "bg-muted",
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
          "font-semibold rounded px-0.5",
          isOwn ? "bg-white/25 text-white" : "bg-blue-500/15 text-blue-600",
        )}
      >
        {part}
      </span>
    );
  }
  return <span key={key}>{part}</span>;
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
            "font-mono text-[12px] rounded-lg p-2.5 mt-1.5 overflow-x-auto whitespace-pre",
            isOwn ? "bg-black/20 text-white/90" : "bg-muted text-foreground",
          )}
        >
          {codeLines.join("\n")}
        </pre>,
      );
    } else {
      const parts = line.split(INLINE_TOKEN_PATTERN);
      result.push(
        <span key={i} className="block">
          {parts.map((part, j) => renderInlinePart(part, j, isOwn))}
        </span>,
      );
    }
    i++;
  }
  return result;
}
