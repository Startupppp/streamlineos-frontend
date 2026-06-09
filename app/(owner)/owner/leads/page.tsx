import Link from "next/link";
import { TrendingUp, Mail } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { OwnerPageHeader } from "@/components/owner/page-header";
import { listLeadsAcrossOrgs } from "@/server/owner/queries/leads";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700 border-blue-200",
  QUALIFIED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PROPOSAL: "bg-violet-100 text-violet-700 border-violet-200",
  NEGOTIATION: "bg-amber-100 text-amber-700 border-amber-200",
  WON: "bg-emerald-100 text-emerald-700 border-emerald-200",
  LOST: "bg-slate-100 text-slate-600 border-slate-200",
};

export default async function LeadsPage() {
  const rows = await listLeadsAcrossOrgs();

  return (
    <div>
      <OwnerPageHeader
        eyebrow="Cross-org leads"
        title="Leads"
        description="Every lead captured across every customer org and through your contact form."
      />

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <TrendingUp className="h-8 w-8 text-slate-300 mx-auto mb-3" />
          <p className="text-[14px] text-slate-600 font-medium">No leads yet.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50 text-[10px] font-mono uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Reference</th>
                <th className="px-5 py-3 text-left font-medium">Contact</th>
                <th className="px-5 py-3 text-left font-medium">Organization</th>
                <th className="px-5 py-3 text-left font-medium">Source</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-left font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.publicCode} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-mono text-[11px] text-slate-500">
                    {r.publicCode}
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">{r.name}</p>
                    {r.email && (
                      <a
                        href={`mailto:${r.email}`}
                        className="text-[11px] font-mono text-slate-500 hover:text-blue-600 inline-flex items-center gap-1"
                      >
                        <Mail className="h-2.5 w-2.5" />
                        {r.email}
                      </a>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {r.organizationSlug ? (
                      <Link
                        href={`/owner/customers/${r.organizationSlug}`}
                        className="text-blue-600 hover:underline"
                      >
                        {r.organizationName}
                      </Link>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {r.source ?? <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 rounded border text-[10px] font-mono uppercase tracking-[0.14em]",
                        STATUS_STYLES[r.status] ?? STATUS_STYLES.NEW,
                      )}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[11px] font-mono text-slate-500">
                    {r.createdAt
                      ? formatDistanceToNow(r.createdAt, { addSuffix: true })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
