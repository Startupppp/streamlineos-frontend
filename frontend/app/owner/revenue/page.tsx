import { Wallet, AlertCircle } from "lucide-react";
import { OwnerPage } from "@/components/owner/owner-page";
import { MetricCard } from "@/components/owner/metric-card";

export const dynamic = "force-dynamic";

export default function RevenuePage() {
  const razorpayConfigured = !!process.env.RAZORPAY_KEY_ID;

  return (
    <div>
      <OwnerPage
        title="Revenue"
        description="Every payment, refund, and failed transaction across your customer base."
      />

      {!razorpayConfigured && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 mb-4 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-[13px] text-amber-900 leading-relaxed">
            <p className="font-semibold mb-0.5">Razorpay isn&apos;t configured yet.</p>
            <p>
              Add <code className="font-mono bg-amber-100 px-1 rounded">RAZORPAY_KEY_ID</code> and{" "}
              <code className="font-mono bg-amber-100 px-1 rounded">RAZORPAY_KEY_SECRET</code> to
              your <code className="font-mono bg-amber-100 px-1 rounded">.env</code>, then point
              your Razorpay dashboard webhook at{" "}
              <code className="font-mono bg-amber-100 px-1 rounded">
                /api/webhooks/razorpay
              </code>
              .
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-1.5">
        <MetricCard
          label="Captured"
          value="₹0"
          hint="0 txn"
          accent="emerald"
          icon={<Wallet className="h-3.5 w-3.5" />}
        />
        <MetricCard label="Refunded" value="₹0" hint="0 txn" accent="violet" />
        <MetricCard label="Failed" value={0} hint="transactions" />
        <MetricCard label="Months tracked" value={0} accent="cyan" />
      </div>

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
