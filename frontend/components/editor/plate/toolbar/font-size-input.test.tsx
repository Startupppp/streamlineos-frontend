import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FontSizeInput } from "./font-size-input";

const addMark = jest.fn();
const focus = jest.fn();
let marks: Record<string, unknown> | null = { fontSize: "16px" };

jest.mock("platejs", () => ({
  KEYS: { fontSize: "fontSize" },
}));

jest.mock("@platejs/basic-styles", () => ({
  toUnitLess: (value: string) => value.replace(/px$/i, ""),
}));

jest.mock("@platejs/basic-styles/react", () => ({
  FontSizePlugin: { key: "fontSize" },
}));

jest.mock("platejs/react", () => ({
  useEditorPlugin: () => ({
    editor: { tf: { focus } },
    tf: { fontSize: { addMark } },
  }),
  useEditorSelector: (
    select: (editor: {
      api: { marks: () => Record<string, unknown> | null };
    }) => string,
  ) => select({ api: { marks: () => marks } }),
}));

function renderFontSizeInput() {
  return render(
    <TooltipProvider>
      <FontSizeInput />
    </TooltipProvider>,
  );
}

describe("FontSizeInput — applies size marks", () => {
  beforeEach(() => {
    addMark.mockClear();
    focus.mockClear();
    marks = { fontSize: "16px" };
  });

  it("renders a size field between decrease and increase, not a native number stepper", () => {
    renderFontSizeInput();

    expect(screen.getByRole("button", { name: "Decrease font size" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Increase font size" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Font size" })).toHaveValue("16");
    expect(screen.getByRole("spinbutton", { name: "Font size" })).not.toHaveAttribute("type", "number");
  });

  it("increases the mark by 1px and restores editor focus", async () => {
    const user = userEvent.setup();
    renderFontSizeInput();

    await user.click(screen.getByRole("button", { name: "Increase font size" }));

    expect(addMark).toHaveBeenCalledWith("17px");
    expect(focus).toHaveBeenCalled();
  });

  it("decreases the mark by 1px and restores editor focus", async () => {
    const user = userEvent.setup();
    renderFontSizeInput();

    await user.click(screen.getByRole("button", { name: "Decrease font size" }));

    expect(addMark).toHaveBeenCalledWith("15px");
    expect(focus).toHaveBeenCalled();
  });

  it("commits a typed size on blur and restores editor focus", async () => {
    const user = userEvent.setup();
    renderFontSizeInput();

    const input = screen.getByRole("spinbutton", { name: "Font size" });
    await user.clear(input);
    await user.type(input, "24");
    await user.tab();

    expect(addMark).toHaveBeenCalledWith("24px");
    expect(focus).toHaveBeenCalled();
  });
});
