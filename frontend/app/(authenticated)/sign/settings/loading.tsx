import { PageWrapper } from "@/components/ui/page-wrapper";
import { SignSettingsSkeleton } from "@/features/sign/settings/sign-settings-page";

export default function SignSettingsLoading() {
  return (
    <PageWrapper
      title="Settings"
      subtitle="Tenant-wide defaults, branding, and watermark policy for Sign OS"
    >
      <SignSettingsSkeleton />
    </PageWrapper>
  );
}
