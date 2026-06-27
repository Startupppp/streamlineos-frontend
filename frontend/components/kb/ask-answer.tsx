import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { KbAskCitation } from "@/types/kb";

interface AskAnswerProps {
  answer: string;
  citations: KbAskCitation[];
}

const CITATION_PATTERN = /\[(\d+)\]/g;

function citationHref(citation: KbAskCitation): string | null {
  if (citation.spaceId === null) return null;
  return `/knowledge-base/spaces/${citation.spaceId}/articles/${citation.articleId}`;
}

function buildAnswerNodes(answer: string, citations: KbAskCitation[]): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of answer.matchAll(CITATION_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      nodes.push(<Fragment key={key}>{answer.slice(lastIndex, index)}</Fragment>);
      key += 1;
    }

    const citationNumber = Number(match[1]);
    const citation = citations[citationNumber - 1];
    const href = citation ? citationHref(citation) : null;

    if (citation && href) {
      nodes.push(
        <Link
          key={key}
          href={href}
          className="mx-0.5 inline-flex items-center rounded bg-primary/10 px-1 text-[11px] font-semibold text-primary align-baseline hover:bg-primary/20"
        >
          [{citationNumber}]
        </Link>,
      );
    } else {
      nodes.push(<Fragment key={key}>{match[0]}</Fragment>);
    }

    key += 1;
    lastIndex = index + match[0].length;
  }

  if (lastIndex < answer.length) {
    nodes.push(<Fragment key={key}>{answer.slice(lastIndex)}</Fragment>);
  }

  return nodes;
}

export function AskAnswer({ answer, citations }: AskAnswerProps) {
  const answerNodes = buildAnswerNodes(answer, citations);

  return (
    <div className="space-y-5">
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {answerNodes}
      </div>

      {citations.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-semibold text-foreground">Sources</p>
          <ol className="space-y-1.5">
            {citations.map((citation, index) => {
              const href = citationHref(citation);
              return (
                <li
                  key={`${citation.articleId}-${index}`}
                  className="flex items-start gap-2 text-xs"
                >
                  <span className="tabular-nums text-muted-foreground">[{index + 1}]</span>
                  {href ? (
                    <Link
                      href={href}
                      className="inline-flex min-w-0 items-center gap-1 text-primary hover:underline"
                    >
                      <span className="truncate">{citation.title}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </Link>
                  ) : (
                    <span className="truncate text-foreground">{citation.title}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
