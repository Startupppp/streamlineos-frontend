import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { apiClient } from "@/lib/api-client";
import { EnvelopeList } from "./envelope-list";

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  usePathname: () => "/sign/envelopes",
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => mockSearchParams,
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useModuleEnabled: jest.fn(() => true),
  usePermissionGate: jest.fn(() => ({ permission: "sign:envelope:view", allowed: true, denied: false, pending: false })),
  useCanState: jest.fn(() => "granted"),
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {}, isOrgOwner: false }, refetch: jest.fn() })),
}));

jest.mock("@/hooks/common/use-query-param-open", () => ({
  useQueryParamOpen: () => ({ open: false, onOpenChange: jest.fn(), setOpen: jest.fn() }),
}));

jest.mock("@/components/sign/create-envelope-dialog", () => ({
  CreateEnvelopeDialog: () => null,
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  newIdempotencyKey: () => "test-key",
}));

const get = apiClient.get as jest.Mock;

function envelope(id: number, status = "sent") {
  return {
    id,
    orgId: "org-1",
    title: `Envelope ${id}`,
    subject: null,
    message: null,
    status,
    routingMode: "parallel",
    ccTiming: "on_send",
    allowDecline: true,
    sourceModule: null,
    sourceEntityType: null,
    sourceEntityId: null,
    templateId: null,
    watermarkPolicyId: null,
    senderMembershipId: 7,
    reminderEnabled: false,
    reminderFirstAfterDays: 3,
    reminderRepeatDays: 3,
    reminderMaxCount: 3,
    reminderSentCount: 0,
    lastReminderAt: null,
    sentAt: "2026-03-01T00:00:00.000Z",
    completedAt: null,
    voidedAt: null,
    voidedByMembershipId: null,
    voidReason: null,
    declinedAt: null,
    expiresAt: null,
    finalizedAt: null,
    finalPdfFileKey: null,
    finalPdfHash: null,
    finalizationKey: null,
    metadataJson: {},
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
  };
}

function page(items: unknown[], total: number, pageNumber: number, pageSize: number) {
  return { items, total, page: pageNumber, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  );
  return render(<EnvelopeList />, { wrapper });
}

/**
 * The list used to read `.items` off the page envelope and render them with
 * no pagination at all, so an organisation with more envelopes than one page
 * saw the first twenty-five and no way to reach the rest, and the status
 * filter lived in component state the URL never carried.
 */
describe("EnvelopeList", () => {
  beforeEach(() => {
    get.mockReset();
    mockReplace.mockReset();
    mockSearchParams = new URLSearchParams();
  });

  it("asks the server for the page and status the URL names", async () => {
    mockSearchParams = new URLSearchParams("status=completed&page=3&size=10");
    get.mockResolvedValue(page([envelope(31, "completed")], 25, 3, 10));

    renderList();

    await waitFor(() => expect(screen.getByText("Envelope 31")).toBeInTheDocument());
    const [path, params] = get.mock.calls[0] as [string, Record<string, unknown>];
    expect(path).toBe("/sign/envelopes");
    expect(params).toEqual({ status: "completed", page: 3, limit: 10 });
  });

  it("paginates on the server, showing the total the page reports", async () => {
    mockSearchParams = new URLSearchParams("size=10");
    get.mockResolvedValue(page([envelope(1), envelope(2)], 42, 1, 10));

    renderList();

    await waitFor(() => expect(screen.getByText("Envelope 1")).toBeInTheDocument());
    expect(screen.getByText(/of 42/)).toBeInTheDocument();
  });

  it("ignores a status the filter does not know rather than sending it", async () => {
    mockSearchParams = new URLSearchParams("status=bogus");
    get.mockResolvedValue(page([], 0, 1, 20));

    renderList();

    await waitFor(() => expect(get).toHaveBeenCalled());
    const [, params] = get.mock.calls[0] as [string, Record<string, unknown>];
    expect(params).toEqual({ status: undefined, page: 1, limit: 20 });
  });
});
