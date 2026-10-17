import { useEffect } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AskOsProvider } from "./ask-os-provider";
import { AskOsLauncher } from "./ask-os-launcher";

const mounted = jest.fn();
const unmounted = jest.fn();
let mockCompanionVisible = false;

jest.mock("next/dynamic", () => () => function DeferredAssistant() {
  useEffect(() => {
    mounted();
    return () => { unmounted(); };
  }, []);
  return <div data-testid="assistant-runtime"><AskOsLauncher /></div>;
});

jest.mock("@/components/brand/animated-logo", () => ({ AnimatedLogo: () => <span /> }));
jest.mock("@/hooks/common/use-hydrated", () => ({ useHydrated: () => true }));
jest.mock("./companion-launcher", () => ({
  useCompanionPresence: () => mockCompanionVisible ? { visible: true } : null,
  CompanionLauncher: () => <button type="button">Loading companion</button>,
}));

beforeEach(() => {
  mounted.mockClear();
  unmounted.mockClear();
  mockCompanionVisible = false;
});

it("loads the full companion runtime as soon as the pet is available", async () => {
  mockCompanionVisible = true;
  render(<AskOsProvider><div>Workspace</div></AskOsProvider>);
  await waitFor(() => expect(mounted).toHaveBeenCalledTimes(1));
  expect(screen.getByTestId("assistant-runtime")).toBeInTheDocument();
});

it("does not mount the full assistant until opened, then preserves its state when minimized", async () => {
  render(<AskOsProvider><div>Workspace</div></AskOsProvider>);
  expect(screen.getByText("Workspace")).toBeInTheDocument();
  expect(screen.queryByTestId("assistant-runtime")).not.toBeInTheDocument();
  expect(mounted).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Open Ask OS assistant" }));
  await waitFor(() => expect(mounted).toHaveBeenCalledTimes(1));
  await userEvent.click(screen.getByRole("button", { name: "Minimize Ask OS assistant" }));
  expect(screen.getByTestId("assistant-runtime")).toBeInTheDocument();
  expect(unmounted).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Open Ask OS assistant" })).toBeInTheDocument();
});
