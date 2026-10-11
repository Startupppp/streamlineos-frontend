import { z } from "zod";

export const SOURCE_CHANNEL_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "support", label: "Support" },
  { value: "sales", label: "Sales" },
  { value: "interview", label: "Interview" },
  { value: "survey", label: "Survey" },
  { value: "public_portal", label: "Public portal" },
  { value: "manual", label: "Manual" },
  { value: "import", label: "Import" },
] as const;

export const CONSENT_STATUS_OPTIONS = [
  { value: "granted", label: "Granted" },
  { value: "denied", label: "Denied" },
  { value: "unknown", label: "Unknown" },
] as const;

export const TYPE_OPTIONS_CAPTURE = [
  { value: "bug", label: "Bug" },
  { value: "idea", label: "Idea" },
  { value: "feature", label: "Feature" },
  { value: "question", label: "Question" },
  { value: "praise", label: "Praise" },
  { value: "other", label: "Other" },
] as const;

export const SENTIMENT_OPTIONS = [
  { value: "positive", label: "Positive" },
  { value: "neutral", label: "Neutral" },
  { value: "negative", label: "Negative" },
  { value: "mixed", label: "Mixed" },
] as const;

export const captureSubmissionSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(5000, "Message too long"),
  sourceChannel: z.enum(["email", "support", "sales", "interview", "survey", "public_portal", "manual", "import"], {
    error: "Source channel is required",
  }),
  type: z.enum(["bug", "idea", "feature", "question", "praise", "other"], {
    error: "Type is required",
  }),
  consentStatus: z.enum(["granted", "denied", "unknown"], {
    error: "Consent status is required",
  }),
  reporterName: z.string().max(100).optional(),
  reporterEmail: z.string().email("Invalid email").max(200).optional().or(z.literal("")),
  segment: z.string().max(200).optional(),
  theme: z.string().max(200).optional(),
  sentiment: z.enum(["positive", "neutral", "negative", "mixed"]).optional(),
});

export type CaptureSubmissionFormValues = z.infer<typeof captureSubmissionSchema>;
