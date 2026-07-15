import { OwnerPage } from "@/components/owner/owner-page";
import { AlertCircle, CheckCircle2, Mail, Send, Users } from "lucide-react";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmailList(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(/[,;\s]+/).map(s => s.trim()).filter(s => s && EMAIL_RE.test(s));
}

function resolveEmailProvider(): "resend" | "sendgrid" | "none" {
  const pref = process.env.EMAIL_PROVIDER?.toLowerCase().trim();
  const hasResend = !!process.env.RESEND_API_KEY;
  const hasSendgrid = !!process.env.SENDGRID_API_KEY;
  if (pref === "sendgrid" && hasSendgrid) return "sendgrid";
  if (pref === "resend" && hasResend) return "resend";
  if (hasResend) return "resend";
  if (hasSendgrid) return "sendgrid";
  return "none";
}

const BRAND_SUPPORT_EMAIL = "support@streamlineos.in";

export default function SettingsPage() {
  const emailProvider = resolveEmailProvider();
  const fromEmailRaw = process.env.EMAIL_FROM_ADDRESS?.trim();
  const fromEmail = fromEmailRaw && EMAIL_RE.test(fromEmailRaw) ? fromEmailRaw : BRAND_SUPPORT_EMAIL;
  const fromName = process.env.EMAIL_FROM_NAME?.trim() || undefined;
  const fromAddress = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
  const adminRecipientsList = [
    ...parseEmailList(process.env.ADMIN_NOTIFICATION_EMAILS),
    ...parseEmailList(process.env.ADMIN_NOTIFICATION_EMAIL),
    ...parseEmailList(process.env.OWNER_EMAIL),
  ];
  const adminRecipients = Array.from(new Set(adminRecipientsList));
  const effectiveAdminRecipients = adminRecipients.length > 0 ? adminRecipients : [BRAND_SUPPORT_EMAIL];

  const razorpay = !!process.env.RAZORPAY_KEY_ID;
  const googleVerification = !!process.env.GOOGLE_SITE_VERIFICATION;

  const checks: { label: string; ok: boolean; hint: string }[] = [
    {
      label: "Email delivery",
      ok: emailProvider !== "none",
      hint:
        emailProvider === "none"
          ? "Set EMAIL_PROVIDER + SENDGRID_API_KEY (or RESEND_API_KEY) in .env"
          : `Using ${emailProvider}`,
    },
    {
      label: "Razorpay",
      ok: razorpay,
      hint: razorpay
        ? "Webhook listening at /api/webhooks/razorpay"
        : "Add RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET + RAZORPAY_WEBHOOK_SECRET",
    },
    {
      label: "Google Search Console",
      ok: googleVerification,
      hint: googleVerification
        ? "Verified — sitemap submitted"
        : "Add GOOGLE_SITE_VERIFICATION token from Search Console",
    },
  ];

  return (
    <div>
      <OwnerPage
        title="Configuration"
        description="What's wired up, what needs your attention."
      />

      <div className="space-y-2.5">
        {checks.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-border bg-card px-4 py-3 flex items-start gap-2"
          >
            {c.ok ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 text-[14px]">
                {c.label}
              </p>
              <p className="text-[12px] text-slate-500 mt-0.5">{c.hint}</p>
            </div>
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                c.ok
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {c.ok ? "Ready" : "Action needed"}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="h-4 w-4 text-slate-500" />
          <h2 className="text-[13px] font-semibold text-slate-500">
            Email routing
          </h2>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <Row
            icon={<Send className="h-4 w-4 text-slate-400" />}
            label="Provider"
            value={
              emailProvider === "none" ? "Not configured" : emailProvider
            }
            tone={emailProvider === "none" ? "warn" : "ok"}
            hint="Switch by setting EMAIL_PROVIDER=sendgrid|resend in .env (requires app restart)."
          />
          <Row
            icon={<Mail className="h-4 w-4 text-slate-400" />}
            label="From address"
            value={fromAddress}
            tone="ok"
            hint={
              fromEmail.endsWith("@streamlineos.in")
                ? "Make sure this sender is verified inside SendGrid (Settings → Sender Authentication)."
                : "Set EMAIL_FROM_ADDRESS to support@streamlineos.in once your domain is verified."
            }
          />
          <Row
            icon={<Users className="h-4 w-4 text-slate-400" />}
            label="Contact-form recipients"
            value={effectiveAdminRecipients.join(", ")}
            tone="ok"
            hint="Edit ADMIN_NOTIFICATION_EMAILS in .env (comma-separated) to change who gets pinged."
          />
        </div>

        <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
          Customer replies sent from{" "}
          <span className="font-mono text-slate-600">/owner/inbox</span> are
          delivered from{" "}
          <span className="font-mono text-slate-600">{fromEmail}</span> using{" "}
          {emailProvider === "none" ? "the configured provider" : emailProvider}
          .
        </p>
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone: "ok" | "warn";
}) {
  return (
    <div className="px-4 py-3 border-b border-slate-100 last:border-b-0 flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-slate-400">
          {label}
        </p>
        <p
          className={`text-[14px] font-medium break-words ${
            tone === "warn" ? "text-amber-700" : "text-slate-900"
          }`}
        >
          {value}
        </p>
        {hint && (
          <p className="text-[12px] text-slate-500 mt-0.5">{hint}</p>
        )}
      </div>
    </div>
  );
}
