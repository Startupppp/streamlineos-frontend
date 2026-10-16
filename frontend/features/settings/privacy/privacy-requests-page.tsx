"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { useCanState } from "@/hooks/api/access";
import { PersonDataPanel } from "./person-data-panel";
import { SubjectRequestsPanel } from "./subject-requests-panel";

/**
 * GDPR administration. Two backends, two keys: member export/erasure is HR retention
 * (`hr:retention:manage`); the platform-wide subject-request queue is compliance
 * (`compliance:subject-requests:view`). Each panel shows only for its own key.
 */
export function PrivacyRequestsPage() {
  const retention = useCanState("hr:retention:manage");
  const compliance = useCanState("compliance:subject-requests:view");

  return (
    <PageWrapper title="Privacy requests" subtitle="Data-subject access and erasure requests.">
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {retention !== "denied" ? <PersonDataPanel /> : null}
        {compliance !== "denied" ? <SubjectRequestsPanel /> : null}
      </div>
    </PageWrapper>
  );
}
