import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { TemplateCard } from "./template-card";

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, variants: _variants, transition: _transition, ...props }: React.HTMLAttributes<HTMLDivElement> & { variants?: unknown; transition?: unknown }) => (
      <div {...props}>{children}</div>
    ),
  },
  useReducedMotion: () => true,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

const TEMPLATE = {
  id: 7,
  orgId: "org-1",
  name: "Product launch",
  description: "A reusable launch checklist",
  category: "MARKETING",
  createdBy: "user-1",
  deletedAt: null,
  createdAt: "2026-10-09T00:00:00.000Z",
  tickets: [],
};

it("hides mutation actions when the viewer cannot manage templates", () => {
  render(
    <TemplateCard
      template={TEMPLATE}
      canManage={false}
      onApply={jest.fn()}
      onDelete={jest.fn()}
    />,
  );

  expect(screen.queryByRole("button", { name: /use template/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /delete product launch template/i })).not.toBeInTheDocument();
});

it("keeps authorized card actions touch-sized and invokes the requested action", () => {
  const onApply = jest.fn();
  const onDelete = jest.fn();
  render(
    <TemplateCard
      template={TEMPLATE}
      canManage
      onApply={onApply}
      onDelete={onDelete}
    />,
  );

  const apply = screen.getByRole("button", { name: /use template/i });
  const remove = screen.getByRole("button", { name: /delete product launch template/i });
  expect(apply).toHaveClass("min-h-11");
  expect(remove).toHaveClass("min-h-11", "min-w-11");

  fireEvent.click(apply);
  fireEvent.click(remove);
  expect(onApply).toHaveBeenCalledWith(TEMPLATE);
  expect(onDelete).toHaveBeenCalledWith(TEMPLATE);
});

it("uses an article inside the owning list item instead of nesting list-item roles", () => {
  render(
    <div role="listitem">
      <TemplateCard
        template={TEMPLATE}
        canManage={false}
        onApply={jest.fn()}
        onDelete={jest.fn()}
      />
    </div>,
  );

  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  expect(screen.getByRole("article", { name: /product launch template/i })).toBeInTheDocument();
});
