"use client";

import type { ReactNode } from "react";
import { render } from "@testing-library/react";

jest.mock("@xyflow/react/dist/style.css", () => ({}), { virtual: true });

jest.mock("@xyflow/react", () => ({
  addEdge: jest.fn((edge, edges: unknown[]) => [...edges, edge]),
  Background: () => null,
  BackgroundVariant: { Dots: "dots" },
  Controls: () => null,
  MiniMap: () => null,
  Panel: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  ReactFlow: ({ children }: { children?: ReactNode }) => (
    <div data-testid="react-flow">{children}</div>
  ),
  useEdgesState: (init: unknown[]) => [init, jest.fn(), jest.fn()],
  useNodesState: (init: unknown[]) => [init, jest.fn(), jest.fn()],
  useReactFlow: () => ({
    screenToFlowPosition: (p: { x: number; y: number }) => p,
  }),
}));

jest.mock("../workflow-node-palette", () => ({
  isWorkflowNodeType: () => false,
  NODE_PALETTE_MAP: {},
}));

jest.mock("../workflow-flow-node", () => ({
  workflowNodeTypes: {},
}));

jest.mock("../workflow-node-config-panel", () => ({
  WorkflowNodeConfigPanel: () => null,
}));

import { WorkflowBuilderCanvasSurface } from "../workflow-builder-canvas-surface";

describe("WorkflowBuilderCanvasSurface", () => {
  it("drop-target wrapper carries flex-1 and h-full so ReactFlow ResizeObserver sees non-zero height", () => {
    const { container } = render(
      <WorkflowBuilderCanvasSurface
        initialNodes={[]}
        initialEdges={[]}
        onDefinitionChange={jest.fn()}
      />,
    );
    const outer = container.firstChild as HTMLElement;
    const dropTarget = outer.firstChild as HTMLElement;
    expect(dropTarget.className).toMatch(/\bflex-1\b/);
    expect(dropTarget.className).toMatch(/\bh-full\b/);
  });
});
