import { z } from "zod";
import type { CollectorType } from "@/hooks/api/surveys/collectors";

export const COLLECTOR_TYPES = [
  "public_link",
  "email",
  "qr",
  "embed",
  "popup",
  "crm_campaign",
  "hr_audience",
] as const satisfies readonly CollectorType[];

export const COLLECTOR_TYPE_LABELS: Record<CollectorType, string> = {
  public_link: "Public link",
  email: "Email invitation",
  qr: "QR code",
  embed: "Website embed",
  popup: "Popup",
  crm_campaign: "CRM campaign",
  hr_audience: "HR employee audience",
  support_trigger: "Support ticket trigger",
  live_session: "Live session",
  manual_access_code: "Manual access code",
};

export const collectorCreateSchema = z.object({
  collectorType: z.enum(COLLECTOR_TYPES),
});

export type CollectorCreateValues = z.infer<typeof collectorCreateSchema>;
