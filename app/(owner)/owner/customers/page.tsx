import Link from "next/link";
import { format } from "date-fns";
import { Building2, ArrowRight, Users as UsersIcon } from "lucide-react";
import { OwnerPageHeader } from "@/components/owner/page-header";
import { listCustomers } from "@/server/owner/queries/customers";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await listCustomers();
  const fmtInr = (n: number) => `₹${new Intl.NumberFormat("en-IN").format(n)}`;

  return (
    <div>
      <OwnerPageHeader
        eyebrow="Customers"
        title="All organizations"
        description="Every organization running on StreamlineOS — users, plan, lifetime spend."
      />

      {customers.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <Building2 className="h-8 w-8 text-slate-300 mx-auto mb-3" />
          <p className="text-[14px] text-slate-600 font-medium">No customers yet.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50 text-[10px] font-mono uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Organization</th>
                <th className="px-5 py-3 text-left font-medium">Users</th>
                <th className="px-5 py-3 text-left font-medium">Plan</th>
                <th className="px-5 py-3 text-left font-medium">Lifetime spend</th>
                <th className="px-5 py-3 text-left font-medium">Joined</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c) => (
                <tr key={c.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-[11px] font-bold text-white"
                        style={{
                          background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
                        }}
                      >
                        {c.name
                          .split(/\s+/)
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                      <div>
                        <Link
                          href={`/owner/customers/${c.slug}`}
                          className="font-semibold text-slate-900 hover:text-blue-600"
                        >
                          {c.name}
                        </Link>
                        <p className="text-[11px] font-mono text-slate-400">
                          /{c.slug}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-slate-700">
                      <UsersIcon className="h-3 w-3 text-slate-400" />
                      {c.userCount}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-700">
                    {c.plan ?? <span className="text-slate-400">free</span>}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-slate-700">
                    {fmtInr(c.lifetimeInr)}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 font-mono text-[12px]">
                    {c.createdAt ? format(c.createdAt, "dd MMM yyyy") : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/owner/customers/${c.slug}`}
                      className="text-blue-600 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-[12px] font-medium"
                    >
                      Open <ArrowRight className="h-3 w-3" />
                    </Link>
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
