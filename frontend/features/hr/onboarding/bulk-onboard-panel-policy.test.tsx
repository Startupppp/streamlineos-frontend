import { render } from "@testing-library/react";
import { BulkOnboardPanel } from "./bulk-onboard-panel";

let policy: Record<string, unknown> | undefined;
const flowArgs = jest.fn();

jest.mock("./use-bulk-onboard-flow", () => ({
  isCommittable: () => false,
  useBulkOnboardFlow: (...args: unknown[]) => {
    flowArgs(...args);
    return { step: "upload", rows: [], committableCount: 0, parsing: false, fileName: "", result: null, handleFile: jest.fn(), reset: jest.fn(), commit: jest.fn(), isPreviewing: false, isCommitting: false };
  },
}));
jest.mock("@/hooks/api/org-hierarchy", () => ({ useOrgDepartments: () => ({ data: { data: [] } }) }));
jest.mock("@/hooks/api/hr/reporting-manager-policy", () => ({ useReportingManagerPolicy: () => ({ data: policy }) }));
jest.mock("@/hooks/api/access", () => ({ useCan: () => false }));

describe("BulkOnboardPanel — secondary cap source", () => {
  beforeEach(() => flowArgs.mockReset());

  it("treats the cap as unknown (server checks it) while the policy is loading, rather than assuming 3", () => {
    policy = undefined;
    render(<BulkOnboardPanel />);
    expect(flowArgs).toHaveBeenLastCalledWith(expect.any(Set), null, null);
  });

  it("passes the organisation's cap once the policy has loaded", () => {
    policy = { maxSecondaryManagersPerEmployee: 1 };
    render(<BulkOnboardPanel />);
    expect(flowArgs).toHaveBeenLastCalledWith(expect.any(Set), 1, null);
  });

  it("passes who a blank primary resolves to, so a row naming them as a secondary is caught", () => {
    policy = {
      maxSecondaryManagersPerEmployee: 1,
      defaultPrimaryManager: { userId: "u-d", name: "Dana Default", email: "dana@example.com", designation: null, state: "active" },
      defaultPrimaryManagerEligible: true,
      fallbackOrder: "CONFIGURED_MANAGER_THEN_UPLOADER",
      actorQualifiesAsFallback: true,
    };
    render(<BulkOnboardPanel />);
    expect(flowArgs).toHaveBeenLastCalledWith(expect.any(Set), 1, { userId: "u-d", name: "Dana Default", email: "dana@example.com" });
  });
});
