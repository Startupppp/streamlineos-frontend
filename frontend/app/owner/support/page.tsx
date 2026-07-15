import { LifeBuoy } from "lucide-react";
import { OwnerPage } from "@/components/owner/owner-page";

export const dynamic = "force-dynamic";

export default function SupportPage() {
  return (
    <div>
      <OwnerPage
        title="Support requests"
        description="Every 'Get support' message customers send through the contact form. Reply directly from each conversation."
      />

      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <LifeBuoy className="w-8 text-slate-300 mx-auto mb-1.5" />
        <p className="text-[14px] text-slate-600 font-medium">
          No support requests yet.
        </p>
        <p className="text-[12px] text-slate-400 mt-1">
          When customers pick &ldquo;Get support&rdquo; on the contact form, they
          appear here.
        </p>
      </div>
    </div>
  );
}
