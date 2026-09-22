import { fireEvent, render, screen } from "@testing-library/react";

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  },
}));

jest.mock("@animateicons/react/lucide", () => ({ DownloadIcon: () => null }));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/hooks/api/payroll/fnf", () => ({ downloadFnfStatement: jest.fn() }));

const mockUseEssFnf = jest.fn();
jest.mock("@/hooks/api/payroll/ess", () => ({
  useEssFnf: () => mockUseEssFnf(),
}));

import { EssFnfSection } from "./ess-fnf-section";

describe("EssFnfSection — a failed final settlement read is an error, not silence", () => {
  it("shows an error state with retry when the settlement cannot be loaded", () => {
    const refetch = jest.fn();
    mockUseEssFnf.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: new Error("upstream down"), refetch });

    render(<EssFnfSection hideToolbar />);

    expect(screen.getByText("Couldn't load your final settlement")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /retry|try again/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("renders nothing when the member simply has no settlement", () => {
    mockUseEssFnf.mockReturnValue({ data: null, isLoading: false, isError: false, error: undefined, refetch: jest.fn() });

    const { container } = render(<EssFnfSection hideToolbar />);

    expect(container).toBeEmptyDOMElement();
  });
});
