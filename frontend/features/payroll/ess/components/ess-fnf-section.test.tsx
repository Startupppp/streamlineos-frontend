import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";

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

    expect(screen.getByText("Couldn't load F&F settlement")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /retry|try again/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("opts the settlement read out of the route boundary, so a 500 reaches the branch above instead of blanking /me/pay", () => {
    const source = readFileSync(join(process.cwd(), "hooks/api/payroll/ess.ts"), "utf8");
    const declaration = source.slice(source.indexOf("export function useEssFnf"));
    const body = declaration.slice(0, declaration.indexOf("\n}\n"));

    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });
    expect(body).toContain("...INLINE_READ_ERROR,");
  });

  it("does not fall through to silence when the read 500s", () => {
    mockUseEssFnf.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: new ApiError("Internal server error", 500), refetch: jest.fn() });

    const { container } = render(<EssFnfSection hideToolbar />);

    expect(container).not.toBeEmptyDOMElement();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders nothing when the member simply has no settlement", () => {
    mockUseEssFnf.mockReturnValue({ data: null, isLoading: false, isError: false, error: undefined, refetch: jest.fn() });

    const { container } = render(<EssFnfSection hideToolbar />);

    expect(container).toBeEmptyDOMElement();
  });
});
