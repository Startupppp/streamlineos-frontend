"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import NextImage from "next/image";
import { Globe, Image as ImageIcon, Clock, IndianRupee, CalendarRange, Users, Palette } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { UploadIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";

const CURRENCIES = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "INR", label: "INR — Indian Rupee" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "AED", label: "AED — UAE Dirham" },
] as const;

const TIMEZONES = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST, UTC+5:30)" },
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "America/New_York (EST/EDT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT)" },
  { value: "America/Chicago", label: "America/Chicago (CST/CDT)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET/CEST)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST, UTC+4)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT, UTC+8)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST, UTC+9)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT)" },
] as const;

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
] as const;

interface OrgConfigData {
  logo?: string | null;
  timezone?: string | null;
  currency?: string | null;
  fiscalYearStart?: number | null;
  directoryPublic?: boolean | null;
  primaryColor?: string | null;
  loginBgUrl?: string | null;
}

interface OrgConfigSectionProps {
  org: OrgConfigData;
  isEditingConfig: boolean;
  logoUrl: string;
  logoUploading: boolean;
  timezone: string;
  currency: string;
  fiscalYearStart: string;
  directoryPublic: boolean;
  primaryColor: string;
  loginBgUrl: string;
  isUpdating: boolean;
  logoInputRef: React.RefObject<HTMLInputElement | null>;
  onStartEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onLogoUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLogoUploadClick: () => void;
  onTimezoneChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onFiscalYearStartChange: (value: string) => void;
  onDirectoryPublicChange: (checked: boolean) => void;
  onPrimaryColorChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLoginBgUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function LogoUploadButton({ uploading, onClick }: { uploading: boolean; onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <LoadingButton type="button" variant="outline" size="sm" className="shrink-0" isPending={uploading} onClick={onClick} {...hoverHandlers}>
      {!uploading && <UploadIcon ref={iconRef} size={14} className="mr-1" />}
      Upload
    </LoadingButton>
  );
}

export function OrgConfigSection({
  org,
  isEditingConfig,
  logoUrl,
  logoUploading,
  timezone,
  currency,
  fiscalYearStart,
  directoryPublic,
  primaryColor,
  loginBgUrl,
  isUpdating,
  logoInputRef,
  onStartEdit,
  onCancel,
  onSave,
  onLogoUrlChange,
  onLogoUpload,
  onLogoUploadClick,
  onTimezoneChange,
  onCurrencyChange,
  onFiscalYearStartChange,
  onDirectoryPublicChange,
  onPrimaryColorChange,
  onLoginBgUrlChange,
}: OrgConfigSectionProps) {
  return (
    <Card className="rounded-lg border border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            App Configuration
          </CardTitle>
          {!isEditingConfig && (
            <Button variant="outline" size="sm" onClick={onStartEdit}>
              Edit
            </Button>
          )}
        </div>
        <CardDescription>
          Branding, currency, timezone, and fiscal year settings for your organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="logo-url" className="text-sm flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
            Logo
          </Label>
          {isEditingConfig ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  id="logo-url"
                  value={logoUrl}
                  onChange={onLogoUrlChange}
                  placeholder="https://example.com/logo.png"
                  aria-label="Logo URL"
                  className="flex-1"
                />
                <LogoUploadButton uploading={logoUploading} onClick={onLogoUploadClick} />
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onLogoUpload}
                />
              </div>
              {logoUrl && (
                <NextImage src={logoUrl} alt="Logo preview" width={200} height={40} className="h-10 w-auto rounded border border-border object-contain" />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {org.logo && (
                <NextImage src={org.logo} alt="Org logo" width={200} height={32} className="h-8 w-auto rounded border border-border object-contain" />
              )}
              <Input
                id="logo-url"
                value={org.logo ?? ""}
                disabled
                className="bg-muted"
                aria-label="Logo URL"
                placeholder="Not set"
              />
            </div>
          )}
        </div>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="timezone" className="text-sm flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              Timezone
            </Label>
            {isEditingConfig ? (
              <Select value={timezone} onValueChange={onTimezoneChange}>
                <SelectTrigger id="timezone" aria-label="Timezone">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="timezone"
                value={org.timezone ?? "Asia/Kolkata"}
                disabled
                className="bg-muted"
                aria-label="Timezone"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="currency" className="text-sm flex items-center gap-1.5">
              <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
              Default Currency
            </Label>
            {isEditingConfig ? (
              <Select value={currency} onValueChange={onCurrencyChange}>
                <SelectTrigger id="currency" aria-label="Default currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="currency"
                value={org.currency ?? "INR"}
                disabled
                className="bg-muted"
                aria-label="Default currency"
              />
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fiscal-year" className="text-sm flex items-center gap-1.5">
            <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
            Fiscal Year Start
          </Label>
          {isEditingConfig ? (
            <Select value={fiscalYearStart} onValueChange={onFiscalYearStartChange}>
              <SelectTrigger id="fiscal-year" aria-label="Fiscal year start month" className="w-48">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="fiscal-year"
              value={MONTHS.find((m) => m.value === (org.fiscalYearStart ?? 4))?.label ?? "April"}
              disabled
              className="bg-muted w-48"
              aria-label="Fiscal year start month"
            />
          )}
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              Public Employee Directory
            </Label>
            <p className="text-sm text-muted-foreground">
              Allow members to view the full employee directory. When off, only HR and admins can browse it.
            </p>
          </div>
          <Switch
            checked={isEditingConfig ? directoryPublic : (org.directoryPublic ?? false)}
            onCheckedChange={isEditingConfig ? onDirectoryPublicChange : undefined}
            disabled={!isEditingConfig}
            aria-label="Public employee directory"
          />
        </div>

        <Separator />

        <div className="space-y-3">
          <Label className="text-sm flex items-center gap-1.5 font-semibold">
            <Palette className="h-3.5 w-3.5 text-muted-foreground" />
            Branding
          </Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="primary-color" className="text-sm text-muted-foreground">Primary Color</Label>
              {isEditingConfig ? (
                <div className="flex gap-2 items-center">
                  <Input
                    id="primary-color"
                    value={primaryColor}
                    onChange={onPrimaryColorChange}
                    placeholder="#bd882c"
                    className="flex-1 font-mono text-sm"
                    aria-label="Primary brand color"
                  />
                  {primaryColor && /^#[0-9a-fA-F]{6}$/.test(primaryColor) && (
                    <div className="h-8 w-8 rounded border border-border shrink-0" style={{ backgroundColor: primaryColor }} />
                  )}
                </div>
              ) : (
                <div className="flex gap-2 items-center">
                  <Input value={org.primaryColor ?? ""} disabled className="bg-muted flex-1 font-mono text-sm" placeholder="Not set" />
                  {org.primaryColor && (
                    <div className="h-8 w-8 rounded border border-border shrink-0" style={{ backgroundColor: org.primaryColor }} />
                  )}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-bg" className="text-sm text-muted-foreground">Login Page Background URL</Label>
              {isEditingConfig ? (
                <Input
                  id="login-bg"
                  value={loginBgUrl}
                  onChange={onLoginBgUrlChange}
                  placeholder="https://example.com/bg.jpg"
                  aria-label="Login background image URL"
                />
              ) : (
                <Input value={org.loginBgUrl ?? ""} disabled className="bg-muted text-sm" placeholder="Not set" />
              )}
            </div>
          </div>
        </div>

        {isEditingConfig && (
          <div className="flex gap-2 pt-1">
            <LoadingButton onClick={onSave} isPending={isUpdating} size="sm" loadingText="Saving…">
              Save Configuration
            </LoadingButton>
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={isUpdating}>
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
