import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { PeopleSectionTabs, resolvePeopleView } from "./people-section-tabs";

let canManageMembership = false;
let mockSearch = "";

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

jest.mock("@/hooks/api/access", () => ({
  useCanManageOrganizationMembership: () => canManageMembership,
}));

jest.mock("@/components/ui/tabs", () => {
  const { createContext, useContext } = jest.requireActual<typeof import("react")>("react");
  const TabsContext = createContext<{ value: string; onValueChange: (v: string) => void }>({
    value: "",
    onValueChange: () => {},
  });
  return {
    Tabs: ({
      children,
      value,
      onValueChange,
    }: {
      children: ReactNode;
      value: string;
      onValueChange: (v: string) => void;
    }) => (
      <TabsContext.Provider value={{ value, onValueChange }}>{children}</TabsContext.Provider>
    ),
    TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    TabsTrigger: ({ children, value }: { children: ReactNode; value: string }) => {
      const tabs = useContext(TabsContext);
      return (
        <button
          type="button"
          data-state={tabs.value === value ? "active" : "inactive"}
          onClick={() => tabs.onValueChange(value)}
        >
          {children}
        </button>
      );
    },
  };
});

describe("PeopleSectionTabs membership authority", () => {
  beforeEach(() => {
    canManageMembership = false;
    mockSearch = "";
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

describe("People view URL state (QA 2026-10-13: Invitations tab unreachable in place)", () => {
  beforeEach(() => {
    canManageMembership = true;
    mockSearch = "";
  });

  it("reads view=invitations and the legacy tab aliases as the invitations view", () => {
    expect(resolvePeopleView(new URLSearchParams("view=invitations"))).toBe("invitations");
    expect(resolvePeopleView(new URLSearchParams("tab=invites"))).toBe("invitations");
    expect(resolvePeopleView(new URLSearchParams("tab=invitations"))).toBe("invitations");
    expect(resolvePeopleView(new URLSearchParams(""))).toBe("members");
    expect(resolvePeopleView(new URLSearchParams("tab=members"))).toBe("members");
  });

  it("selects the Invitations tab for a legacy ?tab=invites link", () => {
    mockSearch = "tab=invites";
    render(<PeopleSectionTabs />);
    expect(screen.getByRole("button", { name: "Invitations" })).toHaveAttribute(
      "data-state",
      "active",
    );
  });

  it("switches view with a client-side history push, not a server navigation", () => {
    const pushState = jest.spyOn(window.history, "pushState");
    render(<PeopleSectionTabs />);

    fireEvent.click(screen.getByRole("button", { name: "Invitations" }));
    expect(pushState).toHaveBeenLastCalledWith(null, "", "/settings/users?view=invitations");

    fireEvent.click(screen.getByRole("button", { name: "Members" }));
    expect(pushState).toHaveBeenLastCalledWith(null, "", "/settings/users");
    pushState.mockRestore();
  });
});
