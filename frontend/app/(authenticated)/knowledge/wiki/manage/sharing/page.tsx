import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import KbSharingSettingsPage from "@/features/wiki/components/kb-sharing-settings-page";

export default async function KbManageSharingPage() {
  await requireSession();
  return (
    <RequireModule module="kb">
      <KbSharingSettingsPage />
    </RequireModule>
  );
}
