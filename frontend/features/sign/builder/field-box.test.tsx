import { fireEvent, render, screen } from "@testing-library/react";
import type { SignField } from "@/types/sign";
import { FieldBox } from "./field-box";

const FIELD = { id: 1, fieldType: "text", label: "Job title", x: 10, y: 10, width: 100, height: 24, required: false } as SignField;
const COLOR = { bg: "bg-muted", border: "border-border", text: "text-foreground" };

function renderBox(editable: boolean) {
  const onMove = jest.fn();
  const onSelect = jest.fn();
  render(<FieldBox field={FIELD} scale={1} color={COLOR} isSelected editable={editable} onSelect={onSelect} onMove={onMove} onResize={jest.fn()} />);
  fireEvent.mouseDown(screen.getByText("Job title"), { clientX: 0, clientY: 0 });
  fireEvent.mouseMove(window, { clientX: 40, clientY: 30 });
  fireEvent.mouseUp(window);
  return { onMove, onSelect };
}

describe("a placed field moves only while the envelope can be edited", () => {
  it("moves on a draft", () => {
    expect(renderBox(true).onMove).toHaveBeenCalledWith(50, 40);
  });

  it("stays put on a sent envelope but can still be selected to read its settings", () => {
    const { onMove, onSelect } = renderBox(false);
    expect(onMove).not.toHaveBeenCalled();
    expect(onSelect).toHaveBeenCalled();
  });
});
