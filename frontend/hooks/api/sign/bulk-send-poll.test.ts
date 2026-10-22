import {
  ACTIVE_BULK_SEND_STATUSES,
  bulkSendPollInterval,
} from "./bulk-send";
import type { SignBulkSendJob } from "@/types/sign";


const job = (status: SignBulkSendJob["status"]) => ({ status });

describe("bulkSendPollInterval", () => {
  it("polls while a job is queued", () => {
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
    expect([...ACTIVE_BULK_SEND_STATUSES].sort()).toEqual(["pending", "running", "validating"]);
  });
});
