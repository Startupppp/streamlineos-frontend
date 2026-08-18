import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { PeopleSectionTabs } from "./people-section-tabs";

const mockPush = jest.fn();
let canManageMembership = false;

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCanManageOrganizationMembership: () => canManageMembership,
}));

jest.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

describe("PeopleSectionTabs membership authority", () => {
  beforeEach(() => {
    canManageMembership = false;
    mockPush.mockClear();
  });

  it("hides invitation management without structural membership authority", () => {
    render(<PeopleSectionTabs />);

    expect(screen.getByRole("button", { name: "Members" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Invitations" }),
    ).not.toBeInTheDocument();
  });

  it("shows invitation management to an owner or reserved Org Admin", () => {
    canManageMembership = true;
    render(<PeopleSectionTabs />);

    expect(
      screen.getByRole("button", { name: "Invitations" }),
    ).toBeInTheDocument();
  });
});
