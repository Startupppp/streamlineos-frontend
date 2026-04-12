/**
 * Shared utilities for normalizing inbound candidate payloads from job boards
 * into a unified CandidateInput structure before DB insertion.
 */

import { db } from "@/lib/db";
import { candidates, candidateApplications, candidateSources } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";

// ─── Unified candidate payload ────────────────────────────────────────────────

export interface NormalizedCandidate {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  linkedinUrl?: string;
  resumeUrl?: string;
  currentRole?: string;
  currentCompany?: string;
  source: string;
  externalId?: string;
}

// ─── Deduplication ────────────────────────────────────────────────────────────

/**
 * Find an existing candidate by email or phone (fuzzy dedup).
 * Returns the existing candidate's ID if found.
 */
export async function findExistingCandidate(
  orgId: string,
  email: string,
  phone?: string
): Promise<number | null> {
  const conditions = [eq(candidates.email, email)];
  if (phone) {
    conditions.push(eq(candidates.phone, phone));
  }

  const existing = await db
    .select({ id: candidates.id })
    .from(candidates)
    .where(
      and(
        eq(candidates.orgId, orgId),
        or(...conditions)
      )
    )
    .limit(1);

  return existing[0]?.id ?? null;
}

/**
 * Create a new candidate from a normalized payload, or return existing ID if duplicate.
 * Also updates `candidateSources.lastSyncedAt` and `lastSyncCount`.
 */
export async function upsertCandidateFromBoard(
  orgId: string,
  payload: NormalizedCandidate
): Promise<{ candidateId: number; isNew: boolean }> {
  // Dedup check
  const existingId = await findExistingCandidate(orgId, payload.email, payload.phone);
  if (existingId !== null) {
    return { candidateId: existingId, isNew: false };
  }

  // Insert new candidate
  const [candidate] = await db
    .insert(candidates)
    .values({
      orgId,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      linkedinUrl: payload.linkedinUrl,
      resumeUrl: payload.resumeUrl,
      currentRole: payload.currentRole,
      currentCompany: payload.currentCompany,
      source: payload.source,
      externalId: payload.externalId,
      status: "NEW",
    })
    .returning({ id: candidates.id });

  if (!candidate) throw new Error("Failed to insert candidate");

  // Update last synced timestamp on the source integration
  await db
    .update(candidateSources)
    .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(candidateSources.orgId, orgId),
        eq(candidateSources.platform, payload.source)
      )
    )
    .catch(() => undefined); // Non-fatal if source record doesn't exist yet

  return { candidateId: candidate.id, isNew: true };
}

// ─── LinkedIn payload normalizer ──────────────────────────────────────────────

interface LinkedInApplication {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  emailAddress?: string;
  phoneNumber?: string;
  linkedInProfileUrl?: string;
  headline?: string;
  currentCompany?: string;
  resumeUrl?: string;
  applicationId?: string | number;
}

export function normalizeLinkedInPayload(
  raw: LinkedInApplication
): NormalizedCandidate | null {
  const email = raw.email ?? raw.emailAddress;
  if (!email) return null;

  let firstName = raw.firstName ?? "";
  let lastName = raw.lastName ?? "";

  if ((!firstName || !lastName) && raw.fullName) {
    const parts = raw.fullName.trim().split(/\s+/);
    firstName = parts[0] ?? "";
    lastName = parts.slice(1).join(" ") || "—";
  }

  if (!firstName) return null;

  return {
    firstName,
    lastName: lastName || "—",
    email,
    phone: raw.phoneNumber,
    linkedinUrl: raw.linkedInProfileUrl,
    resumeUrl: raw.resumeUrl,
    currentRole: raw.headline,
    currentCompany: raw.currentCompany,
    source: "LINKEDIN",
    externalId: raw.applicationId ? String(raw.applicationId) : undefined,
  };
}

// ─── Naukri payload normalizer ────────────────────────────────────────────────

interface NaukriApplication {
  candidateName?: string;
  firstName?: string;
  lastName?: string;
  emailId?: string;
  email?: string;
  mobileNumber?: string;
  phone?: string;
  currentDesignation?: string;
  currentCompany?: string;
  resumeUrl?: string;
  applicationId?: string | number;
}

export function normalizeNaukriPayload(
  raw: NaukriApplication
): NormalizedCandidate | null {
  const email = raw.emailId ?? raw.email;
  if (!email) return null;

  let firstName = raw.firstName ?? "";
  let lastName = raw.lastName ?? "";

  if ((!firstName || !lastName) && raw.candidateName) {
    const parts = raw.candidateName.trim().split(/\s+/);
    firstName = parts[0] ?? "";
    lastName = parts.slice(1).join(" ") || "—";
  }

  if (!firstName) return null;

  return {
    firstName,
    lastName: lastName || "—",
    email,
    phone: raw.mobileNumber ?? raw.phone,
    currentRole: raw.currentDesignation,
    currentCompany: raw.currentCompany,
    resumeUrl: raw.resumeUrl,
    source: "NAUKRI",
    externalId: raw.applicationId ? String(raw.applicationId) : undefined,
  };
}

// ─── Indeed payload normalizer ────────────────────────────────────────────────

interface IndeedApplication {
  applicant?: {
    name?: { given?: string; family?: string; formatted?: string };
    email?: string;
    phone?: string;
  };
  resume?: { file?: { url?: string } };
  jobId?: string;
  applicationId?: string;
}

export function normalizeIndeedPayload(
  raw: IndeedApplication
): NormalizedCandidate | null {
  const email = raw.applicant?.email;
  if (!email) return null;

  const nameObj = raw.applicant?.name;
  let firstName = nameObj?.given ?? "";
  let lastName = nameObj?.family ?? "";

  if ((!firstName || !lastName) && nameObj?.formatted) {
    const parts = nameObj.formatted.trim().split(/\s+/);
    firstName = parts[0] ?? "";
    lastName = parts.slice(1).join(" ") || "—";
  }

  if (!firstName) return null;

  return {
    firstName,
    lastName: lastName || "—",
    email,
    phone: raw.applicant?.phone,
    resumeUrl: raw.resume?.file?.url,
    source: "INDEED",
    externalId: raw.applicationId ?? raw.jobId,
  };
}
