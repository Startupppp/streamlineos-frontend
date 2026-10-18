import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { OrgSettings } from "@/types/organization";
import { OrgSecuritySection } from "./org-security-section";

const mockMutate = jest.fn();

jest.mock("@/hooks/api/organization", () => ({
  useUpdateOrgSecurity: () => ({ mutate: mockMutate, isPending: false }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const ORG = {
  mfaEnforced: false,
  allowedEmailDomains: [],
  ipAllowlist: [],
  maxConcurrentSessions: null,
} as unknown as OrgSettings;

async function openEditor() {
  render(<OrgSecuritySection org={ORG} canEdit />);
  await userEvent.click(screen.getByRole("button", { name: /edit/i }));
}

beforeEach(() => mockMutate.mockClear());

describe("OrgSecuritySection validates each policy field inline before Save", () => {
  it("shows the session-limit error as soon as the field loses focus", async () => {
    await openEditor();
    await userEvent.type(screen.getByLabelText("Maximum concurrent sessions"), "-5");
    await userEvent.tab();
    expect(await screen.findByText("Enter a number from 1 to 100")).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("shows bad domain and bad IP errors on blur, before any Save", async () => {
    await openEditor();
    await userEvent.type(screen.getByLabelText("Allowed email domains"), "not a domain");
    await userEvent.tab();
    await userEvent.type(screen.getByLabelText("IP allowlist"), "999.1.1.1");
    await userEvent.tab();
    expect(await screen.findByText("Enter valid email domains")).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Enter IPv4 or IPv6 addresses, optionally with a CIDR prefix such as 203.0.113.0/24",
      ),
    ).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("clears the error as the value is corrected", async () => {
    await openEditor();
    const sessions = screen.getByLabelText("Maximum concurrent sessions");
    await userEvent.type(sessions, "-5");
    await userEvent.tab();
    expect(await screen.findByText("Enter a number from 1 to 100")).toBeInTheDocument();
    await userEvent.clear(sessions);
    await userEvent.type(sessions, "5");
    expect(screen.queryByText("Enter a number from 1 to 100")).not.toBeInTheDocument();
  });
});
