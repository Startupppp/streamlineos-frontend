import { render, screen } from "@testing-library/react";
import type { Module } from "@/types/projects/projects";
import { ModuleCard } from "./module-card";

const moduleRecord: Module = {
  id: 17,
  projectId: 42,
  orgId: "org-1",
  name: "Payments",
  description: null,
  status: "in-progress",
  leadId: null,
  startDate: null,
  endDate: null,
  createdBy: "user-1",
  createdAt: null,
  updatedAt: null,
};

it("opens the module as an Issues filter", () => {
  render(<ModuleCard module={moduleRecord} projectId={42} />);

  expect(screen.getByRole("link")).toHaveAttribute(
    "href",
    "/build/42/issues?module=17",
  );
});
