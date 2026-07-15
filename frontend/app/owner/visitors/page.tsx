import { Eye, Globe, FileText } from "lucide-react";
import { OwnerPage } from "@/components/owner/owner-page";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";

export const dynamic = "force-dynamic";

export default function VisitorsPage() {
  return (
    <div>
      <OwnerPage
        title="Visitors"
        description="Lightweight pageview tracking — anonymous, no cookies, no third parties."
      />

      <StatCardGrid cols={4} className="mb-1.5">
        <StatCard label="Visits (30d)" value={0} icon={Eye} tone="blue" />
        <StatCard label="Unique (30d)" value={0} icon={Globe} color="cyan" />
        <StatCard label="Top page" value="—" icon={FileText} tone="violet" />
        <StatCard label="Top referrer" value="Direct" tone="emerald" />
      </StatCardGrid>

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
