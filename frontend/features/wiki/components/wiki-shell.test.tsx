import { render, screen } from "@testing-library/react";
import WikiShell from "./wiki-shell";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/kb", () => ({
  useCreateKbPage: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/components/layout/shell-sidebar-collapse-context", () => ({
  useShellSidebarCollapse: () => ({ isCollapsed: false }),
}));

jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("./page-tree", () => ({
  __esModule: true,
  default: () => <div>Folder tree</div>,
}));

jest.mock("./quick-find-dialog", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("./wiki-sidebar-nav", () => ({
  __esModule: true,
  default: () => <div>Wiki navigation</div>,
  WikiSidebarFooter: () => null,
}));

jest.mock("./wiki-sidebar-chrome", () => ({
  WikiCollapsedSidebarChrome: () => null,
}));

it("renders one focused navigation rail without duplicating the home Favorites collection", () => {
  render(<WikiShell><div>Wiki body</div></WikiShell>);

  expect(screen.getByText("Wiki navigation")).toBeInTheDocument();
  expect(screen.getByText("Folder tree")).toBeInTheDocument();
  expect(screen.getByText("Wiki body")).toBeInTheDocument();
  expect(screen.queryByText("Favorites")).not.toBeInTheDocument();
});
