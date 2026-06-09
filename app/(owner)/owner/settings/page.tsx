import { OwnerPageHeader } from "@/components/owner/page-header";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { getEmailProvider } from "@/lib/email/sender";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const emailProvider = getEmailProvider();
  const razorpay = !!process.env.RAZORPAY_KEY_ID;
  const googleVerification = !!process.env.GOOGLE_SITE_VERIFICATION;

  const checks: { label: string; ok: boolean; hint: string }[] = [
    {
      label: "Email delivery",
      ok: emailProvider !== "none",
      hint:
        emailProvider === "none"
          ? "Set RESEND_API_KEY (preferred) or SENDGRID_API_KEY in .env"
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
      <OwnerPageHeader
        eyebrow="Platform settings"
        title="Configuration"
        description="What's wired up, what needs your attention."
      />

      <div className="space-y-2.5">
        {checks.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-4 flex items-start gap-3"
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
              className={`text-[10px] font-mono uppercase tracking-[0.16em] px-2 py-0.5 rounded-full shrink-0 ${
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
    </div>
  );
}
