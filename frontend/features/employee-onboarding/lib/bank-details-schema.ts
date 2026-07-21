import { z } from "zod";
import type { OnboardingRequirements } from "./onboarding-requirements-schema";

const BANK_NAME_REGEX = /^[A-Za-z][A-Za-z0-9.,'&()\-\s]*$/;

export type BankDetailsFormValues = {
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  routingCode: string;
  iban: string;
  swift: string;
  statutory: Record<string, string>;
};

function bankCodeIssue(scheme: string, code: string): string | null {
  const value = code.trim().toUpperCase();
  switch (scheme) {
    case "IFSC":
      return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(value)
        ? null
        : "Enter a valid IFSC code (e.g. HDFC0001234)";
    case "ABA_ROUTING":
      return /^\d{9}$/.test(value) ? null : "Routing number must be 9 digits";
    case "SORT_CODE":
      return /^\d{6}$/.test(value.replace(/-/g, ""))
        ? null
        : "Sort code must be 6 digits";
    case "BSB":
      return /^\d{6}$/.test(value.replace(/-/g, ""))
        ? null
        : "BSB must be 6 digits";
    case "IBAN":
      return /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(value.replace(/\s/g, ""))
        ? null
        : "Enter a valid IBAN";
    case "SWIFT_ACCOUNT":
      return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(value)
        ? null
        : "Enter a valid SWIFT/BIC";
    default:
      return null;
  }
}

export function buildBankDetailsSchema(req: OnboardingRequirements) {
  return z
    .object({
      accountHolder: z
        .string()
        .trim()
        .min(2, "Account holder name must be at least 2 characters")
        .regex(
          /^[A-Za-z][A-Za-z\s'.,-]*$/,
          "Account holder name can only contain letters, spaces, hyphens, apostrophes, and periods",
        ),
      bankName: z
        .string()
        .trim()
        .min(2, "Bank name is required")
        .max(100, "Bank name must be at most 100 characters")
        .regex(BANK_NAME_REGEX, "Enter a valid bank name"),
      accountNumber: z.string().trim(),
      routingCode: z.string().trim(),
      iban: z.string().trim(),
      swift: z.string().trim(),
      statutory: z.record(z.string(), z.string()),
    })
    .superRefine((val, ctx) => {
      if (req.bankScheme === "IBAN") {
        const issue = bankCodeIssue("IBAN", val.iban);
        if (issue)
          ctx.addIssue({ code: "custom", message: issue, path: ["iban"] });
      } else if (req.bankScheme === "SWIFT_ACCOUNT") {
        const issue = bankCodeIssue("SWIFT_ACCOUNT", val.swift);
        if (issue)
          ctx.addIssue({ code: "custom", message: issue, path: ["swift"] });
      } else if (req.bankScheme !== "GENERIC") {
        const issue = bankCodeIssue(req.bankScheme, val.routingCode);
        if (issue)
          ctx.addIssue({
            code: "custom",
            message: issue,
            path: ["routingCode"],
          });
      } else if (val.swift && bankCodeIssue("SWIFT_ACCOUNT", val.swift)) {
        ctx.addIssue({
          code: "custom",
          message: "Enter a valid SWIFT/BIC",
          path: ["swift"],
        });
      }

      if (req.bankScheme !== "IBAN" && !/^\d{6,20}$/.test(val.accountNumber)) {
        ctx.addIssue({
          code: "custom",
          message: "Enter a valid account number",
          path: ["accountNumber"],
        });
      }

      for (const field of req.statutoryFields) {
        const raw = (val.statutory[field.key] ?? "").trim();
        if (!raw) {
          if (field.required) {
            ctx.addIssue({
              code: "custom",
              message: `${field.label} is required`,
              path: ["statutory", field.key],
            });
          }
          continue;
        }
        if (field.pattern) {
          const value = field.uppercase ? raw.toUpperCase() : raw;
          if (!new RegExp(field.pattern).test(value)) {
            ctx.addIssue({
              code: "custom",
              message: field.patternMessage ?? `Enter a valid ${field.label}`,
              path: ["statutory", field.key],
            });
          }
        }
      }
    });
}
