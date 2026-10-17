import { render, screen } from "@testing-library/react";
import {
  AI_FIELD_POPOVER_CONTENT_CLASS,
  AiFieldPopoverLayout,
  AiFieldPopoverScrollBody,
} from "./ai-field-popover-layout";

describe("AiFieldPopoverLayout", () => {
  it("gives long AI output a bounded flex height with one scroll body", () => {
    render(
      <div className={AI_FIELD_POPOVER_CONTENT_CLASS}>
        <AiFieldPopoverLayout>
          <AiFieldPopoverScrollBody>
            <p>Long AI output</p>
          </AiFieldPopoverScrollBody>
        </AiFieldPopoverLayout>
      </div>,
    );

    const scrollArea = screen.getByText("Long AI output").closest('[data-slot="scroll-area"]');
    expect(AI_FIELD_POPOVER_CONTENT_CLASS).toContain("h-[min(28rem,calc(100dvh-2rem))]");
    expect(AI_FIELD_POPOVER_CONTENT_CLASS).toContain("min-h-0");
    expect(scrollArea).toHaveClass("h-full", "flex-1", "min-h-0");
  });
});
