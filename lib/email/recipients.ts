import "server-only";
import { BRAND_SUPPORT_EMAIL } from "@/lib/branding";

/* ─────────────────────────────────────────────────────────────────────────────
   Admin / FROM resolution for outbound email.

   Single source of truth — every server action that needs to know
   "where do contact-form notifications go?" or "what address do we send from?"
   imports from here so we never drift.

   Recipient resolution order (first non-empty wins):
     1. ADMIN_NOTIFICATION_EMAILS  (preferred — comma-separated, multi-recipient)
     2. ADMIN_NOTIFICATION_EMAIL   (legacy singular)
     3. OWNER_EMAIL
     4. BRAND_SUPPORT_EMAIL        (hard fallback so we never lose a lead)
   ───────────────────────────────────────────────────────────────────────── */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => s && EMAIL_RE.test(s));
}

export function getAdminRecipients(): string[] {
  const candidates = [
    ...parseList(process.env.ADMIN_NOTIFICATION_EMAILS),
    ...parseList(process.env.ADMIN_NOTIFICATION_EMAIL),
    ...parseList(process.env.OWNER_EMAIL),
  ];
  const deduped = Array.from(new Set(candidates));
  return deduped.length > 0 ? deduped : [BRAND_SUPPORT_EMAIL];
}

export function getFromEmail(): string {
  const fromEmail = process.env.EMAIL_FROM_ADDRESS?.trim();
  return fromEmail && EMAIL_RE.test(fromEmail) ? fromEmail : BRAND_SUPPORT_EMAIL;
}

export function getFromName(): string | undefined {
  return process.env.EMAIL_FROM_NAME?.trim() || undefined;
}

export function getFromAddress(): string {
  const name = getFromName();
  const email = getFromEmail();
  return name ? `${name} <${email}>` : email;
}
