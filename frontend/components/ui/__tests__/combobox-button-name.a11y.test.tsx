import { render, screen } from "@testing-library/react";
import { Combobox } from "@/components/ui/combobox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { expectNoAxeViolations } from "@/test-utils";

const OPTIONS = [
  { value: "alice", label: "Alice" },
  { value: "bob", label: "Bob" },
];

describe("Combobox trigger has an accessible name (button-name)", () => {
  it("uses the placeholder as aria-label by default", () => {
    render(
      <Combobox
        options={OPTIONS}
        value=""
        onChange={() => {}}
        placeholder="Select assignee"
      />,
    );
    expect(screen.getByRole("combobox", { name: "Select assignee" })).toBeInTheDocument();
  });

  it("accepts an explicit aria-label that overrides the placeholder", () => {
    render(
      <Combobox
        options={OPTIONS}
        value=""
        onChange={() => {}}
        placeholder="Select…"
        aria-label="Select project manager"
      />,
    );
    expect(screen.getByRole("combobox", { name: "Select project manager" })).toBeInTheDocument();
  });

  it("uses aria-labelledby when provided", () => {
    render(
      <div>
        <span id="combo-lbl">Project manager</span>
        <Combobox
          options={OPTIONS}
          value=""
          onChange={() => {}}
          placeholder="Pick one"
          aria-labelledby="combo-lbl"
        />
      </div>,
    );
    expect(screen.getByRole("combobox", { name: "Project manager" })).toBeInTheDocument();
  });

  it("clears aria-label when aria-labelledby is provided", () => {
    render(
      <div>
        <span id="lbl2">Owner</span>
        <Combobox
          options={OPTIONS}
          value=""
          onChange={() => {}}
          placeholder="Pick one"
          aria-label="redundant label"
          aria-labelledby="lbl2"
        />
      </div>,
    );
    const trigger = screen.getByRole("combobox", { name: "Owner" });
    expect(trigger).not.toHaveAttribute("aria-label");
  });

  it("passes axe when trigger has a label", async () => {
    const { container } = render(
      <Combobox
        options={OPTIONS}
        value=""
        onChange={() => {}}
        placeholder="Select assignee"
      />,
    );
    await expectNoAxeViolations(container);
  });

  it("BITE — a role=combobox button with no name source fails to find by name", () => {
    render(
      <button type="button" role="combobox" aria-expanded={false}>
        <span>Select…</span>
      </button>,
    );
    expect(screen.queryByRole("combobox", { name: "Select…" })).toBeNull();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});

describe("Combobox empty state does not produce aria-required-children violation", () => {
  it("renders a status region instead of an empty listbox when no options match", () => {
    render(
      <Command>
        <div role="status" aria-live="polite">No results found.</div>
      </Command>,
    );
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("passes axe when no items and a status region is shown instead of an empty listbox", async () => {
    const { container } = render(
      <Command>
        <div role="status" aria-live="polite" className="py-4 text-center text-sm">No results found.</div>
      </Command>,
    );
    await expectNoAxeViolations(container);
  });

  it("BITE — a role=listbox with only a role=presentation child violates aria-required-children", async () => {
    const { container } = render(
      <Command>
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
        </CommandList>
      </Command>,
    );
    await expect(expectNoAxeViolations(container)).rejects.toThrow();
  });

  it("passes axe when the listbox has option children", async () => {
    const { container } = render(
      <Command>
        <CommandList>
          <CommandGroup>
            <CommandItem value="alice">Alice</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>,
    );
    await expectNoAxeViolations(container);
  });
});
