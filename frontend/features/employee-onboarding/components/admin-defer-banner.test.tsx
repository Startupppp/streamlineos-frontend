/**
 * HRMS-E2E-020. The control that makes the deferral reachable. Its gate is
 * asserted in `lib/__tests__/wizard-gate-admin-defer.test.ts`; this is the other
 * half — that an administrator is offered the skip, a member is not, and that
 * pressing it writes the deferral marker and never the completion one.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ONBOARDING_DEFERRED_MAX_AGE } from "@/lib/onboarding-gate";
import { AdminDeferBanner } from "./admin-defer-banner";

const push = jest.fn();
const writeGateCookie = jest.fn();
const session = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
jest.mock("next-auth/react", () => ({ useSession: () => session() }));
jest.mock("@/lib/onboarding-gate", () => ({
  ...jest.requireActual("@/lib/onboarding-gate"),
  writeGateCookie: (...args: unknown[]) => writeGateCookie(...args),
}));

function signedInAs(role: string, overrides: Record<string, unknown> = {}) {
  session.mockReturnValue({
    data: { orgId: "org-qa", user: { id: "usr-admin", role }, ...overrides },
  });
}

beforeEach(() => {
  push.mockReset();
  writeGateCookie.mockReset();
  session.mockReset();
});

describe("AdminDeferBanner", () => {
  it("offers an administrator a way past their own wizard", () => {
    signedInAs("ORG_ADMIN");
    render(<AdminDeferBanner />);

    expect(screen.getByRole("button", { name: /Skip for now/i })).toBeInTheDocument();
  });

  it("offers a MEMBER a skip button — BUG-018 / FE-122", () => {
    signedInAs("MEMBER");
    render(<AdminDeferBanner />);

    expect(screen.getByRole("button", { name: /Skip for now/i })).toBeInTheDocument();
  });

  it("does not offer the skip button to an org owner, who uses the org-setup path instead — FE-122 negative", () => {
    signedInAs("OWNER", { user: { id: "usr-admin", role: "OWNER", isOrgOwner: true } });
    const { container } = render(<AdminDeferBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it("takes a MEMBER to /dashboard, not /hr, after deferral — BUG-018", async () => {
    signedInAs("MEMBER");
    render(<AdminDeferBanner />);
    await userEvent.click(screen.getByRole("button", { name: /Skip for now/i }));

    expect(push).toHaveBeenCalledWith("/dashboard");
  });

  it("writes the deferral marker with the 7-day max-age, never the completion one", async () => {
    signedInAs("ORG_ADMIN");
    render(<AdminDeferBanner />);
    await userEvent.click(screen.getByRole("button", { name: /Skip for now/i }));

    expect(writeGateCookie).toHaveBeenCalledWith(
      "onboarding-deferred",
      "usr-admin--org-qa",
      ONBOARDING_DEFERRED_MAX_AGE,
    );
    expect(writeGateCookie).not.toHaveBeenCalledWith(
      "onboarding-done",
      expect.anything(),
      expect.anything(),
    );
  });

  it("takes them to the module they were blocked from", async () => {
    signedInAs("ORG_ADMIN");
    render(<AdminDeferBanner />);
    await userEvent.click(screen.getByRole("button", { name: /Skip for now/i }));

    expect(push).toHaveBeenCalledWith("/hr");
  });

  it("says the page stays available, because deferring is not finishing", () => {
    signedInAs("ORG_ADMIN");
    render(<AdminDeferBanner />);

    expect(screen.getByText(/stays available/i)).toBeInTheDocument();
  });

  it("renders nothing before the session resolves", () => {
    session.mockReturnValue({ data: undefined });
    const { container } = render(<AdminDeferBanner />);

    expect(container).toBeEmptyDOMElement();
  });
});
