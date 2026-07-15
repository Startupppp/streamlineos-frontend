import { Eye, Globe, FileText } from "lucide-react";
import { OwnerPage } from "@/components/owner/owner-page";
import { MetricCard } from "@/components/owner/metric-card";

export const dynamic = "force-dynamic";

export default function VisitorsPage() {
  return (
    <div>
      <OwnerPage
        title="Visitors"
        description="Lightweight pageview tracking — anonymous, no cookies, no third parties."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-1.5">
        <MetricCard
          label="Visits (30d)"
          value={0}
          icon={<Eye className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="Unique (30d)"
          value={0}
          icon={<Globe className="h-3.5 w-3.5" />}
          accent="cyan"
        />
        <MetricCard
          label="Top page"
          value="—"
          accent="violet"
          icon={<FileText className="h-3.5 w-3.5" />}
        />
        <MetricCard label="Top referrer" value="Direct" accent="emerald" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-3 mb-4">
        <h3 className="font-display text-base font-bold text-slate-900 mb-1.5">
          Visits — last 30 days
        </h3>
        <p className="text-[13px] text-slate-400 text-center py-3">
          No visits yet. Once people start landing on your site, they show up here.
        </p>
      </div>
    </div>
  );
}
