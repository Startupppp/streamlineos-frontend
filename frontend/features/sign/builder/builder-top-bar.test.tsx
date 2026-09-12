import type { ReactNode } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { SignEnvelope, SignEnvelopeStatus, SignRecipient } from "@/types/sign";
import { BuilderTopBar } from "./builder-top-bar";

const grantedKeys = new Set<string>();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => grantedKeys.has(key),
}));

const idleMutation = { mutateAsync: jest.fn(), mutate: jest.fn(), isPending: false };

jest.mock("@/hooks/api/sign/envelopes", () => ({
  useValidateSignEnvelope: () => idleMutation,
  useSendSignEnvelope: () => idleMutation,
  useResendSignEnvelope: () => idleMutation,
  useSendSignEnvelopeReminder: () => idleMutation,
  useVoidSignEnvelope: () => idleMutation,
  useDownloadSignEnvelopeFinalPdf: () => idleMutation,
  useDownloadSignEnvelopeCertificate: () => idleMutation,
  useCorrectSignEnvelope: () => idleMutation,
  useExtendSignEnvelopeExpiration: () => idleMutation,
}));

jest.mock("@/hooks/api/sign/templates", () => ({
  useSaveEnvelopeAsTemplate: () => idleMutation,
}));

jest.mock("./envelope-ai-menu", () => ({
  EnvelopeAiMenu: () => <div data-testid="envelope-ai-menu" />,
}));

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
  SheetContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  SheetDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  SheetBody: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const certificateJson = {
  certificateNumber: "SGN-42-9A7C1B2D",
  tenantName: "Acme Pvt Ltd",
  envelopeTitle: "Vendor Agreement",
  senderName: "Priya Raman",
  senderEmail: "priya@acme.test",
  finalPdfHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  watermarked: false,
  completedAt: "2026-03-04T09:15:00.000Z",
  documents: [{ fileName: "agreement.pdf", sha256Hash: "aa11bb22cc33", pageCount: 4 }],
  recipients: [
    {
      name: "Sam Iyer",
      email: "sam@vendor.test",
      role: "signer",
      authMethod: "otp_email",
      completedAt: "2026-03-04T09:14:00.000Z",
    },
  ],
  events: [],
};

