import { VendorDetailPage } from "@/features/accounting/vendors/vendor-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ vendorId: string }>;
}) {
  const { vendorId } = await params;
  return <VendorDetailPage vendorId={vendorId} />;
}
