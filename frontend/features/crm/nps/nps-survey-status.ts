import type { BadgeTone } from "@/components/ui/semantic-badge";
import type { NpsSurveyStatus } from "@/hooks/api/crm/nps";

const STATUS_LABEL: Record<NpsSurveyStatus, string> = {
  draft: "Draft",
  active: "Active",
  closed: "Closed",
};

const STATUS_TONE: Record<NpsSurveyStatus, BadgeTone> = {
  draft: "neutral",
  active: "success",
  closed: "info",
};

function asStatus(status: string): NpsSurveyStatus {
  return status === "active" || status === "closed" ? status : "draft";
}

export function surveyStatusBadge(status: string): { label: string; tone: BadgeTone } {
  const known = asStatus(status);
  return { label: STATUS_LABEL[known], tone: STATUS_TONE[known] };
}

/** The one lifecycle move a row offers: open a draft, close an active survey, reopen a closed one. */
export function nextSurveyStatus(status: string): { status: NpsSurveyStatus; label: string } {
  return asStatus(status) === "active"
    ? { status: "closed", label: "Close survey" }
    : { status: "active", label: asStatus(status) === "closed" ? "Reopen survey" : "Activate survey" };
}

/** The respondent page (`app/(public)/nps/[npsToken]`) on this app's own origin. */
export function npsSurveyUrl(origin: string, publicToken: string): string {
  return `${origin}/nps/${encodeURIComponent(publicToken)}`;
}

/** Only an active survey accepts responses; the link of any other one leads to a closed form. */
export function surveyLinkNotice(status: string): string | null {
  return asStatus(status) === "active" ? null : "Activate the survey to collect responses.";
}
