import { CheckCircle2, Clock, FileCheck, FileText, Send, XCircle } from "lucide-react";
import Link from "next/link";
import type { Quote } from "@/types/crm/quotes";
import { formatDate } from "../lib/quote-utils";

interface TimelineEvent {
  label: string;
  date: string | null;
  icon: React.ReactNode;
  className: string;
}

function buildTimeline(quote: Quote): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      label: "Created",
      date: quote.createdAt,
      icon: <FileText className="h-3.5 w-3.5" />,
      className: "text-muted-foreground",
    },
  ];

  if (quote.sentAt) {
    events.push({
      label: "Sent",
      date: quote.sentAt,
      icon: <Send className="h-3.5 w-3.5" />,
      className: "text-primary",
    });
  }

  if (quote.approvalStatus === "approved" && quote.approvedAt) {
    events.push({
      label: "Approved",
      date: quote.approvedAt,
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      className: "text-emerald-600 dark:text-emerald-400",
    });
  }

  if (quote.approvalStatus === "rejected" && quote.approvedAt) {
    events.push({
      label: "Approval Rejected",
      date: quote.approvedAt,
      icon: <XCircle className="h-3.5 w-3.5" />,
      className: "text-red-600 dark:text-red-400",
    });
  }

  if (quote.status === "ACCEPTED" && quote.acceptedAt) {
    events.push({
      label: "Accepted",
      date: quote.acceptedAt,
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      className: "text-emerald-600 dark:text-emerald-400",
    });
  }

  if (quote.status === "REJECTED" && quote.rejectedAt) {
    events.push({
      label: "Rejected",
      date: quote.rejectedAt,
      icon: <XCircle className="h-3.5 w-3.5" />,
      className: "text-red-600 dark:text-red-400",
    });
  }

  if (quote.signedAt) {
    events.push({
      label: "Signed",
      date: quote.signedAt,
      icon: <FileCheck className="h-3.5 w-3.5" />,
      className: "text-emerald-600 dark:text-emerald-400",
    });
  }

  if (quote.convertedInvoiceId) {
    events.push({
      label: "Converted to Invoice",
      date: null,
      icon: <FileText className="h-3.5 w-3.5" />,
      className: "text-primary",
    });
  }

  return events;
}

interface QuoteDetailSidebarProps {
  quote: Quote;
}

export function QuoteDetailSidebar({ quote }: QuoteDetailSidebarProps) {
  const timeline = buildTimeline(quote);

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Timeline
        </h3>
        <ol className="relative border-l border-border ml-2 space-y-4">
          {timeline.map((event, i) => (
            <li key={i} className="ml-4">
              <span className={`absolute -left-[9px] flex items-center justify-center w-4 h-4 rounded-full bg-background border border-border ${event.className}`}>
                {event.icon}
              </span>
              <p className={`text-xs font-medium ${event.className}`}>{event.label}</p>
              {event.date && (
                <p className="text-[10px] text-muted-foreground">{formatDate(event.date)}</p>
              )}
            </li>
          ))}
        </ol>
      </div>

      {quote.signedDocumentRef && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FileCheck className="h-3.5 w-3.5" />
            Signed Document
          </h3>
          <p className="text-xs font-mono text-foreground break-all">{quote.signedDocumentRef}</p>
        </div>
      )}

      {quote.convertedInvoiceId && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Invoice
          </h3>
          <Link
            href="/crm/billing"
            className="text-xs text-primary hover:underline"
          >
            View invoice #{quote.convertedInvoiceId}
          </Link>
        </div>
      )}
    </div>
  );
}
