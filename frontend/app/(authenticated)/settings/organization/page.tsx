"use client";

import { useState, useCallback, useRef } from "react";
import { useAbility } from "@/lib/abilities-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyProjectsIllustration } from "@/components/illustrations";
import { useOrgSettings, useUpdateOrgSettings, useUpdateOrgSecuritySettings } from "@/lib/api/hooks/organization";
import { useUploadFile } from "@/lib/api/hooks/use-upload-file";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { toast } from "sonner";
import { OrgProfileSection } from "@/features/settings/organization/org-profile-section";
import { OrgBrandingSection } from "@/features/settings/organization/org-branding-section";
import { OrgLocalizationSection } from "@/features/settings/organization/org-localization-section";
import { OrgBusinessHoursSection } from "@/features/settings/organization/org-business-hours-section";
import { OrgHolidayCalendarSection } from "@/features/settings/organization/org-holiday-calendar-section";
import { OrgCustomDomainsSection } from "@/features/settings/organization/org-custom-domains-section";
import { OrgConfigSection } from "@/features/settings/organization/org-config-section";
import { OrgSecuritySection } from "@/features/settings/organization/org-security-section";
import { OrgIntegrationsSection } from "@/features/settings/organization/org-integrations-section";
import { OrgDataPrivacySection } from "@/features/settings/organization/org-data-privacy-section";

function isValidOctet(part: string): boolean {
  if (!/^\d{1,3}$/.test(part)) return false;
  const n = Number(part);
  return n >= 0 && n <= 255;
}

function isValidIpOrPrefix(value: string): boolean {
  if (value.endsWith(".")) {
    const parts = value.slice(0, -1).split(".");
    if (parts.length < 1 || parts.length > 3) return false;
    return parts.every(isValidOctet);
  }
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  return parts.every(isValidOctet);
}

function isValidDomain(value: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(value);
}

