export const VIEW_TOKEN = "gallery-view-stub";
export const EDIT_TOKEN = "gallery-edit-stub";
export const FORM_TOKEN = "gallery-form-stub";
export const INTAKE_PROJECT_ID = "gallery-intake-stub";
export const BOARD_LOADING_TOKEN = "gallery-board-loading-stub";

export const GALLERY_PROJECT_ID = 1;
export const GALLERY_FORM_ID = 1;
export const GALLERY_MEETING_ID = 1;

export const STUB_ROADMAP_BOARD = {
  orgName: "Gallery Org",
  roadmap: {
    planned: [
      {
        id: 1,
        title: "Dark mode support",
        description: null,
        status: "planned" as const,
        category: null,
        targetQuarter: "Q4 2026",
        votes: 24,
      },
    ],
    in_progress: [],
    completed: [],
  },
  feedback: [],
  changelog: [],
};

export const STUB_VIEW_BOARD = {
  name: "Sprint planning board",
  data: {
    type: "excalidraw" as const,
    version: 2,
    source: "https://excalidraw.com",
    elements: [
      {
        id: "el-1",
        type: "rectangle",
        x: 50,
        y: 60,
        width: 200,
        height: 80,
        strokeColor: "#1e1e1e",
        backgroundColor: "#a5d8ff",
        fillStyle: "solid",
        strokeWidth: 2,
        roughness: 1,
        opacity: 100,
        angle: 0,
        seed: 12345,
        version: 1,
        versionNonce: 1,
        isDeleted: false,
        groupIds: [],
        frameId: null,
        boundElements: null,
        link: null,
        locked: false,
        updated: 1,
        index: "a0",
      },
    ],
    appState: { viewBackgroundColor: "#ffffff" },
  },
  access: "view" as const,
  allowExport: false,
  updatedAt: "2026-09-01T10:00:00Z",
};

export const STUB_EDIT_BOARD = {
  ...STUB_VIEW_BOARD,
  name: "Architecture overview",
  access: "edit" as const,
  allowExport: true,
};

export const STUB_FORM = {
  name: "Feedback form",
  description: "Share your thoughts about our product.",
  publicToken: FORM_TOKEN,
  isPublic: true,
  isActive: true,
  fields: [
    {
      key: "name",
      label: "Your name",
      type: "text" as const,
      required: false,
      placeholder: "Jane Smith",
    },
    {
      key: "email",
      label: "Email address",
      type: "email" as const,
      required: true,
      placeholder: "you@example.com",
    },
    {
      key: "message",
      label: "Message",
      type: "textarea" as const,
      required: true,
      placeholder: "Your feedback…",
    },
  ],
};
