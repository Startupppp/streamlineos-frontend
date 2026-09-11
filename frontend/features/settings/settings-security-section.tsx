"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import { useShellVariant } from "@/components/layout/shell-variant-context";
import { useAfterLoad } from "@/hooks/common/use-after-load";

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
  const variant = useShellVariant();
  const loaded = useAfterLoad();
  const mfaVisible = variant === "desktop" || loaded;

  return (
    <>
      <SettingsSecurity />
      {mfaVisible ? <MfaSettings /> : <SecuritySkeleton />}
    </>
  );
}
