"use client";

import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Globe, Clock, DollarSign, CalendarRange, Image, Users, Upload, Palette } from "lucide-react";
import { useUpdateOrgSettings } from "@/lib/api/hooks/organization";
import { toast } from "sonner";
import { CURRENCIES, TIMEZONES, MONTHS } from "@/features/settings/organization/constants";
import type { OrgSettings } from "@/types/organization";

interface AppConfigCardProps {
  org: OrgSettings;
}

export function AppConfigCard({ org }: AppConfigCardProps) {
  const [initialized, setInitialized] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [timezone, setTimezone] = useState<string>("");
  const [currency, setCurrency] = useState<string>("");
  const [fiscalYearStart, setFiscalYearStart] = useState<string>("");
  const [directoryPublic, setDirectoryPublic] = useState<boolean>(false);
  const [primaryColor, setPrimaryColor] = useState<string>("");
  const [loginBgUrl, setLoginBgUrl] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);

  const { mutate: updateOrg, isPending: isUpdating } = useUpdateOrgSettings();

  if (!initialized && org) {
    setLogoUrl(org.logo ?? "");
    setTimezone(org.timezone ?? "Asia/Kolkata");
    setCurrency(org.currency ?? "INR");
    setFiscalYearStart(String(org.fiscalYearStart ?? 4));
    setDirectoryPublic(org.directoryPublic ?? false);
    setPrimaryColor(org.primaryColor ?? "");
    setLoginBgUrl(org.loginBgUrl ?? "");
    setInitialized(true);
  }

  const handleStartEdit = useCallback(() => {
    setLogoUrl(org.logo ?? "");
    setTimezone(org.timezone ?? "Asia/Kolkata");
    setCurrency(org.currency ?? "INR");
    setFiscalYearStart(String(org.fiscalYearStart ?? 4));
    setDirectoryPublic(org.directoryPublic ?? false);
    setPrimaryColor(org.primaryColor ?? "");
    setLoginBgUrl(org.loginBgUrl ?? "");
    setIsEditing(true);
  }, [org]);

  const handleCancelEdit = useCallback(() => setIsEditing(false), []);

  const handleLogoUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setLogoUrl(e.target.value),
    []
  );

  const handlePrimaryColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setPrimaryColor(e.target.value),
    []
  );

  const handleLoginBgUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setLoginBgUrl(e.target.value),
    []
  );

  const handleClickUpload = useCallback(() => {
    logoInputRef.current?.click();
  }, []);

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "org-logos");
    setLogoUploading(true);
    try {
      const res = await fetch("/api/storage/upload", { method: "POST", body: formData });
      const json = await res.json() as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed");
      setLogoUrl(json.url);
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }, []);

  const handleSave = useCallback(() => {
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
          setIsEditing(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to save configuration");
        },
      }
    );
  }, [logoUrl, timezone, currency, fiscalYearStart, directoryPublic, primaryColor, loginBgUrl, updateOrg]);

  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-600" />
            App Configuration
          </CardTitle>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={handleStartEdit}>
              Edit
            </Button>
          )}
        </div>
        <CardDescription>
          Branding, currency, timezone, and fiscal year settings for your organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Logo */}
        <div className="space-y-1.5">
          <Label htmlFor="logo-url" className="text-sm flex items-center gap-1.5">
            <Image className="h-3.5 w-3.5 text-muted-foreground" />
            Logo
          </Label>
          {isEditing ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  id="logo-url"
                  value={logoUrl}
                  onChange={handleLogoUrlChange}
                  placeholder="https://example.com/logo.png"
                  aria-label="Logo URL"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={logoUploading}
                  onClick={handleClickUpload}
                >
                  {logoUploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 mr-1" />
                  )}
                  Upload
                </Button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
              {logoUrl && (
                <img src={logoUrl} alt="Logo preview" className="h-10 w-auto rounded border border-border object-contain" />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {org.logo && (
                <img src={org.logo} alt="Org logo" className="h-8 w-auto rounded border border-border object-contain" />
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

        {/* Timezone + Currency side-by-side */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="timezone" className="text-sm flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              Timezone
            </Label>
            {isEditing ? (
              <Select value={timezone} onValueChange={setTimezone}>
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
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              Default Currency
            </Label>
            {isEditing ? (
              <Select value={currency} onValueChange={setCurrency}>
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

        {/* Fiscal Year Start */}
        <div className="space-y-1.5">
          <Label htmlFor="fiscal-year" className="text-sm flex items-center gap-1.5">
            <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
            Fiscal Year Start
          </Label>
          {isEditing ? (
            <Select value={fiscalYearStart} onValueChange={setFiscalYearStart}>
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

        {/* Public Employee Directory */}
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
            checked={isEditing ? directoryPublic : (org.directoryPublic ?? false)}
            onCheckedChange={isEditing ? setDirectoryPublic : () => undefined}
            disabled={!isEditing}
            aria-label="Public employee directory"
          />
        </div>

        <Separator />

        {/* Branding */}
        <div className="space-y-3">
          <Label className="text-sm flex items-center gap-1.5 font-semibold">
            <Palette className="h-3.5 w-3.5 text-muted-foreground" />
            Branding
          </Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="primary-color" className="text-sm text-muted-foreground">Primary Color</Label>
              {isEditing ? (
                <div className="flex gap-2 items-center">
                  <Input
                    id="primary-color"
                    value={primaryColor}
                    onChange={handlePrimaryColorChange}
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
              {isEditing ? (
                <Input
                  id="login-bg"
                  value={loginBgUrl}
                  onChange={handleLoginBgUrlChange}
                  placeholder="https://example.com/bg.jpg"
                  aria-label="Login background image URL"
                />
              ) : (
                <Input value={org.loginBgUrl ?? ""} disabled className="bg-muted text-sm" placeholder="Not set" />
              )}
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="flex gap-2 pt-1">
            <Button onClick={handleSave} disabled={isUpdating} size="sm">
              {isUpdating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Configuration"
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancelEdit} disabled={isUpdating}>
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
