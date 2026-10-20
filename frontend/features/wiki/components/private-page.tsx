"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { WikiPageCollectionTable } from "./wiki-page-collection-table";

const MY_PAGES_PARAMS = { owner: "me" as const };

export default function PrivatePage() {
  return (
    <PageWrapper title="My files" subtitle="Files you own">
      <WikiPageCollectionTable
        fixedParams={MY_PAGES_PARAMS}
        emptyTitle="No files yet"
        emptyDescription="Files you own will appear here."
      />
    </PageWrapper>
  );
}
