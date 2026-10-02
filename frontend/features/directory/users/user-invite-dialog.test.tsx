import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserInviteDialog } from "./user-invite-dialog";

jest.mock("@/hooks/api/users", () => ({
  useInviteUser: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => false),
}));

// The seat notice reads billing; with no seat data it renders nothing.
jest.mock("@/hooks/api/subscription", () => ({
  useSeatInfo: jest.fn(() => ({ data: undefined })),
}));

import { useCan } from "@/hooks/api/access";
import { useInviteUser } from "@/hooks/api/users";

describe("UserInviteDialog — module access section visibility", () => {
  it("does NOT render the module access section when viewer lacks settings:rbac:manage", () => {
    (useCan as jest.Mock).mockReturnValue(false);

    render(<UserInviteDialog open onOpenChange={jest.fn()} />);

    expect(screen.queryByText("Module access")).not.toBeInTheDocument();
  });

  it("renders the module access section with administrable modules for a permitted viewer", () => {
    (useCan as jest.Mock).mockReturnValue(true);

    render(<UserInviteDialog open onOpenChange={jest.fn()} />);

    expect(screen.getByText("Module access")).toBeInTheDocument();
    expect(screen.getByText("Build")).toBeInTheDocument();
    expect(screen.getByText("CRM")).toBeInTheDocument();
  });
});

describe("UserInviteDialog — module access payload and standing options", () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
      value: jest.fn().mockReturnValue(false),
      configurable: true,
      writable: true,
    });
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      value: jest.fn(),
      configurable: true,
      writable: true,
    });
    Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
      value: jest.fn(),
      configurable: true,
      writable: true,
    });
  });

  it("submitted payload carries moduleAccess with selected moduleKey and standing", async () => {
    const mutateMock = jest.fn();
    (useInviteUser as jest.Mock).mockReturnValue({
      mutate: mutateMock,
      isPending: false,
    });
    (useCan as jest.Mock).mockReturnValue(true);

    const user = userEvent.setup();
    render(<UserInviteDialog open onOpenChange={jest.fn()} />);

    await user.type(
      screen.getByLabelText(/email address/i),
      "test@example.com",
    );

    const [roleSelect] = screen.getAllByRole("combobox");
    await user.click(roleSelect);
    await user.click(screen.getByRole("option", { name: /^Member$/ }));

    const buildSelect = screen.getByRole("combobox", {
      name: /module access for Build/i,
    });
    await user.click(buildSelect);
    await user.click(screen.getByRole("option", { name: /^Member$/ }));

    await user.click(screen.getByText("Send invitation"));

    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleAccess: expect.arrayContaining([
          { moduleKey: "build", standing: "MEMBER" },
        ]),
      }),
      expect.anything(),
    );
  });

  it("submitted payload omits moduleAccess when no module standing is selected", async () => {
    const mutateMock = jest.fn();
    (useInviteUser as jest.Mock).mockReturnValue({
      mutate: mutateMock,
      isPending: false,
    });
    (useCan as jest.Mock).mockReturnValue(true);

    const user = userEvent.setup();
    render(<UserInviteDialog open onOpenChange={jest.fn()} />);

    await user.type(
      screen.getByLabelText(/email address/i),
      "test@example.com",
    );

    const [roleSelect] = screen.getAllByRole("combobox");
    await user.click(roleSelect);
    await user.click(screen.getByRole("option", { name: /^Member$/ }));

    await user.click(screen.getByText("Send invitation"));

    expect(mutateMock).toHaveBeenCalledWith(
      expect.not.objectContaining({ moduleAccess: expect.anything() }),
      expect.anything(),
    );
  });

  it.each([
    ["HR Admin", [{ moduleKey: "hr", standing: "ADMIN" }]],
    ["Finance", [{ moduleKey: "payroll", standing: "ADMIN" }, { moduleKey: "accounting", standing: "ADMIN" }]],
  ])("BUG-HRMS-003: the %s preset sends a Member with those module grants, never Org Admin", async (preset, grants) => {
    const mutateMock = jest.fn();
    (useInviteUser as jest.Mock).mockReturnValue({ mutate: mutateMock, isPending: false });
    (useCan as jest.Mock).mockReturnValue(true);

    const user = userEvent.setup();
    render(<UserInviteDialog open onOpenChange={jest.fn()} />);

    await user.type(screen.getByLabelText(/email address/i), "test@example.com");
    const [roleSelect] = screen.getAllByRole("combobox");
    await user.click(roleSelect);
    await user.click(screen.getByRole("option", { name: /^Member$/ }));
    await user.click(screen.getByRole("button", { name: preset }));
    await user.click(screen.getByText("Send invitation"));

    expect(mutateMock).toHaveBeenCalledWith(
      { email: "test@example.com", role: "MEMBER", moduleAccess: grants },
      expect.anything(),
    );
  });

  it("BUG-HRMS-003: the Viewer preset clears grants back to a plain Member", async () => {
    const mutateMock = jest.fn();
    (useInviteUser as jest.Mock).mockReturnValue({ mutate: mutateMock, isPending: false });
    (useCan as jest.Mock).mockReturnValue(true);

    const user = userEvent.setup();
    render(<UserInviteDialog open onOpenChange={jest.fn()} />);

    await user.type(screen.getByLabelText(/email address/i), "test@example.com");
    const [roleSelect] = screen.getAllByRole("combobox");
    await user.click(roleSelect);
    await user.click(screen.getByRole("option", { name: /^Member$/ }));
    await user.click(screen.getByRole("button", { name: "HR Admin" }));
    await user.click(screen.getByRole("button", { name: "Viewer" }));
    await user.click(screen.getByText("Send invitation"));

    expect(mutateMock).toHaveBeenCalledWith({ email: "test@example.com", role: "MEMBER" }, expect.anything());
  });

  it("OWNER standing is never offered in any module standing selector", async () => {
    (useCan as jest.Mock).mockReturnValue(true);

    const user = userEvent.setup();
    render(<UserInviteDialog open onOpenChange={jest.fn()} />);

    const buildSelect = screen.getByRole("combobox", {
      name: /module access for build/i,
    });
    await user.click(buildSelect);

    expect(
      screen.queryByRole("option", { name: /owner/i }),
    ).not.toBeInTheDocument();
  });
});

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

