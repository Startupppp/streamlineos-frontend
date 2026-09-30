import { ticketDetailContract } from "./build-tickets-core-schema";

function person(id: string, name: string) {
  return { id, name, firstName: name, lastName: null, email: `${id}@example.com`, image: null };
}

const BASE_DETAIL = {
  id: 1,
  orgId: "org-1",
  title: "Fix login bug",
  description: null,
  reporterMembershipId: 1,
  completionPercentage: 0,
  clientVisible: false,
  isRecurring: false,
  recurrenceRule: null,
  recurrenceParentId: null,
  recurrenceNextRunAt: null,
  customerId: null,
  version: 1,
  deletedAt: null,
  type: "BUG",
  status: "TODO",
  priority: "HIGH",
  projectId: 1,
  ticketNumber: 1,
  epicId: null,
  assigneeMembershipId: null,
  reporterId: "user-a",
  points: null,
  storyPoints: null,
  link: null,
  rank: "1000",
  parentTicketId: null,
  originalEstimate: null,
  timeSpent: "0.00",
  startDate: null,
  dueDate: null,
  moduleId: null,
  cycleId: null,
  health: null,
  sequenceId: null,
  estimate: null,
  createdAt: "2026-09-17T00:00:00.000Z",
  updatedAt: "2026-09-17T00:00:00.000Z",
  project: { id: 1, name: "Alpha", key: "ALP", orgId: "org-1" },
  epic: null,
  assignee: null,
  reporter: person("user-a", "Ada"),
  assignees: [],
  watchers: [],
  labels: [],
  comments: [],
};

/** The shape `projects-tickets-detail.service.ts` spreads into the response. */
function withAttachment(overrides: Partial<{
  mimeType: string | null;
  fileUrl: string;
  fileName: string;
}>) {
  return {
    ...BASE_DETAIL,
    attachments: [
      {
        id: 7,
        filename: overrides.fileName ?? "screenshot.png",
        url: overrides.fileUrl ?? "org-1/uploads/screenshot.png",
        mimeType: overrides.mimeType ?? null,
        uploader: person("user-a", "Ada"),
      },
    ],
  };
}

describe("the ticket detail attachment contract maps the backend projection", () => {
  it("carries mimeType through from the backend so images render as image thumbnails, not document tiles", () => {
    /*
      projects-tickets-detail.service.ts spreads the full DB row into the attachment,
      which includes mimeType. The contract previously hardcoded `mimeType: null`,
      making att.mimeType?.startsWith("image/") always false and rendering every
      attachment as a document tile (TicketDetailMainSection:179 branch never taken).
    */
    const detail = ticketDetailContract.parse(withAttachment({ mimeType: "image/png" }));
    expect(detail.attachments[0]?.mimeType).toBe("image/png");
  });

  it("maps the backend url alias to fileUrl so storageObjectUrl can build the proxy URL", () => {
    /*
      The service aliasess fileUrl -> url. The component reads att.fileUrl.
    */
    const detail = ticketDetailContract.parse(withAttachment({ fileUrl: "org-1/uploads/Screenshot 2026-09-17 190207.png" }));
    expect(detail.attachments[0]?.fileUrl).toBe("org-1/uploads/Screenshot 2026-09-17 190207.png");
  });

  it("maps the backend filename alias to fileName so the alt text and download name are correct", () => {
    const detail = ticketDetailContract.parse(withAttachment({ fileName: "Screenshot 2026-09-17 190207.png" }));
    expect(detail.attachments[0]?.fileName).toBe("Screenshot 2026-09-17 190207.png");
  });

  it("accepts a null mimeType without throwing so attachments without mime data still render as document tiles", () => {
    const detail = ticketDetailContract.parse(withAttachment({ mimeType: null }));
    expect(detail.attachments[0]?.mimeType).toBeNull();
  });
});
