"use client";

import type { MailComposeMode } from "./mail-compose-schema";

const DRAFT_PREFIX = "mail:draft";

export interface MailDraft {
  subject?: string;
  bodyHtml: string;
}

export function mailDraftKey(mode: MailComposeMode): string {
  if (mode.type === "reply") return `${DRAFT_PREFIX}:reply:${mode.messageId}`;
  return `${DRAFT_PREFIX}:compose`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readMailDraft(key: string): MailDraft | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    const record = parsed;
    const bodyHtml = record.bodyHtml;
    if (typeof bodyHtml !== "string") return null;
    const subject = record.subject;
    return {
      bodyHtml,
      ...(typeof subject === "string" ? { subject } : {}),
    };
  } catch {
    return null;
  }
}

export function writeMailDraft(key: string, draft: MailDraft): void {
  try {
    if (!draft.bodyHtml && !draft.subject) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    return;
  }
}

export function clearMailDraft(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    return;
  }
}
