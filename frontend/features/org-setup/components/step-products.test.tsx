import { render, screen, fireEvent } from "@testing-library/react";
import type { WizardData } from "../lib/wizard-data-schema";
import { DEFAULT_DATA, MODULE_CATALOG, MODULE_QUESTIONS, ALWAYS_ENABLED_MODULES, MODULE_GROUPS } from "../lib/constants";
import { StepProducts } from "./step-products";

function wizard(overrides: Partial<WizardData> = {}): WizardData {
  return {
    ...DEFAULT_DATA,
    modules: [...ALWAYS_ENABLED_MODULES],
    installedApps: [],
    ...overrides,
  };
}

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
        data={wizard({ modules: ["build", "crm", "hr", "chat", "kb"] })}
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
        data={wizard({ modules: ["chat", "kb"] })}
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

  it("Continue is enabled with no selectable module chosen (only Home+kb)", () => {
    render(
      <StepProducts
        data={wizard({ modules: [...ALWAYS_ENABLED_MODULES] })}
        patch={jest.fn()}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    const continueBtn = screen.getByRole("button", { name: /continue/i });
    expect(continueBtn).not.toBeDisabled();
  });

  it("Continue is enabled after selecting one module", () => {
    render(
      <StepProducts
        data={wizard({ modules: ["build", "chat", "kb"] })}
        patch={jest.fn()}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    const continueBtn = screen.getByRole("button", { name: /continue/i });
    expect(continueBtn).not.toBeDisabled();
  });

  it("shows selected count when extra modules are chosen", () => {
    render(
      <StepProducts
        data={wizard({ modules: ["build", "crm", "chat", "kb"] })}
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
        data={wizard({ modules: ["build", "chat", "kb"] })}
        patch={jest.fn()}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    expect(screen.getByText(/1 extra module selected/i)).toBeInTheDocument();
  });
});

describe("StepProducts — module questions", () => {
  it("shows questions when Build module is selected", () => {
    render(
      <StepProducts
        data={wizard({ modules: ["build", "chat", "kb"] })}
        patch={jest.fn()}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    const buildQuestions = MODULE_QUESTIONS.build ?? [];
    for (const q of buildQuestions) {
      expect(screen.getByText(new RegExp(q.label, "i"))).toBeInTheDocument();
    }
  });

  it("does not show Build questions when Build is unchecked", () => {
    render(
      <StepProducts
        data={wizard({ modules: ["chat", "kb"] })}
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
        data={wizard({ modules: ["build", "chat", "kb"] })}
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

  it("shows HR questions when HR module is selected", () => {
    render(
      <StepProducts
        data={wizard({ modules: ["hr", "chat", "kb"] })}
        patch={jest.fn()}
        onBack={jest.fn()}
        onNext={jest.fn()}
      />,
    );
    expect(screen.getByText(/How many people will you manage/i)).toBeInTheDocument();
    expect(screen.getByText(/What should we set up first/i)).toBeInTheDocument();
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
