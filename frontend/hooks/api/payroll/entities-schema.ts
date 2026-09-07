import { z } from "zod";

export const payrollEntityContract = z.object({
  id: z.number(),
  orgId: z.string(),
  legalName: z.string(),
  countryCode: z.string(),
  stateCode: z.string().nullable(),
  baseCurrency: z.string(),
  pan: z.string().nullable(),
  tan: z.string().nullable(),
  pfEstablishmentCode: z.string().nullable(),
  esiCode: z.string().nullable(),
  ptStateCode: z.string().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const payrollEntityListContract = z.array(payrollEntityContract);

const countryPackDescriptorContract = z.object({
  countryCode: z.string(),
  countryName: z.string(),
  currency: z.string(),
  maturity: z.enum(["production_baseline", "pilot", "template"]),
  honestyLabel: z.string(),
  payrollStatutoryBundle: z.string().nullable(),
  holidayCount: z.number(),
  complianceRequirementCount: z.number(),
  sensitiveFieldCount: z.number(),
});

export const countryPacksResponseContract = z.object({
  mode: z.literal("country_pack_catalog"),
  honestyNote: z.string(),
  packs: z.array(countryPackDescriptorContract),
});

const entityReadinessItemContract = z.object({
  key: z.string(),
  label: z.string(),
  done: z.boolean(),
  detail: z.string(),
});

export const entityContextResponseContract = z.object({
  entity: payrollEntityContract,
  countryPack: countryPackDescriptorContract.nullable(),
  readiness: z.array(entityReadinessItemContract),
  readinessScore: z.number(),
  isolation: z.object({ note: z.string() }),
  honestyNote: z.string(),
});

export type PayrollEntity = z.infer<typeof payrollEntityContract>;
export type CountryPacksResponse = z.infer<typeof countryPacksResponseContract>;
export type EntityContextResponse = z.infer<typeof entityContextResponseContract>;
