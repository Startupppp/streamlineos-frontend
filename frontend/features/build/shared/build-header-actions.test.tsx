import { fireEvent, render, screen, within } from "@testing-library/react";
import { Plus } from "lucide-react";
import { BuildHeaderActions } from "./build-header-actions";

function mobileRow(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      "[data-slot=build-header-actions] > .sm\\:hidden:not([aria-haspopup=menu])",
    ),
  );
}

describe("BuildHeaderActions", () => {
  it("renders nothing when the role holds no action", () => {
    const { container } = render(<BuildHeaderActions actions={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("gives a lone action the full mobile width", () => {
    const { container } = render(
      <BuildHeaderActions
        actions={[{ id: "create", label: "New project", icon: Plus, primary: true }]}
      />,
    );
    const inline = mobileRow(container);
    expect(inline).toHaveLength(1);
    expect(inline[0]?.className).toContain("w-full");
  });

  it("splits two actions across one row instead of stacking full-width buttons", () => {
    const { container } = render(
      <BuildHeaderActions
        actions={[
          { id: "resume", label: "Resume project" },
          { id: "create", label: "New project", primary: true },
        ]}
      />,
    );
    const root = container.querySelector<HTMLElement>(
      "[data-slot=build-header-actions]",
    );
    expect(root?.className).toContain("grid-cols-2");
    expect(root?.className).not.toContain("flex-col");
    expect(mobileRow(container)).toHaveLength(2);
  });

  it("leaves the primary a growing column beside a fixed overflow", () => {
    const { container } = render(
      <BuildHeaderActions
        actions={[
          { id: "import", label: "Import" },
          { id: "archive", label: "Archive" },
          { id: "create", label: "New project", primary: true },
        ]}
      />,
    );
    const root = container.querySelector<HTMLElement>(
      "[data-slot=build-header-actions]",
    );
    expect(root?.className).toContain("grid-cols-[1fr_auto]");
  });

  it("keeps the primary beside an overflow once a third action appears", async () => {
    const onArchive = jest.fn();
    const { container } = render(
      <BuildHeaderActions
        actions={[
          { id: "import", label: "Import" },
          { id: "archive", label: "Archive", onSelect: onArchive },
          { id: "create", label: "New project", primary: true },
        ]}
      />,
    );
    const inline = mobileRow(container);
    expect(inline).toHaveLength(1);
    expect(inline[0]).toHaveTextContent("New project");

    const overflow = container.querySelector<HTMLElement>(
      "[aria-label='More actions'].sm\\:hidden",
    );
    expect(overflow).not.toBeNull();
    fireEvent.keyDown(overflow as HTMLElement, { key: "Enter" });
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByText("Import")).toBeInTheDocument();
    expect(within(menu).getByText("Archive")).toBeInTheDocument();
  });

  it("labels the overflow trigger for assistive technology", () => {
    render(
      <BuildHeaderActions
        actions={[
          { id: "a", label: "A" },
          { id: "b", label: "B" },
          { id: "c", label: "C" },
        ]}
      />,
    );
    expect(screen.getAllByLabelText("More actions").length).toBeGreaterThan(0);
  });

  it("runs the handler the caller supplied", () => {
    const onSelect = jest.fn();
    render(
      <BuildHeaderActions
        actions={[{ id: "create", label: "New project", primary: true, onSelect }]}
      />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "New project" })[0]);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("renders an href action as a link", () => {
    render(
      <BuildHeaderActions
        actions={[{ id: "resume", label: "Resume project", href: "/build/7" }]}
      />,
    );
    expect(screen.getAllByRole("link", { name: "Resume project" })[0]).toHaveAttribute(
      "href",
      "/build/7",
    );
  });
});

describe("BuildHeaderActions pending state", () => {
  it("shows the spinner on the acting control alone", () => {
    render(
      <BuildHeaderActions
        actions={[
          { id: "export", label: "Export" },
          {
            id: "create",
            label: "New form",
            primary: true,
            isPending: true,
            loadingLabel: "Creating…",
          },
        ]}
      />,
    );
    const pending = screen.getAllByRole("button", { name: "Creating…" });
    expect(pending.length).toBeGreaterThan(0);
    expect(pending[0]).toHaveAttribute("aria-busy", "true");
    expect(pending[0]).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Export" })[0]).toBeEnabled();
  });
});
