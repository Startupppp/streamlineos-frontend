import React from "react";
import { render, screen } from "@testing-library/react";
import { JobProse } from "../job-prose";

describe("JobProse", () => {
  /**
   * The defect this component replaced: the apply page printed
   * `job.description` into a `<p>`, so every candidate read `<p>You will own
   * the services behind…</p>` — tags and all — on the one screen the
   * employer's own words were supposed to appear on.
   */
  it("renders the employer's markup instead of printing its tags", () => {
    render(<JobProse title="About this role" html="<p>You will own the services.</p>" />);

    expect(screen.getByText("You will own the services.")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("<p>");
  });

  it("keeps the structure a job description is made of", () => {
    const { container } = render(
      <JobProse title="Requirements" html="<ul><li>Postgres</li><li>A query plan</li></ul>" />,
    );

    expect(container.querySelectorAll("li")).toHaveLength(2);
  });

  /**
   * An authenticated recruiter's HTML reaching an unauthenticated page is
   * stored XSS with a very short path: write a posting, publish it, wait for
   * applicants. Nothing that loads or executes survives the allowlist.
   */
  it("drops a script the employer pasted in", () => {
    const { container } = render(
      <JobProse title="About" html={'<p>Safe</p><script>window.pwned = 1;</script>'} />,
    );

    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByText("Safe")).toBeInTheDocument();
  });

  it("drops an inline event handler", () => {
    const { container } = render(
      <JobProse title="About" html={'<p onclick="window.pwned=1">Copy</p>'} />,
    );

    expect(container.querySelector("p")?.getAttribute("onclick")).toBeNull();
  });

  it("drops an image, an iframe and an object", () => {
    const { container } = render(
      <JobProse
        title="About"
        html={'<img src="x" onerror="window.pwned=1"><iframe src="https://e.test"></iframe><object data="x"></object>'}
      />,
    );

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector("object")).toBeNull();
  });

  it("refuses a javascript: link", () => {
    const { container } = render(
      <JobProse title="About" html={'<a href="javascript:alert(1)">click</a>'} />,
    );

    expect(container.querySelector("a")?.getAttribute("href") ?? "").not.toContain("javascript:");
  });

  /**
   * A posting may link out, and the link must not be able to reach back into
   * the tab through `window.opener`.
   */
  it("opens a surviving link away from the page, with noopener", () => {
    const { container } = render(
      <JobProse title="About" html={'<a href="https://example.test/roles">Read more</a>'} />,
    );

    const link = container.querySelector("a");
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toContain("noopener");
  });

  /**
   * Renders nothing rather than an empty bordered box with a heading. A
   * section headed "What we offer" with no content under it reads as an
   * employer who offers nothing.
   */
  it("renders nothing when the markup sanitises to nothing", () => {
    const { container } = render(<JobProse title="What we offer" html="<script>1</script>" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for whitespace", () => {
    const { container } = render(<JobProse title="What we offer" html="   " />);
    expect(container).toBeEmptyDOMElement();
  });
});
