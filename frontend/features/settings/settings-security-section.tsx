"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * The security half of /settings, fetched after first paint.
 *
 * Password change and MFA enrolment both sit below the profile card and neither
 * is what the page is opened for, but between them they drag react-hook-form,
 * the QR/OTP surface and their own contracts into the route's first load. The
 * profile form above them stays eager, so the part of the page that is actually
 * above the fold still renders from the server.
 */
function SecuritySkeleton() {
  return (
    <div className="space-y-3" role="status" aria-busy="true">
      <span className="sr-only">Loading security settings</span>
      <Skeleton className="h-9 w-full rounded-md" />
      <Skeleton className="h-9 w-full rounded-md" />
      <Skeleton className="h-9 w-2/3 rounded-md" />
    </div>
  );
}

const SettingsSecurity = dynamic(
  () =>
    import("@/features/settings/settings-security").then((m) => ({
      default: m.SettingsSecurity,
    })),
  { ssr: false, loading: SecuritySkeleton },
);

const MfaSettings = dynamic(
  () =>
    import("@/components/settings/mfa-settings").then((m) => ({
      default: m.MfaSettings,
    })),
  { ssr: false, loading: SecuritySkeleton },
);

export function SettingsSecuritySection() {
  return (
    <>
      <SettingsSecurity />
      <MfaSettings />
    </>
  );
}
