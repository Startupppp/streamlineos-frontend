"use client";

import Link from "next/link";
import { SourceBadge } from "@/components/shared/source-badge";
import { useHrKbLinkFlags } from "@/hooks/api/kb/hr-link-config";
import { useLinkedDocuments } from "@/hooks/api/kb/linked-documents";
import { companyDocumentHref, KB_COMPANY_DOCUMENTS } from "@/lib/knowledge-routes";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import { KbFileTextIcon } from "@/features/wiki/lib/kb-icons";
import { WikiPageCard, WIKI_PAGE_CARD_GRID_CLASS } from "@/features/wiki/components/wiki-page-card";

const STRIP_LIMIT = 6;

/**
 * The newest company documents, on the wiki home, marked as HR documents. Absent for a tenant that has not
 * switched HR documents on, and absent when there is nothing to show: a reader is never told about a feature that
 * has nothing for them.
 */
export function WikiCompanyDocumentsStrip() {
  const flags = useHrKbLinkFlags();
  const { data } = useLinkedDocuments({ limit: STRIP_LIMIT }, { enabled: flags.link });
  const rows = data?.data ?? [];
  if (!flags.link || rows.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <KbFileTextIcon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Company documents</h2>
        <Link href={KB_COMPANY_DOCUMENTS} className="ml-auto text-xs text-muted-foreground underline">
          View all
        </Link>
      </div>
      <div className={WIKI_PAGE_CARD_GRID_CLASS}>
        {rows.map((row) => (
          <WikiPageCard
            key={row.id}
            href={companyDocumentHref(row.id)}
            title={row.name ?? "Removed document"}
            icon={null}
            coverImage={null}
            subtitle={kbTimeAgo(row.publishedAt)}
          >
            <SourceBadge kind="hr-document" />
          </WikiPageCard>
        ))}
      </div>
    </section>
  );
}
