import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, PropsWithChildren, ReactElement } from "react";
import {
  OrgStorageScopeProvider,
  orgScopedStorageKey,
} from "@/lib/org-scoped-storage";
import { HeaderBrand } from "./header-brand";
import {
  LAST_PRODUCT_PATHS_STORAGE,
  writeLastProductPath,
} from "../last-product-path";

function renderWithScope(ui: ReactElement) {
  return render(
    <OrgStorageScopeProvider scope="org-test">{ui}</OrgStorageScopeProvider>,
  );
}

jest.mock("next/link", () => {
  return function Link({
    children,
    href,
    ...props
  }: PropsWithChildren<
    AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }
  >) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

jest.mock("next/image", () => {
  return function Image(props: { alt: string; src: string }) {
    return <span data-testid="mock-image" data-src={props.src} aria-hidden />;
  };
});

describe("HeaderBrand", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("falls back to /dashboard when nothing is remembered", () => {
    renderWithScope(<HeaderBrand />);
    expect(screen.getByRole("link", { name: "StreamlineOS home" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });

  it("links to the remembered Home URL", () => {
    writeLastProductPath(
      orgScopedStorageKey(LAST_PRODUCT_PATHS_STORAGE, "org-test"),
      "home",
      "/calendar?view=week",
    );
    renderWithScope(<HeaderBrand />);
    expect(screen.getByRole("link", { name: "StreamlineOS home" })).toHaveAttribute(
      "href",
      "/calendar?view=week",
    );
  });
});
