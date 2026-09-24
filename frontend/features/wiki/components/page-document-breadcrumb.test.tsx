import { render, screen } from "@testing-library/react";
import { PageDocumentBreadcrumb } from "./page-document-breadcrumb";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/",
}));

function makePage(overrides: Partial<KbPageDetail> = {}): KbPageDetail {
  return {
    id: 42,
    title: "Current Page",
    icon: null,
    coverImage: null,
    status: "published",
    trustState: "verified",
    visibility: "org",
    isFavorite: false,
    canEdit: true,
    isLocked: false,
    ancestors: [],
    contentRevision: 1,
    nextReviewAt: null,
    parentPageId: null,
    projectId: null,
    publicToken: null,
    spaceId: null,
    ...overrides,
  } as KbPageDetail;
}

describe("PageDocumentBreadcrumb — global wiki context", () => {
  it("shows Wiki linking to /knowledge/wiki when no projectId", () => {
    render(
      <PageDocumentBreadcrumb
        page={makePage()}
        saveState="idle"
      />,
    );

    const wikiLink = screen.getByRole("link", { name: "Wiki" });
    expect(wikiLink).toHaveAttribute("href", "/knowledge/wiki");
    expect(screen.queryByRole("link", { name: "Project" })).toBeNull();
  });

  it("renders ancestor links with global page hrefs", () => {
    render(
      <PageDocumentBreadcrumb
        page={makePage({ ancestors: [{ id: 10, title: "Parent" }] })}
        saveState="idle"
      />,
    );

    const ancestorLink = screen.getByRole("link", { name: "Parent" });
    expect(ancestorLink).toHaveAttribute("href", "/knowledge/wiki/doc/10");
  });
});

describe("PageDocumentBreadcrumb — project wiki context", () => {
  it("shows Project → Wiki breadcrumb when projectId is provided", () => {
    render(
      <PageDocumentBreadcrumb
        page={makePage()}
        saveState="idle"
        projectId={7}
      />,
    );

    expect(screen.getByRole("link", { name: "Project" })).toHaveAttribute(
      "href",
      "/build/7",
    );
    expect(screen.getByRole("link", { name: "Wiki" })).toHaveAttribute(
      "href",
      "/build/7/wiki",
    );
  });

  it("renders ancestor links with project-scoped hrefs", () => {
    render(
      <PageDocumentBreadcrumb
        page={makePage({ ancestors: [{ id: 10, title: "Parent" }] })}
        saveState="idle"
        projectId={7}
      />,
    );

    const ancestorLink = screen.getByRole("link", { name: "Parent" });
    expect(ancestorLink).toHaveAttribute("href", "/build/7/wiki/10");
  });

  it("shows saving indicator when saveState is saving", () => {
    render(
      <PageDocumentBreadcrumb
        page={makePage()}
        saveState="saving"
        projectId={7}
      />,
    );

    expect(screen.getByText("Saving…")).toBeInTheDocument();
  });
});
