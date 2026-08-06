"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { SettingsProfile } from "@/features/settings/settings-profile";
import { SettingsSecurity } from "@/features/settings/settings-security";
import { MfaSettings } from "@/components/settings/mfa-settings";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <PageWrapper
      title="Account Settings"
      subtitle="Manage your profile and security."
    >
      <div className="space-y-4">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-[0.9375rem] font-semibold text-foreground">Profile</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Update your display name and profile photo.
            </p>
          </div>
          <SettingsProfile />
        </section>

        <Separator />

        <section>
          <div className="mb-3">
            <h2 className="text-[0.9375rem] font-semibold text-foreground">Security</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Change your password and manage account security.
            </p>
          </div>
          <div className="space-y-4">
            <SettingsSecurity />
            <MfaSettings />
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
