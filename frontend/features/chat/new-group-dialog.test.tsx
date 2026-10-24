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

jest.mock("@/hooks/api/chat-channel-mutations", () => ({
  useCreateGroupChannel: () => ({ mutateAsync: mockGroupMutateAsync, isPending: false }),
  useCreatePublicChannel: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useCreatePrivateChannel: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

interface MockChatUsers {
  data: { id: string; name: string | null; email: string | null; image: string | null; role: string | null }[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}
let mockChatUsers: MockChatUsers;
const mockUseChatOrgUsers = jest.fn((_enabled: boolean) => mockChatUsers);
jest.mock("@/hooks/api/chat-core-read", () => ({
  useChatOrgUsers: (enabled: boolean) => mockUseChatOrgUsers(enabled),
}));

jest.mock("@/components/shared", () => ({
  MemberPicker: ({
    onToggle,
    candidates,
    placeholder,
  }: {
    onToggle: (id: string) => void;
    candidates?: { id: string; name: string | null }[];
    placeholder?: string;
  }) => (
    <div>
      <span>{placeholder}</span>
      {candidates?.map((c) => <span key={c.id}>{c.name}</span>)}
      <button data-testid="add-member" onClick={() => onToggle("user-1")}>
        Add member
      </button>
    </div>
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
  ...jest.requireActual("@/lib/api-envelope"),
  lazyContract: () => undefined,
  isApiError: () => false,
  getRetryAfterSeconds: () => null,
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: () => null,
}));

import { NewGroupDialog } from "./new-group-dialog";

beforeEach(() => {
  jest.clearAllMocks();
  mockGroupMutateAsync.mockResolvedValue({ id: 99 });
  mockChatUsers = { data: [], isLoading: false, isError: false, error: null };
});

describe("NewGroupDialog — BUG-009 member picker reads the chat directory", () => {
  function openMembersStep() {
    render(<NewGroupDialog onOpenChange={jest.fn()} onCreated={jest.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("e.g. design-team"), { target: { value: "dev-team" } });
    fireEvent.click(screen.getByText("Next: Add Members"));
  }

  it("lists GET /chat/users as the picker's candidates, fetched only on the members step", () => {
    mockChatUsers = {
      data: [{ id: "u-2", name: "Asha Rao", email: "asha@example.com", image: null, role: "MEMBER" }],
      isLoading: false,
      isError: false,
      error: null,
    };
    render(<NewGroupDialog onOpenChange={jest.fn()} onCreated={jest.fn()} />);
    expect(mockUseChatOrgUsers).toHaveBeenLastCalledWith(false);
    fireEvent.change(screen.getByPlaceholderText("e.g. design-team"), { target: { value: "dev-team" } });
    fireEvent.click(screen.getByText("Next: Add Members"));
    expect(mockUseChatOrgUsers).toHaveBeenLastCalledWith(true);
    expect(screen.getByText("Asha Rao")).toBeInTheDocument();
  });

  it("says it is loading while the directory read is pending", () => {
    mockChatUsers = { data: undefined, isLoading: true, isError: false, error: null };
    openMembersStep();
    expect(screen.getByText("Loading members…")).toBeInTheDocument();
  });

  it("shows the read error instead of an empty picker", () => {
    mockChatUsers = { data: undefined, isLoading: false, isError: true, error: new Error("Directory unavailable") };
    openMembersStep();
    expect(screen.getByRole("alert")).toHaveTextContent("Directory unavailable");
  });
});

describe("NewGroupDialog — STRE-142 success toast on create", () => {
  it("fires toast.success after the channel is created so the user knows the action completed", async () => {
    render(
      <NewGroupDialog
        onOpenChange={jest.fn()}
        onCreated={jest.fn()}
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
        onOpenChange={jest.fn()}
        onCreated={jest.fn()}
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

describe("NewGroupDialog — CHAT-005 whitespace-only channel name", () => {
  function renderDialog() {
    render(
      <NewGroupDialog
        onOpenChange={jest.fn()}
        onCreated={jest.fn()}
      />,
    );
    return screen.getByPlaceholderText("e.g. design-team");
  }

  it("keeps Next disabled for a name of only spaces, which used to slugify to '-'", () => {
    const input = renderDialog();

    fireEvent.change(input, { target: { value: "   " } });

    expect(input).toHaveValue("");
    expect(screen.getByText("Next: Add Members")).toBeDisabled();
  });

  it("explains why a punctuation-only name is not a name", () => {
    const input = renderDialog();

    fireEvent.change(input, { target: { value: " - - " } });

    expect(screen.getByText(/Use letters or numbers/)).toBeInTheDocument();
    expect(screen.getByText("Next: Add Members")).toBeDisabled();
  });

  it("still slugifies and accepts a real name", () => {
    const input = renderDialog();

    fireEvent.change(input, { target: { value: "Design Team" } });

    expect(input).toHaveValue("design-team");
    expect(screen.getByText("Next: Add Members")).not.toBeDisabled();
  });

  it("leaves a trailing hyphen alone so a name can be typed through it", () => {
    const input = renderDialog();

    fireEvent.change(input, { target: { value: "design-" } });

    expect(input).toHaveValue("design-");
    expect(screen.getByText("Next: Add Members")).not.toBeDisabled();
  });
});

describe("NewGroupDialog — CHAT-S03 channel type selection state", () => {
  it("reports the selected channel type to assistive technology", () => {
    render(
      <NewGroupDialog
        onOpenChange={jest.fn()}
        onCreated={jest.fn()}
      />,
    );

    const group = screen.getByRole("radio", { name: /Group/ });
    const publicOption = screen.getByRole("radio", { name: /Public/ });
    expect(group).toHaveAttribute("aria-checked", "true");
    expect(publicOption).toHaveAttribute("aria-checked", "false");

    fireEvent.click(publicOption);

    expect(screen.getByRole("radio", { name: /Public/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: /Group/ })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });
});
