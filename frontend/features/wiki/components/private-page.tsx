"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { WikiPageCollectionTable } from "./wiki-page-collection-table";
import { KbNewMenu } from "./kb-new-menu";

const MY_PAGES_PARAMS = { owner: "me" as const };
const MY_FILES_SCOPE = {};

export default function PrivatePage() {
  return (
    <PageWrapper
      title="My files"
      subtitle="Files you own"
      actions={<KbNewMenu scope={MY_FILES_SCOPE} allowFolder={false} />}
    >
      <WikiPageCollectionTable
        fixedParams={MY_PAGES_PARAMS}
        emptyTitle="No files yet"
        emptyDescription="Files you own will appear here."
      />
    </PageWrapper>
  );
}
