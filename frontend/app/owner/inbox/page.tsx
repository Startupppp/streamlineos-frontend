import Link from "next/link";
import { Mail } from "lucide-react";
import { OwnerPage } from "@/components/owner/owner-page";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const tabs: { label: string; value: string }[] = [
  { label: "All", value: "ALL" },
  { label: "New", value: "NEW" },
  { label: "Replied", value: "REPLIED" },
  { label: "Archived", value: "ARCHIVED" },
];

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = params.status ?? "ALL";

  return (
    <div>
      <OwnerPage
        title="Inbox"
        description="Everything customers send from the contact form. Reply directly — they get a branded email."
      />

      <div className="flex items-center gap-1.5 mb-1.5 border-b border-slate-200">
        {tabs.map((t) => {
          const active = status === t.value;
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

      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <Mail className="w-8 text-slate-300 mx-auto mb-1.5" />
        <p className="text-[14px] text-slate-600 font-medium">No messages yet.</p>
        <p className="text-[12px] text-slate-400 mt-1">
          When customers submit the contact form, they appear here.
        </p>
      </div>
    </div>
  );
}
