import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  DirtyStateProvider,
  useHasUnsavedWork,
} from "@/components/shared/dirty-state-context";
import { ApiError } from "@/lib/api-envelope";
import { ManagedProductFormSheet } from "./managed-product-form-sheet";
import type { ManagedProduct } from "@/types/projects";

const mockMutate = jest.fn();
jest.mock("@/hooks/api/build/managed-products", () => ({
  useUpdateManagedProduct: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

jest.mock("@/features/build/ticket-details/ticket-conflict-dialog", () => ({
  TicketConflictDialog: ({
    open,
    fields,
  }: {
    open: boolean;
    fields: { key: string; label: string }[];
  }) =>
    open ? (
      <div data-testid="conflict-dialog">
        {fields.map((f) => (
          <span key={f.key} data-testid={`conflict-field-${f.key}`}>
            {f.label}
          </span>
        ))}
      </div>
    ) : null,
}));

jest.mock("@/components/shared", () => ({
  FormSheetChrome: ({
    open,
    children,
    footer,
  }: {
    open: boolean;
    children: React.ReactNode;
    footer: React.ReactNode;
    onOpenChange?: (open: boolean) => void;
    title?: string;
    description?: string;
  }) => open ? <div>{children}{footer}</div> : null,
  MemberPicker: ({ onChange }: { onChange: (v: string | null) => void; value?: string; mode?: string; allowUnassigned?: boolean; placeholder?: string }) => (
    <button type="button" onClick={() => onChange("user-1")} data-testid="member-picker">
      Select owner
    </button>
  ),
}));

function HasUnsavedWorkProbe() {
  const hasUnsavedWork = useHasUnsavedWork();
  return <span data-testid="probe">{hasUnsavedWork ? "dirty" : "clean"}</span>;
}

function renderCreateHarness() {
  return render(
    <DirtyStateProvider>
      <HasUnsavedWorkProbe />
      <ManagedProductFormSheet
        open
        onOpenChange={jest.fn()}
        mode="create"
        onSubmitCreate={jest.fn()}
      />
    </DirtyStateProvider>,
  );
}

const BASE_PRODUCT: ManagedProduct = {
  id: 1,
  orgId: "org-1",
  name: "Atlas",
  key: "ATL",
  description: null,
  status: "active",
  ownerId: null,
  vision: null,
  missionStatement: null,
  targetCustomer: null,
  differentiators: null,
  currentPhase: null,
  targetLaunchDate: null,
  successMetrics: null,
  ownerMembershipId: null,
  version: 1,
  deletedAt: null,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

beforeEach(() => {
  mockMutate.mockReset();
});

describe("managed product form sheet dirty guard (BSN-04-010, BSN-04-013)", () => {
  test("clean form when sheet is first opened reports clean state", () => {
    renderCreateHarness();
    expect(screen.getByTestId("probe")).toHaveTextContent("clean");
  });

  test("entering a product name registers the form as dirty so scope-change guard fires", async () => {
    renderCreateHarness();

    act(() => {
      fireEvent.change(screen.getByPlaceholderText("Product name"), {
        target: { value: "New Product" },
      });
    });

    await waitFor(() =>
      expect(screen.getByTestId("probe")).toHaveTextContent("dirty"),
    );
  });

  test("typed product name is preserved after editing (content is not cleared on dirty registration)", async () => {
    renderCreateHarness();

    act(() => {
      fireEvent.change(screen.getByPlaceholderText("Product name"), {
        target: { value: "Important product" },
      });
    });

    await waitFor(() =>
      expect(screen.getByTestId("probe")).toHaveTextContent("dirty"),
    );

    expect(
      (screen.getByPlaceholderText("Product name") as HTMLInputElement).value,
    ).toBe("Important product");
  });

  test("closed sheet does not register as dirty even if form was previously dirty", () => {
    render(
      <DirtyStateProvider>
        <HasUnsavedWorkProbe />
        <ManagedProductFormSheet
          open={false}
          onOpenChange={jest.fn()}
          mode="create"
          onSubmitCreate={jest.fn()}
        />
      </DirtyStateProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("clean");
  });
});

describe("managed product form sheet — 409 conflict path", () => {
  test("submitting the edit form when server responds with 409 shows the conflict dialog with differing fields", async () => {
    mockMutate.mockImplementation(
      (_input: unknown, { onError }: { onError: (e: unknown) => void }) => {
        onError(new ApiError("Version conflict", 409, "PROJECTS_TICKET_CONFLICT"));
      },
    );

    render(
      <DirtyStateProvider>
        <ManagedProductFormSheet
          open
          onOpenChange={jest.fn()}
          mode="edit"
          defaultValues={{ ...BASE_PRODUCT, name: "Old name" }}
        />
      </DirtyStateProvider>,
    );

    act(() => {
      fireEvent.change(screen.getByPlaceholderText("Product name"), {
        target: { value: "New name" },
      });
    });

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    });

    await waitFor(() =>
      expect(screen.getByTestId("conflict-dialog")).toBeInTheDocument(),
    );

    expect(screen.getByTestId("conflict-field-name")).toBeInTheDocument();
  });
});
