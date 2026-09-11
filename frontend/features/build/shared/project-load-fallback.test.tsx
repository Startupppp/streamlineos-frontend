import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";

import { ProjectLoadFallback } from "./project-load-fallback";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api-envelope";

const notFound = jest.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

jest.mock("next/navigation", () => ({
  notFound: (...args: unknown[]) => (notFound as (...a: unknown[]) => never)(...args),
}));

/**
 * `project-board-page` and `project-backlog-page` read `const { data, isLoading }
 * = useProject(projectId)` and then `if (!data) return notFound()`, with nothing
 * between. Any failure of the project read — a transient 500, a timeout, a
 * revoked permission — therefore rendered Next's hard "This page could not be
 * found": the user's project looked deleted, there was no retry affordance, and
 * refreshing reproduced it. Six sibling pages in the same module already split
 * the two cases; the two that did not are the module's most-visited.
 */

/** PageWrapper truncates its title through a Radix tooltip. */
function renderFallback(element: ReactElement) {
  return render(<TooltipProvider>{element}</TooltipProvider>);
}

beforeEach(() => {
  notFound.mockClear();
});

describe("ProjectLoadFallback", () => {
  it("renders the hard 404 only when the server RESOLVED the id as absent", () => {
    const error = new ApiError("Project not found", 404, "PROJECTS_NOT_FOUND");
    expect(() =>
      renderFallback(<ProjectLoadFallback title="Board" error={error} onRetry={jest.fn()} />),
    ).toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it("does NOT 404 a project that merely failed to load", () => {
    const error = new ApiError("Internal server error", 500);
    renderFallback(<ProjectLoadFallback title="Board" error={error} onRetry={jest.fn()} />);

    expect(notFound).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load this project/i);
  });

  it("offers a retry that re-reads the project", () => {
    const onRetry = jest.fn();
    renderFallback(
      <ProjectLoadFallback
        title="Backlog"
        error={new ApiError("Internal server error", 500)}
        onRetry={onRetry}
      />,
    );

    screen.getByRole("button", { name: /try again/i }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not 404 a network failure that never reached the server", () => {
    renderFallback(
      <ProjectLoadFallback
        title="Board"
        error={new TypeError("Failed to fetch")}
        onRetry={jest.fn()}
      />,
    );

    expect(notFound).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("does not 404 a 403 — a permission problem is not an absent project", () => {
    renderFallback(
      <ProjectLoadFallback
        title="Board"
        error={new ApiError("Forbidden", 403)}
        onRetry={jest.fn()}
      />,
    );

    expect(notFound).not.toHaveBeenCalled();
  });
});
