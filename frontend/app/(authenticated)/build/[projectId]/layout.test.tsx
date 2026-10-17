import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { createAppQueryClient } from "@/components/providers/query-provider";

let mockPathname = "/build/1/tickets/211";
const mockPush = jest.fn();
const mockApiGet = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
let mockIsApiError = false;
jest.mock("@/lib/api-client", () => ({
  isApiError: () => mockIsApiError,
  apiClient: { get: (path: string) => mockApiGet(path) },
}));
jest.mock("@/lib/prefetch/build", () => ({ prefetchBuildProject: jest.fn() }));
jest.mock("@/features/build/sidebar/remember-last-project", () => ({
  RememberLastProject: () => null,
}));
jest.mock("@/features/build/project-detail/access-denied-view", () => ({
  AccessDeniedView: () => <div data-testid="access-denied" />,
}));
jest.mock("@/features/build/project-detail/backend-unavailable-view", () => ({
  BackendUnavailableView: () => <div data-testid="backend-unavailable" />,
}));
jest.mock("@/features/build/project-detail/project-hydration-context", () => ({
  ...jest.requireActual("@/features/build/project-detail/project-hydration-context"),
  ProjectHydrationProvider: ({ children }: { children: ReactNode }) => children,
}));

import ProjectLayout from "./layout";
import { TicketPanelInner } from "@/features/build/ticket-details/ticket-panel-inner";

const { notFound } = jest.requireMock("next/navigation") as {
  notFound: jest.Mock;
};
const { prefetchBuildProject } = jest.requireMock("@/lib/prefetch/build") as {
  prefetchBuildProject: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockIsApiError = false;
  prefetchBuildProject.mockResolvedValue({ project: { id: 1 }, state: {} });
});

describe("ProjectLayout", () => {
  it.each(["0", "-1"])("404s for a non-positive project id (%s)", async (projectId) => {
    await expect(
      ProjectLayout({ children: null, panel: null, params: Promise.resolve({ projectId }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledTimes(1);
    expect(prefetchBuildProject).not.toHaveBeenCalled();
  });

  it("renders the not-found boundary for a missing project instead of throwing the API error", async () => {
    mockIsApiError = true;
    prefetchBuildProject.mockRejectedValue({ status: 404, code: "PROJECTS_NOT_FOUND" });

    await expect(
      ProjectLayout({ children: null, panel: null, params: Promise.resolve({ projectId: "6" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it("renders the access-denied boundary for a forbidden project", async () => {
    mockIsApiError = true;
    prefetchBuildProject.mockRejectedValue({
      status: 403,
      code: "PROJECTS_FORBIDDEN_PROJECT",
      details: { reason: "NOT_A_MEMBER" },
    });

    const result = await ProjectLayout({
      children: null,
      panel: null,
      params: Promise.resolve({ projectId: "6" }),
    });

    expect(result).toEqual(
      expect.objectContaining({
        props: expect.objectContaining({ projectName: "this project", hint: expect.any(String) }),
      }),
    );
    expect(notFound).not.toHaveBeenCalled();
  });

  it("renders a recoverable backend-unavailable state instead of crashing the shell", async () => {
    mockIsApiError = true;
    prefetchBuildProject.mockRejectedValue({ status: 503, code: "BACKEND_UNREACHABLE" });

    const result = await ProjectLayout({
      children: null,
      panel: null,
      params: Promise.resolve({ projectId: "6" }),
    });

    expect(result).toEqual(expect.objectContaining({ props: expect.any(Object) }));
    expect(notFound).not.toHaveBeenCalled();
  });
});

describe("retained ticket panel", () => {
  it.each([
    ["/build/1/tickets/211", "211"],
    ["/build/01/tickets/211/", "211"],
    ["/build/1/tickets/%53TRE-211", "STRE-211"],
  ])("dismisses the retained pane from %s and restores only its own route", async (ticketPath, ticketKey) => {
    mockPathname = ticketPath;
    let returnHref = "/build/1/issues";
    const ticket = {
      id: 365,
      ticketNumber: 211,
      projectId: 1,
      project: { id: 1, name: "Stream", key: "STRE" },
      title: "Reserved navigation verification",
      description: "",
      status: "IN_REVIEW",
      priority: "MEDIUM",
      version: 1,
    };
    mockApiGet.mockImplementation((path: string) => {
      if (path === "/me/access") return Promise.resolve({
        membershipId: 1,
        scopes: { "build:tickets:view": "all", "build:projects:view": "all" },
        modules: { build: true },
        isOrgOwner: false,
        version: 1,
      });
      if (path === "/build/1/tickets/key/211" || path === "/build/1/tickets/365")
        return Promise.resolve(ticket);
      if (path === "/build/1/tickets/365/subtasks") return Promise.resolve([]);
      if (path === "/build/1") return Promise.resolve({ id: 1, key: "STRE", members: [], statuses: [] });
      return Promise.reject(new Error(`Unexpected API read: ${path}`));
    });
    const client = createAppQueryClient("authenticated:reserved-org:reserved-user");
    const route = () => (
      <SessionProvider session={{
        user: { id: "reserved-user", role: "MEMBER" },
        orgId: "reserved-org",
        expires: "2099-01-01T00:00:00.000Z",
      }} refetchOnWindowFocus={false}>
        <QueryClientProvider client={client}>
          <h1>Issues collection</h1>
          <TicketPanelInner projectId={1} ticketKey={ticketKey} returnTo={returnHref} />
        </QueryClientProvider>
      </SessionProvider>
    );
    const view = render(route());
    try {
      fireEvent.click(await screen.findByRole("button", { name: "Close ticket pane" }));
      expect(mockPush).toHaveBeenCalledWith("/build/1/issues", { scroll: false });
      mockPathname = "/build/1/issues";
      view.rerender(route());
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(screen.getByRole("heading", { name: "Issues collection" })).toBeVisible();
      mockPathname = ticketPath;
      view.rerender(route());
      expect(await screen.findByRole("button", { name: "Close ticket pane" })).toBeVisible();
      returnHref = "/build/1/issues?q=reserved";
      view.rerender(route());
      fireEvent.click(screen.getByRole("button", { name: "Close ticket pane" }));
      expect(mockPush).toHaveBeenLastCalledWith(returnHref, { scroll: false });
      mockPathname = "/build/1/tickets/212";
      view.rerender(route());
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      mockPathname = "/build/2/tickets/211";
      view.rerender(route());
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    } finally {
      view.unmount();
      client.clear();
    }
  });
});
