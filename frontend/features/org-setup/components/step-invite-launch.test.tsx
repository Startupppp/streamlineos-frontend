import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DEFAULT_DATA } from "../lib/constants";
import type { Invitee, InviteeModuleAccess, WizardData } from "../lib/wizard-data-schema";
import { StepInviteLaunch } from "./step-invite-launch";

jest.mock("@/hooks/api/subscription", () => ({
  useBillingPlans: () => ({
    data: { trialPlan: "trial", plans: [{ id: "trial", maxEmployees: 20 }] },
  }),
}));

jest.mock("./step-generation", () => ({
  StepGeneration: () => <div data-testid="generation" />,
}));

function wizard(invitees: Invitee[] = []): WizardData {
  return {
    ...DEFAULT_DATA,
    goals: ["build", "sales", "hr"],
    modules: ["build", "crm", "hr", "chat", "kb"],
    installedApps: ["build", "crm", "hr", "chat", "kb"],
    invitees,
  };
}

describe("People step product access", () => {
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

  it("adds a Member with only Build access and shows the per-person summary", () => {
    const onChangeInvitees = jest.fn<void, [Invitee[]]>();
    const onBack = jest.fn();
    const { rerender } = render(
      <StepInviteLaunch
        data={wizard()}
        onBack={onBack}
        onChangeInvitees={onChangeInvitees}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("teammate@company.com"), {
      target: { value: "editor@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add invitee" }));

    expect(onChangeInvitees).toHaveBeenCalledWith([
      {
        email: "editor@example.com",
        role: "MEMBER",
        moduleAccess: [{ moduleKey: "build", standing: "MEMBER" }],
      },
    ]);

    const invitees = onChangeInvitees.mock.calls[0]?.[0] ?? [];
    rerender(
      <StepInviteLaunch
        data={wizard(invitees)}
        onBack={onBack}
        onChangeInvitees={onChangeInvitees}
      />,
    );
    expect(screen.getByText("Access: Build Member")).toBeInTheDocument();
    expect(screen.queryByText(/Access:.*CRM/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Access:.*HR/)).not.toBeInTheDocument();
    expect(screen.getByText("Edit product access for editor@example.com")).toBeInTheDocument();
  });

  it("blocks launch and offers a repair when a draft still grants a deselected product", () => {
    const onChangeInvitees = jest.fn();
    const data = wizard([
      {
        email: "editor@example.com",
        role: "MEMBER",
        moduleAccess: [
          { moduleKey: "build", standing: "MEMBER" },
          { moduleKey: "hr", standing: "ADMIN" },
        ],
      },
    ]);
    data.modules = ["build", "chat", "kb"];

    render(
      <StepInviteLaunch
        data={data}
        onBack={jest.fn()}
        onChangeInvitees={onChangeInvitees}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/hr access.*no longer selected/i);
    fireEvent.click(screen.getByRole("button", { name: "Build my organization" }));
    expect(screen.queryByTestId("generation")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove unavailable access" }));
    expect(onChangeInvitees).toHaveBeenCalledWith([
      {
        email: "editor@example.com",
        role: "MEMBER",
        moduleAccess: [{ moduleKey: "build", standing: "MEMBER" }],
      },
    ]);
  });

  it("allows repairing one stale invite even while another still needs repair", () => {
    const onChangeInvitees = jest.fn();
    const staleAccess: InviteeModuleAccess[] = [
      { moduleKey: "hr", standing: "ADMIN" },
    ];
    const data = wizard([
      { email: "one@example.com", role: "MEMBER", moduleAccess: staleAccess },
      { email: "two@example.com", role: "MEMBER", moduleAccess: staleAccess },
    ]);
    data.modules = ["build", "chat", "kb"];

    render(
      <StepInviteLaunch
        data={data}
        onBack={jest.fn()}
        onChangeInvitees={onChangeInvitees}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Remove unavailable access" })[0]);
    expect(onChangeInvitees).toHaveBeenCalledWith([
      { email: "one@example.com", role: "MEMBER", moduleAccess: [] },
      { email: "two@example.com", role: "MEMBER", moduleAccess: staleAccess },
    ]);
  });

  it("lets the owner explicitly add CRM Admin access to a Build member", async () => {
    const onChangeInvitees = jest.fn<void, [Invitee[]]>();
    const data = wizard([
      {
        email: "editor@example.com",
        role: "MEMBER",
        moduleAccess: [{ moduleKey: "build", standing: "MEMBER" }],
      },
    ]);
    const user = userEvent.setup();
    render(
      <StepInviteLaunch
        data={data}
        onBack={jest.fn()}
        onChangeInvitees={onChangeInvitees}
      />,
    );

    await user.click(screen.getByText("Edit product access for editor@example.com"));
    await user.click(screen.getByRole("combobox", { name: "CRM access for editor@example.com" }));
    await user.click(screen.getByRole("option", { name: "Admin" }));

    expect(onChangeInvitees).toHaveBeenCalledWith([
      {
        email: "editor@example.com",
        role: "MEMBER",
        moduleAccess: [
          { moduleKey: "build", standing: "MEMBER" },
          { moduleKey: "crm", standing: "ADMIN" },
        ],
      },
    ]);
  });

  it("requires an explicit Org Admin choice and shows its structural access", async () => {
    const onChangeInvitees = jest.fn<void, [Invitee[]]>();
    const user = userEvent.setup();
    const { rerender } = render(
      <StepInviteLaunch
        data={wizard()}
        onBack={jest.fn()}
        onChangeInvitees={onChangeInvitees}
      />,
    );

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Org Admin" }));
    await user.type(screen.getByPlaceholderText("teammate@company.com"), "admin@example.com");
    await user.click(screen.getByRole("button", { name: "Add invitee" }));

    expect(onChangeInvitees).toHaveBeenCalledWith([
      { email: "admin@example.com", role: "ORG_ADMIN", moduleAccess: [] },
    ]);
    const invitees = onChangeInvitees.mock.calls[0]?.[0] ?? [];
    rerender(
      <StepInviteLaunch
        data={wizard(invitees)}
        onBack={jest.fn()}
        onChangeInvitees={onChangeInvitees}
      />,
    );
    expect(screen.getByText("Access: all enabled products as Org Admin")).toBeInTheDocument();
  });
});
