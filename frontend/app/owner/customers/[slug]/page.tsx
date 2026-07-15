import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { OwnerPage } from "@/components/owner/owner-page";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/owner/customers"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to customers
        </Link>
      </div>

      <OwnerPage title={slug} />
    </div>
  );
}
