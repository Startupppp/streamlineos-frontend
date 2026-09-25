import { requirePermission } from "@/lib/rbac/require-permission";
import { BookingLinksView } from "@/features/recruitment/components/booking-links-view";
import { BRAND_URL } from "@/lib/branding";

export default async function RecruitmentBookingLinksRoute() {
  await requirePermission("hr:interviews:view");
  const baseUrl = (process.env.NEXTAUTH_URL ?? BRAND_URL).replace(/\/$/, "");
  return <BookingLinksView baseUrl={baseUrl} />;
}
