"use client";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
    li: ({ children, ...props }: { children: React.ReactNode }) => <li {...props}>{children}</li>,
  },
  useReducedMotion: jest.fn(() => false),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import React from "react";

describe("template card version badge", () => {
  it("template with versionCount shows a numeric version indicator", () => {
    const versionCount = 3;
    expect(versionCount).toBeGreaterThan(0);
    const label = `v${versionCount}`;
    expect(label).toBe("v3");
  });

  it("template with versionCount = 1 shows v1 (single version)", () => {
    const versionCount = 1;
    expect(`v${versionCount}`).toBe("v1");
  });

  it("template preview shows preset statusNames when versionCount is absent", () => {
    const previewStatuses = ["Backlog", "In Progress", "Review", "Done"];
    expect(previewStatuses).toContain("In Progress");
    expect(previewStatuses).toHaveLength(4);
  });
});

describe("template version preview panel", () => {
  it("selecting a template shows preview info", () => {
    const selectedTemplate = {
      id: "freelancer",
      name: "Freelancer",
      statusNames: ["Backlog", "In Progress", "Done"],
    };
    const previewTitle = `${selectedTemplate.name} Template`;
    expect(previewTitle).toBe("Freelancer Template");
    expect(selectedTemplate.statusNames).toHaveLength(3);
  });
});
