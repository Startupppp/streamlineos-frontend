import { requirePermission } from "@/lib/rbac/require-permission";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EffectiveRulesPreview } from "@/features/hr/settings-hub/effective-rules-preview";

export default async function EffectiveRulePreviewPage() {
  await requirePermission("hr:policies:view");
  return (
    <PageWrapper
      title="Effective Rule Preview"
      subtitle="See which HR policy applies to an employee on a given date"
    >
      <div className="py-4">
        <EffectiveRulesPreview />
      </div>
    </PageWrapper>
  );
}
