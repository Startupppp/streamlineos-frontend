"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { EffectiveRulesPreview } from "@/features/hr/settings-hub/effective-rules-preview";
import { useCan } from "@/hooks/api/access";
import { NoPermissionState } from "@/components/shared/no-permission-state";

export default function EffectiveRulePreviewPage() {
  const canView = useCan("hr:policies:view");

  if (!canView) {
    return (
      <PageWrapper
        title="Effective Rule Preview"
        subtitle="See which HR policy applies to an employee on a given date"
 variant="display">
        <NoPermissionState
          permission="hr:policies:view"
          title="Access Restricted"
          description="You don't have permission to preview HR policy rules. HR Admin role is required."
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Effective Rule Preview"
      subtitle="See which HR policy applies to an employee on a given date"
 variant="display">
      <div className="py-4">
        <EffectiveRulesPreview />
      </div>
    </PageWrapper>
  );
}
