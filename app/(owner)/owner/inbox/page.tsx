import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Mail, ArrowRight, Archive } from "lucide-react";
import { OwnerPage } from "@/components/owner/owner-page";
import { listMessages } from "@/server/owner/queries/inbox";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700 border-blue-200",
  READ: "bg-slate-100 text-slate-700 border-slate-200",
  REPLIED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  ARCHIVED: "bg-slate-100 text-slate-500 border-slate-200",
};

const TOPIC_LABEL: Record<string, string> = {
  sales: "Sales",
  support: "Support",
  partnership: "Partnership",
  press: "Press",
  other: "Other",
};

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = params.status as "NEW" | "READ" | "REPLIED" | "ARCHIVED" | "ALL" | undefined;
  const messages = await listMessages({ status: status ?? "ALL" });

  const tabs: { label: string; value: string }[] = [
    { label: "All", value: "ALL" },
    { label: "New", value: "NEW" },
    { label: "Replied", value: "REPLIED" },
    { label: "Archived", value: "ARCHIVED" },
  ];

  return (
    <div>
      <OwnerPage
        eyebrow="Messages"
        title="Inbox"
        description="Everything customers send from the contact form. Reply directly — they get a branded email."
      />

      <div className="flex items-center gap-1.5 mb-1.5 border-b border-slate-200">
        {tabs.map((t) => {
          const active = (status ?? "ALL") === t.value;
          return (
            <Link
              key={t.value}
              href={`/owner/inbox${t.value === "ALL" ? "" : `?status=${t.value}`}`}
              className={cn(
                "px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors",
                active
                  ? "border-blue-500 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-900",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {messages.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <Mail className="h-8 w-8 text-slate-300 mx-auto mb-1.5" />
          <p className="text-[14px] text-slate-600 font-medium">No messages yet.</p>
          <p className="text-[12px] text-slate-400 mt-1">
            When customers submit the contact form, they appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="divide-y divide-slate-100">
            {messages.map((m) => (
              <Link
                key={m.publicCode}
                href={`/owner/inbox/${m.publicCode}`}
                className="block px-4 py-3 hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-start gap-2">
                  <span
                    className="h-9 w-9 rounded-full inline-flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                    style={{
                      background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
                    }}
                  >
                    {m.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-[14px] font-semibold text-slate-900 truncate">
                        {m.name}
                      </p>
                      <span className="text-[12px] text-slate-500 truncate">
                        {m.email}
                      </span>
                      {m.company && (
                        <span className="text-[12px] text-slate-400 truncate">
                          · {m.company}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-slate-600 line-clamp-1 mb-1.5">
                      {m.message}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em]">
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded border",
                          STATUS_STYLES[m.status] ?? STATUS_STYLES.NEW,
                        )}
                      >
                        {m.status}
                      </span>
                      <span className="text-slate-400">
                        {TOPIC_LABEL[m.topic] ?? m.topic}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-400 normal-case tracking-normal">
                        {formatDistanceToNow(m.createdAt, { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0 mt-1.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-slate-400 mt-1.5 flex items-center gap-1.5">
        <Archive className="h-3 w-3" />
        {messages.length} message{messages.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}
