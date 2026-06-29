import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MessageDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  if (!code) notFound();

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/owner/inbox"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to inbox
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <p className="text-[14px] text-slate-600 font-medium">
          Message not found.
        </p>
      </div>
    </div>
  );
}
