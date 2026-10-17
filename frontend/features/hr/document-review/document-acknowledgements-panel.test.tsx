import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({
    data: { scopes: { "hr:documents:view": "all" }, modules: { hr: true }, isOrgOwner: true },
    refetch: jest.fn(),
  }),
  useModuleEnabled: () => true,
}));

const apiGet = jest.fn();
const apiPatch = jest.fn();
jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: (...args: unknown[]) => apiGet(...args),
    patch: (...args: unknown[]) => apiPatch(...args),
  },
}));

import { DocumentAcknowledgementsPanel } from "@/features/hr/document-review/document-acknowledgements-panel";

const PENDING = {
  id: 7,
  documentId: 3,
  userId: "u1",
  status: "PENDING" as const,
  acknowledgedAt: null,
  createdAt: "2026-02-01T00:00:00.000Z",
  document: { id: 3, name: "Leave policy 2026" },
  user: { id: "u1", name: "Ada" },
};

const ACKED = {
  ...PENDING,
  id: 8,
  status: "ACKNOWLEDGED" as const,
  acknowledgedAt: "2026-02-02T00:00:00.000Z",
  document: { id: 4, name: "Code of conduct" },
};

function renderPanel() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <DocumentAcknowledgementsPanel />
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  apiGet.mockReset();
  apiPatch.mockReset();
  apiPatch.mockResolvedValue({ success: true });
});

describe("HRMS-UX-008 — document acknowledgement", () => {
  it("defaults to the pending-ack filter and hides already-acked rows", async () => {
    apiGet.mockResolvedValue([PENDING, ACKED]);
    renderPanel();

    expect(await screen.findByText("Leave policy 2026")).toBeInTheDocument();
    expect(screen.queryByText("Code of conduct")).not.toBeInTheDocument();
  });

  it("turning the filter off reveals the acked rows, so the filter is a filter", async () => {
    apiGet.mockResolvedValue([PENDING, ACKED]);
    renderPanel();
    await screen.findByText("Leave policy 2026");

    await userEvent.click(screen.getByLabelText("Pending only"));
    expect(await screen.findByText("Code of conduct")).toBeInTheDocument();
  });

  it("acknowledging asks for confirmation first, then records it against the real endpoint", async () => {
    apiGet.mockResolvedValue([PENDING]);
    renderPanel();

    await userEvent.click(await screen.findByRole("button", { name: "Acknowledge" }));
    expect(
      await screen.findByText("Acknowledge this document?"),
    ).toBeInTheDocument();
    expect(apiPatch).not.toHaveBeenCalled();

    const dialog = screen.getByRole("alertdialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Acknowledge" }),
    );

    await waitFor(() =>
      expect(apiPatch).toHaveBeenCalledWith(
        "/hr/compliance",
        { acknowledgmentId: 7, status: "ACKNOWLEDGED" },
        undefined,
        expect.anything(),
      ),
    );
  });

  it("a failed read is a failure, never an empty acknowledgement queue", async () => {
    apiGet.mockRejectedValue(new Error("read failed"));
    renderPanel();

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(
      screen.queryByText("Nothing waiting on an acknowledgement."),
    ).not.toBeInTheDocument();
  });
});
