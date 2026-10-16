import { createRef } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StepBasics } from "./steps/step-basics";
import type { BasicsHandle } from "./steps/step-basics";
import type { WizardDraft } from "./use-project-create";

jest.mock("@/hooks/api/build/projects", () => ({
  useProjects: () => ({ data: undefined }),
  useCheckProjectKeyAvailable: () => jest.fn().mockResolvedValue({ available: true }),
}));

jest.mock("./steps/step-basics-manager-field", () => ({
  BasicsManagerField: () => null,
  BasicsClientField: () => null,
  charCounter: () => null,
}));

const EMPTY_DRAFT: WizardDraft = {
  name: "",
  key: "",
  description: "",
  managerId: "",
  clientId: "",
  startDate: "",
  endDate: "",
  projectType: "",
  templateId: null,
  modules: { epics: true, timeTracking: true, wiki: true },
  features: {},
  workflow: "simple",
  memberIds: [],
};

const NAME_TOO_SHORT = "Name must be at least 2 characters";

function renderStep() {
  const ref = createRef<BasicsHandle>();
  render(
    <StepBasics
      ref={ref}
      draft={{ ...EMPTY_DRAFT }}
      updateDraft={jest.fn()}
      onCancel={jest.fn()}
    />,
  );
  return { ref, input: screen.getByLabelText(/project name/i) };
}

describe("New Project wizard step 1 — a shown name error clears as soon as the name is valid (NEW-26)", () => {
  it("clears the too-short message once a valid name is typed, without waiting for Next", async () => {
    const { ref, input } = renderStep();

    fireEvent.change(input, { target: { value: "A" } });
    await act(async () => {
      await ref.current?.validate();
    });
    expect(await screen.findByText(NAME_TOO_SHORT)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "QA Name OK" } });

    await waitFor(() => {
      expect(screen.queryByText(NAME_TOO_SHORT)).not.toBeInTheDocument();
    });
  });

  it("still blocks Next while the name is too short, so the error is not merely cosmetic", async () => {
    const { ref, input } = renderStep();

    fireEvent.change(input, { target: { value: "A" } });
    let advanced: boolean | undefined;
    await act(async () => {
      advanced = await ref.current?.validate();
    });
    expect(advanced).toBe(false);

    fireEvent.change(input, { target: { value: "QA Name OK" } });
    await act(async () => {
      advanced = await ref.current?.validate();
    });
    expect(advanced).toBe(true);
  });
});
