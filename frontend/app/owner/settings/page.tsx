import { OwnerPage } from "@/components/owner/owner-page";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const googleVerification = !!process.env.GOOGLE_SITE_VERIFICATION;

  const checks: { label: string; ok: boolean; hint: string }[] = [
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
    </div>
  );
}
