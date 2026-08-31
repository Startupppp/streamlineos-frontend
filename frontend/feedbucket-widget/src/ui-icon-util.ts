export const NS = "http://www.w3.org/2000/svg";
export const POSITION_KEY = "feedbucket:pos";

export type FeedbackType = "bug" | "idea" | "feature" | "question" | "other";
export type ViewState = "form" | "success" | "error";

export const FEEDBACK_TYPES: ReadonlyArray<{
  readonly value: FeedbackType;
  readonly label: string;
}> = [
  { value: "bug", label: "Bug" },
  { value: "idea", label: "Idea" },
  { value: "feature", label: "Feature" },
  { value: "question", label: "Question" },
  { value: "other", label: "Other" },
];

export interface IconSpec {
  readonly paths?: ReadonlyArray<string>;
  readonly circles?: ReadonlyArray<readonly [number, number, number]>;
  readonly stroke?: boolean;
  readonly size?: number;
}

export function svgIcon(spec: IconSpec): SVGSVGElement {
  const svg = document.createElementNS(NS, "svg");
  const size = spec.size ?? 20;
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  if (spec.stroke) {
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
  } else {
    svg.setAttribute("fill", "currentColor");
  }
  for (const d of spec.paths ?? []) {
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
  }
  for (const [cx, cy, r] of spec.circles ?? []) {
    const circle = document.createElementNS(NS, "circle");
    circle.setAttribute("cx", String(cx));
    circle.setAttribute("cy", String(cy));
    circle.setAttribute("r", String(r));
    svg.appendChild(circle);
  }
  return svg;
}
