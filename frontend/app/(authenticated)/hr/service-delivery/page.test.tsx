import { render, screen } from "@testing-library/react";
import ServiceDeliveryPage from "./page";

/**
 * FE-47: a caller holding neither hr:cases:view nor hr:helpdesk:view has both
 * reads disabled, which used to fall through to "Nothing open".
 */

const scopes: Record<string, true> = {};
let accessLoaded = true;

jest.mock("@/hooks/api/access", () => ({
  useCanState: (key: string) => (!accessLoaded ? "loading" : scopes[key] ? "granted" : "denied"),
  useAccess: () => ({
    data: accessLoaded ? { scopes, isOrgOwner: false, modules: { hr: true } } : undefined,
    isLoading: !accessLoaded,
  }),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

const idle = { data: undefined, isLoading: false, error: null, refetch: jest.fn() };
jest.mock("@/hooks/api/hr/service-delivery", () => ({
  useServiceDeliveryOpsInbox: () => idle,
  useServiceDeliveryMyItems: () => idle,
}));

jest.mock("@/components/shared/page-state-views", () => ({
  DeniedView: () => <p>Access denied</p>,
  FeatureLockedView: () => null,
  QuotaExceededView: () => null,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

beforeEach(() => {
  for (const key of Object.keys(scopes)) delete scopes[key];
  accessLoaded = true;
});

describe("service delivery page", () => {
  it("says denied, not 'Nothing open', when the caller holds neither key", () => {
    render(<ServiceDeliveryPage />);
    expect(screen.getByText("Access denied")).toBeInTheDocument();
    expect(screen.queryByText("Nothing open")).not.toBeInTheDocument();
  });

  it("does not claim emptiness while access is still loading", () => {
    accessLoaded = false;
    render(<ServiceDeliveryPage />);
    expect(screen.queryByText("Nothing open")).not.toBeInTheDocument();
    expect(screen.queryByText("Access denied")).not.toBeInTheDocument();
  });

  it("shows the empty state to a permitted caller with nothing open", () => {
    scopes["hr:helpdesk:view"] = true;
    render(<ServiceDeliveryPage />);
    expect(screen.getByText("Nothing open")).toBeInTheDocument();
  });
});
