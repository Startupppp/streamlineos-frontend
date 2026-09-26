"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { PublicBoardView } from "@/features/build/whiteboard/public-board-view";
import { PublicFormView } from "@/features/build/forms/public-form-view";
import { PublicIntakeView } from "@/features/build/intake/public-intake-view";
import PublicRoadmapPage from "@/app/(public)/roadmap/[orgId]/page";

const VIEW_TOKEN = "gallery-view-stub";
const EDIT_TOKEN = "gallery-edit-stub";
const FORM_TOKEN = "gallery-form-stub";
const INTAKE_PROJECT_ID = "gallery-intake-stub";
const BOARD_LOADING_TOKEN = "gallery-board-loading-stub";

const STUB_ROADMAP_BOARD = {
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

const STUB_VIEW_BOARD = {
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

const STUB_EDIT_BOARD = {
  ...STUB_VIEW_BOARD,
  name: "Architecture overview",
  access: "edit" as const,
  allowExport: true,
};

const STUB_FORM = {
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

function useGalleryQueryClient() {
  const [queryClient] = useState(() => {
    const client = createAppQueryClient("content-intake-gallery");

    client.setQueryData(
      accountingAndSupportQueryKeys.whiteboards.publicLink(VIEW_TOKEN),
      STUB_VIEW_BOARD,
    );

    client.setQueryData(
      accountingAndSupportQueryKeys.whiteboards.publicLink(EDIT_TOKEN),
      STUB_EDIT_BOARD,
    );

    client.setQueryData(
      buildWorkQueryKeys.projects.publicForms.token(FORM_TOKEN),
      STUB_FORM,
    );

    client.setQueryData(
      buildWorkQueryKeys.projects.publicForms.projectIntakeForm(INTAKE_PROJECT_ID),
      null,
    );

    client.setQueryData(
      ["streamlineos", "roadmap", "publicBoard", undefined] as const,
      STUB_ROADMAP_BOARD,
    );

    return client;
  });
  return queryClient;
}

function useBoardLoadingQueryClient() {
  const [client] = useState(() => {
    const c = createAppQueryClient("content-intake-gallery-board-loading");
    void c.prefetchQuery({
      queryKey: accountingAndSupportQueryKeys.whiteboards.publicLink(BOARD_LOADING_TOKEN),
      queryFn: (): Promise<unknown> => new Promise(() => {}),
    });
    return c;
  });
  return client;
}

function PublicBoardLoadingFrame() {
  const loadingClient = useBoardLoadingQueryClient();
  return (
    <QueryClientProvider client={loadingClient}>
      <PublicBoardView shareToken={BOARD_LOADING_TOKEN} />
    </QueryClientProvider>
  );
}

function CaseFrame({
  id,
  title,
  height = "h-auto",
  children,
}: {
  id: string;
  title: string;
  height?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title}>
      <h2 className="mb-2 text-sm font-semibold text-foreground">{title}</h2>
      <div
        data-case-frame={id}
        className={`w-full min-w-0 overflow-hidden rounded-xl border border-border bg-background ${height}`}
      >
        {children}
      </div>
    </section>
  );
}

export function ContentIntakeGallery() {
  const queryClient = useGalleryQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex flex-col gap-8 p-4">
        <header>
          <h1 className="text-lg font-semibold tracking-tight">
            Content intake public surfaces
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overflow, control-height and focus-order contracts for the public
            whiteboard, form and intake surfaces. Each frame mounts the real
            component with pre-seeded stub data.
          </p>
        </header>

        <CaseFrame
          id="public-whiteboard-view"
          title="Public whiteboard — view mode"
          height="h-[36rem]"
        >
          <PublicBoardView shareToken={VIEW_TOKEN} />
        </CaseFrame>

        <CaseFrame
          id="public-whiteboard-edit"
          title="Public whiteboard — edit mode"
          height="h-[36rem]"
        >
          <PublicBoardView shareToken={EDIT_TOKEN} />
        </CaseFrame>

        <CaseFrame
          id="public-form"
          title="Public form"
        >
          <PublicFormView formToken={FORM_TOKEN} />
        </CaseFrame>

        <CaseFrame
          id="public-intake"
          title="Public intake"
        >
          <PublicIntakeView projectId={INTAKE_PROJECT_ID} />
        </CaseFrame>

        <CaseFrame
          id="public-board-loading"
          title="Public whiteboard — loading skeleton"
          height="h-64"
        >
          <PublicBoardLoadingFrame />
        </CaseFrame>

        <CaseFrame
          id="public-roadmap"
          title="Public roadmap"
          height="h-[48rem]"
        >
          <PublicRoadmapPage />
        </CaseFrame>
      </div>
    </QueryClientProvider>
  );
}
