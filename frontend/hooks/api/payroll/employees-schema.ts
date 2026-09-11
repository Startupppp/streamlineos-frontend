import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

export const workerTypeContract = z.enum([
  "EMPLOYEE",
  "CONTRACTOR",
  "CONSULTANT",
  "INTERN",
  "EOR",
]);

export const profileDetailContract = z.object({
  id: z.number(),
  userId: z.string().nullable(),
  workerId: z.string().nullable(),
  workerType: workerTypeContract,
  currency: z.string(),
  payoutCurrency: z.string().nullable(),
  annualCtc: z.string(),
  taxRegime: z.enum(["OLD", "NEW"]).nullable(),
  costCenter: z.string().nullable(),
  status: z.enum(["UPCOMING", "ACTIVE", "SUPERSEDED"]),
  effectiveFrom: z.string(),
});

const profileComponentContract = z.object({
  id: z.number(),
  componentId: z.number(),
  calcMethodOverride: z.string().nullable(),
  amount: z.string().nullable(),
  percent: z.string().nullable(),
  formulaOverride: z.string().nullable(),
  sortOrder: z.number(),
  code: z.string(),
  name: z.string(),
  type: z.string(),
  calcMethod: z.string(),
  taxable: z.boolean(),
});

export const profileDetailResponseContract = z.object({
  active: profileDetailContract.nullable(),
  components: z.array(profileComponentContract),
  history: z.array(profileDetailContract),
});

export const profileHistoryResponseContract = z.array(profileDetailContract);

const profileListItemContract = z.object({
  id: z.number(),
  userId: z.string().nullable(),
  workerId: z.string().nullable(),
  workerType: workerTypeContract,
  currency: z.string(),
  annualCtc: z.string(),
  taxRegime: z.enum(["OLD", "NEW"]).nullable(),
  costCenter: z.string().nullable(),
  status: z.enum(["UPCOMING", "ACTIVE", "SUPERSEDED"]),
  effectiveFrom: z.string(),
  userName: z.string().nullable(),
  userEmail: z.string().nullable(),
});

export const profileListResponseContract = cursorPageContract(profileListItemContract);

export const profileCreateResponseContract = z.object({
  profileId: z.number(),
});

export const okResponseContract = z.object({ ok: z.boolean() });
export const idResponseContract = z.object({ id: z.number() });

export type SalaryComponentType =
  | "EARNING"
  | "DEDUCTION"
  | "EMPLOYER_CONTRIBUTION"
  | "REIMBURSEMENT"
  | "TAX"
  | "ADJUSTMENT";

export type SalaryProfileStatus = "ACTIVE" | "UPCOMING" | "SUPERSEDED";

export type ProfileComponent = z.infer<typeof profileComponentContract>;
export type ProfileDetail = z.infer<typeof profileDetailContract>;
export type ProfileDetailResponse = z.infer<typeof profileDetailResponseContract>;
export type ProfileListResponse = z.infer<typeof profileListResponseContract>;
