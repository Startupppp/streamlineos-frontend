import { VendorDetailPage } from "@/features/accounting/purchases/vendors/vendor-detail-page";

interface PageProps {
  params: Promise<{ vendorId: string }>;
}

export default async function AccountingVendorDetailPage({ params }: PageProps) {
  const { vendorId } = await params;
  return <VendorDetailPage vendorId={vendorId} />;
}
