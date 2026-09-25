import { render } from "@testing-library/react";
import { BulkOnboardPanel } from "./bulk-onboard-panel";

let policy: { maxSecondaryManagersPerEmployee: number } | undefined;
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
    expect(flowArgs).toHaveBeenLastCalledWith(expect.any(Set), null);
  });

  it("passes the organisation's cap once the policy has loaded", () => {
    policy = { maxSecondaryManagersPerEmployee: 1 };
    render(<BulkOnboardPanel />);
    expect(flowArgs).toHaveBeenLastCalledWith(expect.any(Set), 1);
  });
});
