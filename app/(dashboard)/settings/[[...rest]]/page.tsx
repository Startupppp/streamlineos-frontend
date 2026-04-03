"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { SettingsProfile } from "./_components/settings-profile";
import { SettingsSecurity } from "./_components/settings-security";
import { SettingsPreferences } from "./_components/settings-preferences";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <PageWrapper
      title="Account Settings"
      subtitle="Manage your profile, preferences, and security."
    >
      <div className="max-w-2xl space-y-8">
        {/* ── Profile & Avatar ── */}
        <section>
          <div className="mb-4">
            <h2 className="text-[0.9375rem] font-semibold text-foreground">Profile</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Update your display name and profile photo.
            </p>
          </div>
          <SettingsProfile />
        </section>

        <Separator />

        {/* ── Preferences (compact view, etc.) ── */}
        <section>
          <div className="mb-4">
            <h2 className="text-[0.9375rem] font-semibold text-foreground">Preferences</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Customise how the application looks and behaves.
            </p>
          </div>
          <SettingsPreferences />
        </section>

        <Separator />

        {/* ── Password & Security ── */}
        <section>
          <div className="mb-4">
            <h2 className="text-[0.9375rem] font-semibold text-foreground">Security</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Change your password and manage account security.
            </p>
          </div>
          <SettingsSecurity />
        </section>
      </div>
    </PageWrapper>
  );
}
