import type { WizardDraft } from "./wizard-draft-schema";

export type EmployeePreviewSnapshot = {
  displayName: string;
  email: string;
  roleLabel: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  addressLine1: string;
  addressCity: string;
  addressState: string;
  addressPostalCode: string;
  addressCountry: string;
  emergencyName: string;
  emergencyRelation: string;
  emergencyPhone: string;
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  bankCode: string;
  bankCodeLabel: string;
  docsComplete: boolean;
};

export type PreviewIdentity = {
  displayName: string;
  email: string;
  roleLabel: string;
};

export function toPreviewSnapshot(
  draft: WizardDraft,
  identity: PreviewIdentity,
): EmployeePreviewSnapshot {
  return {
    displayName: identity.displayName,
    email: identity.email,
    roleLabel: identity.roleLabel,
    phone: draft.personal.phone,
    gender: draft.personal.gender,
    dateOfBirth: draft.personal.dateOfBirth,
    addressLine1: draft.personal.addressLine1,
    addressCity: draft.personal.addressCity,
    addressState: draft.personal.addressState,
    addressPostalCode: draft.personal.addressPostalCode,
    addressCountry: draft.personal.addressCountry,
    emergencyName: draft.personal.emergencyName,
    emergencyRelation: draft.personal.emergencyRelation,
    emergencyPhone: draft.personal.emergencyPhone,
    accountHolder: draft.bank.accountHolder,
    bankName: draft.bank.bankName,
    accountNumber: draft.bank.accountNumber,
    bankCode: draft.bank.iban || draft.bank.routingCode || draft.bank.swift,
    bankCodeLabel: draft.bank.iban
      ? "IBAN"
      : draft.bank.swift && !draft.bank.routingCode
        ? "SWIFT / BIC"
        : "Bank code",
    docsComplete: draft.docsComplete,
  };
}

export function previewSnapshotsEqual(
  a: EmployeePreviewSnapshot,
  b: EmployeePreviewSnapshot,
): boolean {
  return (
    a.displayName === b.displayName &&
    a.email === b.email &&
    a.roleLabel === b.roleLabel &&
    a.phone === b.phone &&
    a.gender === b.gender &&
    a.dateOfBirth === b.dateOfBirth &&
    a.addressLine1 === b.addressLine1 &&
    a.addressCity === b.addressCity &&
    a.addressState === b.addressState &&
    a.addressPostalCode === b.addressPostalCode &&
    a.addressCountry === b.addressCountry &&
    a.emergencyName === b.emergencyName &&
    a.emergencyRelation === b.emergencyRelation &&
    a.emergencyPhone === b.emergencyPhone &&
    a.accountHolder === b.accountHolder &&
    a.bankName === b.bankName &&
    a.accountNumber === b.accountNumber &&
    a.bankCode === b.bankCode &&
    a.bankCodeLabel === b.bankCodeLabel &&
    a.docsComplete === b.docsComplete
  );
}

export function formatPreviewGender(value: string): string {
  switch (value) {
    case "MALE":
      return "Male";
    case "FEMALE":
      return "Female";
    case "OTHER":
      return "Other";
    default:
      return value.trim();
  }
}

export function formatPreviewDate(isoOrDate: string): string {
  const raw = isoOrDate.trim();
  if (!raw) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!match) return raw;
  const year = match[1];
  const month = match[2];
  const day = match[3];
  if (!year || !month || !day) return raw;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthIndex = Number(month) - 1;
  const label = months[monthIndex];
  if (!label) return raw;
  return `${day} ${label} ${year}`;
}

export function maskAccountNumber(value: string): string {
  const digits = value.replace(/\s+/g, "");
  if (digits.length <= 4) return digits;
  return `•••• ${digits.slice(-4)}`;
}

export function previewInitials(displayName: string, email: string): string {
  const name = displayName.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "";
    const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
    const initials = `${first}${second}`.toUpperCase();
    if (initials) return initials;
  }
  const local = email.split("@")[0]?.trim() ?? "";
  return (local[0] ?? "?").toUpperCase();
}

export function formatAddressBlock(snapshot: EmployeePreviewSnapshot): string {
  const lines = [
    snapshot.addressLine1.trim(),
    [snapshot.addressCity.trim(), snapshot.addressState.trim()]
      .filter(Boolean)
      .join(", "),
    [snapshot.addressPostalCode.trim(), snapshot.addressCountry.trim()]
      .filter(Boolean)
      .join(" "),
  ].filter(Boolean);
  return lines.join("\n");
}
