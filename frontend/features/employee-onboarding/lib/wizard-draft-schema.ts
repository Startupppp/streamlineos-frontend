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
});

export type PersonalDraft = z.infer<typeof personalDraftSchema>;
export type BankDraft = z.infer<typeof bankDraftSchema>;
export type WizardDraft = z.infer<typeof wizardDraftSchema>;

export const BANK_DRAFT_SECRET_FIELDS = [
  "accountNumber",
  "routingCode",
  "iban",
  "swift",
  "statutory",
] as const satisfies readonly (keyof BankDraft)[];

export type PersistableBankDraft = Omit<
  BankDraft,
  (typeof BANK_DRAFT_SECRET_FIELDS)[number]
>;

export function persistableBankDraft(bank: BankDraft): PersistableBankDraft {
  return {
    countryCode: bank.countryCode,
    accountHolder: bank.accountHolder,
    bankName: bank.bankName,
  };
}

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
};

function preferCurrent(current: string, prefill: string): string {
  return current.trim() ? current : prefill;
}

export function mergePersonalDraft(
  current: PersonalDraft,
  prefill: PersonalDraft,
): PersonalDraft {
  const hasCurrentAddress = Boolean(
    current.addressLine1.trim() ||
    current.addressCity.trim() ||
    current.addressState.trim() ||
    current.addressPostalCode.trim(),
  );
  const currentCountry =
    !hasCurrentAddress && current.addressCountry === INDIA_COUNTRY_NAME
      ? ""
      : current.addressCountry;

  return {
    phone: preferCurrent(current.phone, prefill.phone),
    gender: preferCurrent(current.gender, prefill.gender),
    dateOfBirth: preferCurrent(current.dateOfBirth, prefill.dateOfBirth),
    addressLine1: preferCurrent(current.addressLine1, prefill.addressLine1),
    addressCity: preferCurrent(current.addressCity, prefill.addressCity),
    addressState: preferCurrent(current.addressState, prefill.addressState),
    addressPostalCode: preferCurrent(current.addressPostalCode, prefill.addressPostalCode),
    addressCountry: preferCurrent(currentCountry, prefill.addressCountry),
    emergencyName: preferCurrent(current.emergencyName, prefill.emergencyName),
    emergencyRelation: preferCurrent(current.emergencyRelation, prefill.emergencyRelation),
    emergencyPhone: preferCurrent(current.emergencyPhone, prefill.emergencyPhone),
  };
}

export function mergeBankDraft(
  current: BankDraft,
  prefill: BankDraft,
): BankDraft {
  const statutoryKeys = new Set([
    ...Object.keys(prefill.statutory),
    ...Object.keys(current.statutory),
  ]);
  const statutory: Record<string, string> = {};
  for (const key of statutoryKeys) {
    statutory[key] = preferCurrent(
      current.statutory[key] ?? "",
      prefill.statutory[key] ?? "",
    );
  }

  return {
    countryCode: preferCurrent(current.countryCode, prefill.countryCode),
    accountHolder: preferCurrent(current.accountHolder, prefill.accountHolder),
    bankName: preferCurrent(current.bankName, prefill.bankName),
    accountNumber: preferCurrent(current.accountNumber, prefill.accountNumber),
    routingCode: preferCurrent(current.routingCode, prefill.routingCode),
    iban: preferCurrent(current.iban, prefill.iban),
    swift: preferCurrent(current.swift, prefill.swift),
    statutory,
  };
}

export function personalDraftHasPrefill(draft: PersonalDraft): boolean {
  return Boolean(
    draft.phone.trim() ||
    draft.gender.trim() ||
    draft.dateOfBirth.trim() ||
    draft.addressLine1.trim() ||
    draft.addressCity.trim() ||
    draft.addressState.trim() ||
    draft.addressPostalCode.trim() ||
    draft.emergencyName.trim() ||
    draft.emergencyPhone.trim(),
  );
}

export function bankDraftHasPrefill(draft: BankDraft): boolean {
  return Boolean(
    draft.accountHolder.trim() ||
    draft.bankName.trim() ||
    draft.accountNumber.trim() ||
    draft.routingCode.trim() ||
    draft.iban.trim() ||
    draft.swift.trim() ||
    Object.values(draft.statutory).some((value) => value.trim()),
  );
}

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
