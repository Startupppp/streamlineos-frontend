import { z } from "zod";


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
