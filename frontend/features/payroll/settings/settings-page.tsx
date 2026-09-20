"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { EmptyPayroll } from "@/components/illustrations";
import { usePayrollPolicyCurrent } from "@/hooks/api/payroll";
import { PolicyProfileSection } from "./policy-profile-section";
import { ToggleSettingsSection } from "./toggle-settings-section";
import { VersionHistorySection } from "./version-history-section";
import { CalendarSection } from "./calendar-section";
import { FxRatesSection } from "./fx-rates-section";
import { EntitiesSection } from "./entities-section";

export function SettingsPageContent() {
  const { data, isLoading, isError, error, refetch } = usePayrollPolicyCurrent();

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
