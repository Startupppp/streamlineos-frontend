import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import type { WizardData } from "../lib/wizard-data-schema";
import { DEFAULT_DATA, MODULE_CATALOG, MODULE_QUESTIONS, ALWAYS_ENABLED_MODULES, MODULE_GROUPS } from "../lib/constants";
import { StepProducts } from "./step-products";

const mockPreview = jest.fn((payload: { modules: string[] }) =>
  Promise.resolve({
    modules: payload.modules.map((moduleKey) => ({ moduleKey, eligible: true })),
    quotaSnapshot: { seats: 0, usedSeats: 0 },
    expiresAt: new Date().toISOString(),
  }),
);
jest.mock("@/hooks/api/org-setup", () => ({
  useOrgSetupPreviewMutation: () => ({ mutateAsync: mockPreview, isPending: false }),
}));

function wizard(overrides: Partial<WizardData> = {}): WizardData {
  return {
    ...DEFAULT_DATA,
    modules: [...ALWAYS_ENABLED_MODULES],
    installedApps: [],
    ...overrides,
  };
}

beforeEach(() => {
  mockPreview.mockClear();
});

describe("StepProducts — module card grid", () => {
  it("renders a card for every non-always module in the catalog", () => {
    render(
      <StepProducts
        data={wizard()}
        patch={jest.fn()}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    for (const group of MODULE_GROUPS) {
      for (const key of group.keys) {
        const meta = MODULE_CATALOG[key];
        const matches = screen.getAllByText(meta.label, { exact: false });
        expect(matches.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("says the always-on modules do not count toward the one-product rule", () => {
    render(
      <StepProducts
        data={wizard()}
        patch={jest.fn()}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    expect(screen.getByText(/Choose at least one product to continue/)).toHaveTextContent(
      "Home and Knowledge base are always on and do not count toward this.",
    );
  });

  it("shows the always-included Home and Knowledge base cards", () => {
    render(
      <StepProducts
        data={wizard()}
        patch={jest.fn()}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Knowledge base")).toBeInTheDocument();
  });

  it("always-included cards have no interactive toggle button", () => {
    render(
      <StepProducts
        data={wizard()}
        patch={jest.fn()}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    const homeTexts = screen.getAllByText("Home");
    for (const el of homeTexts) {
      const btn = el.closest("button");
      expect(btn).toBeNull();
    }
  });

  it("toggles a non-always module off when clicked", () => {
    const patch = jest.fn();
    render(
      <StepProducts
        data={wizard({ modules: ["build", "crm", "hr", "kb"] })}
        patch={patch}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    const crmMeta = MODULE_CATALOG.crm;
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
        data={wizard({ modules: ["kb"] })}
        patch={patch}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    const buildMeta = MODULE_CATALOG.build;
    const btn = screen.getByRole("button", { name: new RegExp(buildMeta.label, "i") });
    fireEvent.click(btn);
    expect(patch).toHaveBeenCalledWith(
      expect.objectContaining({
        modules: expect.arrayContaining(["build"]),
      }),
    );
  });

  it("Continue stays disabled with only the always-on Home+kb modules, even once the preview answers", async () => {
    render(
      <StepProducts
        data={wizard({ modules: [...ALWAYS_ENABLED_MODULES] })}
        patch={jest.fn()}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    await waitFor(() => expect(mockPreview).toHaveBeenCalled());
    await act(async () => {});
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
  });

  it("Continue is enabled after selecting one module once the availability preview matches it", async () => {
    render(
      <StepProducts
        data={wizard({ modules: ["build", "kb"] })}
        patch={jest.fn()}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    const continueBtn = screen.getByRole("button", { name: /continue/i });
    expect(continueBtn).toBeDisabled();
    await waitFor(() => expect(continueBtn).toBeEnabled());
    expect(mockPreview).toHaveBeenCalledWith({ modules: ["build", "kb"] });
  });

  it("an ineligible module in the preview keeps Continue disabled", async () => {
    mockPreview.mockImplementationOnce((payload: { modules: string[] }) =>
      Promise.resolve({
        modules: payload.modules.map((moduleKey) => ({ moduleKey, eligible: moduleKey !== "build" })),
        quotaSnapshot: { seats: 0, usedSeats: 0 },
        expiresAt: new Date().toISOString(),
      }),
    );
    render(
      <StepProducts
        data={wizard({ modules: ["build", "kb"] })}
        patch={jest.fn()}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    await waitFor(() => expect(mockPreview).toHaveBeenCalled());
    await act(async () => {});
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
  });

  it("shows selected count when extra modules are chosen", () => {
    render(
      <StepProducts
        data={wizard({ modules: ["build", "crm", "kb"] })}
        patch={jest.fn()}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    expect(screen.getByText(/2 extra modules selected/i)).toBeInTheDocument();
  });

  it("shows singular count for one extra module", () => {
    render(
      <StepProducts
        data={wizard({ modules: ["build", "kb"] })}
        patch={jest.fn()}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    expect(screen.getByText(/1 extra module selected/i)).toBeInTheDocument();
  });
});

describe("StepProducts — module questions", () => {
  it("shows only the first Build question when Build module is selected", () => {
    render(
      <StepProducts
        data={wizard({ modules: ["build", "kb"] })}
        patch={jest.fn()}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    const [first, ...rest] = MODULE_QUESTIONS.build ?? [];
    expect(first).toBeDefined();
    expect(screen.getByText(new RegExp(first?.label ?? "", "i"))).toBeInTheDocument();
    for (const q of rest) {
      expect(screen.queryByText(new RegExp(q.label, "i"))).not.toBeInTheDocument();
    }
  });

  it("does not show Build questions when Build is unchecked", () => {
    render(
      <StepProducts
        data={wizard({ modules: ["kb"] })}
        patch={jest.fn()}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    const buildQuestions = MODULE_QUESTIONS.build ?? [];
    for (const q of buildQuestions) {
      expect(screen.queryByText(new RegExp(q.label, "i"))).not.toBeInTheDocument();
    }
  });

  it("selecting a chip answer calls patch with moduleAnswers", () => {
    const patch = jest.fn();
    render(
      <StepProducts
        data={wizard({ modules: ["build", "kb"] })}
        patch={patch}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    const softwareChip = screen.getByRole("radio", { name: "Software" });
    fireEvent.click(softwareChip);
    expect(patch).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleAnswers: expect.objectContaining({
          build: expect.objectContaining({ workType: "Software" }),
        }),
      }),
    );
  });

  it("shows only the first HR question when HR module is selected", () => {
    render(
      <StepProducts
        data={wizard({ modules: ["hr", "kb"] })}
        patch={jest.fn()}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    expect(screen.getByText(/How many people will you manage/i)).toBeInTheDocument();
    expect(screen.queryByText(/What should we set up first/i)).not.toBeInTheDocument();
  });
});

describe("StepProducts — nav buttons", () => {
  it("calls onNext when Continue is clicked", async () => {
    const onNext = jest.fn();
    render(
      <StepProducts
        data={wizard({ modules: ["build", "kb"] })}
        patch={jest.fn()}
        onBack={jest.fn()}
        onNext={onNext}
      />,
    );
    const continueBtn = screen.getByRole("button", { name: /continue/i });
    await waitFor(() => expect(continueBtn).toBeEnabled());
    fireEvent.click(continueBtn);
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

describe("StepProducts — availability check failure", () => {
  it("shows an inline error with Retry, and Retry re-runs the check", async () => {
    jest.useFakeTimers();
    mockPreview.mockRejectedValueOnce(new Error("Request timed out. Please try again."));
    render(
      <StepProducts
        data={wizard({ modules: [...ALWAYS_ENABLED_MODULES, "hr"] })}
        patch={jest.fn()}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    await act(async () => { jest.advanceTimersByTime(350); });
    expect(await screen.findByText(/couldn't verify product availability/i)).toBeInTheDocument();
    expect(screen.queryByText(/Checking product availability/)).toBeNull();
    const calls = mockPreview.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await act(async () => { jest.advanceTimersByTime(350); });
    expect(mockPreview.mock.calls.length).toBe(calls + 1);
    expect(screen.queryByText(/couldn't verify product availability/i)).toBeNull();
    jest.useRealTimers();
  });
});
