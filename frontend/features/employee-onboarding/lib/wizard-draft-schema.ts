import { z } from "zod";
import { INDIA_COUNTRY_NAME } from "@/lib/location/address-options";

const draftString = z.string().catch("");

export const personalDraftSchema = z.object({
  phone: draftString,
  gender: draftString,
  dateOfBirth: draftString,
  addressLine1: draftString,
  addressCity: draftString,
  addressState: draftString,
  addressPostalCode: draftString,
  addressCountry: draftString,
  emergencyName: draftString,
  emergencyRelation: draftString,
  emergencyPhone: draftString,
});

export const bankDraftSchema = z.object({
  countryCode: draftString,
  accountHolder: draftString,
  bankName: draftString,
  accountNumber: draftString,
  routingCode: draftString,
  iban: draftString,
  swift: draftString,
  statutory: z.record(z.string(), z.string()).catch({}),
});

export const wizardDraftSchema = z.object({
  personal: personalDraftSchema.catch({
    phone: "",
    gender: "",
    dateOfBirth: "",
    addressLine1: "",
    addressCity: "",
    addressState: "",
    addressPostalCode: "",
    addressCountry: INDIA_COUNTRY_NAME,
    emergencyName: "",
    emergencyRelation: "",
    emergencyPhone: "",
  }),
  bank: bankDraftSchema.catch({
    countryCode: "",
    accountHolder: "",
    bankName: "",
    accountNumber: "",
    routingCode: "",
    iban: "",
    swift: "",
    statutory: {},
  }),
  docsComplete: z.boolean().catch(false),
});

export type PersonalDraft = z.infer<typeof personalDraftSchema>;
export type BankDraft = z.infer<typeof bankDraftSchema>;
export type WizardDraft = z.infer<typeof wizardDraftSchema>;

export const EMPTY_PERSONAL_DRAFT: PersonalDraft = {
  phone: "",
  gender: "",
  dateOfBirth: "",
  addressLine1: "",
  addressCity: "",
  addressState: "",
  addressPostalCode: "",
  addressCountry: INDIA_COUNTRY_NAME,
  emergencyName: "",
  emergencyRelation: "",
  emergencyPhone: "",
};

export const EMPTY_BANK_DRAFT: BankDraft = {
  countryCode: "",
  accountHolder: "",
  bankName: "",
  accountNumber: "",
  routingCode: "",
  iban: "",
  swift: "",
  statutory: {},
};

export const EMPTY_WIZARD_DRAFT: WizardDraft = {
  personal: { ...EMPTY_PERSONAL_DRAFT },
  bank: { ...EMPTY_BANK_DRAFT },
  docsComplete: false,
};

export function parseWizardDraft(value: unknown): WizardDraft {
  const parsed = wizardDraftSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : { ...EMPTY_WIZARD_DRAFT };
}

export type PersonalFormDefaults = {
  phone: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth: string;
  addressLine1: string;
  addressCity: string;
  addressState: string;
  addressPostalCode: string;
  addressCountry: string;
  emergencyName: string;
  emergencyRelation: string;
  emergencyPhone: string;
};

export function personalDraftToFormDefaults(
  draft: PersonalDraft,
): PersonalFormDefaults {
  const gender =
    draft.gender === "MALE" ||
    draft.gender === "FEMALE" ||
    draft.gender === "OTHER"
      ? draft.gender
      : undefined;
  return {
    phone: draft.phone,
    gender,
    dateOfBirth: draft.dateOfBirth,
    addressLine1: draft.addressLine1,
    addressCity: draft.addressCity,
    addressState: draft.addressState,
    addressPostalCode: draft.addressPostalCode,
    addressCountry: draft.addressCountry.trim() || INDIA_COUNTRY_NAME,
    emergencyName: draft.emergencyName,
    emergencyRelation: draft.emergencyRelation,
    emergencyPhone: draft.emergencyPhone,
  };
}
