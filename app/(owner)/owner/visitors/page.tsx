import { Eye, Globe, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { OwnerPage } from "@/components/owner/owner-page";
import { MetricCard } from "@/components/owner/metric-card";
import { getVisitorAnalytics } from "@/server/owner/queries/visitors";

export const dynamic = "force-dynamic";

export default async function VisitorsPage() {
  const a = await getVisitorAnalytics();
  const total = a.byDay.reduce((acc, d) => acc + d.visits, 0);
  const unique = a.byDay.reduce((acc, d) => acc + d.unique, 0);
  const max = Math.max(1, ...a.byDay.map((d) => d.visits));

  return (
    <div>
      <OwnerPage
        eyebrow="Analytics"
        title="Visitors"
        description="Lightweight pageview tracking — anonymous, no cookies, no third parties."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-1.5">
        <MetricCard
          label="Visits (30d)"
          value={total}
          icon={<Eye className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="Unique (30d)"
          value={unique}
          icon={<Globe className="h-3.5 w-3.5" />}
          accent="cyan"
        />
        <MetricCard
          label="Top page"
          value={a.topPaths[0]?.path ?? "—"}
          accent="violet"
          icon={<FileText className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="Top referrer"
          value={a.topReferrers[0]?.referrer ?? "Direct"}
          accent="emerald"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-3 mb-4">
        <h3 className="font-display text-base font-bold text-slate-900 mb-1.5">
          Visits — last 30 days
        </h3>
        {a.byDay.length === 0 ? (
          <p className="text-[13px] text-slate-400 text-center py-3">
            No visits yet. Once people start landing on your site, they show up here.
          </p>
        ) : (
          <div className="flex items-end gap-1 h-36">
            {a.byDay.map((d) => (
              <div
                key={d.date}
                className="flex-1 flex flex-col items-center gap-1.5"
                title={`${d.date} · ${d.visits} visits · ${d.unique} unique`}
              >
                <div
                  className="w-full rounded-t bg-gradient-to-t from-blue-500/30 to-cyan-400/80"
                  style={{ height: `${(d.visits / max) * 100}%`, minHeight: "2px" }}
                />
                <span className="text-[9px] font-mono text-slate-400 truncate w-full text-center">
                  {d.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-2">
        <ListCard
          title="Top pages"
          empty="No pageviews yet."
          rows={a.topPaths.map((p) => ({
            label: p.path,
            value: p.visits.toString(),
          }))}
        />
        <ListCard
          title="Top referrers"
          empty="No referrers tracked yet."
          rows={a.topReferrers.map((r) => ({
            label: r.referrer ?? "Direct",
            value: r.visits.toString(),
          }))}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card mt-1.5 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="font-display text-base font-bold text-slate-900">
            Recent visits
          </h3>
        </div>
        {a.recent.length === 0 ? (
          <p className="text-[13px] text-slate-400 text-center py-4">No data.</p>
        ) : (
          <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto scrollbar-hide">
            {a.recent.map((v, i) => (
              <li key={i} className="px-5 py-2.5 flex items-center gap-2 text-[12px]">
                <span className="font-mono text-slate-500 truncate flex-1">
                  {v.path}
                </span>
                <span className="text-slate-400 truncate hidden sm:inline w-1/3">
                  {v.referrer ?? "Direct"}
                </span>
                <span className="text-slate-400 font-mono text-[11px] shrink-0">
                  {formatDistanceToNow(v.createdAt, { addSuffix: true })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ListCard({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: { label: string; value: string }[];
  empty: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <h3 className="font-display text-base font-bold text-slate-900">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="text-[13px] text-slate-400 text-center py-4">{empty}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <li
              key={r.label}
              className="px-5 py-2.5 flex items-center justify-between text-[13px]"
            >
              <span className="text-slate-700 truncate font-mono text-[12px]">
                {r.label}
              </span>
              <span className="text-slate-900 font-semibold tabular-nums">
                {r.value}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
