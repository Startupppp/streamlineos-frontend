"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { EmptyPayroll } from "@/components/illustrations";
import { usePayrollPolicyCurrent } from "@/hooks/api/payroll";
import { useCan } from "@/hooks/api/access";
import { PolicyProfileSection } from "./policy-profile-section";
import { ToggleSettingsSection } from "./toggle-settings-section";
import { VersionHistorySection } from "./version-history-section";
import { CalendarSection } from "./calendar-section";
import { FxRatesSection } from "./fx-rates-section";
import { EntitiesSection } from "./entities-section";

export function SettingsPageContent() {
  const { data, isLoading, isError, error, refetch } = usePayrollPolicyCurrent();
  /**
   * The page gate is `payroll:settings:manage` but the policy read is gated on
   * `payroll:policies:view`, so a role holding only the first disables the read
   * — leaving `data` undefined and `isLoading` false, which is exactly the
   * shape of "no policy". Saying "Payroll not set up yet" over a configured
   * payroll is the state-integrity lie BUG-001 was about, reachable through a
   * withdrawn grant rather than a missing row. The two stock templates grant
   * both keys, so this is latent, not live.
   */
  const canViewPolicy = useCan("payroll:policies:view");

  if (isLoading) {
    return (
      <PageWrapper title="Payroll Settings">
        <div className="flex flex-1 min-h-0 flex-col gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg border border-border bg-card animate-pulse" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Payroll Settings">
        <ErrorState
          className="flex-1"
          title="Failed to load settings"
          description={getErrorMessage(error)}
          onRetry={refetch}
        />
      </PageWrapper>
    );
  }

  if (!canViewPolicy) {
    return (
      <PageWrapper title="Payroll Settings">
        <EmptyState
          illustration={<EmptyPayroll />}
          title="You cannot view the payroll policy"
          description="Your role can manage payroll settings but not read the payroll policy, so this page cannot show whether payroll is set up. Ask an administrator for the payroll policy view permission."
        />
      </PageWrapper>
    );
  }

  if (!data?.policy) {
    return (
      <PageWrapper title="Payroll Settings">
        <EmptyState
          illustration={<EmptyPayroll />}
          title="Payroll not set up yet"
          description="Configure your payroll settings to start running payroll for your team."
          action={{ label: "Set up Payroll", href: "/payroll/setup" }}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Payroll Settings"
      subtitle={`Current payroll policy · ${data.policy.status}`}
    >
      <div className="flex flex-col gap-4">
        <PolicyProfileSection policy={data.policy} />
        <ToggleSettingsSection policy={data.policy} activeVersion={data.activeVersion} />
        {!!(data.activeVersion?.toggles["multiCurrency"]) && (
          <FxRatesSection policy={data.policy} activeVersion={data.activeVersion} />
        )}
        <VersionHistorySection policyId={data.policy.id} />
        <CalendarSection />
        <EntitiesSection />
      </div>
    </PageWrapper>
  );
}
