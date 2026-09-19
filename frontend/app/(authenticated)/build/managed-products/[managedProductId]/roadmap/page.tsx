import { notFound } from "next/navigation";
import { requireModulePermission } from "@/lib/rbac/require-permission";
import { ProductRoadmapPage } from "@/features/build/managed-products/product-roadmap-page";

export const metadata = {
  title: "Roadmap | Product",
};

interface Props {
  params: Promise<{ managedProductId: string }>;
}

export default async function ProductRoadmapRoute({ params }: Props) {
  await requireModulePermission("build", "build:roadmap:view");
  const { managedProductId } = await params;
  const parsed = Number(managedProductId);
  if (!Number.isInteger(parsed) || parsed <= 0) notFound();
  return <ProductRoadmapPage managedProductId={parsed} />;
}
