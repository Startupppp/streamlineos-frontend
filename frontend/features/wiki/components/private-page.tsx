"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { WikiPageCollectionTable, collectionCountSubtitle } from "./wiki-page-collection-table";
import { KbNewMenu } from "./kb-new-menu";
import { ShortcutsSection } from "./library/shortcuts-section";

const MY_PAGES_PARAMS = { owner: "me" as const };
const MY_FILES_SCOPE = {};

export default function PrivatePage() {
  const [documentCountLabel, setDocumentCountLabel] = useState<string | null>(null);

  return (
    <PageWrapper
      title="My files"
      subtitle={collectionCountSubtitle("Files you own", documentCountLabel)}
      actions={<KbNewMenu scope={MY_FILES_SCOPE} allowFolder={false} />}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-6">
        <ShortcutsSection />
        <WikiPageCollectionTable
          fixedParams={MY_PAGES_PARAMS}
          emptyTitle="No files yet"
          emptyDescription="Files you own will appear here."
          onDocumentCountLabelChange={setDocumentCountLabel}
        />
      </div>
    </PageWrapper>
  );
}
