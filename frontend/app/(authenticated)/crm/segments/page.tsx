import { RequireModule } from "@/components/auth/require-module";
import { SegmentsPage } from "@/features/crm/segments";

export default function CrmSegmentsRoute() {
  return (
    <RequireModule module="crm">
      <SegmentsPage />
    </RequireModule>
  );
}
