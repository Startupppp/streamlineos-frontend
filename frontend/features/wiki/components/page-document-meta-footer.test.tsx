import { render, screen } from "@testing-library/react";
import { PageDocumentMetaFooter } from "./page-document-meta-footer";

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembersByIds: jest.fn(() => ({ data: undefined })),
}));

jest.mock("@/lib/design-tokens", () => ({
  statusToneClasses: jest.fn(() => ({ surface: "bg-muted", ink: "text-foreground" })),
}));

const { useOrgMembersByIds } = jest.requireMock("@/hooks/api/organization") as {
  useOrgMembersByIds: jest.Mock;
};

const BASE_PROPS = {
  status: "published" as const,
  trustState: "verified" as const,
  visibility: "org" as const,
  nextReviewAt: null,
  updatedAt: "2026-09-25T10:00:00.000Z",
  lastEditedById: null,
  ownerUserId: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  useOrgMembersByIds.mockReturnValue({ data: undefined });
});

describe("PageDocumentMetaFooter — status fact visible so a future deletion fails instead of going quiet", () => {
  it("shows Published badge for a published page", () => {
    render(<PageDocumentMetaFooter {...BASE_PROPS} status="published" />);
    expect(screen.getByText("Published")).toBeInTheDocument();
  });

  it("shows Draft badge for a draft page", () => {
    render(<PageDocumentMetaFooter {...BASE_PROPS} status="draft" />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("shows In review badge for an in-review page", () => {
    render(<PageDocumentMetaFooter {...BASE_PROPS} status="in_review" />);
    expect(screen.getByText("In review")).toBeInTheDocument();
  });

  it("shows Archived badge for an archived page", () => {
    render(<PageDocumentMetaFooter {...BASE_PROPS} status="archived" />);
    expect(screen.getByText("Archived")).toBeInTheDocument();
  });
});

describe("PageDocumentMetaFooter — trustState fact visible so a future deletion fails instead of going quiet", () => {
  it("shows Verified badge when trust state is verified", () => {
    render(<PageDocumentMetaFooter {...BASE_PROPS} trustState="verified" />);
    expect(screen.getByText("Verified")).toBeInTheDocument();
  });

  it("shows Unverified badge when trust state is unverified", () => {
    render(<PageDocumentMetaFooter {...BASE_PROPS} trustState="unverified" />);
    expect(screen.getByText("Unverified")).toBeInTheDocument();
  });

  it("shows Expired badge when trust state is verification_expired", () => {
    render(<PageDocumentMetaFooter {...BASE_PROPS} trustState="verification_expired" />);
    expect(screen.getByText("Expired")).toBeInTheDocument();
  });
});

describe("PageDocumentMetaFooter — visibility fact visible so a future deletion fails instead of going quiet", () => {
  it("shows Private badge for private visibility", () => {
    render(<PageDocumentMetaFooter {...BASE_PROPS} visibility="private" />);
    expect(screen.getByText("Private")).toBeInTheDocument();
  });

  it("shows Team badge for org visibility", () => {
    render(<PageDocumentMetaFooter {...BASE_PROPS} visibility="org" />);
    expect(screen.getByText("Team")).toBeInTheDocument();
  });

  it("shows Public badge for public visibility", () => {
    render(<PageDocumentMetaFooter {...BASE_PROPS} visibility="public" />);
    expect(screen.getByText("Public")).toBeInTheDocument();
  });
});

describe("PageDocumentMetaFooter — nextReviewAt fact visible so a future deletion fails instead of going quiet", () => {
  it("shows review due text when nextReviewAt is set", () => {
    render(
      <PageDocumentMetaFooter
        {...BASE_PROPS}
        nextReviewAt="2026-10-25T00:00:00.000Z"
      />,
    );
    expect(screen.getByText(/review/i)).toBeInTheDocument();
  });

  it("does not show review due text when nextReviewAt is null", () => {
    render(<PageDocumentMetaFooter {...BASE_PROPS} nextReviewAt={null} />);
    expect(screen.queryByText(/review due/i)).not.toBeInTheDocument();
  });
});

describe("PageDocumentMetaFooter — updatedAt fact visible so a future deletion fails instead of going quiet", () => {
  it("shows an updated time for the page", () => {
    render(<PageDocumentMetaFooter {...BASE_PROPS} updatedAt="2026-09-25T10:00:00.000Z" />);
    expect(screen.getByText(/updated/i)).toBeInTheDocument();
  });

  it("shows the editor name when lastEditedById resolves to a member", () => {
    useOrgMembersByIds.mockReturnValue({
      data: {
        data: [{ id: "user-alice", userId: "user-alice", name: "Alice Smith", email: "alice@co.com" }],
        pagination: { limit: 50, hasMore: false, nextCursor: null },
      },
    });

    render(
      <PageDocumentMetaFooter
        {...BASE_PROPS}
        lastEditedById="user-alice"
      />,
    );

    expect(screen.getByText(/Alice Smith/)).toBeInTheDocument();
  });
});

describe("PageDocumentMetaFooter — owner fact visible so a future deletion fails instead of going quiet", () => {
  it("shows owner display name when ownerUserId resolves to a member", () => {
    useOrgMembersByIds.mockReturnValue({
      data: {
        data: [{ id: "user-bob", userId: "user-bob", name: "Bob Jones", email: "bob@co.com" }],
        pagination: { limit: 50, hasMore: false, nextCursor: null },
      },
    });

    render(
      <PageDocumentMetaFooter
        {...BASE_PROPS}
        ownerUserId="user-bob"
      />,
    );

    expect(screen.getByText(/Bob Jones/)).toBeInTheDocument();
  });

  it("shows no owner section when ownerUserId is null", () => {
    render(<PageDocumentMetaFooter {...BASE_PROPS} ownerUserId={null} />);
    expect(screen.queryByText(/owner/i)).not.toBeInTheDocument();
  });
});
