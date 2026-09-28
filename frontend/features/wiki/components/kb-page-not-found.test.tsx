import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/api-envelope";
import { KbPageNotFound } from "./kb-page-not-found";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("@/components/illustrations/state-illustration", () => ({
  StateIllustration: () => <div data-testid="illustration" />,
}));

const noop = () => {};

describe("KbPageNotFound — the wiki page detail error state exposes a request id", () => {
  it("renders the correlation id the failed read carried so a reader can quote it to support", () => {
    render(
      <KbPageNotFound
        error={new ApiError("Request failed", 500, "INTERNAL_ERROR", {
          correlationId: "req_wiki_detail_991",
        })}
        onRetry={noop}
      />,
    );
    expect(screen.getByText("req_wiki_detail_991")).toBeInTheDocument();
  });

  it("renders no reference line for an error that carried no correlation id — paired control for the id test above", () => {
    render(
      <KbPageNotFound
        error={new ApiError("Request failed", 500, "INTERNAL_ERROR")}
        onRetry={noop}
      />,
    );
    expect(screen.queryByText("Reference")).not.toBeInTheDocument();
  });

  it("still offers a retry for a generic failure alongside the reference line", () => {
    render(
      <KbPageNotFound
        error={new ApiError("Request failed", 500, "INTERNAL_ERROR", {
          correlationId: "req_wiki_detail_992",
        })}
        onRetry={noop}
      />,
    );
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("offers no retry for a 404 because re-reading a missing record cannot succeed", () => {
    render(
      <KbPageNotFound
        error={new ApiError("Not found", 404, "NOT_FOUND")}
        onRetry={noop}
      />,
    );
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    expect(screen.getByText("Page not found")).toBeInTheDocument();
  });
});
