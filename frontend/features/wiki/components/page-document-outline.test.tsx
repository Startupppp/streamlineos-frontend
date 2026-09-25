import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { PageDocumentOutline, extractHeadings } from "./page-document-outline";

describe("extractHeadings", () => {
  it("returns an empty list for null content", () => {
    expect(extractHeadings(null)).toEqual([]);
  });

  it("returns an empty list for legacy TipTap doc-shaped content", () => {
    expect(extractHeadings({ type: "doc", content: [{ type: "heading", attrs: { level: 1 }, content: [{ text: "Old" }] }] })).toEqual([]);
  });

  it("extracts h1/h2/h3 nodes from a Slate-array value in document order", () => {
    const content = [
      { type: "h1", children: [{ text: "Overview" }] },
      { type: "p", children: [{ text: "Some body text" }] },
      { type: "h2", children: [{ text: "Details" }] },
      { type: "h3", children: [{ text: "Sub detail" }] },
    ];
    expect(extractHeadings(content)).toEqual([
      { level: 1, text: "Overview", index: 0 },
      { level: 2, text: "Details", index: 1 },
      { level: 3, text: "Sub detail", index: 2 },
    ]);
  });

  it("joins nested inline children into one heading text", () => {
    const content = [
      {
        type: "h2",
        children: [{ text: "Bold " }, { text: "and", bold: true }, { text: " plain" }],
      },
    ];
    expect(extractHeadings(content)).toEqual([{ level: 2, text: "Bold and plain", index: 0 }]);
  });

  it("ignores non-heading block types", () => {
    const content = [
      { type: "p", children: [{ text: "no heading here" }] },
      { type: "blockquote", children: [{ text: "still no heading" }] },
    ];
    expect(extractHeadings(content)).toEqual([]);
  });
});

describe("PageDocumentOutline", () => {
  it("renders nothing when there are no headings", () => {
    const containerRef = createRef<HTMLDivElement>();
    const { container } = render(
      <PageDocumentOutline content={[{ type: "p", children: [{ text: "x" }] }]} containerRef={containerRef} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a nav with a button per heading", () => {
    const containerRef = createRef<HTMLDivElement>();
    const content = [
      { type: "h1", children: [{ text: "Overview" }] },
      { type: "h2", children: [{ text: "Details" }] },
    ];
    render(<PageDocumentOutline content={content} containerRef={containerRef} />);
    expect(screen.getByRole("navigation", { name: "Page outline" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Details" })).toBeInTheDocument();
  });

  it("scrolls the matching heading element inside the container on click", () => {
    const scrollIntoView = jest.fn();
    document.body.innerHTML = "";
    const container = document.createElement("div");
    document.body.appendChild(container);
    const h1 = document.createElement("h1");
    h1.textContent = "Overview";
    const h2 = document.createElement("h2");
    h2.textContent = "Details";
    h2.scrollIntoView = scrollIntoView;
    container.appendChild(h1);
    container.appendChild(h2);
    const containerRef = { current: container };

    const content = [
      { type: "h1", children: [{ text: "Overview" }] },
      { type: "h2", children: [{ text: "Details" }] },
    ];
    render(<PageDocumentOutline content={content} containerRef={containerRef} />);

    screen.getByRole("button", { name: "Details" }).click();

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });
});
