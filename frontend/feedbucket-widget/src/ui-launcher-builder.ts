import { svgIcon, type IconSpec } from "./ui-icon-util";
import { LOGO_SVG } from "./logo";

export interface LauncherCallbacks {
  onScreenshot(): void;
  onRecord(): void;
  onComment(): void;
  onHoverEnter(): void;
  onHoverLeave(): void;
}

export interface LauncherRefs {
  launcher: HTMLDivElement;
  logo: HTMLDivElement;
}

function buildLogoMark(): Element {
  const parsed = new DOMParser().parseFromString(LOGO_SVG, "image/svg+xml").documentElement;
  const node = document.importNode(parsed, true);
  if (node instanceof Element) {
    node.setAttribute("width", "24");
    node.setAttribute("height", "24");
    node.classList.add("logo-mark");
    return node;
  }
  return document.createElement("span");
}

function launcherButton(
  label: string,
  handler: () => void,
  iconSpec: IconSpec,
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = "launcher-btn";
  btn.type = "button";
  btn.setAttribute("aria-label", label);
  btn.title = label;
  btn.appendChild(svgIcon(iconSpec));
  btn.addEventListener("click", handler);
  return btn;
}

export function buildLauncher(callbacks: LauncherCallbacks): LauncherRefs {
  const launcher = document.createElement("div");
  launcher.className = "launcher";
  launcher.setAttribute("role", "toolbar");
  launcher.setAttribute("aria-label", "Feedback");

  const logo = document.createElement("div");
  logo.className = "launcher-logo";
  logo.title = "Drag to move";
  logo.setAttribute("role", "img");
  logo.setAttribute("aria-label", "Feedbucket");
  logo.appendChild(buildLogoMark());
  const gripOverlay = svgIcon({
    size: 16,
    circles: [
      [9, 6, 1],
      [15, 6, 1],
      [9, 12, 1],
      [15, 12, 1],
      [9, 18, 1],
      [15, 18, 1],
    ],
  });
  gripOverlay.classList.add("grip-overlay");
  logo.appendChild(gripOverlay);
  launcher.appendChild(logo);

  const divider = document.createElement("div");
  divider.className = "launcher-divider";
  launcher.appendChild(divider);

  const screenshotBtn = launcherButton(
    "Screenshot & annotate",
    callbacks.onScreenshot,
    {
      paths: [
        "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z",
      ],
      circles: [[12, 13, 4]],
      stroke: true,
    },
  );
  screenshotBtn.addEventListener("pointerenter", callbacks.onHoverEnter);
  screenshotBtn.addEventListener("pointerleave", callbacks.onHoverLeave);
  launcher.appendChild(screenshotBtn);

  launcher.appendChild(
    launcherButton("Record screen", callbacks.onRecord, {
      paths: [
        "M23 7l-7 5 7 5V7z",
        "M14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z",
      ],
      stroke: true,
    }),
  );
  launcher.appendChild(
    launcherButton("Send feedback", callbacks.onComment, {
      paths: [
        "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
      ],
      stroke: true,
    }),
  );

  return { launcher, logo };
}
