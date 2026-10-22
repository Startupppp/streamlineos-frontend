"use client";

import { ShieldAlert } from "lucide-react";
import { useMissingConsentCount } from "@/hooks/api/crm/consent";

export function ConsentGapNotice() {
  const missing = useMissingConsentCount("EMAIL");
  const count = missing.data?.count;

  if (count === undefined || count === 0) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-lg border border-status-warning-rule bg-status-warning-surface px-4 py-3"
    >
      <ShieldAlert className="size-4 shrink-0 text-status-warning-ink" aria-hidden />
      <p className="flex-1 text-label text-status-warning-ink">
        <span className="font-semibold">
          {count === 1 ? "1 contact has" : `${count} contacts have`}
        </span>{" "}
        no email consent on file. Nothing is recorded either way for them, which is
        not the same as permission — open a contact to record what they agreed to.
      </p>
    </div>
  );
}
