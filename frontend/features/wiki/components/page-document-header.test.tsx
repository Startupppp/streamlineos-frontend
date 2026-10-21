import { fireEvent, render, screen } from "@testing-library/react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";
import PageDocumentHeader from "./page-document-header";

const mockCreateTemplate = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/hooks/api/kb", () => ({
  useDeleteKbPage: () => ({ mutate: jest.fn(), isPending: false }),
  useCreateKbPageTemplate: () => ({ mutate: mockCreateTemplate, isPending: false }),
}));
jest.mock("./page-comments-sheet", () => () => null);
jest.mock("./page-history-sheet", () => () => null);
jest.mock("./move-page-dialog", () => () => null);
jest.mock("./page-metadata-sheet", () => () => null);
jest.mock("./page-record-links", () => ({ PageRecordLinks: () => null }));
jest.mock("./page-document-breadcrumb", () => ({ PageDocumentBreadcrumb: () => null }));
jest.mock("./page-document-toolbar", () => ({
  PageDocumentToolbar: ({ onOpenSaveAsTemplate }: { onOpenSaveAsTemplate: () => void }) => (
    <button type="button" onClick={onOpenSaveAsTemplate}>
      Save as template
    </button>
  ),
}));

const page = { id: 1, title: "Runbook", kind: "document", parentPageId: null, content: null } as unknown as KbPageDetail;

function saveTemplate() {
  render(
    <PageDocumentHeader page={page} pageId={1} saveState="saved" isEditable onNavigate={jest.fn()} onOpenCover={jest.fn()} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Save as template" }));
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  return mockCreateTemplate.mock.calls[0]?.[1] as { onSuccess: () => void; onError: (error: unknown) => void };
}

beforeEach(() => jest.clearAllMocks());

describe("PageDocumentHeader — Save as template (KB-B-025)", () => {
  it("names the clash when a template with that name already exists", () => {
    const options = saveTemplate();

    options.onError(new ApiError("Template name already exists", 409, "CONFLICT"));

    expect(toast.error).toHaveBeenCalledWith('A template named "Runbook" already exists. Choose another name.');
  });

  it("shows the server's message for any other failure", () => {
    const options = saveTemplate();

    const error = new ApiError("Service unavailable", 503, "UNAVAILABLE");
    options.onError(error);

    expect(toast.error).toHaveBeenCalledWith(getErrorMessage(error));
    expect(toast.error).not.toHaveBeenCalledWith(expect.stringContaining("already exists"));
  });

  it("closes the dialog with a success toast when the template is saved", () => {
    const options = saveTemplate();

    options.onSuccess();

    expect(toast.success).toHaveBeenCalledWith("Template saved");
    expect(mockCreateTemplate).toHaveBeenCalledWith({ fromPageId: 1, name: "Runbook" }, expect.anything());
  });
});