jest.mock("@/hooks/api/sign/certificates", () => ({
  useSignEnvelopeCertificate: (envelopeId: number | undefined) => ({
    data:
      envelopeId === undefined
        ? undefined
        : {
            url: "https://files.test/certificate.pdf",
            expiresInSeconds: 900,
            certificate: {
              id: 1,
              orgId: "org-1",
              envelopeId: 42,
              certificateNumber: "SGN-42-9A7C1B2D",
              certificateFileKey: "k1",
              finalPdfFileKey: "k2",
              finalPdfHash: certificateJson.finalPdfHash,
              watermarked: false,
              generatedAt: "2026-03-04T09:15:00.000Z",
              certificateJson,
            },
          },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useRegenerateSignCertificate: () => idleMutation,
}));

function makeEnvelope(status: SignEnvelopeStatus, expiresAt: string | null = null): SignEnvelope {
  return {
    id: 42,
    orgId: "org-1",
    title: "Vendor Agreement",
    subject: null,
    message: null,
    status,
    routingMode: "parallel",
    ccTiming: "on_send",
    allowDecline: true,
    sourceModule: null,
    sourceEntityType: null,
    sourceEntityId: null,
    templateId: null,
    watermarkPolicyId: null,
    senderMembershipId: 7,
    reminderEnabled: false,
    reminderFirstAfterDays: 3,
    reminderRepeatDays: 3,
    reminderMaxCount: 3,
    reminderSentCount: 0,
    lastReminderAt: null,
    expiresAt,
    sentAt: null,
    completedAt: null,
    voidedAt: null,
    voidedByMembershipId: null,
    voidReason: null,
    declinedAt: null,
    correctionRequiredAt: null,
    correctionReason: null,
    finalizationKey: null,
    finalizedAt: null,
    finalPdfFileKey: null,
    finalPdfHash: null,
    publicFormId: null,
    metadataJson: {},
    createdAt: "2026-03-01T09:00:00.000Z",
    updatedAt: "2026-03-04T09:15:00.000Z",
  };
}

function makeRecipient(id: number, name: string, status: SignRecipient["status"]): SignRecipient {
  return {
    id,
    orgId: "org-1",
    envelopeId: 42,
    roleName: "Signer",
    recipientType: "signer",
    name,
    email: `${name.toLowerCase().replace(/\s/g, ".")}@vendor.test`,
    phone: null,
    userMembershipId: null,
    routingOrder: id,
    status,
    authMethod: "email_link",
    otpExpiresAt: null,
    otpAttempts: 0,
    failedAuthAttempts: 0,
    authLockedUntil: null,
    tokenExpiresAt: null,
    tokenRevokedAt: null,
    consentAcceptedAt: null,
    consentIp: null,
    consentUserAgent: null,
    consentDisclosureVersion: null,
    delegatedToRecipientId: null,
    viewedAt: null,
    authenticatedAt: null,
    completedAt: status === "completed" ? "2026-03-04T09:14:00.000Z" : null,
    declinedAt: null,
    declinedReason: null,
    bouncedAt: null,
    createdAt: "2026-03-01T09:00:00.000Z",
    updatedAt: "2026-03-04T09:15:00.000Z",
  };
}

const RECIPIENTS: SignRecipient[] = [
  makeRecipient(1, "Sam Iyer", "invited"),
  makeRecipient(2, "Dana Khan", "completed"),
];

function renderTopBar(
  status: SignEnvelopeStatus,
  options?: { recipients?: SignRecipient[]; expiresAt?: string | null },
) {
  return render(
    <TooltipProvider>
      <BuilderTopBar
        envelope={makeEnvelope(status, options?.expiresAt ?? null)}
        recipients={options?.recipients ?? RECIPIENTS}
        onShowAudit={jest.fn()}
      />
    </TooltipProvider>,
  );
}

describe("BuilderTopBar certificate control", () => {
  beforeEach(() => {
    grantedKeys.clear();
  });

  it("reaches the certificate sheet from the envelope's own action menu", () => {
    grantedKeys.add("sign:certificate:download");
    renderTopBar("completed");

    const control = screen.getByRole("button", { name: /Certificate of completion/ });
    expect(control).toBeEnabled();

    fireEvent.click(control);

    expect(screen.getByText("SGN-42-9A7C1B2D")).toBeInTheDocument();
    expect(screen.getByText(certificateJson.finalPdfHash)).toBeInTheDocument();
    expect(screen.getByText(/not a\s+digital signature issued by a certifying authority/)).toBeInTheDocument();
  });

  it("keeps the control visible but disabled, with its reason, before the envelope completes", () => {
    grantedKeys.add("sign:certificate:download");
    renderTopBar("sent");

    expect(screen.getByRole("button", { name: /Certificate of completion/ })).toBeDisabled();
    expect(screen.getByText("Issued once every signer has completed")).toBeInTheDocument();
  });

  it("hides the certificate control from a role without the download permission", () => {
    renderTopBar("completed");

    expect(screen.queryByRole("button", { name: /Certificate of completion/ })).not.toBeInTheDocument();
  });
});

describe("BuilderTopBar correction control", () => {
  beforeEach(() => {
    grantedKeys.clear();
  });

  it("reaches the correction sheet from the envelope's own action menu once it has been sent", () => {
    grantedKeys.add("sign:envelope:correct");
    renderTopBar("sent");

    const control = screen.getByRole("button", { name: /Correct recipients/ });
    expect(control).toBeEnabled();

    fireEvent.click(control);

    expect(screen.getByText("Correct this envelope")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Sam Iyer")).toBeInTheDocument();
  });

  it("lists a completed recipient as locked rather than offering fields the backend refuses", () => {
    grantedKeys.add("sign:envelope:correct");
    renderTopBar("partially_completed");

    fireEvent.click(screen.getByRole("button", { name: /Correct recipients/ }));

    expect(screen.queryByDisplayValue("Dana Khan")).not.toBeInTheDocument();
    expect(screen.getByText(/Dana Khan/)).toBeInTheDocument();
    expect(screen.getByText(/A completed recipient cannot be modified/)).toBeInTheDocument();
  });

  it("keeps the control visible but disabled on a terminal envelope, with the reason", () => {
    grantedKeys.add("sign:envelope:correct");
    renderTopBar("voided");

    expect(screen.getByRole("button", { name: /Correct recipients/ })).toBeDisabled();
    expect(screen.getByText("Completed and voided envelopes cannot be corrected")).toBeInTheDocument();
  });

  it("says a draft is edited directly rather than corrected", () => {
    grantedKeys.add("sign:envelope:correct");
    renderTopBar("draft");

    expect(screen.getByRole("button", { name: /Correct recipients/ })).toBeDisabled();
    expect(screen.getByText("Draft envelopes are edited directly, not corrected")).toBeInTheDocument();
  });

  it("hides the correction control from a role without the correct permission", () => {
    renderTopBar("sent");

    expect(screen.queryByRole("button", { name: /Correct recipients/ })).not.toBeInTheDocument();
  });
});

describe("BuilderTopBar expiry control", () => {
  beforeEach(() => {
    grantedKeys.clear();
  });

  it("reaches the extend-expiry picker from the envelope's own expiry chip", () => {
    grantedKeys.add("sign:envelope:correct");
    renderTopBar("sent", { expiresAt: "2026-03-20T18:29:59.999Z" });

    const chip = screen.getByRole("button", { name: /Expires/ });
    fireEvent.click(chip);

    expect(screen.getByRole("button", { name: "Extend expiry" })).toBeInTheDocument();
    expect(screen.getByText(/Everyone who has not finished gets the new deadline/)).toBeInTheDocument();
  });

  it("renders the expiry read-only, with no picker, once the envelope is completed", () => {
    grantedKeys.add("sign:envelope:correct");
    renderTopBar("completed", { expiresAt: "2026-03-20T18:29:59.999Z" });

    expect(screen.queryByRole("button", { name: /Expires/ })).not.toBeInTheDocument();
    expect(screen.getByText(/^Expires \d{1,2} Mar 2026$/)).toBeInTheDocument();
  });

  it("hides the picker from a role without the correct permission", () => {
    renderTopBar("sent", { expiresAt: "2026-03-20T18:29:59.999Z" });

    expect(screen.queryByRole("button", { name: /Expires/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Expires/)).toBeInTheDocument();
  });
});

describe("BuilderTopBar void control", () => {
  beforeEach(() => {
    grantedKeys.clear();
    idleMutation.mutate.mockClear();
  });

  it("asks for a reason in a sheet and sends it with the void, never a browser prompt", () => {
    grantedKeys.add("sign:envelope:void");
    renderTopBar("sent");

    fireEvent.click(screen.getByRole("button", { name: /Void envelope/ }));

    expect(screen.getByText("Void this envelope?")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Why this envelope is being voided"), {
      target: { value: "Signed on paper instead" },
    });
    const confirm = screen.getAllByRole("button", { name: "Void envelope" }).at(-1);
    fireEvent.click(confirm as HTMLElement);

    expect(idleMutation.mutate).toHaveBeenCalledWith("Signed on paper instead", expect.anything());
  });

  it("refuses to void without a reason", () => {
    grantedKeys.add("sign:envelope:void");
    renderTopBar("sent");

    fireEvent.click(screen.getByRole("button", { name: /Void envelope/ }));
    const confirm = screen.getAllByRole("button", { name: "Void envelope" }).at(-1);
    fireEvent.click(confirm as HTMLElement);

    expect(confirm).toBeDisabled();
    expect(idleMutation.mutate).not.toHaveBeenCalled();
  });

  it("hides the void control from a role without the void permission", () => {
    renderTopBar("sent");

    expect(screen.queryByRole("button", { name: /Void envelope/ })).not.toBeInTheDocument();
  });

  it("hides send, reminder and save-as-template from roles without their keys", () => {
    renderTopBar("draft");
    expect(screen.queryByRole("button", { name: /^Send$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Save as template/ })).not.toBeInTheDocument();

    grantedKeys.add("sign:envelope:send");
    grantedKeys.add("sign:template:manage");
    renderTopBar("draft");
    expect(screen.getByRole("button", { name: /^Send$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save as template/ })).toBeInTheDocument();
  });
});
