"use client";

import { ShieldOff } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EffectiveRulesPreview } from "@/features/hr/settings-hub/effective-rules-preview";
import { useCan } from "@/hooks/api/access";

export default function EffectiveRulePreviewPage() {
  const canView = useCan("hr:policies:view");

  return (
    <PageWrapper
      title="Effective Rule Preview"
      subtitle="See which HR policy applies to an employee on a given date"
    >
      {canView ? (
        <div className="px-4 sm:px-6 py-4">
          <EffectiveRulesPreview />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 py-24 text-center">
          <ShieldOff className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            You don&apos;t have permission to view HR policies.
          </p>
        </div>
      )}
    </PageWrapper>
  );
}
