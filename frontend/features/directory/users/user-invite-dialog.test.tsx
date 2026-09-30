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
