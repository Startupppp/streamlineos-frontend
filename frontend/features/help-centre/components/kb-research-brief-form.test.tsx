import { render, screen, fireEvent, act } from "@testing-library/react";
import { KbResearchBriefForm } from "./kb-research-brief-form";
import { useCreateResearchBrief } from "@/hooks/api/kb/research-briefs";
import { useKbSpaces } from "@/hooks/api/kb/spaces";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/hooks/api/kb/research-briefs", () => ({
  useCreateResearchBrief: jest.fn(),
}));

jest.mock("@/hooks/api/kb/spaces", () => ({
  useKbSpaces: jest.fn(),
}));

const useCreateResearchBriefMock = jest.mocked(useCreateResearchBrief);
const useKbSpacesMock = jest.mocked(useKbSpaces);

describe("KbResearchBriefForm — topic trim validation (FE-184)", () => {
  const mutateMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useCreateResearchBriefMock.mockReturnValue({
      mutate: mutateMock,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateResearchBrief>);
    useKbSpacesMock.mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useKbSpaces>);
  });

  it("calls the create mutation when the topic has meaningful content — positive control ensures the harness works", async () => {
    render(<KbResearchBriefForm basePath="/knowledge/research-briefs" />);

    const topicInput = screen.getByPlaceholderText(
      "e.g. How to configure SSO for enterprise customers",
    );
    fireEvent.change(topicInput, {
      target: { value: "Configure SSO for enterprise customers" },
    });

    const submitButton = screen.getByRole("button", { name: /generate brief/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(mutateMock).toHaveBeenCalledWith(
      { topic: "Configure SSO for enterprise customers", spaceId: undefined },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it("does not call the create mutation when the topic is whitespace-only — the backend trims before min(3) so three spaces become an empty string and the request is rejected 400, the frontend schema must pre-empt that with its own trim", async () => {
    render(<KbResearchBriefForm basePath="/knowledge/research-briefs" />);

    const topicInput = screen.getByPlaceholderText(
      "e.g. How to configure SSO for enterprise customers",
    );
    fireEvent.change(topicInput, { target: { value: "   " } });

    const submitButton = screen.getByRole("button", { name: /generate brief/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(mutateMock).not.toHaveBeenCalled();
  });
});
