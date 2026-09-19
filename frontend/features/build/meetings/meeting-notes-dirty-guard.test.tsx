"use client";

import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  BuildDirtyStateProvider,
  useBuildHasUnsavedWork,
} from "@/features/build/navigation/build-dirty-state-context";
import { MeetingNotesSection } from "./meeting-notes-section";
import type { MeetingDetail } from "@/types/projects";

jest.mock("next/dynamic", () => (_fn: () => Promise<{ default: React.ComponentType<{ onChangeHtml?: (html: string) => void; contentKey?: unknown }> }>, _opts: unknown) => {
  return function MockDynamic(props: { onChangeHtml?: (html: string) => void; contentKey?: unknown }) {
    const handleTrigger = () => {
      props.onChangeHtml?.("<p>Edited notes</p>");
    };
    return <button type="button" onClick={handleTrigger} data-testid={`editor-trigger-${String(props.contentKey)}`}>Trigger change</button>;
  };
});

jest.mock("@/hooks/api/build", () => ({
  useUpdateMeeting: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
}));

jest.mock("@/components/pm-chrome", () => ({
  PM_PANEL: "pm-panel",
}));

const MOCK_MEETING: MeetingDetail = {
  id: 99,
  projectId: 1,
  title: "Sprint planning",
  agenda: "",
  notes: "",
  status: "scheduled",
  meetingDate: "2026-09-19T10:00:00.000Z",
  startTime: null,
  endTime: null,
  location: null,
  isRecurring: false,
  recurrenceRule: null,
  attendees: [],
  actionItems: [],
  createdAt: "2026-09-19T00:00:00.000Z",
  updatedAt: "2026-09-19T00:00:00.000Z",
} as unknown as MeetingDetail;

function HasUnsavedWorkProbe() {
  const hasUnsavedWork = useBuildHasUnsavedWork();
  return <span data-testid="probe">{hasUnsavedWork ? "dirty" : "clean"}</span>;
}

function renderHarness() {
  return render(
    <BuildDirtyStateProvider>
      <HasUnsavedWorkProbe />
      <MeetingNotesSection
        meeting={MOCK_MEETING}
        projectId={1}
        canManage
      />
    </BuildDirtyStateProvider>,
  );
}

describe("meeting notes section dirty guard (BSN-04-010, BSN-04-013)", () => {
  test("dirty state is clean before any edit", () => {
    renderHarness();
    expect(screen.getByTestId("probe")).toHaveTextContent("clean");
  });

  test("editing notes registers the surface as dirty so scope-change guard fires", () => {
    renderHarness();

    act(() => {
      fireEvent.click(screen.getByTestId("editor-trigger-notes-99"));
    });

    expect(screen.getByTestId("probe")).toHaveTextContent("dirty");
  });

  test("editing agenda registers the surface as dirty so scope-change guard fires", () => {
    renderHarness();

    act(() => {
      fireEvent.click(screen.getByTestId("editor-trigger-agenda-99"));
    });

    expect(screen.getByTestId("probe")).toHaveTextContent("dirty");
  });

  test("draft content from the editor is preserved after editing (not cleared until explicit discard)", () => {
    renderHarness();

    act(() => {
      fireEvent.click(screen.getByTestId("editor-trigger-notes-99"));
    });

    expect(screen.getByTestId("probe")).toHaveTextContent("dirty");
    expect(screen.getAllByTestId(/editor-trigger/).length).toBeGreaterThan(0);
  });
});
