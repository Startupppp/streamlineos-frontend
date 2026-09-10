"use client";

import { ShieldAlert } from "lucide-react";
import { useMissingConsentCount } from "@/hooks/api/crm/consent";

/**
 * How many contacts hold no email-consent record at all.
 *
 * The number a DPDP review opens with, and the one the contact list is the only
 * honest place for: a per-contact history answers "what did this person agree
 * to", and answers nothing about the size of the gap. `GET /crm/consent/missing`
 * has always been able to say, and until now nothing asked it.
 *
 * Email alone, named as such. The endpoint takes any of the five channels, but
 * a count that silently spanned all of them would be a different number from
 * the one the sentence claims — and email is the channel unsubscribe, marketing
 * sends and the withdrawal route all run on.
 *
 * Nothing is rendered until a count is in hand. A failed or refused read
 * arrives as no data, and "0 contacts are missing consent" is the strongest
 * possible claim to make out of not knowing.
 */
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
