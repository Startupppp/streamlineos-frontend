import Link from "next/link";
import { format } from "date-fns";
import { Wallet, AlertCircle } from "lucide-react";
import { OwnerPage } from "@/components/owner/owner-page";
import { MetricCard } from "@/components/owner/metric-card";
import {
  listPayments,
  getRevenueSummary,
} from "@/server/owner/queries/revenue";

export const dynamic = "force-dynamic";

export default async function RevenuePage() {
  const [payments, summary] = await Promise.all([listPayments(), getRevenueSummary()]);

  const fmtInr = (rupees: number) =>
    `₹${new Intl.NumberFormat("en-IN").format(rupees)}`;
  const fmtInrPaise = (paise: number) =>
    fmtInr(Math.round(paise / 100));

  const captured = summary.byStatus.find((s) => s.status === "captured");
  const refunded = summary.byStatus.find((s) => s.status === "refunded");
  const failed = summary.byStatus.find((s) => s.status === "failed");

  const razorpayConfigured = !!process.env.RAZORPAY_KEY_ID;

  return (
    <div>
      <OwnerPage
        eyebrow="Razorpay"
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
          value={fmtInr(captured?.total ?? 0)}
          hint={`${captured?.count ?? 0} txn`}
          accent="emerald"
          icon={<Wallet className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="Refunded"
          value={fmtInr(refunded?.total ?? 0)}
          hint={`${refunded?.count ?? 0} txn`}
          accent="violet"
        />
        <MetricCard
          label="Failed"
          value={failed?.count ?? 0}
          hint="transactions"
        />
        <MetricCard
          label="Months tracked"
          value={summary.byMonth.length}
          accent="cyan"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="font-display text-base font-bold text-slate-900">
            Recent payments
          </h3>
        </div>
        {payments.length === 0 ? (
          <p className="text-[13px] text-slate-400 text-center py-4">
            No payments captured yet. Once Razorpay sends a webhook, transactions show
            up here automatically.
          </p>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50 text-[10px] font-mono uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Payment</th>
                <th className="px-4 py-2.5 text-left font-medium">Customer</th>
                <th className="px-4 py-2.5 text-left font-medium">Amount</th>
                <th className="px-4 py-2.5 text-left font-medium">Method</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                <th className="px-4 py-2.5 text-left font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-[11px] text-slate-700">
                    {p.razorpayPaymentId}
                  </td>
                  <td className="px-4 py-2.5">
                    {p.orgSlug ? (
                      <Link
                        href={`/owner/customers/${p.orgSlug}`}
                        className="text-blue-600 hover:underline"
                      >
                        {p.orgName}
                      </Link>
                    ) : (
                      <span className="text-slate-500">{p.customerEmail ?? "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono font-semibold">
                    {fmtInrPaise(p.amount)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{p.method ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-block px-2 py-0.5 rounded border text-[10px] font-mono uppercase tracking-[0.14em] border-emerald-200 bg-emerald-50 text-emerald-700">
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                    {format(p.createdAt, "dd MMM, HH:mm")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
