import { render } from "@testing-library/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

describe("Select width behavior", () => {
  it("lets the popup grow for readable option text while capping it to the viewport", () => {
    render(
      <Select defaultOpen>
        <SelectTrigger aria-label="Assignee">
          <SelectValue placeholder="Choose an assignee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="long">
            A deliberately long assignee name that is wider than the trigger
          </SelectItem>
        </SelectContent>
      </Select>,
    );

    expect(document.querySelector('[data-slot="select-content"]')).toHaveClass(
      "w-max",
      "max-w-[calc(100vw-2rem)]",
    );
  });

  it("keeps an explicit trigger width from the call site", () => {
    render(
      <Select>
        <SelectTrigger aria-label="Status" className="w-40">
          <SelectValue placeholder="Choose a status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="open">Open</SelectItem>
        </SelectContent>
      </Select>,
    );

    expect(document.querySelector('[data-slot="select-trigger"]')).toHaveClass(
      "w-40",
    );
    expect(document.querySelector('[data-slot="select-trigger"]')).not.toHaveClass(
      "w-full",
    );
  });

  it("keeps an explicit popup width from the call site", () => {
    render(
      <Select defaultOpen>
        <SelectTrigger aria-label="Status">
          <SelectValue placeholder="Choose a status" />
        </SelectTrigger>
        <SelectContent className="w-64 max-w-64">
          <SelectItem value="open">Open</SelectItem>
        </SelectContent>
      </Select>,
    );

    const content = document.querySelector('[data-slot="select-content"]');
    expect(content).toHaveClass("w-64", "max-w-64");
    expect(content).not.toHaveClass("w-max", "max-w-[calc(100vw-2rem)]");
  });
});
