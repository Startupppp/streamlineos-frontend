"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useReportingManagerPolicy } from "@/hooks/api/hr/reporting-manager-policy";
import { useCan } from "@/hooks/api/access";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export const REPORTING_POLICY_SETTINGS_HREF = "/hr/settings/reporting-managers";

interface PolicyMissingBannerProps {
  context: "form" | "file";
  className?: string;
}

export function PolicyMissingBanner({ context, className }: PolicyMissingBannerProps) {
  const { data: policy } = useReportingManagerPolicy();
  const canConfigure = useCan("hr:reporting-lines:override");
  if (!policy || (policy.defaultPrimaryManager && policy.defaultPrimaryManagerEligible)) return null;

  const blank = context === "file" ? "A row with a blank manager" : "An employee saved without a manager";
  const outcome = policy.actorQualifiesAsFallback
    ? `${blank} will report to you, as the HR administrator doing this, until someone replaces you.`
    : `${blank} will be refused unless it is marked as a top-level role.`;
  const tone = statusToneClasses(policy.actorQualifiesAsFallback ? "warning" : "danger");

  return (
    <div
      role="status"
      className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-sm", tone.surface, tone.ink, tone.rule, className)}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>
        <span className="font-medium">
          {policy.defaultPrimaryManager ? "The default reporting manager can no longer be assigned." : "No default reporting manager is set."}
        </span>{" "}
        {outcome}
        {canConfigure ? (
          <>
            {" "}
            <Link href={REPORTING_POLICY_SETTINGS_HREF} className="font-medium underline underline-offset-2">
              Set a default reporting manager
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}
