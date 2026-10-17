import { fireEvent, render, screen } from "@testing-library/react";
import { MobileNav } from "./mobile-nav";

const LINKS = [
  { href: "/blogs", label: "Journal" },
  { href: "/blogs/archive", label: "All stories" },
];
const CTA = { href: "/pricing", label: "Explore StreamlineOS" };

function open() {
  const view = render(<MobileNav links={LINKS} cta={CTA} />);
  const toggle = screen.getByText("Menu").closest("summary") as HTMLElement;
  const details = toggle.closest("details") as HTMLDetailsElement;
  details.open = true;
  return { ...view, toggle, details };
}

describe("journal mobile navigation", () => {
  it("is a disclosure, so every link is reachable without JavaScript", () => {
    render(<MobileNav links={LINKS} cta={CTA} />);
    // The links are in the markup whether or not the menu script ever runs.
    expect(screen.getByRole("link", { name: "All stories" })).toHaveAttribute("href", "/blogs/archive");
    expect(screen.getByRole("navigation", { name: "Journal" })).toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the toggle", () => {
    const { toggle, details } = open();
    screen.getByRole("link", { name: "Journal" }).focus();

    fireEvent.keyDown(details, { key: "Escape" });

    expect(details.open).toBe(false);
    expect(document.activeElement).toBe(toggle);
  });

  it("keeps Tab inside the open menu, cycling from the last control back to the toggle", () => {
    const { toggle, details } = open();
    const cta = screen.getByRole("link", { name: CTA.label });
    cta.focus();

    fireEvent.keyDown(details, { key: "Tab" });

    expect(document.activeElement).toBe(toggle);
    expect(details.open).toBe(true);
  });

  it("wraps backwards from the toggle to the last control", () => {
    const { toggle, details } = open();
    toggle.focus();

    fireEvent.keyDown(details, { key: "Tab", shiftKey: true });

    expect(document.activeElement).toBe(screen.getByRole("link", { name: CTA.label }));
  });

  it("ignores keys while the menu is closed", () => {
    render(<MobileNav links={LINKS} cta={CTA} />);
    const details = screen.getByText("Menu").closest("details") as HTMLDetailsElement;

    fireEvent.keyDown(details, { key: "Escape" });

    expect(details.open).toBe(false);
  });

  it("closes the menu when a link is followed", () => {
    const { details } = open();
    fireEvent.click(screen.getByRole("link", { name: "All stories" }));
    expect(details.open).toBe(false);
  });
});
