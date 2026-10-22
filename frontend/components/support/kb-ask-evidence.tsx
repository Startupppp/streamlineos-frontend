import { AiCitationChips, type Citation } from "@/components/ai/ai-citation-chips";
import type { KbAskCitationWithParts } from "@/hooks/api/kb/ask-result-schema";
import { companyDocumentHref, pageHref } from "@/lib/knowledge-routes";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const warningTone = statusToneClasses("warning");

function buildCitations(citations: KbAskCitationWithParts[]): Citation[] {
  return citations.map((citation) => {
    const freshness = citation.updatedAt;
    if (citation.kind === "article") {
      return { id: `a-${citation.articleId}`, title: citation.title, href: `/support/kb/${citation.articleId}`, freshness };
    }
    if (citation.kind === "page") {
      return { id: `p-${citation.pageId}`, title: citation.title, href: pageHref(citation.pageId), snippet: citation.passage, freshness };
    }
    if (citation.kind === "document") {
      return { id: `d-${citation.linkedDocumentId}`, title: citation.title, href: companyDocumentHref(citation.linkedDocumentId), freshness };
    }
    return { id: `s-${citation.sourceId}`, title: citation.title, freshness };
  });
}

export function KbAskEvidence({ citations, disagreement }: { citations: KbAskCitationWithParts[]; disagreement?: { summary: string } }) {
  const chips = buildCitations(citations);

  return (
    <>
      {chips.length > 0 && (
        <div className="space-y-1 pt-1 border-t">
          <p className="text-micro font-medium uppercase tracking-wide text-muted-foreground">Sources</p>
          <AiCitationChips citations={chips} />
          <ul aria-label="Source evidence" className="space-y-2 pt-1">
            {citations.map((citation, index) => (
              <li key={`${citation.kind}-${index}`} className="text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium text-foreground">{citation.title}</span>
                  <time dateTime={citation.updatedAt}>Updated {new Date(citation.updatedAt).toLocaleDateString()}</time>
                  <span>{citation.verified === true ? "Verified source" : citation.verified === false ? "Not verified source" : "Verification unavailable"}</span>
                </div>
                {citation.passage && <blockquote className="mt-1 border-l-2 border-accent/40 pl-2 italic">{citation.passage}</blockquote>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {disagreement && (
        <div role="note" className={cn("rounded-md border p-2 text-xs", warningTone.rule, warningTone.surface, warningTone.ink)}>
          <span className="font-semibold">Sources disagree:</span> {disagreement.summary}
        </div>
      )}
    </>
  );
}
