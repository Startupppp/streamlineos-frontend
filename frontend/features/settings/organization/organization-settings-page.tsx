"use client";

import { useCallback } from "react";
import { useCan } from "@/hooks/api/access";
import { RichPageContent } from "@/components/shared/rich-surface";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { OrgSettingsSectionsSkeleton } from "@/features/settings/organization/org-settings-skeleton";
import { EmptyProjectsIllustration } from "@/components/illustrations";
import { useOrgSettings } from "@/hooks/api/organization";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { getErrorMessage } from "@/lib/get-error-message";
import { OrgProfileSection } from "@/features/settings/organization/org-profile-section";
import { OrgBrandingSection } from "@/features/settings/organization/org-branding-section";
import { OrgLocalizationSection } from "@/features/settings/organization/org-localization-section";
import { OrgBusinessHoursSection } from "@/features/settings/organization/org-business-hours-section";
import { OrgHolidayCalendarSection } from "@/features/settings/organization/org-holiday-calendar-section";
import { OrgConfigSection } from "@/features/settings/organization/org-config-section";
import { OrgDataPrivacySection } from "@/features/settings/organization/org-data-privacy-section";
import { OrgDangerZoneSection } from "@/features/settings/organization/org-danger-zone-section";
import { OrgIncomingTransferSection } from "@/features/settings/organization/org-incoming-transfer-section";
import { OrgSecuritySection } from "@/features/settings/organization/org-security-section";

export function OrganizationSettingsPage() {
  const { data: org, isLoading, isError, error, refetch } = useOrgSettings();

  const canEdit = useCan("settings:manage");

  const handleRetry = useCallback(() => void refetch(), [refetch]);

  if (isLoading) {
    return (
      <PageWrapper title="Organization" subtitle="Manage your organization profile, branding, and lifecycle settings">
        <OrgSettingsSectionsSkeleton />
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Organization" subtitle="Manage your organization profile, branding, and lifecycle settings">
        <ErrorState className="flex-1" title="Couldn't load organization settings" description={getErrorMessage(error)} onRetry={handleRetry} />
      </PageWrapper>
    );
  }

  if (!org) {
    return (
      <PageWrapper title="Organization" subtitle="Manage your organization profile, branding, and lifecycle settings">
        <EmptyState illustration={<EmptyProjectsIllustration />} title="No organization found" description="Create your first organization to start managing your team and projects." className="flex-1" />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Organization" subtitle="Manage your organization profile, branding, and lifecycle settings">
      <RichPageContent className="flex-1 min-h-0">
        <OrgProfileSection org={org} canEdit={canEdit} />

        <OrgBrandingSection org={org} canEdit={canEdit} />

        <OrgLocalizationSection org={org} canEdit={canEdit} />

        <OrgBusinessHoursSection org={org} canEdit={canEdit} />

        <OrgHolidayCalendarSection canEdit={canEdit} />

        <OrgDataPrivacySection canEdit={canEdit} />

        <OrgSecuritySection org={org} canEdit={canEdit} />

        {canEdit && <OrgConfigSection org={org} canEdit={canEdit} />}

        <OrgIncomingTransferSection />

        <OrgDangerZoneSection org={org} />
      </RichPageContent>
    </PageWrapper>
  );
}
