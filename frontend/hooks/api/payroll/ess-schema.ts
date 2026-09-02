import { z } from "zod";

/**
 * Employee self-service payroll: an individual's own pay and bank details.
 *
 * Every money field here is a Postgres `decimal` and therefore arrives as a
 * STRING, never a number — `net`, and everything the total-rewards statement
 * emits through its `money()` helper. A contract that said `z.number()` would
 * reject every real response, and a client type that said `number` would let
 * arithmetic run on a string.
 *
 * `masked` on the bank read is `null` exactly when `hasBank` is false, which is
 * why it is a discriminated union rather than two loosely-related fields.
 */

export const essPayslipContract = z.object({
  publicationId: z.number(),
  month: z.string(),
  net: z.string().nullable(),
  publishedAt: z.string().nullable(),
  downloadHref: z.string(),
  workerType: z.string().nullable().optional(),
  invoiceNumber: z.string().nullable().optional(),
  paymentAdvice: z.string().nullable().optional(),
});

export const essPayslipsContract = z.array(essPayslipContract);

export const essBankDetailsContract = z.discriminatedUnion("hasBank", [
  z.object({ hasBank: z.literal(false), masked: z.null() }),
  z.object({
    hasBank: z.literal(true),
    masked: z.object({
      accountNumber: z.string(),
      bankName: z.string(),
      branch: z.string(),
      ifsc: z.string(),
      accountHolder: z.string(),
      bankCountry: z.string().nullable(),
    }),
  }),
]);

export type EssPayslip = z.infer<typeof essPayslipContract>;
export type EssBankDetails = z.infer<typeof essBankDetailsContract>;
