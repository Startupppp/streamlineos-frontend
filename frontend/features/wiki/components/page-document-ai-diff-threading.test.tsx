import { render, screen } from "@testing-library/react";
import { PageDocumentToolbar } from "./page-document-toolbar";
import { KbPageImproveDiffDialog } from "./kb-page-improve-diff-dialog";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

jest.mock("@/hooks/api/kb", () => ({
  useToggleFavoriteKbPage: () => ({ mutate: jest.fn() }),
  useDuplicateKbPage: () => ({ mutate: jest.fn() }),
  useLockKbPage: () => ({ mutate: jest.fn() }),
  useKbPageBacklinks: () => ({ data: [] }),
}));

const receivedProps: { currentContent?: string }[] = [];
jest.mock("./kb-page-ai-actions", () => ({
  KbPageAiActions: (props: { currentContent?: string }) => {
    receivedProps.push(props);
    return <button type="button" aria-label="AI" />;
  },
}));

jest.mock("./page-share-popover", () => ({
  __esModule: true,
  default: () => <button type="button" aria-label="Share page" />,
}));

jest.mock("@/hooks/api/kb/export-page", () => ({
  useExportKbPage: () => ({ mutate: jest.fn() }),
}));

const page = {
  id: 5,
  title: "signos",
  isFavorite: false,
  isLocked: false,
  coverImage: null,
} as KbPageDetail;

function noop() {}

describe("improve diff wiring", () => {
  beforeEach(() => {
    receivedProps.length = 0;
  });

  it("toolbar forwards currentContent to KbPageAiActions so the diff is not inert", () => {
    render(
      <PageDocumentToolbar
        page={page}
        pageId={5}
        isEditable
        currentContent="the current page body"
        onApplyImprovement={noop}
        onInsertSummary={noop}
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

    expect(receivedProps[0]?.currentContent).toBe("the current page body");
  });

  it("renders added and removed lines when current content is supplied", () => {
    render(
      <KbPageImproveDiffDialog
        open
        currentContent={"keep me\ndrop me"}
        proposedText={"keep me\nbrand new"}
        onApply={noop}
        onDiscard={noop}
      />,
    );

    const diff = screen.getByRole("region", { name: /content diff/i });
    expect(diff).toHaveTextContent("drop me");
    expect(diff).toHaveTextContent("brand new");
    expect(diff).toHaveTextContent("keep me");
  });

  it("falls back to a plain preview when current content is absent", () => {
    render(
      <KbPageImproveDiffDialog
        open
        proposedText="proposed body"
        onApply={noop}
        onDiscard={noop}
      />,
    );

    expect(
      screen.queryByRole("region", { name: /content diff/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("proposed body")).toBeInTheDocument();
  });
});
