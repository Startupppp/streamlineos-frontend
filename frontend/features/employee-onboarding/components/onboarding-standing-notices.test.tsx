/**
 * V-034. The deferral gate itself is correct and tested. These cover the two
 * things it left unsaid: an administrator who deferred is never reminded, and
 * a member redirected into the wizard is never told why.
 */
import { render, screen } from "@testing-library/react";
import {
  DeferredOnboardingReminder,
  MemberOnboardingNote,
} from "./onboarding-standing-notices";

const session = jest.fn();
jest.mock("next-auth/react", () => ({ useSession: () => session() }));

const DEFERRED_COOKIE = "onboarding-deferred--usr-admin--org-qa";

function signedIn(overrides: Record<string, unknown> = {}) {
  session.mockReturnValue({
    data: {
      orgId: "org-qa",
      user: { id: "usr-admin", role: "ORG_ADMIN" },
      userOnboardingCompletedAt: null,
      ...overrides,
    },
  });
}

function setCookie(value: string) {
  document.cookie = value;
}

beforeEach(() => {
  session.mockReset();
  document.cookie = `${DEFERRED_COOKIE}=; path=/; max-age=0`;
});

describe("DeferredOnboardingReminder — /hr does not forget a deferred wizard", () => {
  it("reminds an administrator who skipped and has still not finished", () => {
    signedIn();
    setCookie(`${DEFERRED_COOKIE}=1; path=/`);

    render(<DeferredOnboardingReminder />);

    expect(screen.getByText(/your own employee profile is still incomplete/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /finish your details/i })).toHaveAttribute(
      "href",
      "/employee-onboarding",
    );
  });

  it("says nothing once the wizard has actually been completed", () => {
    signedIn({ userOnboardingCompletedAt: "2026-09-01T00:00:00.000Z" });
    setCookie(`${DEFERRED_COOKIE}=1; path=/`);

    const { container } = render(<DeferredOnboardingReminder />);

    expect(container).toBeEmptyDOMElement();
  });

  it("says nothing to someone who never deferred", () => {
    signedIn();

    const { container } = render(<DeferredOnboardingReminder />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("MemberOnboardingNote — a member is told why they were redirected", () => {
  it("explains the redirect to someone who may not defer", () => {
    signedIn({ user: { id: "usr-member", role: "MEMBER" } });

    render(<MemberOnboardingNote />);

    expect(
      screen.getByText(/asks every employee to complete this profile before using HR/i),
    ).toBeInTheDocument();
  });

  it("stays out of an administrator's way, who has the skip control instead", () => {
    signedIn();

    const { container } = render(<MemberOnboardingNote />);

    expect(container).toBeEmptyDOMElement();
  });
});
