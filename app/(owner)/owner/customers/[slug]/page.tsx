import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { format } from "date-fns";
import { OwnerPage } from "@/components/owner/owner-page";
import { MetricCard } from "@/components/owner/metric-card";
import { getCustomerBySlug } from "@/server/owner/queries/customers";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getCustomerBySlug(slug);
  if (!data) notFound();

  const { org, members, payments, subscription } = data;
  const lifetime = payments
    .filter((p) => p.status === "captured")
    .reduce((acc, p) => acc + p.amount, 0);
  const fmtInr = (paise: number) =>
    `₹${new Intl.NumberFormat("en-IN").format(Math.round(paise / 100))}`;

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/owner/customers"
          className="inline-flex items-center gap-1.5 text-[12px] font-mono uppercase tracking-[0.16em] text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to customers
        </Link>
      </div>

      <OwnerPage
        eyebrow={`Customer · /${org.slug}`}
        title={org.name}
        description={`Joined ${format(org.createdAt!, "PPP")}`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-1.5">
        <MetricCard label="Users" value={members.length} />
        <MetricCard
          label="Plan"
          value={subscription?.plan ?? "Free"}
          hint={subscription?.status ?? "—"}
          accent="cyan"
        />
        <MetricCard
          label="Lifetime spend"
          value={fmtInr(lifetime)}
          accent="emerald"
        />
        <MetricCard
          label="Transactions"
          value={payments.filter((p) => p.status === "captured").length}
          accent="violet"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-2">
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="font-display text-base font-bold text-slate-900">
              Team members
            </h3>
            <p className="text-[12px] text-slate-500 mt-0.5">
              {members.length} {members.length === 1 ? "person" : "people"}
            </p>
          </div>
          {members.length === 0 ? (
            <p className="text-[13px] text-slate-400 px-5 py-4 text-center">
              No users.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {members.slice(0, 12).map((u) => (
                <li
                  key={u.id}
                  className="px-4 py-2.5 flex items-center gap-2 text-[13px]"
                >
                  <span
                    className="h-7 w-7 rounded-full inline-flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{
                      background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
                    }}
                  >
                    {(u.name ?? u.email ?? "?").slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 truncate">
                      {u.name ?? "—"}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 truncate">
                      {u.email}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-400">
                    {u.role}
                  </span>
                </li>
              ))}
              {members.length > 12 && (
                <li className="px-4 py-2.5 text-[12px] text-slate-400 text-center">
                  +{members.length - 12} more
                </li>
              )}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="font-display text-base font-bold text-slate-900">
              Recent payments
            </h3>
            <p className="text-[12px] text-slate-500 mt-0.5">
              {payments.length} {payments.length === 1 ? "record" : "records"}
            </p>
          </div>
          {payments.length === 0 ? (
            <p className="text-[13px] text-slate-400 px-5 py-4 text-center">
              No payments yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {payments.slice(0, 12).map((p) => (
                <li
                  key={p.id}
                  className="px-4 py-2.5 flex items-center gap-2 text-[13px]"
                >
                  <Building2 className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 truncate">
                      {p.description ?? p.razorpayPaymentId}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500">
                      {format(p.createdAt, "dd MMM yyyy")} · {p.method ?? "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold text-slate-900">
                      {fmtInr(p.amount)}
                    </p>
                    <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-400">
                      {p.status}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
