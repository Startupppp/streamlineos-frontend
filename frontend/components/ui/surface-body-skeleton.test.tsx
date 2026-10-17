import { render } from "@testing-library/react";
import { SurfaceBodySkeleton } from "./surface-body-skeleton";

describe("SurfaceBodySkeleton", () => {
  it("renders a surface body skeleton shell", () => {
    const { container } = render(<SurfaceBodySkeleton />);
    expect(
      container.querySelector('[data-slot="surface-body-skeleton"]'),
    ).not.toBeNull();
  });

  it("scales placeholder rows", () => {
    const { container: a } = render(<SurfaceBodySkeleton rows={2} />);
    const { container: b } = render(<SurfaceBodySkeleton rows={5} />);
    const count = (root: HTMLElement) => root.querySelectorAll(".animate-pulse").length;
    expect(count(b)).toBeGreaterThan(count(a));
  });
});
