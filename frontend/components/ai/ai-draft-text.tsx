import { cn } from "@/lib/utils";

interface AiDraftTextProps {
  text: string;
  className?: string;
}

function draftLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function stripBullet(line: string): string {
  return line.replace(/^[-*•]\s*/, "");
}

function isBulletLine(line: string): boolean {
  return /^[-*•](\s+|$)/.test(line) || /^[-*•][A-Za-z]/.test(line);
}

export function AiDraftText({ text, className }: AiDraftTextProps) {
  const lines = draftLines(text);
  const bulletCount = lines.filter(isBulletLine).length;
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
          <li key={`${lineIndex}:${line}`} className="pl-0.5">
            {stripBullet(line)}
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
      {text}
    </p>
  );
}
