import { LifeBuoy, Mail } from "lucide-react";
import Link from "next/link";
import { OwnerPageHeader } from "@/components/owner/page-header";
import { listMessages } from "@/server/owner/queries/inbox";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const supportMessages = await listMessages({ topic: "support" });

  return (
    <div>
      <OwnerPageHeader
        eyebrow="Customer support"
        title="Support requests"
        description="Every 'Get support' message customers send through the contact form. Reply directly from each conversation."
      />

      {supportMessages.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <LifeBuoy className="h-8 w-8 text-slate-300 mx-auto mb-3" />
          <p className="text-[14px] text-slate-600 font-medium">
            No support requests yet.
          </p>
          <p className="text-[12px] text-slate-400 mt-1">
            When customers pick &ldquo;Get support&rdquo; on the contact form, they
            appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {supportMessages.map((m) => (
              <li key={m.publicCode}>
                <Link
                  href={`/owner/inbox/${m.publicCode}`}
                  className="block px-5 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-slate-300 mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900">
                          {m.name}
                        </span>
                        <span className="text-[12px] text-slate-500">
                          {m.email}
                        </span>
                      </div>
                      <p className="text-[13px] text-slate-600 line-clamp-2">
                        {m.message}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-mono uppercase tracking-[0.14em] px-1.5 py-0.5 rounded border shrink-0 ${
                        m.status === "REPLIED"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-blue-200 bg-blue-50 text-blue-700"
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
