import { render } from "@testing-library/react";
import { MailAccountsSheet } from "./mail-accounts-sheet";

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

describe("MailAccountsSheet", () => {
  it("uses the shared bottom AppSheet presentation on mobile", () => {
    render(<MailAccountsSheet open onClose={jest.fn()} />);

    const content = document.querySelector("[data-slot='sheet-content']");
    expect(content).not.toBeNull();
    expect(content).toHaveClass("data-[state=open]:slide-in-from-bottom", "rounded-t-2xl");
    expect(document.querySelector("[data-slot='drawer-content']")).toBeNull();
  });
});
