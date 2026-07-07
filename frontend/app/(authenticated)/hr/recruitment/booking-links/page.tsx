import { BookingLinksView } from "@/features/hr/recruitment/components/booking-links-view";
import { BRAND_URL } from "@/lib/branding";

export default function BookingLinksPage() {
  const baseUrl = (process.env.NEXTAUTH_URL ?? BRAND_URL).replace(/\/$/, "");
  return <BookingLinksView baseUrl={baseUrl} />;
}
