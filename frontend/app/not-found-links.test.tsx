import { existsSync } from "fs";
import path from "path";
import { render, screen } from "@testing-library/react";
import GlobalNotFound from "./not-found";
import DashboardNotFound from "./(authenticated)/not-found";

jest.mock("next/image", () => function Img() {
  return null;
});

const GROUPS = ["", "(public)", "(authenticated)", "(auth)"];

function routeExists(href: string): boolean {
  return GROUPS.some((group) =>
    existsSync(path.join(__dirname, group, href, "page.tsx")),
  );
}

describe.each([
  ["global", GlobalNotFound],
  ["authenticated", DashboardNotFound],
])("the %s 404 page", (_name, Page) => {
  it("links only to routes that exist, and never to a placeholder", () => {
    render(<Page />);
    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href") ?? "");

    for (const href of hrefs) {
      expect(href).not.toBe("#");
      expect({ href, exists: routeExists(href) }).toEqual({ href, exists: true });
    }
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/legal/privacy");
    expect(screen.getByRole("link", { name: /Contact Support/ })).toHaveAttribute("href", "/contact");
    expect(screen.queryByRole("link", { name: "System Status" })).not.toBeInTheDocument();
  });
});
