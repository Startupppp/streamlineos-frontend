import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { WizardData } from "../lib/wizard-data-schema";
import { DEFAULT_DATA, MODULE_CATALOG, ALWAYS_ENABLED_MODULES } from "../lib/constants";
import { StepProducts } from "./step-products";

const mockPreviewMutateAsync = jest.fn();

jest.mock("@/hooks/api/org-setup", () => ({
  useOrgSetupPreviewMutation: () => ({
    mutateAsync: mockPreviewMutateAsync,
    isPending: false,
  }),
}));

function wizard(overrides: Partial<WizardData> = {}): WizardData {
  return {
    ...DEFAULT_DATA,
    modules: ["build", "crm", "hr", "chat", "kb"],
    installedApps: ["build", "crm", "hr", "chat", "kb"],
    ...overrides,
  };
}

describe("StepProducts — module card grid", () => {
  it("renders a card for every MODULE_CATALOG key", () => {
    const keys = Object.keys(MODULE_CATALOG);
    render(
      <StepProducts
        data={wizard()}
        patch={jest.fn()}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    for (const key of keys) {
      const meta = MODULE_CATALOG[key as keyof typeof MODULE_CATALOG];
      if (!meta) continue;
      const matches = screen.getAllByText(meta.label, { exact: false });
      expect(matches.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("ALWAYS_ENABLED_MODULES are checked and have disabled buttons", () => {
    render(
      <StepProducts
        data={wizard()}
        patch={jest.fn()}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    for (const key of ALWAYS_ENABLED_MODULES) {
      const meta = MODULE_CATALOG[key];
      if (!meta) continue;
      const btn = screen.getByRole("button", { name: new RegExp(meta.label, "i") });
      expect(btn).toBeDisabled();
    }
  });

  it("toggles a non-always module off when clicked", () => {
    const patch = jest.fn();
    render(
      <StepProducts
        data={wizard({ modules: ["build", "crm", "hr", "chat", "kb"] })}
        patch={patch}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    const crmMeta = MODULE_CATALOG.crm;
    if (!crmMeta) return;
    const btn = screen.getByRole("button", { name: new RegExp(crmMeta.label, "i") });
    fireEvent.click(btn);
    expect(patch).toHaveBeenCalledWith(
      expect.objectContaining({
        modules: expect.not.arrayContaining(["crm"]),
      }),
    );
  });

  it("toggles a non-always module on when clicked while unchecked", () => {
    const patch = jest.fn();
    render(
      <StepProducts
        data={wizard({ modules: ["chat", "kb"] })}
        patch={patch}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    const buildMeta = MODULE_CATALOG.build;
    if (!buildMeta) return;
    const btn = screen.getByRole("button", { name: new RegExp(buildMeta.label, "i") });
    fireEvent.click(btn);
    expect(patch).toHaveBeenCalledWith(
      expect.objectContaining({
        modules: expect.arrayContaining(["build"]),
      }),
    );
  });

  it("chat always-enabled card is checked even with minimal modules", () => {
    render(
      <StepProducts
        data={wizard({ modules: ["chat", "kb"] })}
        patch={jest.fn()}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    const chatMeta = MODULE_CATALOG.chat;
    if (!chatMeta) return;
    const btn = screen.getByRole("button", { name: new RegExp(chatMeta.label, "i") });
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });
});

describe("StepProducts — adaptive questions", () => {
  it("shows adaptive question fields when Build module is checked", () => {
    render(
      <StepProducts
        data={wizard({ modules: ["build", "chat", "kb"] })}
        patch={jest.fn()}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    expect(
      screen.getByText(/How large is your development team/i),
    ).toBeInTheDocument();
  });

  it("does NOT show Build adaptive questions when Build is unchecked", () => {
    render(
      <StepProducts
        data={wizard({ modules: ["chat", "kb"] })}
        patch={jest.fn()}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    expect(
      screen.queryByText(/How large is your development team/i),
    ).not.toBeInTheDocument();
  });
});

describe("StepProducts — quota preview", () => {
  beforeEach(() => mockPreviewMutateAsync.mockReset());

  it("shows quota banner after a successful preview call", async () => {
    mockPreviewMutateAsync.mockResolvedValue({
      modules: [],
      quotaSnapshot: { seats: 20, usedSeats: 3 },
      expiresAt: "2026-01-01T00:00:00.000Z",
    });

    render(
      <StepProducts
        data={wizard()}
        patch={jest.fn()}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />,
    );

    const btn = screen.getByRole("button", { name: /preview seat usage/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText(/Seat quota/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/3 used of 20/)).toBeInTheDocument();
  });

  it("hides the quota banner when preview call fails", async () => {
    mockPreviewMutateAsync.mockRejectedValue(new Error("Network error"));

    render(
      <StepProducts
        data={wizard()}
        patch={jest.fn()}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />,
    );

    const btn = screen.getByRole("button", { name: /preview seat usage/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(mockPreviewMutateAsync).toHaveBeenCalled();
    });
    expect(screen.queryByText(/Seat quota/i)).not.toBeInTheDocument();
  });
});

describe("StepProducts — nav buttons", () => {
  it("calls onNext when Continue is clicked", () => {
    const onNext = jest.fn();
    render(
      <StepProducts
        data={wizard()}
        patch={jest.fn()}
        onBack={jest.fn()}
        onNext={onNext}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onNext).toHaveBeenCalled();
  });

  it("calls onBack when Back is clicked", () => {
    const onBack = jest.fn();
    render(
      <StepProducts
        data={wizard()}
        patch={jest.fn()}
        onBack={onBack}
        onNext={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^back$/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
