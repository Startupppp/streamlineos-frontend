"use client";

import { useState, useCallback } from "react";
import { useCan } from "@/hooks/api/access";
import { RichPageContent } from "@/components/shared/rich-surface";
import { EmptyState } from "@/components/ui/empty-state";
import { OrgSettingsSectionsSkeleton } from "@/features/settings/organization/org-settings-skeleton";
import { EmptyProjectsIllustration } from "@/components/illustrations";
import { useOrgSettings, useUpdateOrgSettings } from "@/hooks/api/organization";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { toast } from "sonner";
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

const CURRENCY_CODES = ["USD", "EUR", "INR", "GBP", "AED"] as const;
type CurrencyCode = (typeof CURRENCY_CODES)[number];

function isCurrencyCode(value: string): value is CurrencyCode {
  return (CURRENCY_CODES as readonly string[]).includes(value);
}

export function OrganizationSettingsPage() {
  const { data: org, isLoading } = useOrgSettings();

  const [configInitialized, setConfigInitialized] = useState(false);
  const [timezone, setTimezone] = useState<string>("");
  const [currency, setCurrency] = useState<CurrencyCode | "">("");
  const [fiscalYearStart, setFiscalYearStart] = useState<string>("");
  const [directoryPublic, setDirectoryPublic] = useState<boolean>(false);
  const [isEditingConfig, setIsEditingConfig] = useState(false);

  const canEdit = useCan("settings:manage");

  const { mutate: updateOrg, isPending: isUpdatingOrg } = useUpdateOrgSettings();

  const initConfig = useCallback(() => {
    if (!configInitialized && org) {
      setTimezone(org.timezone ?? "Asia/Kolkata");
      const orgCurrency = org.currency ?? "INR";
      setCurrency(isCurrencyCode(orgCurrency) ? orgCurrency : "INR");
      setFiscalYearStart(String(org.fiscalYearStart ?? 4));
      setDirectoryPublic(org.directoryPublic ?? false);
      setConfigInitialized(true);
    }
  }, [configInitialized, org]);

  if (!configInitialized && org) initConfig();

  const handleStartEditConfig = useCallback(() => {
    if (!org) return;
    setTimezone(org.timezone ?? "Asia/Kolkata");
    const editCurrency = org.currency ?? "INR";
    setCurrency(isCurrencyCode(editCurrency) ? editCurrency : "INR");
    setFiscalYearStart(String(org.fiscalYearStart ?? 4));
    setDirectoryPublic(org.directoryPublic ?? false);
    setIsEditingConfig(true);
  }, [org]);

  const handleCancelEditConfig = useCallback(() => setIsEditingConfig(false), []);

  const handleSaveConfig = useCallback(() => {
    const fiscalNum = fiscalYearStart ? parseInt(fiscalYearStart, 10) : undefined;
    updateOrg(
      {
        timezone: timezone || undefined,
        currency: currency || undefined,
        fiscalYearStart: fiscalNum,
        directoryPublic,
      },
      {
        onSuccess: () => {
          toast.success("App configuration saved");
          setIsEditingConfig(false);
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
        },
      },
    );
  }, [timezone, currency, fiscalYearStart, directoryPublic, updateOrg]);

  const handleTimezoneChange = useCallback((value: string) => setTimezone(value), []);
  const handleCurrencyChange = useCallback((value: string) => {
    if (isCurrencyCode(value)) setCurrency(value);
  }, []);
  const handleFiscalYearStartChange = useCallback((value: string) => setFiscalYearStart(value), []);
  const handleDirectoryPublicChange = useCallback((checked: boolean) => setDirectoryPublic(checked), []);

  if (isLoading) {
    return (
      <PageWrapper title="Organization" subtitle="Manage your organization profile, branding, and lifecycle settings">
        <OrgSettingsSectionsSkeleton />
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

        {canEdit && (
          <OrgConfigSection
            org={org}
            isEditingConfig={isEditingConfig}
            timezone={timezone}
            currency={currency}
            fiscalYearStart={fiscalYearStart}
            directoryPublic={directoryPublic}
            isUpdating={isUpdatingOrg}
            onStartEdit={handleStartEditConfig}
            onCancel={handleCancelEditConfig}
            onSave={handleSaveConfig}
            onTimezoneChange={handleTimezoneChange}
            onCurrencyChange={handleCurrencyChange}
            onFiscalYearStartChange={handleFiscalYearStartChange}
            onDirectoryPublicChange={handleDirectoryPublicChange}
          />
        )}

        <OrgIncomingTransferSection />

        <OrgDangerZoneSection org={org} />
      </RichPageContent>
    </PageWrapper>
  );
}
