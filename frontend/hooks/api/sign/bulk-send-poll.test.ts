import {
  ACTIVE_BULK_SEND_STATUSES,
  bulkSendPollInterval,
} from "./bulk-send";
import type { SignBulkSendJob } from "@/types/sign";

/**
 * SIGN-P1-04. Bulk send stopped finishing inside the request (SIGN-P0-05), so
 * the response no longer tells the whole story — the list has to watch the job.
 *
 * Both failure modes are silent, which is why they are pinned here. Polling
 * that never stops costs a request every few seconds forever on a page whose
 * jobs all completed last week; polling that never starts shows a queued job
 * frozen at 0/N, which is indistinguishable from a stalled worker.
 */

const job = (status: SignBulkSendJob["status"]) => ({ status });

describe("bulkSendPollInterval", () => {
  it("polls while a job is queued", () => {
    /** The state every job is now in for its first seconds. */
    expect(bulkSendPollInterval([job("pending")])).toBeGreaterThan(0);
  });

  it("polls while a job is validating or running", () => {
    expect(bulkSendPollInterval([job("validating")])).toBeGreaterThan(0);
    expect(bulkSendPollInterval([job("running")])).toBeGreaterThan(0);
  });

  it("stops once every job is terminal", () => {
    expect(bulkSendPollInterval([job("completed"), job("failed"), job("cancelled")])).toBe(false);
  });

  it("keeps polling if even one job is still working", () => {
    expect(bulkSendPollInterval([job("completed"), job("running")])).toBeGreaterThan(0);
  });

  it("does not poll before the first response, or on an empty list", () => {
    expect(bulkSendPollInterval(undefined)).toBe(false);
    expect(bulkSendPollInterval([])).toBe(false);
  });

  it("treats exactly the non-terminal statuses as active", () => {
    /**
     * Pinned as a set rather than case by case: a status added to the backend
     * enum and forgotten here stops updating on screen, and nothing else in
     * the app would notice.
     */
    expect([...ACTIVE_BULK_SEND_STATUSES].sort()).toEqual(["pending", "running", "validating"]);
  });
});
