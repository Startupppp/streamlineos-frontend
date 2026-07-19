import { render } from "@testing-library/react";
import { CalendarAccountsSheet } from "./calendar-accounts-sheet";

jest.mock("@/hooks/common/use-mobile", () => ({
  useIsMobile: () => true,
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
}));

jest.mock("@/hooks/api/integrations", () => ({
  useIntegrationConnections: () => ({
    data: [],
    isError: false,
    isLoading: false,
    refetch: jest.fn(),
  }),
  useInitiateIntegrationConnection: () => ({
    mutateAsync: jest.fn(),
  }),
  useDisconnectIntegration: () => ({
    isPending: false,
    mutateAsync: jest.fn(),
  }),
  useSetPrimaryIntegration: () => ({
    mutateAsync: jest.fn(),
  }),
}));

jest.mock("./use-calendar-account-filters", () => ({
  useCalendarAccountFilters: () => ({
    hiddenIds: [],
    toggleConnection: jest.fn(),
  }),
}));

describe("CalendarAccountsSheet", () => {
  it("uses a bottom drawer on mobile", () => {
    render(<CalendarAccountsSheet open onClose={jest.fn()} />);

    expect(document.querySelector("[data-slot='drawer-content']")).not.toBeNull();
    expect(document.querySelector("[data-slot='sheet-content']")).toBeNull();
  });
});
