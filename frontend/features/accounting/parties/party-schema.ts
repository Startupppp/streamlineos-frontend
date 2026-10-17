import { z } from "zod";
import type {
  CreatePartyInput,
  PartyDetail,
} from "@/types/accounting/accounting-ar";

export const partyFormSchema = z.object({
  role: z.enum(["customer", "vendor", "both"]),
  displayName: z.string().trim().min(1, "Enter a name").max(255),
  legalName: z.string().trim().max(255),
  email: z.union([
    z.literal(""),
    z.string().trim().email("Enter a valid email").max(255),
  ]),
  phone: z.string().trim().max(64),
  countryCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, "Two-letter country code, such as IN"),
  defaultCurrency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, "Three-letter currency code, such as INR"),
  paymentTermsDays: z
    .string()
    .trim()
    .regex(/^\d{1,4}$/, "Enter a whole number of days"),
  billingLine1: z.string().trim().max(255),
  billingLine2: z.string().trim().max(255),
  billingCity: z.string().trim().max(120),
  billingRegion: z.string().trim().max(64),
  billingPostalCode: z.string().trim().max(32),
  notes: z.string().trim().max(4000),
  isActive: z.boolean(),
});

export type PartyFormValues = z.infer<typeof partyFormSchema>;

export const emptyPartyForm: PartyFormValues = {
  role: "customer",
  displayName: "",
  legalName: "",
  email: "",
  phone: "",
  countryCode: "IN",
  defaultCurrency: "INR",
  paymentTermsDays: "30",
  billingLine1: "",
  billingLine2: "",
  billingCity: "",
  billingRegion: "",
  billingPostalCode: "",
  notes: "",
  isActive: true,
};

export function partyFormFromDetail(party: PartyDetail): PartyFormValues {
  return {
    role: party.role,
    displayName: party.displayName,
    legalName: party.legalName ?? "",
    email: party.email ?? "",
    phone: party.phone ?? "",
    countryCode: party.countryCode,
    defaultCurrency: party.defaultCurrency,
    paymentTermsDays: String(party.paymentTermsDays),
    billingLine1: party.billingLine1 ?? "",
    billingLine2: party.billingLine2 ?? "",
    billingCity: party.billingCity ?? "",
    billingRegion: party.billingRegion ?? "",
    billingPostalCode: party.billingPostalCode ?? "",
    notes: party.notes ?? "",
    isActive: party.isActive,
  };
}

function orNull(value: string): string | null {
  return value.length > 0 ? value : null;
}

export function toCreatePartyInput(values: PartyFormValues): CreatePartyInput {
  return {
    role: values.role,
    displayName: values.displayName,
    legalName: orNull(values.legalName),
    email: orNull(values.email),
    phone: orNull(values.phone),
    countryCode: values.countryCode.toUpperCase(),
    defaultCurrency: values.defaultCurrency.toUpperCase(),
    paymentTermsDays: Number(values.paymentTermsDays),
    billingLine1: orNull(values.billingLine1),
    billingLine2: orNull(values.billingLine2),
    billingCity: orNull(values.billingCity),
    billingRegion: orNull(values.billingRegion),
    billingPostalCode: orNull(values.billingPostalCode),
    billingCountryCode: values.countryCode.toUpperCase(),
    notes: orNull(values.notes),
    isActive: values.isActive,
  };
}

