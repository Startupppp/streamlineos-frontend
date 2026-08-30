export const NS = "http://www.w3.org/2000/svg";
export const STROKE = "#ef4444";

export type Tool = "arrow" | "rect" | "rect-outline" | "pen" | "comment";

export const TYPES: ReadonlyArray<{ value: string; label: string }> = [
  { value: "bug", label: "Bug" },
  { value: "idea", label: "Idea" },
  { value: "feature", label: "Feature" },
  { value: "question", label: "Question" },
  { value: "other", label: "Other" },
];

export function icon(paths: string[], circles?: Array<[number, number, number]>): SVGSVGElement {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", "18");
  svg.setAttribute("height", "18");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  for (const d of paths) {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", d);
    svg.appendChild(p);
  }
  for (const [cx, cy, r] of circles ?? []) {
    const c = document.createElementNS(NS, "circle");
    c.setAttribute("cx", String(cx));
    c.setAttribute("cy", String(cy));
    c.setAttribute("r", String(r));
    svg.appendChild(c);
  }
  return svg;
}

function filledRectIcon(): SVGSVGElement {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", "18");
  svg.setAttribute("height", "18");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "currentColor");
  svg.setAttribute("stroke", "none");
  const rect = document.createElementNS(NS, "rect");
  rect.setAttribute("x", "3");
  rect.setAttribute("y", "3");
  rect.setAttribute("width", "18");
  rect.setAttribute("height", "18");
  rect.setAttribute("rx", "2");
  svg.appendChild(rect);
  return svg;
}

export const TOOL_ICONS: Record<Tool | "undo" | "close", () => SVGSVGElement> = {
  arrow: () => icon(["M7 17L17 7", "M8 7h9v9"]),
  rect: filledRectIcon,
  "rect-outline": () => icon(["M4 4h16v16H4z"]),
  pen: () => icon(["M12 19l7-7 3 3-7 7-3-3z", "M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z", "M2 2l7.586 7.586"]),
  comment: () => icon(["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"]),
  undo: () => icon(["M2.5 8a9.5 9.5 0 1 1 0 8", "M2.5 2v6h6"]),
  close: () => icon(["M18 6L6 18", "M6 6l12 12"]),
};
