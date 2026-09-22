import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { SanitizedHtml } from "./sanitized-html";

describe("SanitizedHtml", () => {
  it("renders the safe markup and strips the script once mounted", async () => {
    render(
      <SanitizedHtml
        html='<p>Safe <em>text</em></p><script>window.__XSS__=1</script><img src="x" onerror="alert(1)" alt="pic">'
        className="prose"
      />,
    );
    const paragraph = await screen.findByText(/Safe/);
    const container = paragraph.parentElement;
    expect(container).toHaveClass("prose");
    expect(container?.innerHTML).toContain("<em>text</em>");
    expect(container?.innerHTML).not.toMatch(/<script/i);
    expect(container?.innerHTML).not.toContain("onerror");
    expect(typeof (window as unknown as Record<string, unknown>)["__XSS__"]).toBe("undefined");
  });

  it("re-sanitises when the html prop changes", async () => {
    const { rerender } = render(<SanitizedHtml html="<p>first</p>" />);
    await screen.findByText("first");
    rerender(<SanitizedHtml html="<p>second</p>" />);
    await screen.findByText("second");
    await waitFor(() => expect(screen.queryByText("first")).toBeNull());
  });
});
