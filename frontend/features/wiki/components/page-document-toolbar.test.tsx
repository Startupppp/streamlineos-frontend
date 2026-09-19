import { render, screen } from "@testing-library/react";
import { PageDocumentToolbar } from "./page-document-toolbar";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/hooks/api/kb", () => ({
  useToggleFavoriteKbPage: () => ({ mutate: jest.fn() }),
  useDuplicateKbPage: () => ({ mutate: jest.fn() }),
  useLockKbPage: () => ({ mutate: jest.fn() }),
  useKbPageBacklinks: () => ({ data: [] }),
}));

jest.mock("./kb-page-ai-actions", () => ({
  KbPageAiActions: () => <button type="button" aria-label="AI" />,
}));

jest.mock("./page-share-popover", () => ({
  __esModule: true,
  default: () => <button type="button" aria-label="Share page" />,
}));

const page = {
  id: 5,
  title: "signos",
  isFavorite: false,
  isLocked: false,
  coverImage: null,
} as KbPageDetail;

function noop() {}

describe("PageDocumentToolbar", () => {
  it("renders AI, Share, and More as icon-only controls", () => {
    render(
      <PageDocumentToolbar
        page={page}
        pageId={5}
        isEditable
        onOpenMetaSheet={noop}
        onOpenComments={noop}
        onOpenHistory={noop}
        onOpenMove={noop}
        onOpenSaveAsTemplate={noop}
        onOpenCover={noop}
        onDelete={noop}
        onNavigate={noop}
      />,
    );

    expect(screen.getByRole("button", { name: "AI" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share page" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More options" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Page settings" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add cover" })).toBeNull();
  });

  it("shows cover as set in More when the page has a cover image", () => {
    render(
      <PageDocumentToolbar
        page={{ ...page, coverImage: "gradient:ocean", isFavorite: true }}
        pageId={5}
        isEditable
        onOpenMetaSheet={noop}
        onOpenComments={noop}
        onOpenHistory={noop}
        onOpenMove={noop}
        onOpenSaveAsTemplate={noop}
        onOpenCover={noop}
        onDelete={noop}
        onNavigate={noop}
      />,
    );

    expect(screen.getByRole("button", { name: "More options" })).toBeInTheDocument();
  });
});
