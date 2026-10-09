import { render, screen } from "@testing-library/react";
import {
  MANAGED_PRODUCT_DETAIL_CONTENT_CLASS,
  ManagedProductDetailPrimarySection,
  ManagedProductDetailShell,
} from "./managed-product-detail-layout";

describe("managed product detail layout", () => {
  it("gives the scroll content a definite full height", () => {
    expect(MANAGED_PRODUCT_DETAIL_CONTENT_CLASS).toContain("h-full");
  });

  it("stretches primary tab content across the available width and remaining height", () => {
    const { container } = render(
      <ManagedProductDetailShell>
        <ManagedProductDetailPrimarySection>
          <div>Empty panel</div>
        </ManagedProductDetailPrimarySection>
      </ManagedProductDetailShell>,
    );

    expect(screen.getByText("Empty panel")).toBeInTheDocument();
    const shell = container.firstElementChild;
    const primary = shell?.firstElementChild;

    expect(shell).toHaveClass(
      "h-full",
      "w-full",
      "flex-1",
    );
    expect(primary).toHaveClass(
      "min-h-0",
      "w-full",
      "flex-1",
      "flex-col",
    );
  });
});
