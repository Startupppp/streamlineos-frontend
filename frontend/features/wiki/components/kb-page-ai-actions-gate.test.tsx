import { render } from "@testing-library/react";
import { KbPageAiActions } from "./kb-page-ai-actions";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
}));

jest.mock("@/hooks/api/kb/page-ai", () => ({
  useKbPageSummarize: jest.fn(() => ({ mutateAsync: jest.fn() })),
  useKbPageAsk: jest.fn(() => ({ mutateAsync: jest.fn() })),
  useKbPageImprove: jest.fn(() => ({ mutateAsync: jest.fn() })),
  useKbPageSuggestRelated: jest.fn(() => ({ mutateAsync: jest.fn() })),
}));

const { useCan } = jest.requireMock<{ useCan: jest.Mock }>("@/hooks/api/access");

beforeEach(() => {
  useCan.mockReturnValue(false);
});

describe("KbPageAiActions — kb:ai:generate gate", () => {
  it("renders nothing when kb:ai:generate is not granted", () => {
    useCan.mockReturnValue(false);
    const { container } = render(<KbPageAiActions pageId={1} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the AI trigger when kb:ai:generate is granted", () => {
    useCan.mockReturnValue(true);
    const { container } = render(<KbPageAiActions pageId={1} />);
    expect(container.firstChild).not.toBeNull();
  });

  it("gates on kb:ai:generate specifically", () => {
    render(<KbPageAiActions pageId={1} />);
    expect(useCan).toHaveBeenCalledWith("kb:ai:generate");
  });
});
