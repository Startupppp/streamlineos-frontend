import { render, screen, fireEvent, act } from "@testing-library/react";
import { toast } from "sonner";
import type { ReactNode } from "react";

const mockGroupMutateAsync = jest.fn().mockResolvedValue({ id: 99 });

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/hooks/api", () => ({
  useCreateGroupChannel: () => ({ mutateAsync: mockGroupMutateAsync, isPending: false }),
  useCreatePublicChannel: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useCreatePrivateChannel: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("@/components/shared", () => ({
  MemberPicker: ({ onToggle }: { onToggle: (id: string) => void }) => (
    <button data-testid="add-member" onClick={() => onToggle("user-1")}>
      Add member
    </button>
  ),
}));

jest.mock("@/components/ui/animated-icon-button", () => ({
  AnimatedIconButton: ({
    children,
    onClick,
    disabled,
  }: {
    children?: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/loading-button", () => ({
  LoadingButton: ({
    children,
    onClick,
    disabled,
    isPending,
  }: {
    children?: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    isPending?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled ?? isPending}>
      {children}
    </button>
  ),
}));

jest.mock("@animateicons/react/lucide", () => ({
  ChevronRightIcon: () => null,
  UsersIcon: () => null,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { upload: jest.fn() },
  isApiError: () => false,
}));

jest.mock("@/lib/api-envelope", () => ({
  lazyContract: () => undefined,
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: () => null,
}));

import { NewGroupDialog } from "./new-group-dialog";

beforeEach(() => {
  jest.clearAllMocks();
  mockGroupMutateAsync.mockResolvedValue({ id: 99 });
});

describe("NewGroupDialog — STRE-142 success toast on create", () => {
  it("fires toast.success after the channel is created so the user knows the action completed", async () => {
    render(
      <NewGroupDialog
        open
        onOpenChange={jest.fn()}
        onCreated={jest.fn()}
        hideTrigger
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. design-team"), {
      target: { value: "dev-team" },
    });

    fireEvent.click(screen.getByText("Next: Add Members"));
    fireEvent.click(screen.getByTestId("add-member"));

    await act(async () => {
      fireEvent.click(screen.getByText(/Create with 1 member/));
    });

    expect(toast.success).toHaveBeenCalledWith("Channel created");
  });

  it("does not fire toast.success and fires toast.error when the mutation fails", async () => {
    mockGroupMutateAsync.mockRejectedValueOnce(new Error("Network error"));

    render(
      <NewGroupDialog
        open
        onOpenChange={jest.fn()}
        onCreated={jest.fn()}
        hideTrigger
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. design-team"), {
      target: { value: "dev-team" },
    });

    fireEvent.click(screen.getByText("Next: Add Members"));
    fireEvent.click(screen.getByTestId("add-member"));

    await act(async () => {
      fireEvent.click(screen.getByText(/Create with 1 member/));
    });

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });
});
