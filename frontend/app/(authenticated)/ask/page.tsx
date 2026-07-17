"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { KbAskPanel } from "@/components/support/kb-ask-panel";

export default function AskPage() {
  return (
    <PageWrapper
      title="Ask AI"
      subtitle="Ask questions across your knowledge base and get AI-powered answers with citations"
    >
      <div className="max-w-2xl">
        <KbAskPanel mode="authed" />
      </div>
    </PageWrapper>
  );
}
