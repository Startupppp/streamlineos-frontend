import { Wallet } from "lucide-react";
import { OwnerPage } from "@/components/owner/owner-page";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";

export const dynamic = "force-dynamic";

export default function RevenuePage() {
  return (
    <div>
      <OwnerPage
        title="Revenue"
        description="Every payment, refund, and failed transaction across your customer base."
      />

      <StatCardGrid cols={4} className="mb-1.5">
        <StatCard
          label="Captured"
          value="₹0"
          hint="0 txn"
          icon={Wallet}
          tone="emerald"
        />
        <StatCard label="Refunded" value="₹0" hint="0 txn" tone="violet" />
        <StatCard label="Failed" value={0} hint="transactions" />
        <StatCard label="Months tracked" value={0} color="cyan" />
      </StatCardGrid>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="font-display text-base font-bold text-slate-900">
            Recent payments
          </h3>
        </div>
        <p className="text-[13px] text-slate-400 text-center py-4">
          No payments captured yet. Once Razorpay sends a webhook, transactions show
          up here automatically.
        </p>
      </div>
    </div>
  );
}
