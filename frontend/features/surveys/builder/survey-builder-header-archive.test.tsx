import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SurveyForm } from "@/hooks/api/surveys/forms";
import { SurveyBuilderHeader } from "./survey-builder-header";

const archiveMutate = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("@/hooks/api/surveys/live-session", () => ({
  useCreateLiveSession: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));
jest.mock("@/hooks/api/surveys/forms", () => {
  const idle = () => ({ mutateAsync: jest.fn(), isPending: false });
  return {
    usePublishSurvey: idle,
    usePauseSurvey: idle,
    useCloseSurvey: idle,
    useDuplicateSurvey: idle,
    useArchiveSurvey: () => ({ mutateAsync: archiveMutate, isPending: false }),
  };
});

function survey(status: SurveyForm["status"]): SurveyForm {
  return {
    id: 7,
    orgId: "org-1",
    title: "QA-TEST-SURVEY",
    description: null,
    mode: "survey",
    status,
    ownerUserId: "u1",
    defaultLanguage: "en",
    activeVersionId: null,
    settings: {},
    branding: {},
    createdBy: "u1",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    archivedAt: null,
  };
}

beforeEach(() => archiveMutate.mockReset().mockResolvedValue({}));

describe("archiving a survey from the builder", () => {
  it("asks for confirmation first, and archives only after it is given", async () => {
    const user = userEvent.setup();
    render(<SurveyBuilderHeader survey={survey("published")} />);

    await user.click(screen.getByRole("button", { name: "Survey actions" }));
    await user.click(await screen.findByRole("menuitem", { name: /archive/i }));

    expect(await screen.findByRole("alertdialog", { name: "Archive this survey?" })).toBeInTheDocument();
    expect(archiveMutate).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Archive survey" }));
    await waitFor(() => expect(archiveMutate).toHaveBeenCalledWith(7));
  });

  it("does not offer Archive for a survey that is already archived", async () => {
    const user = userEvent.setup();
    render(<SurveyBuilderHeader survey={survey("archived")} />);

    await user.click(screen.getByRole("button", { name: "Survey actions" }));
    await screen.findByRole("menuitem", { name: /duplicate/i });
    expect(screen.queryByRole("menuitem", { name: /archive/i })).not.toBeInTheDocument();
  });
});
