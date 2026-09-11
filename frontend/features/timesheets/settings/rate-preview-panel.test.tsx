import { render, screen } from "@testing-library/react";
import { RatePreviewPanel, RatePreviewResult } from "./rate-preview-panel";
import { RatesTab } from "./rates-tab";
import type { ResolvedRatePreview } from "@/features/timesheets/types";

const previewState: { data?: ResolvedRatePreview; isFetching: boolean; isError: boolean } = {
  isFetching: false,
  isError: false,
};

jest.mock("@/hooks/api/timesheets-core/rate-preview", () => ({
  useRatePreview: () => ({ ...previewState, error: null }),
}));

jest.mock("@/hooks/api/build", () => ({
  useProjects: () => ({ data: { data: [{ id: 1, name: "Atlas" }] } }),
}));

jest.mock("@/hooks/api/org-display", () => ({
  useOrgDisplay: () => ({ currency: "INR", locale: "en-IN" }),
}));

jest.mock("@/components/ui/user-combobox", () => ({
  UserCombobox: () => <div data-testid="user-combobox" />,
}));

/* RatesTab resolves permissions and loads rates; neither is what is under test. */
jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  usePermissionGate: () => ({ allowed: true, denied: false }),
}));

jest.mock("@/hooks/api/timesheets-core/rates", () => ({
  useRates: () => ({ data: [], isLoading: false, isError: false, refetch: jest.fn() }),
  useDeleteRate: () => ({ mutate: jest.fn(), isPending: false }),
  useCreateRate: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateRate: () => ({ mutate: jest.fn(), isPending: false }),
}));

/*
 * The panel only queries once something is picked, so the state under test is
 * "a selection was made and the server answered". React state cannot be reached
 * from outside, so the query hook is what varies and the selection is implied
 * by the hook returning data — which is exactly the seam the component reads.
 */
beforeEach(() => {
  previewState.data = undefined;
  previewState.isFetching = false;
  previewState.isError = false;
});

describe("RatePreviewPanel", () => {
  it("asks for a selection before it claims anything", () => {
    render(<RatePreviewPanel />);

    expect(screen.getByText(/pick a project, a member, or both/i)).toBeInTheDocument();
  });
});

describe("RatePreviewResult", () => {
  /**
   * The reason this panel exists.
   *
   * `source: null` with `billRate: null` means no rate card matched and the
   * person has no rate on the project, so time logged against that combination
   * resolves to no bill rate at all. Rendering it as a blank or a zero would
   * hide the one answer somebody needs before they invoice.
   */
  it("says plainly when a combination would bill nothing", () => {
    render(
      <RatePreviewResult
        rate={{ billRate: null, costRate: null, currency: "INR", source: null }}
      />,
    );

    expect(screen.getByText("Nothing would be billed")).toBeInTheDocument();
    expect(screen.getByText(/no rate card matches this combination/i)).toBeInTheDocument();
  });

  it("names which of the two sources decided the rate", () => {
    render(
      <RatePreviewResult
        rate={{ billRate: 4500, costRate: 2000, currency: "INR", source: "RATE_CARD" }}
      />,
    );

    expect(screen.getByText(/from a rate card/i)).toBeInTheDocument();
  });

  it("distinguishes the project-member fallback from a rate card", () => {
    render(
      <RatePreviewResult
        rate={{ billRate: 3000, costRate: null, currency: "INR", source: "PROJECT_MEMBER" }}
      />,
    );

    expect(screen.getByText(/from the project member rate/i)).toBeInTheDocument();
  });

  it("says margin cannot be computed rather than showing a zero cost", () => {
    render(
      <RatePreviewResult
        rate={{ billRate: 3000, costRate: null, currency: "INR", source: "RATE_CARD" }}
      />,
    );

    expect(screen.getByText(/margin cannot be computed/i)).toBeInTheDocument();
  });
});

/**
 * A component with a green unit test and no mount point is this effort's
 * signature defect, and `rate-preview` is a fresh example of it — the endpoint
 * shipped with a query key and no caller. So the mount is asserted.
 */
describe("the rates tab mounts the preview", () => {
  it("renders it above the rate table", () => {
    render(<RatesTab />);

    expect(screen.getByText("Which rate applies?")).toBeInTheDocument();
  });
});
