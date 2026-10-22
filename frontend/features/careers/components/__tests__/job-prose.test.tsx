import React from "react";
import { render, screen } from "@testing-library/react";
import { JobProse } from "../job-prose";

describe("JobProse", () => {
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

  it("opens a surviving link away from the page, with noopener", () => {
    const { container } = render(
      <JobProse title="About" html={'<a href="https://example.test/roles">Read more</a>'} />,
    );

    const link = container.querySelector("a");
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toContain("noopener");
  });

  it("renders nothing when the markup sanitises to nothing", () => {
    const { container } = render(<JobProse title="What we offer" html="<script>1</script>" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for whitespace", () => {
    const { container } = render(<JobProse title="What we offer" html="   " />);
    expect(container).toBeEmptyDOMElement();
  });
});
