import { render, screen } from "@testing-library/react";
import { OrganizationStructurePage } from "./organization-structure-page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/settings/organization/structure",
  useSearchParams: () => new URLSearchParams(""),
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => ({ data: { permissions: [] } }),
  useCan: () => true,
}));

jest.mock("@/hooks/api/org-hierarchy", () => ({
  useOrgHierarchyOverview: () => ({
    data: {
      businessUnits: 0,
      branches: 0,
      departments: 0,
      teams: 0,
      locations: 0,
      costCenters: 0,
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgSettings: () => ({ data: undefined, isLoading: false }),
}));

describe("organization structure header", () => {
  it("does not show Org settings or Chart header actions", () => {
    render(<OrganizationStructurePage />);

    expect(screen.queryByRole("link", { name: "Org settings" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Chart/i })).not.toBeInTheDocument();
  });
});
