"use client";

import { useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateOrgSecurity } from "@/hooks/api/organization";
import type { OrgSettings } from "@/types/organization";
import {
  OrgSettingsCard,
  OrgSettingsEditButton,
  OrgSettingsFormActions,
  SettingsField,
  SettingsFieldGrid,
} from "./org-settings-chrome";
import {
  orgSecurityFormSchema,
  parseSecurityList,
  type OrgSecurityFormValues,
} from "./org-security-schema";
import { useOrganizationSettingsForm } from "./use-organization-settings-form";

interface OrgSecuritySectionProps {
  org: OrgSettings;
  canEdit: boolean;
}

function toSecurityValues(org: OrgSettings): OrgSecurityFormValues {
  return {
    mfaEnforced: org.mfaEnforced ?? false,
    allowedEmailDomains: (org.allowedEmailDomains ?? []).join("\n"),
    ipAllowlist: (org.ipAllowlist ?? []).join("\n"),
    maxConcurrentSessions:
      org.maxConcurrentSessions === null || org.maxConcurrentSessions === undefined
        ? ""
        : String(org.maxConcurrentSessions),
  };
}

export function OrgSecuritySection({ org, canEdit }: OrgSecuritySectionProps) {
  const mutation = useUpdateOrgSecurity();
  const { form, isEditing, isSaving, handleEdit, handleCancel, save } =
    useOrganizationSettingsForm({
      resolver: zodResolver(orgSecurityFormSchema),
      serverValues: toSecurityValues(org),
      mutation,
      successMessage: "Session policy updated",
    });
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;
  const mfaEnforced = watch("mfaEnforced");

  const handleMfaChange = useCallback(
    (checked: boolean) => setValue("mfaEnforced", checked, { shouldDirty: true }),
    [setValue],
  );
  const handleSave = useCallback(
    (values: OrgSecurityFormValues) => {
      const maxSessions = values.maxConcurrentSessions.trim();
      save({
        mfaEnforced: values.mfaEnforced,
        allowedEmailDomains: parseSecurityList(values.allowedEmailDomains),
        ipAllowlist: parseSecurityList(values.ipAllowlist),
        maxConcurrentSessions: maxSessions ? Number(maxSessions) : null,
      });
    },
    [save],
  );

  return (
    <OrgSettingsCard
      title="Session policy"
      description="Set organization-wide sign-in and session requirements."
      icon={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}
      action={
        canEdit && !isEditing ? <OrgSettingsEditButton onClick={handleEdit} /> : undefined
      }
    >
      {isEditing ? (
        <form className="space-y-3" onSubmit={handleSubmit(handleSave)}>
          <div className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
            <div>
              <Label htmlFor="mfa-enforced">Require multi-factor authentication</Label>
              <p className="text-xs text-muted-foreground">
                Members must configure MFA before continuing.
              </p>
            </div>
            <Switch
              id="mfa-enforced"
              checked={mfaEnforced}
              onCheckedChange={handleMfaChange}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="allowed-email-domains">Allowed email domains</Label>
              <Textarea
                id="allowed-email-domains"
                rows={3}
                placeholder={"example.com\nsubsidiary.com"}
                aria-invalid={!!errors.allowedEmailDomains}
                {...register("allowedEmailDomains")}
              />
              {errors.allowedEmailDomains && (
                <p className="text-xs text-destructive">{errors.allowedEmailDomains.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ip-allowlist">IP allowlist</Label>
              <Textarea
                id="ip-allowlist"
                rows={3}
                placeholder={"203.0.113.10\n2001:db8::/32"}
                aria-invalid={!!errors.ipAllowlist}
                {...register("ipAllowlist")}
              />
              {errors.ipAllowlist && (
                <p className="text-xs text-destructive">{errors.ipAllowlist.message}</p>
              )}
            </div>
          </div>
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="max-concurrent-sessions">Maximum concurrent sessions</Label>
            <Input
              id="max-concurrent-sessions"
              inputMode="numeric"
              placeholder="Unlimited"
              aria-invalid={!!errors.maxConcurrentSessions}
              {...register("maxConcurrentSessions")}
            />
            {errors.maxConcurrentSessions && (
              <p className="text-xs text-destructive">
                {errors.maxConcurrentSessions.message}
              </p>
            )}
          </div>
          <OrgSettingsFormActions onCancel={handleCancel} isPending={isSaving}>
            <LoadingButton type="submit" size="sm" isPending={isSaving}>
              Save policy
            </LoadingButton>
          </OrgSettingsFormActions>
        </form>
      ) : (
        <SettingsFieldGrid>
          <SettingsField
            label="MFA requirement"
            value={org.mfaEnforced ? "Required" : "Optional"}
          />
          <SettingsField
            label="Email domains"
            value={
              org.allowedEmailDomains?.length
                ? org.allowedEmailDomains.join(", ")
                : "Any verified email"
            }
          />
          <SettingsField
            label="Concurrent sessions"
            value={org.maxConcurrentSessions ?? "Unlimited"}
          />
          <SettingsField
            label="IP allowlist"
            value={org.ipAllowlist?.length ? org.ipAllowlist.join(", ") : "Any IP address"}
          />
        </SettingsFieldGrid>
      )}
    </OrgSettingsCard>
  );
}
