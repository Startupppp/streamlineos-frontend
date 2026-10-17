import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { MailHtmlViewer } from "./mail-html-viewer";

jest.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

function getMailBody(): Element | null {
  return document.querySelector(".mail-html-body");
}

async function renderMail(html: string): Promise<Element> {
  render(<MailHtmlViewer safeHtml={html} />);
  await waitFor(() => expect(getMailBody()?.childElementCount ?? 0).toBeGreaterThan(0));
  const body = getMailBody();
  if (!body) throw new Error("mail body did not render");
  return body;
}

describe("MailHtmlViewer — rendering provided HTML", () => {
  it("renders the provided safeHtml immediately without async delay", () => {
    render(<MailHtmlViewer safeHtml="<p>Safe content</p>" />);
    expect(getMailBody()?.innerHTML).toContain("Safe content");
  });

  it("contains wide email layouts within the device width", async () => {
    await renderMail('<table style="width:1200px"><tr><td><img width="900" src="https://example.com/wide.png"></td></tr></table>');
    expect(document.querySelector(".mail-html-frame")).toHaveClass("@container", "overflow-x-hidden");
    expect(getMailBody()).toHaveClass("[overflow-wrap:anywhere]");
    expect(getMailBody()).toHaveClass("[&_table]:!max-w-full", "[&_img]:!max-w-full");
  });

  it("preserves successful image proportions and collapses broken decorative images", async () => {
    const body = await renderMail('<img src="https://example.com/logo.png" alt="Logo"><img src="https://example.com/pixel.gif" alt="" width="1" height="1">');
    const [logo, pixel] = Array.from(body.querySelectorAll("img"));

    fireEvent.load(logo);
    fireEvent.error(pixel);

    expect(logo).toHaveAttribute("data-mail-image-state", "loaded");
    expect(pixel).toHaveAttribute("data-mail-image-state", "failed");
  });

  it("marks duplicate images in one email row for mobile display", async () => {
    const body = await renderMail('<table><tr><td><img src="https://example.com/logo.png" alt="Logo"></td><td><img src="https://example.com/logo.png" alt="Logo"></td></tr></table>');
    const images = body.querySelectorAll("img");
    expect(images[0]).not.toHaveAttribute("data-mail-duplicate-image");
    expect(images[1]).toHaveAttribute("data-mail-duplicate-image", "true");
    expect(images[1].closest("td")).toHaveAttribute("data-mail-duplicate-image-cell", "true");
  });

  it("reflows fixed-width email tables on mobile without shrinking the text", async () => {
    const body = await renderMail('<table width="600"><tr><td>Fixed email</td></tr></table>');
    expect(body).toHaveClass("@max-[640px]:[&_table]:!w-full", "@max-[640px]:[&_td]:block");
    expect(body).toHaveStyle({ width: "100%" });
  });

  it("images are constrained to max-width 100% and height auto at all times", async () => {
    await renderMail('<img src="https://example.com/img.png" width="9999" height="9999">');
    expect(getMailBody()).toHaveClass("[&_img]:!max-w-full", "[&_img]:!h-auto");
  });
});
