import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import type { PermissionKey } from "@/lib/rbac/permissions";
import { ConsentGapNotice } from "./consent-gap-notice";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const mockGranted = new Set<string>();
jest.mock("@/hooks/api/access", () => {
  const { permissionGate } =
    jest.requireActual<typeof import("@/lib/rbac/permission-gate")>(
      "@/lib/rbac/permission-gate",
    );
  return {
    usePermissionGate: (permission: PermissionKey) =>
      permissionGate(permission, mockGranted.has(permission), true),
  };
});

const mockedGet = apiClient.get as jest.Mock;


function renderNotice() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return render(<ConsentGapNotice />, { wrapper: Wrapper });
}

describe("ConsentGapNotice", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGranted.clear();
    mockGranted.add("crm:contacts:view");
    mockedGet.mockResolvedValue({ channel: "EMAIL", count: 42 });
  });

  it("asks how many contacts hold no email consent", async () => {
    renderNotice();

    await waitFor(() =>
      expect(mockedGet).toHaveBeenCalledWith(
        "/crm/consent/missing",
        { channel: "EMAIL" },
        expect.anything(),
      ),
    );
  });

  it("names the count and the channel it is about", async () => {
    renderNotice();

    const notice = await screen.findByRole("status");
    expect(notice).toHaveTextContent("42 contacts have");
    expect(notice).toHaveTextContent(/no email consent on file/i);
  });

  it("says nothing is recorded either way, not that permission was refused", async () => {
    renderNotice();

    expect(await screen.findByRole("status")).toHaveTextContent(
      /not the same as permission/i,
    );
  });

  it("counts one contact in the singular", async () => {
    mockedGet.mockResolvedValue({ channel: "EMAIL", count: 1 });
    renderNotice();

    expect(await screen.findByRole("status")).toHaveTextContent("1 contact has");
  });

  it("stays silent when every contact has an answer on file", async () => {
    mockedGet.mockResolvedValue({ channel: "EMAIL", count: 0 });
    renderNotice();

    await waitFor(() => expect(mockedGet).toHaveBeenCalled());
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("claims no zero when the read failed", async () => {
    mockedGet.mockRejectedValue(new Error("boom"));
    const { container } = renderNotice();

    await waitFor(() => expect(mockedGet).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("claims no zero, and asks nothing, without the contacts key", async () => {
    mockGranted.clear();
    const { container } = renderNotice();

    await Promise.resolve();
    expect(mockedGet).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it("is actually mounted on the contact list", () => {
    const page = readFileSync(join(__dirname, "contact-list-page.tsx"), "utf8");
    expect(page).toContain("<ConsentGapNotice />");
  });
});
