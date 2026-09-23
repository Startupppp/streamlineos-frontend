"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { WikiPageCollectionTable } from "./wiki-page-collection-table";

const MY_PAGES_PARAMS = { owner: "me" as const };

export default function PrivatePage() {
  return (
    <PageWrapper title="My pages" subtitle="Pages you own">
      <WikiPageCollectionTable
        fixedParams={MY_PAGES_PARAMS}
        emptyTitle="No pages yet"
        emptyDescription="Pages you own will appear here."
      />
    </PageWrapper>
  );
}
