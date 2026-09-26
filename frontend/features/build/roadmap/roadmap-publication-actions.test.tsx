import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { useCan } from "@/hooks/api/access";
import {
  usePublishRoadmap,
  useRoadmapPublication,
} from "@/hooks/api/build/roadmap";
import { RoadmapPublicationActions } from "./roadmap-publication-actions";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
}));

jest.mock("@/hooks/api/build/roadmap", () => ({
  useRoadmapPublication: jest.fn(),
  usePublishRoadmap: jest.fn(),
}));

const mockUseCan = useCan as jest.MockedFunction<typeof useCan>;
const mockUsePublication = useRoadmapPublication as jest.MockedFunction<typeof useRoadmapPublication>;
const mockUsePublish = usePublishRoadmap as jest.MockedFunction<typeof usePublishRoadmap>;

const ORG_ID = "org_live_9812";
const TOKEN = "rm_9fK2xQ7vBnL4tR8sW1yZ3aC6";

const publishMutation = { mutate: jest.fn(), isPending: false };

function setup(
  publication: { token: string | null; path: string | null } | undefined,
  options?: { isPending?: boolean; canManage?: boolean },
) {
  mockUseCan.mockReturnValue(options?.canManage ?? true);
  mockUsePublication.mockReturnValue({
    data: publication,
    isPending: options?.isPending ?? false,
  } as unknown as ReturnType<typeof useRoadmapPublication>);
  mockUsePublish.mockReturnValue(
    publishMutation as unknown as ReturnType<typeof usePublishRoadmap>,
  );
  return render(<RoadmapPublicationActions />);
}

beforeEach(() => {
  publishMutation.mutate.mockClear();
});

describe("RoadmapPublicationActions — unpublished board", () => {
  it("offers to publish the board when the operator may manage the roadmap", () => {
    setup({ token: null, path: null }, { canManage: true });
    expect(screen.getByRole("button", { name: /publish board/i })).toBeInTheDocument();
  });

  it("offers nothing to an operator who may not manage the roadmap", () => {
    setup({ token: null, path: null }, { canManage: false });
    expect(screen.queryByRole("button", { name: /publish board/i })).not.toBeInTheDocument();
  });

  it("renders nothing while the publication state is still unknown", () => {
    const { container } = setup(undefined, { isPending: true });
    expect(container).toBeEmptyDOMElement();
  });
});

describe("RoadmapPublicationActions — published board", () => {
  it("links to the opaque publication path rather than an organization identifier", () => {
    setup({ token: TOKEN, path: `/roadmap/${TOKEN}` });
    const link = screen.getByRole("link", { name: /public board/i });
    expect(link).toHaveAttribute("href", `/roadmap/${TOKEN}`);
  });

  it("never renders the organization identifier alongside the public link", () => {
    const { container } = setup({ token: TOKEN, path: `/roadmap/${TOKEN}` });
    expect(container.innerHTML).not.toContain(ORG_ID);
  });

  it("copies the absolute public URL so the operator can paste it anywhere", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    setup({ token: TOKEN, path: `/roadmap/${TOKEN}` });
    await userEvent.click(screen.getByRole("button", { name: /copy the public roadmap link/i }));

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/roadmap/${TOKEN}`);
  });

  it("does not offer a publish control once the board is already published", () => {
    setup({ token: TOKEN, path: `/roadmap/${TOKEN}` });
    expect(screen.queryByRole("button", { name: /publish board/i })).not.toBeInTheDocument();
  });
});
