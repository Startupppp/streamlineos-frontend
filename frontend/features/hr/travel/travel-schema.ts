import { z } from "zod";

const MONEY_RE = /^\d+(\.\d{1,2})?$/;
const MAX_MONEY = 999_999_999.99;
const TEXT_CHARS_RE = /^[\p{L}\p{N}\s'.,&\-()/:;#+]+$/u;
const CONSECUTIVE_SPECIAL_RE = /[^\p{L}\p{N}\s]{2,}/u;

function hasLetterOrDigit(value: string): boolean {
  return /[\p{L}\p{N}]/u.test(value);
}

export function isMeaningfulTravelText(value: string): boolean {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return (
    trimmed.length >= 2 &&
    hasLetterOrDigit(trimmed) &&
    TEXT_CHARS_RE.test(trimmed) &&
    !CONSECUTIVE_SPECIAL_RE.test(trimmed)
  );
}

export const optionalMoneySchema = z.string().optional().superRefine((v, ctx) => {
  const t = v?.trim();
  if (!t) return;
  if (!MONEY_RE.test(t)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter a valid amount (e.g. 100 or 100.50)",
    });
    return;
  }
  if (Number(t) > MAX_MONEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Amount cannot exceed ₹99,99,99,999.99",
    });
  }
});

export const travelSchema = z
  .object({
    purpose: z
      .string()
      .trim()
      .min(1, "Purpose is required")
      .max(500, "Purpose must be at most 500 characters")
      .refine(isMeaningfulTravelText, {
        message:
          "Purpose must include letters or numbers and cannot be only special characters",
      }),
    destination: z
      .string()
      .trim()
      .min(1, "Destination is required")
      .max(255, "Destination must be at most 255 characters")
      .refine(isMeaningfulTravelText, {
        message:
          "Destination must include letters or numbers and cannot be only special characters",
      }),
    departureDate: z
      .string()
      .min(1, "Departure date is required")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid departure date"),
    returnDate: z
      .string()
      .min(1, "Return date is required")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid return date"),
    flightRequired: z.boolean(),
    hotelRequired: z.boolean(),
    advanceRequired: z.boolean(),
    estimatedCost: optionalMoneySchema,
    perDiem: optionalMoneySchema,
  })
  .superRefine((data, ctx) => {
    if (data.departureDate && data.returnDate && data.returnDate < data.departureDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Return date must be on or after departure date",
        path: ["returnDate"],
      });
    }
  });

export type TravelFormValues = z.infer<typeof travelSchema>;
