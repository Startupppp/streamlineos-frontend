import { isLegalAckMove, legalAckStatuses } from "./ack-export-schema";

describe("ack export moves", () => {
  it("offers every status to an export nobody has acknowledged", () => {
    expect(legalAckStatuses(null)).toEqual(["RECEIVED", "ACCEPTED", "REJECTED", "FAILED"]);
  });

  it("never offers the status the export already carries", () => {
    expect(legalAckStatuses("RECEIVED")).toEqual(["ACCEPTED", "REJECTED", "FAILED"]);
    expect(isLegalAckMove("ACCEPTED", "ACCEPTED")).toBe(false);
  });

  it("does not let a settled export go back to received", () => {
    expect(legalAckStatuses("ACCEPTED")).toEqual(["REJECTED", "FAILED"]);
    expect(legalAckStatuses("REJECTED")).toEqual(["ACCEPTED", "FAILED"]);
    expect(legalAckStatuses("FAILED")).toEqual(["ACCEPTED", "REJECTED"]);
  });
});
