import { render, screen } from "@testing-library/react";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { BuildPaginatedContent } from "./build-paginated-content";

const EMBEDDED_PAGINATION_EXCEPTIONS = [
  "features/build/client-portal/grants-pager.tsx",
  "features/build/portfolios/portfolio-linked-programs-section.tsx",
  "features/build/portfolios/portfolio-linked-projects-section.tsx",
  "features/build/programs/program-detail-page.tsx",
  "features/build/settings/project-member-roles-section.tsx",
  "features/build/settings/project-settings-portal-page.tsx",
  "features/build/settings/webhook-delivery-panel.tsx",
  "features/build/teams/team-members-section.tsx",
] as const;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : [path];
  });
}

describe("BuildPaginatedContent", () => {
  it("keeps a mobile-safe pagination footer below the scrolling results area", () => {
    render(
      <BuildPaginatedContent
        ariaLabel="Tickets"
        footer={<nav aria-label="Pagination">Pages</nav>}
      >
        <div>Ticket results</div>
      </BuildPaginatedContent>,
    );

    const results = screen.getByRole("region", { name: "Tickets" });
    expect(results).toHaveClass(
      "min-h-0",
      "flex-1",
      "overflow-y-auto",
      "overscroll-contain",
    );

    const footer = screen.getByRole("navigation", { name: "Pagination" });
    expect(footer.parentElement).toHaveClass("shrink-0");
    expect(footer.parentElement).toHaveClass(
      "max-md:[.mobile-nav-active_&]:pb-[env(safe-area-inset-bottom,0px)]",
    );
    expect(footer.parentElement?.previousElementSibling).toBe(results);
  });

  it("does not reserve footer space when pagination is absent", () => {
    render(
      <BuildPaginatedContent ariaLabel="Empty tickets" footer={null}>
        <div>No tickets</div>
      </BuildPaginatedContent>,
    );

    const results = screen.getByRole("region", { name: "Empty tickets" });
    expect(results).toHaveClass("flex", "flex-col");
    expect(results.nextElementSibling).toBeNull();
  });

  it("routes full-page custom pagination through the shared layout seam", () => {
    const frontendRoot = process.cwd();
    const buildRoot = join(frontendRoot, "features", "build");
    const directCallers = sourceFiles(buildRoot)
      .filter((path) => path.endsWith(".tsx"))
      .filter((path) => !path.includes("project-list"))
      .filter((path) => !path.includes(".test."))
      .filter((path) => !path.includes("test-harness"))
      .filter((path) => readFileSync(path, "utf8").includes("<TablePagination"))
      .map((path) => relative(frontendRoot, path).replaceAll("\\", "/"));

    const embedded = new Set<string>(EMBEDDED_PAGINATION_EXCEPTIONS);
    const fullPageCallers = directCallers.filter((path) => !embedded.has(path));

    expect(directCallers.filter((path) => embedded.has(path)).sort()).toEqual(
      [...EMBEDDED_PAGINATION_EXCEPTIONS].sort(),
    );
    for (const path of fullPageCallers) {
      expect(readFileSync(join(frontendRoot, path), "utf8")).toContain(
        "<BuildPaginatedContent",
      );
    }
  });
});
