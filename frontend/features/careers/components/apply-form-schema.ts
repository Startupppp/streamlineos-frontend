import { z } from "zod";
import type { ScreeningQuestion } from "./apply-screening-fields";

/** What the public apply endpoint accepts — kept in step with `RESUME_ALLOWED_TYPES`. */
export const RESUME_ACCEPT = ".pdf,.doc,.docx";
export const RESUME_MAX_BYTES = 10 * 1024 * 1024;

const RESUME_NAME = /\.(pdf|docx|doc)$/i;

interface FileLike {
  readonly size: number;
  readonly name: string;
}

/**
 * Structural rather than `instanceof File`, because the same schema is parsed
 * under jsdom, where the `File` the test constructs is not the `File` this
 * module would close over.
 *
 * Narrowed with `in`, which walks the prototype chain — `size` and `name` are
 * accessors on `Blob.prototype`, so an own-property check would reject a real
 * file.
 */
function isFileLike(value: unknown): value is FileLike {
  if (typeof value !== "object" || value === null) return false;
  if (!("size" in value) || !("name" in value)) return false;
  return typeof value.size === "number" && typeof value.name === "string";
}

/**
 * The résumé is optional — an application without one is still an application,
 * and the endpoint says so by returning `resumeStored: false` with a reason
 * rather than refusing. What is checked here is only what the server checks
 * first, so the candidate hears it without a round trip.
 */
const resumeField = z
  .custom<File | null>((value) => value === null || isFileLike(value), {
    message: "Attach a PDF, DOC or DOCX file.",
  })
  .refine((file) => file === null || file.size <= RESUME_MAX_BYTES, {
    message: "Résumé must be 10MB or smaller.",
  })
  .refine((file) => file === null || RESUME_NAME.test(file.name), {
    message: "Résumé must be a PDF, DOC or DOCX file.",
  });

const linkedinField = z
  .string()
  .trim()
  .max(500)
  .refine(
    (raw) => {
      if (!raw) return true;
      try {
        const parsed = new URL(raw.startsWith("www.") ? `https://${raw}` : raw);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "LinkedIn profile must be a valid link." },
  );

const phoneField = z
  .string()
  .trim()
  .max(50)
  .refine(
    (raw) => {
      if (!raw) return true;
      const digits = raw.replace(/\D/g, "");
      return digits.length >= 8 && digits.length <= 15;
    },
    { message: "Phone number must be 8–15 digits." },
  );

const baseApplySchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(200),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(200),
  phone: phoneField,
  linkedinUrl: linkedinField,
  coverLetter: z.string().trim().max(5000),
  resume: resumeField,
  /**
   * DPDP consent is the lawful basis for holding the file at all. The field
   * stays a `boolean` so the form can start unchecked, and the refinement is
   * what makes an unchecked box a validation failure rather than a silent
   * default.
   */
  consent: z.boolean().refine((given) => given, {
    message: "You must consent to your data being processed before applying.",
  }),
  answers: z.record(z.string(), z.string().max(2000)),
});

export type ApplyFormValues = z.infer<typeof baseApplySchema>;

/**
 * The schema for one job's form.
 *
 * Required screening answers are enforced with a `superRefine` keyed on the
 * question id rather than a generated object shape, so the inferred value type
 * stays the same whatever questions the job carries — and every message lands
 * on `answers.<id>`, which is where the field renders it.
 */
export function buildApplySchema(questions: readonly ScreeningQuestion[]) {
  return baseApplySchema.superRefine((values, ctx) => {
    for (const question of questions) {
      if (!question.required) continue;
      if ((values.answers[question.id] ?? "").trim()) continue;
      ctx.addIssue({
        code: "custom",
        path: ["answers", question.id],
        message: "This question is required.",
      });
    }
  });
}

export function emptyApplyValues(): ApplyFormValues {
  return {
    name: "",
    email: "",
    phone: "",
    linkedinUrl: "",
    coverLetter: "",
    resume: null,
    consent: false,
    answers: {},
  };
}

/** The multipart body the apply endpoint reads. */
export function toFormData(
  values: ApplyFormValues,
  questions: readonly ScreeningQuestion[],
): FormData {
  const body = new FormData();
  body.set("name", values.name);
  body.set("email", values.email);
  if (values.phone) body.set("phone", values.phone);
  if (values.linkedinUrl)
    body.set(
      "linkedinUrl",
      values.linkedinUrl.startsWith("www.") ? `https://${values.linkedinUrl}` : values.linkedinUrl,
    );
  if (values.coverLetter) body.set("coverLetter", values.coverLetter);
  body.set("consent", "true");

  const answered: Record<string, string> = {};
  for (const question of questions) {
    const value = (values.answers[question.id] ?? "").trim();
    if (value) answered[question.id] = value;
  }
  if (Object.keys(answered).length > 0) body.set("answers", JSON.stringify(answered));

  if (values.resume) body.set("resume", values.resume);
  return body;
}
