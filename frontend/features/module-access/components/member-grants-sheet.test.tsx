import type { ReactNode } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemberGrantsSheet } from "./member-grants-sheet";
import { toast } from "sonner";

const mockCatalog = [
  {
    name: "hr:employees:view",
    resource: "employees",
    action: "view",
    description: "View employees",
    scopable: false,
  },
  {
    name: "hr:employees:manage",
    resource: "employees",
    action: "manage",
    description: "Manage employees",
    scopable: true,
  },
];

const grantForView = {
  permissionKey: "hr:employees:view",
  scope: "all" as const,
  reason: null,
  createdAt: "2026-01-01T00:00:00Z",
};

let mockMutate = jest.fn();

jest.mock("@/hooks/api/module-access", () => ({
  useModuleAccessCatalog: () => ({ data: mockCatalog, isLoading: false }),
  useModuleMemberGrants: () => ({
    data: { grants: [grantForView] },
    isLoading: false,
  }),
  useSetModuleMemberGrants: () => ({ mutate: mockMutate, isPending: false }),
}));

jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div>{children}</div> : null,
  SheetContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SheetHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SheetTitle: ({ children }: { children: ReactNode }) => (
    <h2>{children}</h2>
  ),
  SheetDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
}));

jest.mock("./page-action-picker", () => ({
  PageActionPicker: ({
    draft,
    onDraftChange,
    readOnly,
  }: {
    draft: Record<string, string>;
    onDraftChange: (next: Record<string, string>) => void;
    readOnly: boolean;
  }) => (
    <div
      data-testid="page-action-picker"
      data-draft={JSON.stringify(draft)}
      data-readonly={String(readOnly)}
    >
      <button
        type="button"
        onClick={() =>
          onDraftChange({
            "hr:employees:view": "all",
            "hr:employees:manage": "team",
          })
        }
      >
        Add manage permission
      </button>
    </div>
  ),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const member = {
  membershipId: 42,
  userId: "user-1",
  displayName: "Alex Morgan",
  email: "alex@example.com",
  avatarUrl: null,
  groups: [],
};

const commonProps = {
  open: true,
  onOpenChange: jest.fn(),
  moduleKey: "hr",
  member,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockMutate = jest.fn();
});

describe("MemberGrantsSheet", () => {
  it("renders granted permissions as selected in the picker's initial draft", () => {
    render(<MemberGrantsSheet {...commonProps} canManage />);

    const picker = screen.getByTestId("page-action-picker");
    const draft = JSON.parse(picker.dataset.draft ?? "{}") as Record<
      string,
      string
    >;

    expect(draft["hr:employees:view"]).toBe("all");
    expect(draft["hr:employees:manage"]).toBeUndefined();
  });

  it("toggling and saving sends exactly the intended items to the mutation", () => {
    render(<MemberGrantsSheet {...commonProps} canManage />);

    fireEvent.click(screen.getByRole("button", { name: "Add manage permission" }));

    fireEvent.click(screen.getByRole("button", { name: "Save grants" }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        membershipId: 42,
        items: expect.arrayContaining([
          { permissionKey: "hr:employees:view", scope: "all" },
          { permissionKey: "hr:employees:manage", scope: "team" },
        ]),
      }),
      expect.any(Object),
    );
    expect(mockMutate.mock.calls[0][0].items).toHaveLength(2);
  });

  it("surfaces a server 403 as a toast error via getErrorMessage", () => {
    const apiError = new Error("You do not hold this permission");
    mockMutate = jest.fn(
      (_vars: unknown, callbacks: { onError: (e: Error) => void }) => {
        callbacks.onError(apiError);
      },
    );

    render(<MemberGrantsSheet {...commonProps} canManage />);

    fireEvent.click(screen.getByRole("button", { name: "Save grants" }));

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("You do not hold this permission"),
    );
  });

  it("hides save controls and marks picker read-only for viewers without manage access", () => {
    render(<MemberGrantsSheet {...commonProps} canManage={false} />);

    expect(
      screen.queryByRole("button", { name: "Save grants" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancel" }),
    ).not.toBeInTheDocument();

    const picker = screen.getByTestId("page-action-picker");
    expect(picker.dataset.readonly).toBe("true");
  });
});
