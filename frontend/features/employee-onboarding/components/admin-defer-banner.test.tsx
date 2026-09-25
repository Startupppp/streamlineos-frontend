/**
 * HRMS-E2E-020. The control that makes the deferral reachable. Its gate is
 * asserted in `lib/__tests__/wizard-gate-admin-defer.test.ts`; this is the other
 * half — that an administrator is offered the skip, a member is not, and that
 * pressing it writes the deferral marker and never the completion one.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminDeferBanner } from "./admin-defer-banner";

const push = jest.fn();
const writeGateCookie = jest.fn();
const session = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
jest.mock("next-auth/react", () => ({ useSession: () => session() }));
// Only the cookie write is doubled. `mayDeferOwnOnboarding` stays real, so
// these assertions exercise the rule the routing gate actually applies rather
// than a stand-in that could drift away from it.
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

  it("offers a member nothing, because the wizard still applies to them", () => {
    // The paired negative. Decision #7 keeps MEMBER guided, so the control must
    // not merely be hidden by CSS — it must not exist for them.
    signedInAs("MEMBER");
    const { container } = render(<AdminDeferBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it("writes the deferral marker, never the completion one", async () => {
    // The distinction the whole change rests on: deferring is not finishing,
    // and writing `onboarding-done` here would tell the product this person had
    // handed over bank details they have not.
    signedInAs("ORG_ADMIN");
    render(<AdminDeferBanner />);
    await userEvent.click(screen.getByRole("button", { name: /Skip for now/i }));

    expect(writeGateCookie).toHaveBeenCalledWith("onboarding-deferred", "usr-admin--org-qa");
    expect(writeGateCookie).not.toHaveBeenCalledWith(
      "onboarding-done",
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
