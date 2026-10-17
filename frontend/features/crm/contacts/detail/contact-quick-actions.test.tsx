import { fireEvent, render, screen } from "@testing-library/react";
import { ContactQuickActions } from "./contact-quick-actions";
import { downloadBlob } from "@/lib/download-blob";
import type { Contact } from "@/types/crm";

const mockMutate = jest.fn();

jest.mock("@/hooks/api/crm/contacts", () => ({
  useDownloadContactVcard: () => ({ mutate: mockMutate, isPending: false }),
}));
jest.mock("@/lib/download-blob", () => ({ downloadBlob: jest.fn() }));
jest.mock("@/features/crm/shared/messaging-panel", () => ({ MessagingPanel: () => null }));
jest.mock("@/features/crm/shared/ai-assistant-panel", () => ({ AiAssistantPanel: () => null }));

describe("ContactQuickActions vCard", () => {
  it("downloads the contact's vCard under their name", () => {
    const blob = new Blob(["BEGIN:VCARD"]);
    mockMutate.mockImplementation((_id: number, opts: { onSuccess: (b: Blob) => void }) => opts.onSuccess(blob));
    const contact = { id: 41, name: "Ana Rao", phone: null } as unknown as Contact;
    render(<ContactQuickActions contact={contact} onSendEmail={jest.fn()} onLogCall={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /download vcard/i }));

    expect(mockMutate).toHaveBeenCalledWith(41, expect.any(Object));
    expect(downloadBlob).toHaveBeenCalledWith(blob, "Ana Rao.vcf");
  });
});
