import { render, screen } from "@testing-library/react";
import { WorkspaceSwitcher } from "./org-switcher";

let mockOrganizations: Array<{ id: string; name: string }> = [];

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { orgId: "org-1" } }),
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => ({ data: { isOrgOwner: false } }),
}));

jest.mock("@/hooks/common/auth-hooks", () => ({
  useGetOrganizations: () => ({ data: mockOrganizations }),
  useSwitchOrg: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("next/dynamic", () => () => function Deferred() {
  return null;
});

describe("organization trigger label (QA 2026-10-13: one membership read as 'Switch organization')", () => {
  it("does not offer a switch when the user belongs to one organization", () => {
    mockOrganizations = [{ id: "org-1", name: "Only org" }];
    render(<WorkspaceSwitcher triggerOnly />);
    expect(screen.getByRole("button", { name: "Organization menu" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Switch organization" })).toBeNull();
  });

  it("offers the switch when there is another organization to switch to", () => {
    mockOrganizations = [
      { id: "org-1", name: "Current" },
      { id: "org-2", name: "Other" },
    ];
    render(<WorkspaceSwitcher triggerOnly />);
    expect(screen.getByRole("button", { name: "Switch organization" })).toBeInTheDocument();
  });
});
