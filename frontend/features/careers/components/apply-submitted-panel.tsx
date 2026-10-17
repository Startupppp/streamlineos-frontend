"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export interface SubmittedApplication {
  trackingToken: string;
  /** True when this email had already applied; the token is the first one's. */
  duplicate: boolean;
  resumeStored: boolean;
  resumeReason: string | null;
}

interface Props {
  result: SubmittedApplication;
  orgSlug: string;
}

/**
 * `resumeReason` is a machine code, and this is the display boundary.
 *
 * Two of the codes are not failures and must not be reported as one:
 * `no-file` is a candidate who attached nothing, and `duplicate-application`
 * is the duplicate path, which the headline already explains. Both map to
 * null, so no warning is shown.
 */
const RESUME_REASON: Record<string, string | null> = {
  "no-file": null,
  "duplicate-application": null,
  "storage-not-configured":
    "This employer has not finished setting up résumé storage, so the file was not kept.",
  "upload-failed": "We could not store the file you attached.",
  "too-large": "Your résumé was larger than 10MB.",
  "type-not-allowed": "Your résumé must be a PDF, DOC or DOCX file.",
  "content-mismatch": "That file's contents did not match its type.",
  infected: "That file was refused by malware scanning.",
};

function resumeWarning(result: SubmittedApplication): string | null {
  if (result.resumeStored || !result.resumeReason) return null;
  const known = RESUME_REASON[result.resumeReason];
  return known === undefined ? "We could not store the file you attached." : known;
}

/**
 * What the candidate is told after a successful POST.
 *
 * A duplicate is NOT dressed up as a new application: the server returned the
 * first application's tracking token and wrote nothing, and this says so. A
 * résumé the server refused is named with the server's own reason rather than
 * left to look as though the file went through.
 */
export function ApplySubmittedPanel({ result, orgSlug }: Props) {
  const router = useRouter();
  /**
   * Read once at mount rather than in an effect. This panel only ever renders
   * after a client-side submit, so there is no server render to disagree with —
   * and the candidate wants a URL they can copy, not a path.
   */
  const [origin] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));

  const warning = resumeWarning(result);
  const trackingPath = `/application-status/${result.trackingToken}`;
  const goToStatus = useCallback(() => router.push(trackingPath), [router, trackingPath]);
  const goToOpenings = useCallback(() => router.push(`/careers/${orgSlug}`), [router, orgSlug]);

  return (
    <main className="min-h-dvh bg-background flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-3">
          <div className="w-14 h-14 rounded-full bg-status-success-surface flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-7 text-status-success-ink"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <CardTitle>
            {result.duplicate ? "You have already applied" : "Application submitted"}
          </CardTitle>
          <CardDescription>
            {result.duplicate
              ? "We already have an application from this email address for this role. Nothing was submitted a second time — here is the link to the one we hold."
              : "Your application has been received. Use your tracking link to check its status."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {warning && (
            <div className="rounded-lg border border-status-warning-rule bg-status-warning-surface px-4 py-3">
              <p className="text-sm font-medium text-status-warning-ink">
                Your résumé was not attached
              </p>
              <p className="text-sm text-status-warning-ink mt-0.5">{warning}</p>
              <p className="text-xs text-status-warning-ink mt-1.5">
                The rest of your application was saved. Reply to the hiring team with your CV, or
                apply again with a PDF, DOC or DOCX file.
              </p>
            </div>
          )}

          <div className="rounded-lg border bg-muted/40 px-4 py-3">
            <p className="text-xs text-muted-foreground mb-1">Tracking link</p>
            <a
              href={trackingPath}
              className="text-sm text-status-info-ink hover:underline break-all"
            >
              {origin ? `${origin}${trackingPath}` : trackingPath}
            </a>
            <p className="text-xs text-muted-foreground mt-1.5">
              Save this link to track your application status.
            </p>
          </div>

          <Button className="w-full" onClick={goToStatus}>
            Track my application
          </Button>
          <Button variant="outline" className="w-full" onClick={goToOpenings}>
            View other openings
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
