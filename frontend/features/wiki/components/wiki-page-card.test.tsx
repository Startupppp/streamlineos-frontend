import { render, screen } from "@testing-library/react";
import { WikiPageCard } from "./wiki-page-card";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

describe("WikiPageCard", () => {
  it("renders a cover strip when coverImage is set", () => {
    const { container } = render(
      <WikiPageCard
        href="/knowledge/wiki/doc/5"
        title="signos"
        icon={null}
        coverImage="gradient:ocean"
        subtitle="Updated just now"
      />,
    );

    expect(screen.getByText("signos")).toBeInTheDocument();
    const cover = container.querySelector("[aria-hidden]");
    expect(cover).toHaveClass("h-16", "w-full");
  });

  it("omits the cover strip when coverImage is null", () => {
    const { container } = render(
      <WikiPageCard
        href="/knowledge/wiki/doc/1"
        title="Untitled"
        icon={null}
        coverImage={null}
        subtitle="Updated yesterday"
      />,
    );

    expect(container.querySelector("[aria-hidden]")).toBeNull();
  });
});
