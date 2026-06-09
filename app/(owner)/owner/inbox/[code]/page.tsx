import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Building, Phone, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getMessageByPublicCode } from "@/server/owner/queries/inbox";
import { markMessageStatus } from "@/server/owner/actions/reply-message";
import { ReplyComposer } from "@/components/owner/reply-composer";

export const dynamic = "force-dynamic";

const TOPIC_LABEL: Record<string, string> = {
  sales: "Sales",
  support: "Support",
  partnership: "Partnership",
  press: "Press",
  other: "Other",
};

export default async function MessageDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const message = await getMessageByPublicCode(code);
  if (!message) notFound();

  if (message.status === "NEW") {
    await markMessageStatus(code, "READ").catch(() => {});
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/owner/inbox"
          className="inline-flex items-center gap-1.5 text-[12px] font-mono uppercase tracking-[0.16em] text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to inbox
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-start gap-4">
          <span
            className="h-12 w-12 rounded-full inline-flex items-center justify-center text-[14px] font-bold text-white shrink-0"
            style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
          >
            {message.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl font-bold text-slate-900">
              {message.name}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-[12px] text-slate-500 flex-wrap">
              <a
                href={`mailto:${message.email}`}
                className="inline-flex items-center gap-1 hover:text-blue-600"
              >
                <Mail className="h-3 w-3" />
                {message.email}
              </a>
              {message.company && (
                <span className="inline-flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  {message.company}
                </span>
              )}
              {message.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {message.phone}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-3 text-[10px] font-mono uppercase tracking-[0.14em]">
              <span className="px-1.5 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-700">
                {TOPIC_LABEL[message.topic] ?? message.topic}
              </span>
              <span className="text-slate-400 normal-case tracking-normal">
                {formatDistanceToNow(message.createdAt, { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-slate-500 mb-2">
            Message
          </p>
          <p className="text-[14px] text-slate-700 leading-relaxed whitespace-pre-wrap">
            {message.message}
          </p>
        </div>

        {message.replyBody && (
          <div className="px-6 py-5 border-t border-slate-100 bg-emerald-50/40">
            <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-emerald-700 mb-2 flex items-center gap-1.5">
              <Send className="h-3 w-3" />
              Your reply{" "}
              {message.repliedAt &&
                `· ${formatDistanceToNow(message.repliedAt, { addSuffix: true })}`}
            </p>
            <p className="text-[14px] text-slate-700 leading-relaxed whitespace-pre-wrap">
              {message.replyBody}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6">
        <ReplyComposer publicCode={message.publicCode} replied={!!message.replyBody} />
      </div>
    </div>
  );
}
