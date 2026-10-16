import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { BroadcastsPage } from "./broadcasts-page";

let canManage = false;
let listState: { data?: { items: [] }; isLoading: boolean; isError: boolean; error: unknown } = {
  data: { items: [] },
  isLoading: false,
  isError: false,
  error: null,
};

jest.mock("@/hooks/api/access", () => ({ useCan: () => canManage }));
jest.mock("@/hooks/api/notifications-broadcasts", () => {
  const mutation = { mutate: jest.fn(), isPending: false };
  return {
    useBroadcasts: () => ({ ...listState, refetch: jest.fn() }),
    useCreateBroadcast: () => mutation,
    useUpdateBroadcast: () => mutation,
    usePublishBroadcast: () => mutation,
    useCancelBroadcast: () => mutation,
    useDeleteBroadcast: () => mutation,
  };
});
jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ actions, children }: { actions?: React.ReactNode; children: React.ReactNode }) => (
    <main>
      {actions}
      {children}
    </main>
  ),
}));
jest.mock("@/features/notifications/components/broadcast-editor", () => ({ BroadcastSheet: () => null }));

beforeEach(() => {
  canManage = false;
  listState = { data: { items: [] }, isLoading: false, isError: false, error: null };
});

describe("BroadcastsPage body states", () => {
  it("shows the empty state without a create action to a viewer", () => {
    render(<BroadcastsPage />);
    expect(screen.getByText("No broadcasts")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New Broadcast" })).not.toBeInTheDocument();
  });

  it("offers the create action to a manager", () => {
    canManage = true;
    render(<BroadcastsPage />);
    expect(screen.getAllByRole("button", { name: /New Broadcast/ }).length).toBeGreaterThan(0);
  });

  it("states the server's reason when the read fails", () => {
    listState = {
      isLoading: false,
      isError: true,
      error: new ApiError("Broadcasts are unavailable for this organisation", 500),
    };
    render(<BroadcastsPage />);
    expect(screen.getByText("Broadcasts are unavailable for this organisation")).toBeInTheDocument();
  });
});
