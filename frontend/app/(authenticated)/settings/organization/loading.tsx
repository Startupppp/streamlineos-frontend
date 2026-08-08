import { PageWrapper } from "@/components/ui/page-wrapper";
import { OrgSettingsSectionsSkeleton } from "@/features/settings/organization/org-settings-skeleton";

export default function OrganizationSettingsLoading() {
  return (
    <PageWrapper
      title="Organization"
      subtitle="Manage your organization profile, branding, and lifecycle settings"
    >
      <OrgSettingsSectionsSkeleton />
    </PageWrapper>
  );
}
