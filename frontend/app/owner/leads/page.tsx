import { TrendingUp } from "lucide-react";
import { OwnerPage } from "@/components/owner/owner-page";

export const dynamic = "force-dynamic";

export default function LeadsPage() {
  return (
    <div>
      <OwnerPage
        title="Leads"
        description="Every lead captured across every customer org and through your contact form."
      />

      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <TrendingUp className="w-8 text-slate-300 mx-auto mb-1.5" />
        <p className="text-[14px] text-slate-600 font-medium">No leads yet.</p>
      </div>
    </div>
  );
}
