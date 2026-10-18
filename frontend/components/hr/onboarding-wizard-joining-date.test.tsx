import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const saveDraft = jest.fn();

jest.mock("@/hooks/api/hr", () => ({
  useOnboardEmployee: () => ({ mutate: jest.fn(), isPending: false, isError: false, error: null }),
}));
jest.mock("@/hooks/api/hr/onboarding", () => ({ useOnboardingTemplateDepartments: () => ({ data: [] }) }));
jest.mock("@/hooks/api/org-hierarchy", () => ({ useOrgLocations: () => ({ data: { data: [] } }) }));
jest.mock("@/hooks/api/org-display", () => ({ useOrgTimeZone: () => "America/Los_Angeles" }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "u1" }, orgId: "o1" }, status: "authenticated" }),
}));
jest.mock("@/components/hr/_onboarding/wizard-draft", () => ({
  loadAdminWizardDraft: () => null,
  saveAdminWizardDraft: (draft: unknown) => saveDraft(draft),
  clearAdminWizardDraft: jest.fn(),
  toAdminWizardDraft: (values: Record<string, unknown>, step: number) => ({ ...values, step }),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), warning: jest.fn(), error: jest.fn() } }));

import { OnboardingWizard } from "@/components/hr/onboarding-wizard";

function localDay(value: unknown): string {
  if (!(value instanceof Date)) throw new Error("joiningDate is not a Date");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}

describe("OnboardingWizard — HRM-B-012 joining date defaults to the organisation's today", () => {
  beforeEach(() => {
    jest.useFakeTimers({
      now: new Date("2026-10-14T19:30:00Z"),
      doNotFake: [
        "nextTick",
        "setImmediate",
        "clearImmediate",
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "queueMicrotask",
        "requestAnimationFrame",
        "cancelAnimationFrame",
        "requestIdleCallback",
        "cancelIdleCallback",
        "hrtime",
        "performance",
      ],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("uses the calendar day in the organisation's zone, not the browser's", async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard />);

    await user.type(screen.getByLabelText(/^first name/i), "J");

    await waitFor(() => expect(saveDraft).toHaveBeenCalled());
    const draft = saveDraft.mock.calls.at(-1)?.[0] as { joiningDate: unknown };
    expect(localDay(draft.joiningDate)).toBe("2026-10-14");
  });
});