export default function OrganizationSettingsPage() {
  const { data: org, isLoading } = useOrgSettings();

  const [configInitialized, setConfigInitialized] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [timezone, setTimezone] = useState<string>("");
  const [currency, setCurrency] = useState<string>("");
  const [fiscalYearStart, setFiscalYearStart] = useState<string>("");
  const [directoryPublic, setDirectoryPublic] = useState<boolean>(false);
  const [primaryColor, setPrimaryColor] = useState<string>("");
  const [loginBgUrl, setLoginBgUrl] = useState<string>("");
  const [isEditingConfig, setIsEditingConfig] = useState(false);

  const [ipAllowlist, setIpAllowlist] = useState<string[]>([]);
  const [ipInput, setIpInput] = useState("");
  const [ipAllowlistInitialized, setIpAllowlistInitialized] = useState(false);

  const [mfaEnforced, setMfaEnforced] = useState(false);
  const [passwordExpiryDays, setPasswordExpiryDays] = useState<string>("");
  const [maxConcurrentSessions, setMaxConcurrentSessions] = useState<string>("");
  const [allowedEmailDomains, setAllowedEmailDomains] = useState<string[]>([]);
  const [domainInput, setDomainInput] = useState("");
  const [securityInitialized, setSecurityInitialized] = useState(false);
  const domainInputRef = useRef<HTMLInputElement>(null);

  const uploadFileMutation = useUploadFile();
  const ability = useAbility();
  const canEdit = ability.can("manage", "settings");

  const { mutate: updateOrg, isPending: isUpdatingOrg } = useUpdateOrgSettings();
  const { mutate: updateSecurity, isPending: isUpdatingSecurity } = useUpdateOrgSecuritySettings();

  const initSecurity = useCallback(() => {
    if (!securityInitialized && org) {
      setMfaEnforced(org.mfaEnforced ?? false);
      setPasswordExpiryDays(String(org.passwordExpiryDays ?? ""));
      setMaxConcurrentSessions(String(org.maxConcurrentSessions ?? ""));
      setAllowedEmailDomains(org.allowedEmailDomains ?? []);
      setSecurityInitialized(true);
    }
  }, [securityInitialized, org]);

  const initConfig = useCallback(() => {
    if (!configInitialized && org) {
      setLogoUrl(org.logo ?? "");
      setTimezone(org.timezone ?? "Asia/Kolkata");
      setCurrency(org.currency ?? "INR");
      setFiscalYearStart(String(org.fiscalYearStart ?? 4));
      setDirectoryPublic(org.directoryPublic ?? false);
      setPrimaryColor(org.primaryColor ?? "");
      setLoginBgUrl(org.loginBgUrl ?? "");
      setConfigInitialized(true);
    }
    if (!ipAllowlistInitialized && org) {
      setIpAllowlist(org.ipAllowlist ?? []);
      setIpAllowlistInitialized(true);
    }
  }, [configInitialized, ipAllowlistInitialized, org]);

  if (!securityInitialized && org) initSecurity();
  if ((!configInitialized || !ipAllowlistInitialized) && org) initConfig();

  const handleStartEditConfig = useCallback(() => {
    if (!org) return;
    setLogoUrl(org.logo ?? "");
    setTimezone(org.timezone ?? "Asia/Kolkata");
    setCurrency(org.currency ?? "INR");
    setFiscalYearStart(String(org.fiscalYearStart ?? 4));
    setDirectoryPublic(org.directoryPublic ?? false);
    setPrimaryColor(org.primaryColor ?? "");
    setLoginBgUrl(org.loginBgUrl ?? "");
    setIsEditingConfig(true);
  }, [org]);

  const handleCancelEditConfig = useCallback(() => setIsEditingConfig(false), []);

  const handleSaveConfig = useCallback(() => {
    const fiscalNum = fiscalYearStart ? parseInt(fiscalYearStart, 10) : undefined;
    const colorVal = primaryColor.trim();
    if (colorVal && !/^#[0-9a-fA-F]{6}$/.test(colorVal)) {
      toast.error("Primary color must be a valid hex color (e.g. #bd882c)");
      return;
    }
    updateOrg(
      {
        logo: logoUrl.trim() || null,
        timezone: timezone || undefined,
        currency: (currency as "USD" | "EUR" | "INR" | "GBP" | "AED") || undefined,
        fiscalYearStart: fiscalNum,
        directoryPublic,
        primaryColor: colorVal || null,
        loginBgUrl: loginBgUrl.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success("App configuration saved");
          setIsEditingConfig(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to save configuration");
        },
      },
    );
  }, [logoUrl, timezone, currency, fiscalYearStart, directoryPublic, primaryColor, loginBgUrl, updateOrg]);

  const handleAddIp = useCallback(() => {
    const ip = ipInput.trim();
    if (!ip) return;
    if (!isValidIpOrPrefix(ip)) {
      toast.error("Enter a valid IP address (e.g. 203.0.113.5) or prefix (e.g. 192.168.1.)");
      return;
    }
    if (ipAllowlist.includes(ip)) {
      toast.error("This IP is already in the allowlist");
      return;
    }
    setIpAllowlist((prev) => [...prev, ip]);
    setIpInput("");
  }, [ipInput, ipAllowlist]);

  const handleRemoveIp = useCallback((ip: string) => {
    setIpAllowlist((prev) => prev.filter((i) => i !== ip));
  }, []);

  const handleSaveIpAllowlist = useCallback(() => {
    updateOrg(
      { ipAllowlist },
      {
        onSuccess: () => toast.success("IP allowlist saved"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
      },
    );
  }, [ipAllowlist, updateOrg]);

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const result = await uploadFileMutation.mutateAsync({ file, folder: "org-logos" });
      setLogoUrl(result.url);
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }, [uploadFileMutation]);

  const handleLogoUploadClick = useCallback(() => logoInputRef.current?.click(), []);
  const handleLogoUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setLogoUrl(e.target.value), []);
  const handleTimezoneChange = useCallback((value: string) => setTimezone(value), []);
  const handleCurrencyChange = useCallback((value: string) => setCurrency(value), []);
  const handleFiscalYearStartChange = useCallback((value: string) => setFiscalYearStart(value), []);
  const handleDirectoryPublicChange = useCallback((checked: boolean) => setDirectoryPublic(checked), []);
  const handlePrimaryColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setPrimaryColor(e.target.value), []);
  const handleLoginBgUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setLoginBgUrl(e.target.value), []);
  const handlePasswordExpiryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setPasswordExpiryDays(e.target.value), []);
  const handleMaxConcurrentSessionsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setMaxConcurrentSessions(e.target.value), []);

  const handleAddDomain = useCallback(() => {
    const domain = domainInput.trim().toLowerCase().replace(/^@/, "");
    if (!domain) return;
    if (!isValidDomain(domain)) {
      toast.error("Enter a valid domain (e.g. company.com)");
      return;
    }
    if (allowedEmailDomains.includes(domain)) {
      toast.error("This domain is already in the list");
      return;
    }
    setAllowedEmailDomains((prev) => [...prev, domain]);
    setDomainInput("");
    domainInputRef.current?.focus();
  }, [domainInput, allowedEmailDomains]);

  const handleRemoveDomain = useCallback((domain: string) => {
    setAllowedEmailDomains((prev) => prev.filter((d) => d !== domain));
  }, []);

  const handleDomainInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setDomainInput(e.target.value), []);
  const handleDomainInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); handleAddDomain(); }
  }, [handleAddDomain]);

  const handleIpInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setIpInput(e.target.value), []);
  const handleIpInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); handleAddIp(); }
  }, [handleAddIp]);

  const handleSaveSecurity = useCallback(() => {
    const expiryDaysNum = passwordExpiryDays ? parseInt(passwordExpiryDays, 10) : null;
    if (passwordExpiryDays && (isNaN(expiryDaysNum!) || expiryDaysNum! < 30 || expiryDaysNum! > 365)) {
      toast.error("Password expiry must be between 30 and 365 days");
      return;
    }
    const maxSessionsNum = maxConcurrentSessions ? parseInt(maxConcurrentSessions, 10) : null;
    if (maxConcurrentSessions && (isNaN(maxSessionsNum!) || maxSessionsNum! < 1 || maxSessionsNum! > 100)) {
      toast.error("Max concurrent sessions must be between 1 and 100");
      return;
    }
    updateSecurity(
      { mfaEnforced, passwordExpiryDays: expiryDaysNum, allowedEmailDomains, maxConcurrentSessions: maxSessionsNum },
      {
        onSuccess: () => toast.success("Security settings saved"),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save security settings"),
      },
    );
  }, [mfaEnforced, passwordExpiryDays, maxConcurrentSessions, allowedEmailDomains, updateSecurity]);

  if (isLoading) {
    return (
      <PageWrapper title="Organization" subtitle="Manage your organization details and settings">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  if (!org) {
    return (
      <PageWrapper title="Organization" subtitle="Manage your organization details and settings">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <EmptyProjectsIllustration />
            </div>
            <CardTitle>No Organization Found</CardTitle>
            <CardDescription>
              Create your first organization to start managing your team and projects.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <p className="text-sm text-muted-foreground">
              Please contact your administrator to set up an organization.
            </p>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Organization" subtitle="Manage your organization details and settings">
      <div className="space-y-6">
        <OrgProfileSection org={org} canEdit={canEdit} />

        <OrgBrandingSection org={org} canEdit={canEdit} />

        <OrgLocalizationSection org={org} canEdit={canEdit} />

        <OrgBusinessHoursSection org={org} canEdit={canEdit} />

        <OrgHolidayCalendarSection canEdit={canEdit} />

        <OrgCustomDomainsSection canEdit={canEdit} />

        <OrgIntegrationsSection canEdit={canEdit} />

        <OrgDataPrivacySection canEdit={canEdit} />

        {canEdit && (
          <OrgConfigSection
            org={org}
            isEditingConfig={isEditingConfig}
            logoUrl={logoUrl}
            logoUploading={logoUploading}
            timezone={timezone}
            currency={currency}
            fiscalYearStart={fiscalYearStart}
            directoryPublic={directoryPublic}
            primaryColor={primaryColor}
            loginBgUrl={loginBgUrl}
            isUpdating={isUpdatingOrg}
            logoInputRef={logoInputRef}
            onStartEdit={handleStartEditConfig}
            onCancel={handleCancelEditConfig}
            onSave={handleSaveConfig}
            onLogoUrlChange={handleLogoUrlChange}
            onLogoUpload={handleLogoUpload}
            onLogoUploadClick={handleLogoUploadClick}
            onTimezoneChange={handleTimezoneChange}
            onCurrencyChange={handleCurrencyChange}
            onFiscalYearStartChange={handleFiscalYearStartChange}
            onDirectoryPublicChange={handleDirectoryPublicChange}
            onPrimaryColorChange={handlePrimaryColorChange}
            onLoginBgUrlChange={handleLoginBgUrlChange}
          />
        )}

        {canEdit && (
          <OrgSecuritySection
            mfaEnforced={mfaEnforced}
            passwordExpiryDays={passwordExpiryDays}
            maxConcurrentSessions={maxConcurrentSessions}
            allowedEmailDomains={allowedEmailDomains}
            domainInput={domainInput}
            domainInputRef={domainInputRef}
            ipAllowlist={ipAllowlist}
            ipInput={ipInput}
            isUpdatingSecurity={isUpdatingSecurity}
            isUpdatingOrg={isUpdatingOrg}
            onMfaChange={setMfaEnforced}
            onPasswordExpiryChange={handlePasswordExpiryChange}
            onMaxConcurrentSessionsChange={handleMaxConcurrentSessionsChange}
            onDomainInputChange={handleDomainInputChange}
            onDomainInputKeyDown={handleDomainInputKeyDown}
            onAddDomain={handleAddDomain}
            onRemoveDomain={handleRemoveDomain}
            onSaveSecurity={handleSaveSecurity}
            onIpInputChange={handleIpInputChange}
            onIpInputKeyDown={handleIpInputKeyDown}
            onAddIp={handleAddIp}
            onRemoveIp={handleRemoveIp}
            onSaveIpAllowlist={handleSaveIpAllowlist}
          />
        )}
      </div>
    </PageWrapper>
  );
}
