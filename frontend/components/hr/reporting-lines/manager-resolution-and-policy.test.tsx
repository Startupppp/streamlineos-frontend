import { render, screen } from "@testing-library/react";
import type { ReportingManagerPolicy } from "@/hooks/api/hr/reporting-lines-schema";
import { ManagerResolutionCell } from "./manager-resolution-cell";
import { PolicyMissingBanner } from "./policy-missing-banner";

const policyRead = jest.fn();
const can = jest.fn();
jest.mock("@/hooks/api/hr/reporting-manager-policy", () => ({ useReportingManagerPolicy: () => policyRead() }));
jest.mock("@/hooks/api/access", () => ({ useCan: (key: string) => can(key) }));

function policy(overrides: Partial<ReportingManagerPolicy>): ReportingManagerPolicy {
  return {
    maxSecondaryManagersPerEmployee: 0,
    defaultPrimaryManager: null,
    defaultPrimaryManagerEligible: false,
    fallbackOrder: "CONFIGURED_MANAGER_THEN_UPLOADER",
    requireReasonAfterChanges: 3,
    allowTopLevelWithoutManager: true,
    version: 0,
    updatedAt: null,
    isConfigured: false,
    actorQualifiesAsFallback: false,
    ...overrides,
  };
}

describe("ManagerResolutionCell — fallback preview", () => {
  it("names the fallback person and the rule that picked them", () => {
    render(
      <ManagerResolutionCell primaryManager={{ name: "Dana Default", email: "dana@example.com", resolution: "FALLBACK_CONFIGURED" }} />,
    );
    expect(screen.getByText("Dana Default")).toBeInTheDocument();
    expect(screen.getByText("Fallback")).toBeInTheDocument();
    expect(screen.getByText("The organisation's default reporting manager")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/automatic/i);
  });

  it("says when the uploader is the fallback", () => {
    render(<ManagerResolutionCell primaryManager={{ name: "Hana HR", email: "hana@example.com", resolution: "FALLBACK_UPLOADER" }} />);
    expect(screen.getByText(/You, as the HR administrator/)).toBeInTheDocument();
  });

  it("points a manager created in the same file at its row", () => {
    render(
      <ManagerResolutionCell
        primaryManager={{ name: "New Lead", email: "lead@example.com", resolution: "IN_FILE" }}
        dependsOnRow={4}
      />,
    );
    expect(screen.getByText("From file")).toBeInTheDocument();
    expect(screen.getByText(/created by row 4 \(lead@example.com\)/)).toBeInTheDocument();
  });
});

describe("PolicyMissingBanner — blocking warning on onboarding/import entry points", () => {
  beforeEach(() => can.mockReturnValue(false));

  it("renders nothing while a valid default exists", () => {
    policyRead.mockReturnValue({
      data: policy({
        defaultPrimaryManager: { userId: "u", name: "Dana", email: null, designation: null, state: "active" },
        defaultPrimaryManagerEligible: true,
        isConfigured: true,
      }),
    });
    const { container } = render(<PolicyMissingBanner context="file" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("warns that blank rows will be refused when the uploader cannot be the fallback", () => {
    policyRead.mockReturnValue({ data: policy({}) });
    render(<PolicyMissingBanner context="file" />);
    expect(screen.getByRole("status")).toHaveTextContent("No default reporting manager is set.");
    expect(screen.getByRole("status")).toHaveTextContent("A row with a blank manager will be refused");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("says the uploader will be assigned, and links admins to the policy", () => {
    can.mockImplementation((key: string) => key === "hr:reporting-lines:override");
    policyRead.mockReturnValue({ data: policy({ actorQualifiesAsFallback: true }) });
    render(<PolicyMissingBanner context="form" />);
    expect(screen.getByRole("status")).toHaveTextContent("will report to you");
    expect(screen.getByRole("link", { name: "Set a default reporting manager" })).toHaveAttribute(
      "href",
      "/hr/settings/reporting-managers",
    );
  });

  it("flags a default who is no longer eligible", () => {
    policyRead.mockReturnValue({
      data: policy({
        defaultPrimaryManager: { userId: "u", name: "Gone", email: null, designation: null, state: "exited" },
        defaultPrimaryManagerEligible: false,
      }),
    });
    render(<PolicyMissingBanner context="form" />);
    expect(screen.getByRole("status")).toHaveTextContent("can no longer be assigned");
  });
});
