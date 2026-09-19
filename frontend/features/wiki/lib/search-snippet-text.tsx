import { cn } from "@/lib/utils";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import {
  parseSearchSnippet,
  searchSnippetPlainText,
  type SearchSnippetPart,
} from "./search-snippet";

interface SearchSnippetTextProps {
  snippet: string;
  className?: string;
}

function SearchSnippetPartView({ part }: { part: SearchSnippetPart }) {
  if (part.highlight) {
    return (
      <mark className="bg-transparent p-0 font-medium text-foreground">{part.text}</mark>
    );
  }
  return <span>{part.text}</span>;
}

export function SearchSnippetText({ snippet, className }: SearchSnippetTextProps) {
  const plain = searchSnippetPlainText(snippet);
  if (!plain) return null;
  const parts = parseSearchSnippet(snippet);

  return (
    <span title={plain} className={cn(TEXT_ONE_LINE, className)}>
      {parts.map((part, partIndex) => (
        <SearchSnippetPartView key={`${part.text}-${partIndex}`} part={part} />
      ))}
    </span>
  );
}
