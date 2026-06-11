import {
  Building2,
  Users as UsersIcon,
  Mail,
  TrendingUp,
  Eye,
  Wallet,
} from "lucide-react";
import { OwnerPage } from "@/components/owner/owner-page";
import { MetricCard } from "@/components/owner/metric-card";
import { getDashboardMetrics } from "@/server/owner/queries/dashboard-metrics";

export default async function OwnerDashboard() {
  const m = await getDashboardMetrics();
  const fmtInr = (n: number) =>
    `₹${new Intl.NumberFormat("en-IN").format(n)}`;

  return (
    <div>
      <OwnerPage
        eyebrow="Platform overview"
        title="Welcome back."
        description="Everything across your StreamlineOS platform — customers, messages, leads, traffic, and revenue."
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
        <MetricCard
          label="Customers"
          value={m.customers.total}
          hint={`${m.customers.activeLast30d} active last 30d`}
          icon={<Building2 className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="Users"
          value={m.users.total}
          hint="across all orgs"
          icon={<UsersIcon className="h-3.5 w-3.5" />}
          accent="cyan"
        />
        <MetricCard
          label="Inbox"
          value={m.messages.total}
          delta={{
            value: `${m.messages.unread} unread`,
            direction: m.messages.unread > 0 ? "up" : "flat",
          }}
          icon={<Mail className="h-3.5 w-3.5" />}
          accent="violet"
        />
        <MetricCard
          label="Leads"
          value={m.leads.total}
          hint={`+${m.leads.newLast7d} this week`}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          accent="emerald"
        />
        <MetricCard
          label="Visits (30d)"
          value={m.visits.last30d}
          hint={`${m.visits.uniqueLast30d} unique`}
          icon={<Eye className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="Revenue (30d)"
          value={fmtInr(m.revenue.last30dInr)}
          hint={`${fmtInr(m.revenue.lifetimeInr)} lifetime`}
          icon={<Wallet className="h-3.5 w-3.5" />}
          accent="emerald"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-2 mt-1.5">
        <ChartCard
          title="Visits — last 30 days"
          unit="visits"
          data={m.series.visitsByDay.map((d) => ({
            label: d.date.slice(5),
            value: d.count,
          }))}
        />
        <ChartCard
          title="Revenue — by month"
          unit="₹"
          data={m.series.revenueByMonth.map((d) => ({
            label: d.month,
            value: d.amount,
          }))}
        />
      </div>
    </div>
  );
}

function ChartCard({
  title,
  unit,
  data,
}: {
  title: string;
  unit: string;
  data: { label: string; value: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-3">
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="font-display text-base font-bold text-slate-900">{title}</h3>
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-400">
          {data.length === 0 ? "No data yet" : `${data.length} points`}
        </span>
      </div>
      {data.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-[12px] text-slate-400">
          Once you start receiving {unit === "₹" ? "payments" : "visits"}, this chart will populate.
        </div>
      ) : (
        <div className="flex items-end gap-1 h-32">
          {data.map((d) => (
            <div
              key={d.label}
              className="flex-1 flex flex-col items-center gap-1.5 group"
            >
              <div
                className="w-full rounded-t bg-gradient-to-t from-blue-500/40 to-cyan-400/80 transition-opacity hover:opacity-90"
                style={{ height: `${(d.value / max) * 100}%`, minHeight: "2px" }}
                title={`${d.label} · ${unit === "₹" ? "₹" : ""}${d.value}${unit !== "₹" ? ` ${unit}` : ""}`}
              />
              <span className="text-[9px] font-mono text-slate-400 truncate w-full text-center">
                {d.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
