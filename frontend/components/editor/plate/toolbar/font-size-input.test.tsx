import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FontSizeInput } from "./font-size-input";

const addMark = jest.fn();

jest.mock("platejs/react", () => ({
  useEditorRef: () => ({ tf: { addMark } }),
  useEditorSelector: (select: (editor: { api: { marks: () => Record<string, unknown> } }) => number) =>
    select({ api: { marks: () => ({ fontSize: "16px" }) } }),
}));

describe("FontSizeInput — toolbar density", () => {
  it("renders a size field between decrease and increase, not a native number stepper", () => {
    render(
      <TooltipProvider>
        <FontSizeInput />
      </TooltipProvider>,
    );

    expect(screen.getByRole("button", { name: "Decrease font size" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Increase font size" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Font size" })).toHaveValue("16");
    expect(screen.getByRole("spinbutton", { name: "Font size" })).not.toHaveAttribute("type", "number");
  });
});
