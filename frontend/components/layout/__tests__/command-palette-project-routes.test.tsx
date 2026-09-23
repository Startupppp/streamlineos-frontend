import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { useCan } from "@/hooks/api/access";
import { useRouter, usePathname } from "next/navigation";
import { buildProjectCatalog } from "@/lib/build/nav/build-project-catalog";
import { CommandPaletteDialogBody } from "../command-palette-dialog";

let accessData: { isOrgOwner: boolean; scopes: Record<string, unknown> } = {
  isOrgOwner: false,
  scopes: {},
};
let enabledModules: string[] = ["BUILD"];
let projectData: unknown = {
  settings: { features: { clientPortal: true } },
};

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => ({ data: accessData }),
  useCan: jest.fn(),
}));

jest.mock("@/hooks/api/access/org-modules", () => ({
  useEnabledModules: () => enabledModules,
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: { lockedModules: [] } }),
}));

jest.mock("@/hooks/api/build/projects", () => ({
  useProject: () => ({ data: projectData }),
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useNavigationLeave: () => (fn: () => void) => fn(),
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (v: string) => v,
}));

jest.mock("@/components/command-palette/hooks/use-global-search", () => ({
  GLOBAL_SEARCH_MIN_LENGTH: 2,
  useGlobalSearch: () => ({
    results: [],
    isSearching: false,
    isError: false,
    error: null,
    retry: jest.fn(),
  }),
}));

jest.mock("@/components/command-palette", () => ({
  useCommandPalette: () => ({
    paletteOpen: true,
    setPaletteOpen: jest.fn(),
    openCreateTicket: jest.fn(),
  }),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

const PROJECT_BASE_PATH = "/build/42";

function projectCatalogHrefs(): string[] {
  const catalog = buildProjectCatalog(PROJECT_BASE_PATH);
  return [
    ...catalog.primary,
    ...catalog.moreTools,
    ...(catalog.settings ? [catalog.settings] : []),
  ].map((destination) => destination.href);
}

function typeQuery(value: string) {
  fireEvent.change(
    screen.getByPlaceholderText("Search pages, leads, deals, contacts…"),
    { target: { value } },
  );
}

describe("CommandPaletteDialogBody — project-scoped route catalog", () => {
  let mockPush: jest.Mock;

  beforeEach(() => {
    mockPush = jest.fn();
    accessData = { isOrgOwner: false, scopes: {} };
    enabledModules = ["BUILD", "FEEDBUCKET"];
    projectData = { settings: { features: { clientPortal: true } } };
    (useCan as jest.Mock).mockReturnValue(false);
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (usePathname as jest.Mock).mockReturnValue(PROJECT_BASE_PATH);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("offers /build/42/risks to a member holding build:risks:view", () => {
    accessData = {
      isOrgOwner: false,
      scopes: { "build:view": "all", "build:risks:view": "all" },
    };

    render(<CommandPaletteDialogBody />);
    typeQuery("risks");

    expect(screen.getByText(`${PROJECT_BASE_PATH}/risks`)).toBeInTheDocument();
    expect(screen.getByText("Risks")).toBeInTheDocument();
  });

  it("withholds /build/42/risks from a member lacking build:risks:view while still offering the routes they do hold", () => {
    accessData = { isOrgOwner: false, scopes: { "build:view": "all" } };

    render(<CommandPaletteDialogBody />);
    typeQuery("risks");
    expect(
      screen.queryByText(`${PROJECT_BASE_PATH}/risks`),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Risks")).not.toBeInTheDocument();

    typeQuery("wiki");
    expect(screen.getByText(`${PROJECT_BASE_PATH}/wiki`)).toBeInTheDocument();
  });

  it("navigates to the project route the palette offered", () => {
    accessData = {
      isOrgOwner: false,
      scopes: { "build:view": "all", "build:risks:view": "all" },
    };

    render(<CommandPaletteDialogBody />);
    typeQuery("risks");
    fireEvent.click(screen.getByText(`${PROJECT_BASE_PATH}/risks`));

    expect(mockPush).toHaveBeenCalledWith(`${PROJECT_BASE_PATH}/risks`);
  });

  it("reaches every route in the project catalog for an owner of an org with the Build and Feedbucket modules", () => {
    accessData = { isOrgOwner: true, scopes: {} };

    render(<CommandPaletteDialogBody />);
    typeQuery("project");

    for (const href of projectCatalogHrefs()) {
      expect(screen.getByText(href)).toBeInTheDocument();
    }
  });

  it("offers no project routes off a project page", () => {
    accessData = { isOrgOwner: true, scopes: {} };
    (usePathname as jest.Mock).mockReturnValue("/crm/leads");

    render(<CommandPaletteDialogBody />);
    typeQuery("project");

    for (const href of projectCatalogHrefs()) {
      expect(screen.queryByText(href)).not.toBeInTheDocument();
    }
  });

  it("withholds the Feedbucket-gated project route when the org module is off", () => {
    accessData = { isOrgOwner: true, scopes: {} };
    enabledModules = ["BUILD"];

    render(<CommandPaletteDialogBody />);
    typeQuery("project");

    expect(
      screen.queryByText(`${PROJECT_BASE_PATH}/feedbucket`),
    ).not.toBeInTheDocument();
    expect(screen.getByText(`${PROJECT_BASE_PATH}/risks`)).toBeInTheDocument();
  });

  it("withholds the client-portal project route when the project has that feature off", () => {
    accessData = { isOrgOwner: true, scopes: {} };
    projectData = { settings: { features: { clientPortal: false } } };

    render(<CommandPaletteDialogBody />);
    typeQuery("project");

    expect(
      screen.queryByText(`${PROJECT_BASE_PATH}/client-portal`),
    ).not.toBeInTheDocument();
    expect(screen.getByText(`${PROJECT_BASE_PATH}/risks`)).toBeInTheDocument();
  });

  it("withholds every project route when the Build module is disabled for the org", () => {
    accessData = { isOrgOwner: true, scopes: {} };
    enabledModules = ["CRM"];

    render(<CommandPaletteDialogBody />);
    typeQuery("project");

    for (const href of projectCatalogHrefs()) {
      expect(screen.queryByText(href)).not.toBeInTheDocument();
    }
  });
});
