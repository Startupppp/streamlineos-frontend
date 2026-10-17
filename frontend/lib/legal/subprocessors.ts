import "server-only";
import type { z } from "zod";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { publicGet } from "@/lib/public-fetch";
import { publicSubprocessorListContract } from "@/lib/public-schema";

export type Subprocessor = Pick<
  z.infer<typeof publicSubprocessorListContract>["data"][number],
  "name" | "purpose" | "location" | "url"
>;

/**
 * The register as it stood when the privacy page was hand-written. Used only when the backend is
 * unreachable while the page is being BUILT, so a build without a backend still ships a page.
 */
const BUILD_FALLBACK: readonly Subprocessor[] = [
  { name: "Neon (Postgres)", purpose: "Primary database", location: "AP Southeast 1 / your region", url: null },
  { name: "Cloudflare R2", purpose: "File storage (avatars, attachments, payslips)", location: "Global", url: null },
  { name: "Zoho ZeptoMail", purpose: "Transactional email (auth, notifications)", location: "India", url: null },
  { name: "Ably", purpose: "Realtime chat and presence", location: "Global edge", url: null },
  { name: "Inngest", purpose: "Background jobs and scheduled reports", location: "US / EU", url: null },
  { name: "Upstash Redis", purpose: "Rate limiting and session cache", location: "Your region", url: null },
  { name: "OpenAI / Google AI", purpose: "Optional AI features (you can disable)", location: "US", url: null },
  { name: "Vercel", purpose: "Hosting and edge delivery", location: "Global", url: null },
];

/**
 * The current subprocessors, from the register the subscribe/notice flow is built on
 * (`GET /compliance/subprocessors`, public). Retired entries are left out of the policy page.
 *
 * Outside the build a failure throws: the page is ISR, so Next keeps serving the last good render
 * instead of caching the fallback over live data.
 */
export async function getCurrentSubprocessors(): Promise<readonly Subprocessor[]> {
  try {
    const page = await publicGet("/compliance/subprocessors", { includeRetired: "false" }, publicSubprocessorListContract);
    return (page?.data ?? []).filter((entry) => entry.retiredAt === null);
  } catch (error) {
    if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) return BUILD_FALLBACK;
    throw error;
  }
}
