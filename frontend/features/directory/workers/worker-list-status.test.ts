import { workerListStatus } from "./worker-list-status";

describe("workerListStatus", () => {
  it("shows an inactive payee as an active payee", () => {
    expect(workerListStatus({ status: "INACTIVE", isPayee: true })).toEqual({
      label: "Active",
      tone: "success",
    });
  });

  it("leaves a non-payee inactive", () => {
    expect(workerListStatus({ status: "INACTIVE", isPayee: false })).toEqual({
      label: "Inactive",
      tone: "neutral",
    });
  });

  it("keeps an exited payee exited", () => {
    expect(workerListStatus({ status: "EXITED", isPayee: true })).toEqual({
      label: "Exited",
      tone: "danger",
    });
  });
});
