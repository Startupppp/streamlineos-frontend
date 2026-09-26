import { render, screen } from "@testing-library/react";
import { TemplateCard } from "./template-cards";
import type { KbPageTemplate } from "@/hooks/api/kb/page-templates";

jest.mock("@/hooks/api/kb", () => ({
  useDeleteKbPageTemplate: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("./edit-template-dialog", () => ({
  EditTemplateDialog: () => null,
}));

function makeTemplate(over: Partial<KbPageTemplate> = {}): KbPageTemplate {
  return {
    id: 1,
    orgId: "org-1",
    name: "Runbook",
    icon: null,
    description: null,
    content: null,
    createdById: "u-1",
    createdByName: "Ada Lovelace",
    useCount: 0,
    lastUsedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

function renderCard(template: KbPageTemplate) {
  render(
    <TemplateCard
      template={template}
      canDelete={false}
      onUse={jest.fn()}
      isPending={false}
      isDisabled={false}
    />,
  );
}

describe("TemplateCard usage metadata", () => {
  it("shows how many times a saved template has been used", () => {
    renderCard(makeTemplate({ useCount: 7 }));

    expect(screen.getByText(/7 uses/i)).toBeInTheDocument();
  });

  it("singularises a template used exactly once", () => {
    renderCard(makeTemplate({ useCount: 1 }));

    expect(screen.getByText(/1 use\b/i)).toBeInTheDocument();
  });

  it("shows when the template was last used", () => {
    renderCard(
      makeTemplate({ useCount: 3, lastUsedAt: "2026-01-02T00:00:00.000Z" }),
    );

    expect(screen.getByText(/last used/i)).toBeInTheDocument();
  });

  it("says never used rather than showing a blank slot for an unused template", () => {
    renderCard(makeTemplate({ useCount: 0, lastUsedAt: null }));

    expect(screen.getByText(/never used/i)).toBeInTheDocument();
    expect(screen.queryByText(/last used/i)).not.toBeInTheDocument();
  });
});
