import { z } from "zod";
import type { EntityFilingPatch, PayrollEntity } from "@/hooks/api/payroll/entities";

export const INDIAN_STATE_CODES: ReadonlyArray<{ code: string; name: string }> = [
  { code: "AN", name: "Andaman and Nicobar Islands" },
  { code: "AP", name: "Andhra Pradesh" },
  { code: "AR", name: "Arunachal Pradesh" },
  { code: "AS", name: "Assam" },
  { code: "BR", name: "Bihar" },
  { code: "CH", name: "Chandigarh" },
  { code: "CG", name: "Chhattisgarh" },
  { code: "DH", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "DL", name: "Delhi" },
  { code: "GA", name: "Goa" },
  { code: "GJ", name: "Gujarat" },
  { code: "HR", name: "Haryana" },
  { code: "HP", name: "Himachal Pradesh" },
  { code: "JK", name: "Jammu and Kashmir" },
  { code: "JH", name: "Jharkhand" },
  { code: "KA", name: "Karnataka" },
  { code: "KL", name: "Kerala" },
  { code: "LA", name: "Ladakh" },
  { code: "LD", name: "Lakshadweep" },
  { code: "MP", name: "Madhya Pradesh" },
  { code: "MH", name: "Maharashtra" },
  { code: "MN", name: "Manipur" },
  { code: "ML", name: "Meghalaya" },
  { code: "MZ", name: "Mizoram" },
  { code: "NL", name: "Nagaland" },
  { code: "OR", name: "Odisha" },
  { code: "PY", name: "Puducherry" },
  { code: "PB", name: "Punjab" },
  { code: "RJ", name: "Rajasthan" },
  { code: "SK", name: "Sikkim" },
  { code: "TN", name: "Tamil Nadu" },
  { code: "TS", name: "Telangana" },
  { code: "TR", name: "Tripura" },
  { code: "UP", name: "Uttar Pradesh" },
  { code: "UK", name: "Uttarakhand" },
  { code: "WB", name: "West Bengal" },
];

function optionalCode(pattern: RegExp, message: string) {
  return z.string().refine((v) => v === "" || pattern.test(v), message);
}

export const entityFilingSchema = z.object({
  legalName: z.string().trim().min(1, "Legal name is required").max(200),
  pan: optionalCode(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "PAN must look like ABCDE1234F"),
  tan: optionalCode(/^[A-Z]{4}[0-9]{5}[A-Z]$/, "TAN must look like ABCD12345E"),
  pfEstablishmentCode: optionalCode(/^[A-Z0-9]{5,22}$/, "Use 5-22 letters or digits"),
  esiCode: optionalCode(/^[0-9]{17}$/, "ESI employer code must be 17 digits"),
  ptStateCode: optionalCode(/^[A-Z]{2}$/, "Pick a state"),
  stateCode: optionalCode(/^[A-Z]{2}$/, "Pick a state"),
});
export type EntityFilingForm = z.infer<typeof entityFilingSchema>;

const CODE_FIELDS = ["pan", "tan", "pfEstablishmentCode", "esiCode", "ptStateCode", "stateCode"] as const;

export function toFilingForm(entity: PayrollEntity): EntityFilingForm {
  return {
    legalName: entity.legalName,
    pan: entity.pan ?? "",
    tan: entity.tan ?? "",
    pfEstablishmentCode: entity.pfEstablishmentCode ?? "",
    esiCode: entity.esiCode ?? "",
    ptStateCode: entity.ptStateCode ?? "",
    stateCode: entity.stateCode ?? "",
  };
}

export function changedFilingFields(initial: EntityFilingForm, values: EntityFilingForm): EntityFilingPatch {
  const patch: EntityFilingPatch = {};
  const legalName = values.legalName.trim();
  if (legalName !== initial.legalName) patch.legalName = legalName;
  for (const key of CODE_FIELDS) {
    if (values[key] !== initial[key]) patch[key] = values[key] === "" ? null : values[key];
  }
  return patch;
}
