import { z } from "zod";

export const personalDetailsContract = z.object({
  phone: z.string().nullable(),
  gender: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
  addressLine1: z.string().nullable(),
  addressCity: z.string().nullable(),
  addressState: z.string().nullable(),
  addressPostalCode: z.string().nullable(),
  addressCountry: z.string().nullable(),
  emergencyName: z.string().nullable(),
  emergencyRelation: z.string().nullable(),
  emergencyPhone: z.string().nullable(),
});

export const bankDetailsContract = z.object({
  countryCode: z.string().nullable(),
  accountHolder: z.string().nullable(),
  bankName: z.string().nullable(),
  accountNumber: z.string().nullable(),
  routingCode: z.string().nullable(),
  iban: z.string().nullable(),
  swift: z.string().nullable(),
  statutory: z.record(z.string(), z.string()),
});

/** `successSchema` — the three onboarding writes all answer `{ success: true }`. */
export const onboardingSuccessContract = z.object({ success: z.literal(true) });
