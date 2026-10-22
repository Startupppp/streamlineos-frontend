import fs from "node:fs";
import path from "node:path";
import React from "react";
import { render as rtlRender, screen, within } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { expectNoAxeViolations } from "@/test-utils/axe";
import { atViewport } from "@/test-utils/viewport";
import type { SkillsMatrixData } from "@/hooks/api/hr/employees";

const mockUseSkillsMatrix = jest.fn<unknown, unknown[]>();
const mockUseCan = jest.fn<boolean, unknown[]>(() => true);

jest.mock("@/hooks/api/use-page-state", () => {
  const { resolvePageState } = jest.requireActual<typeof import("@/lib/page-state/resolve-page-state")>(
    "@/lib/page-state/resolve-page-state",
  );
  return {
    usePageState: (options: Omit<Parameters<typeof resolvePageState>[0], "access">) =>
      resolvePageState({ ...options, access: "granted" }),
  };
});

jest.mock("@/hooks/api/hr", () => ({
  useSkillsMatrix: (...args: unknown[]) => mockUseSkillsMatrix(...args),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (...args: unknown[]) => mockUseCan(...args),
}));

import { SkillsMatrixPage } from "@/features/hr/employees/skills-matrix-page";

function render(ui: React.ReactElement) {
  return rtlRender(ui, { wrapper: TooltipProvider });
}

const MATRIX: SkillsMatrixData = {
  employees: [
    {
      userId: "user-1",
      name: "Asha Menon",
      image: null,
      skills: { "Communication skills": 2, "TypeScript": 5 },
    },
    {
      userId: "user-2",
      name: "Ravi Kumar",
      image: null,
      skills: { "TypeScript": 3 },
    },
  ],
  skills: ["Communication skills", "TypeScript"],
  pageInfo: { limit: 20, hasMore: false, nextCursor: null },
};

function loaded() {
  return {
    data: MATRIX,
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: jest.fn(),
  };
}

beforeEach(() => {
  mockUseCan.mockReturnValue(true);
  mockUseSkillsMatrix.mockReturnValue(loaded());
});

afterEach(() => jest.clearAllMocks());

describe("a11y — HR skills matrix table semantics", () => {
  it("passes axe at 375px mobile", async () => {
    const restore = atViewport("mobile");
    try {
      const { baseElement } = render(<SkillsMatrixPage />);
      await expectNoAxeViolations(baseElement);
    } finally {
      restore();
    }
  });

  it("passes axe at 768px tablet", async () => {
    const restore = atViewport("tablet");
    try {
      const { baseElement } = render(<SkillsMatrixPage />);
      await expectNoAxeViolations(baseElement);
    } finally {
      restore();
    }
  });

  it("passes axe at 1280px desktop", async () => {
    const restore = atViewport("desktop");
    try {
      const { baseElement } = render(<SkillsMatrixPage />);
      await expectNoAxeViolations(baseElement);
    } finally {
      restore();
    }
  });

  it("names the table with a caption", () => {
    const { container } = render(<SkillsMatrixPage />);
    const caption = container.querySelector("caption");
    expect(caption).not.toBeNull();
    expect(caption?.textContent ?? "").toMatch(/skills matrix/i);
  });

  it("gives every column header an explicit scope", () => {
    const { container } = render(<SkillsMatrixPage />);
    const headerCells = Array.from(
      container.querySelectorAll("thead th"),
    );
    expect(headerCells).toHaveLength(MATRIX.skills.length + 2);
    for (const cell of headerCells)
      expect(cell.getAttribute("scope")).toBe("col");
  });

  it("makes the employee cell a row header, not a plain data cell", () => {
    const { container } = render(<SkillsMatrixPage />);
    const rowHeaders = Array.from(container.querySelectorAll("tbody th"));
    expect(rowHeaders).toHaveLength(MATRIX.employees.length);
    for (const cell of rowHeaders)
      expect(cell.getAttribute("scope")).toBe("row");
    expect(rowHeaders[0]?.textContent).toContain("Asha Menon");
  });

  it("spells out a truncated column label to assistive technology", () => {
    render(<SkillsMatrixPage />);
    const header = screen.getByRole("columnheader", {
      name: "Communication skills",
    });
    expect(header).toBeInTheDocument();
  });

  it("announces a proficiency cell as skill plus named level, not a bare letter", () => {
    const { container } = render(<SkillsMatrixPage />);
    const firstRow = container.querySelectorAll("tbody tr")[0];
    expect(firstRow).toBeDefined();
    expect(within(firstRow as HTMLElement).getByText(
      "Communication skills: level 2, Elementary",
    )).toBeInTheDocument();
  });

  it("announces an unrecorded skill rather than a bare em dash", () => {
    const { container } = render(<SkillsMatrixPage />);
    const secondRow = container.querySelectorAll("tbody tr")[1];
    expect(secondRow).toBeDefined();
    expect(within(secondRow as HTMLElement).getByText(
      "Communication skills: not assessed",
    )).toBeInTheDocument();
  });
});

const HR_FEATURES = path.resolve(__dirname, "..", "hr");
const RECRUITMENT_FEATURES = path.resolve(__dirname, "..", "recruitment");

function tsxFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) tsxFiles(full, out);
    else if (entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

function sheetClassNames(): { file: string; line: number; className: string }[] {
  const found: { file: string; line: number; className: string }[] = [];
  for (const file of [...tsxFiles(HR_FEATURES), ...tsxFiles(RECRUITMENT_FEATURES)]) {
    const src = fs.readFileSync(file, "utf8");
    const re = /<SheetContent\b([\s\S]*?)>/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(src)) !== null) {
      const attrs = match[1] ?? "";
      const className = /className=(?:"([^"]*)"|\{`([^`]*)`\})/.exec(attrs);
      found.push({
        file: path.relative(HR_FEATURES, file).split(path.sep).join("/"),
        line: src.slice(0, match.index).split("\n").length,
        className: (className?.[1] ?? className?.[2] ?? "").replace(/\s+/g, " "),
      });
    }
  }
  return found;
}

const UNCONDITIONAL_PIXEL_WIDTH = /(^|\s)w-\[\d+(?:px|rem)\]/;

describe("responsive — HR sheets are not wider than a 375px viewport", () => {
  const sheets = sheetClassNames();

  it("scans the whole HR feature tree, not just the files that were fixed", () => {
    expect(tsxFiles(HR_FEATURES).length).toBeGreaterThan(400);
    expect(sheets.length).toBeGreaterThan(60);
  });

  it("no HR SheetContent pins an unconditional pixel width", () => {
    const offenders = sheets
      .filter((sheet) => UNCONDITIONAL_PIXEL_WIDTH.test(sheet.className))
      .map((sheet) => `${sheet.file}:${sheet.line} -> ${sheet.className}`);
    expect(offenders).toEqual([]);
  });

  it("the four repaired sheets cap their width behind the sm: breakpoint", () => {
    const repaired = [
      "goals/create-goal-sheet.tsx",
      "kpis/kpi-library-tab.tsx",
      "kpis/competency-frameworks-tab.tsx",
      "feedback/cycles-tab.tsx",
    ];
    for (const file of repaired) {
      const sheet = sheets.find((candidate) => candidate.file === file);
      expect(sheet).toBeDefined();
      expect(sheet?.className).toMatch(/(^|\s)w-full(\s|$)/);
      expect(sheet?.className).toMatch(/sm:max-w-\[\d+px\]/);
    }
  });
});
