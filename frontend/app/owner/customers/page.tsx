import { Building2 } from "lucide-react";
import { OwnerPage } from "@/components/owner/owner-page";

export const dynamic = "force-dynamic";

export default function CustomersPage() {
  return (
    <div>
      <OwnerPage
        title="All organizations"
        description="Every organization running on StreamlineOS — users, plan, lifetime spend."
      />

      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <Building2 className="h-8 w-8 text-slate-300 mx-auto mb-1.5" />
        <p className="text-[14px] text-slate-600 font-medium">No customers yet.</p>
      </div>
    </div>
  );
}