describe("UserInviteDialog — CHAT-002 a refusal stays on screen", () => {
  async function submitInvite(mutateMock: jest.Mock) {
    (useInviteUser as jest.Mock).mockReturnValue({
      mutate: mutateMock,
      isPending: false,
    });
    (useCan as jest.Mock).mockReturnValue(false);

    const user = userEvent.setup();
    render(<UserInviteDialog open onOpenChange={jest.fn()} />);

    await user.type(screen.getByLabelText(/email address/i), "b@example.com");
    const [roleSelect] = screen.getAllByRole("combobox");
    await user.click(roleSelect);
    await user.click(screen.getByRole("option", { name: /^Member$/ }));
    await user.click(screen.getByText("Send invitation"));
    return user;
  }

  it("renders the server's refusal in the form, not only as a toast", async () => {
    const mutateMock = jest.fn((_payload, options) => {
      options.onError(
        Object.assign(new Error("Seat limit reached"), { status: 402 }),
      );
    });

    await submitInvite(mutateMock);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "No seat is available for another member. Free a seat or raise the limit, then invite again.",
    );
    expect(screen.getByText("Send invitation")).toBeInTheDocument();
  });

  it("clears the refusal when the next attempt succeeds", async () => {
    let fail = true;
    const mutateMock = jest.fn((_payload, options) => {
      if (fail) {
        fail = false;
        options.onError(new Error("Something broke"));
        return;
      }
      options.onSuccess({ success: true, invitationId: "i1", resent: false });
    });

    const user = await submitInvite(mutateMock);
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await user.click(screen.getByText("Send invitation"));

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Invitation sent!")).toBeInTheDocument();
  });
});
