"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { RequireModule } from "@/components/auth/require-module";
import { WebhooksSection } from "./webhooks-section";
import { ConnectedAppsSection } from "./connected-apps-section";
import { DevicesSection } from "./devices-section";
import { HrRecruitmentIntegrationsSettings } from "../recruitment-integrations-settings";

export function HrIntegrationsSettings() {
  return (
    <PageWrapper
      title="Integrations"
      subtitle="Webhooks, connected apps, and external provider settings for the HR module."
    >
      <RequireModule module="HR">
        <div className="space-y-8">
          <WebhooksSection />
          <ConnectedAppsSection />
          <DevicesSection />
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Recruitment Integrations</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Job board webhooks for the ATS.
              </p>
            </div>
            <HrRecruitmentIntegrationsSettings embedded />
          </div>
        </div>
      </RequireModule>
    </PageWrapper>
  );
}
