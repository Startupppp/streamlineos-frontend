import { render, screen } from "@testing-library/react";
import ManagedProductDetailError from "./error";

let currentPathname = "/build/managed-products/7";

jest.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: () => <div>Something went wrong</div>,
}));

jest.mock("@/lib/observability", () => ({
  isChunkLoadError: () => false,
  reportError: jest.fn(),
}));

describe("managed product route error heading", () => {
  it.each([
    ["/build/managed-products/7", "Overview"],
    ["/build/managed-products/7/feedback", "Feedback"],
    ["/build/managed-products/7/insights", "Insights"],
    ["/build/managed-products/7/roadmap", "Roadmap"],
    ["/build/managed-products/7/releases", "Releases"],
    ["/build/managed-products/7/goals", "Goals & OKRs"],
    ["/build/managed-products/7/projects", "Linked Projects"],
    ["/build/managed-products/7/settings", "Settings"],
  ])("shows %s as %s when the route fails", (pathname, title) => {
    currentPathname = pathname;
    render(<ManagedProductDetailError error={new Error("Failed to load")} reset={jest.fn()} />);

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Managed Product" })).not.toBeInTheDocument();
  });
});
