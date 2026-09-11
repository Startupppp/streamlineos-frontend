"use client";

import { Receipt, CheckCircle2, XCircle } from "lucide-react";

export const CATEGORIES = ["Travel", "Meals", "Office Supplies", "Software", "Medical", "Other"];
const LABEL_CHARS_RE = /^[\p{L}\p{N}\s'.-]+$/u;
const CONSECUTIVE_SPECIAL_RE = /[^\p{L}\p{N}\s]{2,}/u;
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

export function isValidOtherLabel(value: string): boolean {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return (
    trimmed.length >= 2 &&
    trimmed.length <= 100 &&
    /[a-zA-Z]/.test(trimmed) &&
    LABEL_CHARS_RE.test(trimmed) &&
    !CONSECUTIVE_SPECIAL_RE.test(trimmed)
  );
}

export function getStatusConfig(s: string | null) {
  if (s === "APPROVED" || s === "PAID") {
    return {
      badge: "bg-status-success-surface text-status-success-ink border-status-success-rule",
      icon: <CheckCircle2 className="h-2.5 w-2.5" />,
    };
  }
  if (s === "REJECTED") {
    return {
      badge: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
      icon: <XCircle className="h-2.5 w-2.5" />,
    };
  }
  return {
    badge: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
    icon: <Receipt className="h-2.5 w-2.5" />,
  };
}
