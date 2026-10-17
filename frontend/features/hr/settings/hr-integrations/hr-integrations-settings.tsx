"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { RequireModule } from "@/components/auth/require-module";
import { WebhooksSection } from "./webhooks-section";
import { ConnectedAppsSection } from "./connected-apps-section";
import { DevicesSection } from "./devices-section";

export function HrIntegrationsSettings() {
  return (
    <PageWrapper
      title="Integrations"
      subtitle="Webhooks, connected apps, and external provider settings for the HR module."
    >
      <RequireModule module="hr">
        <div className="space-y-8">
          <WebhooksSection />
          <ConnectedAppsSection />
          <DevicesSection />
        </div>
      </RequireModule>
    </PageWrapper>
  );
}
