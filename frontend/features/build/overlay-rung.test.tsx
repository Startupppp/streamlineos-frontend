import { render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

const mutation = { mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false };

jest.mock("@/hooks/api/build/advanced", () => ({
  useCreateView: () => mutation,
}));

jest.mock("@/hooks/api/build/client-portal", () => ({
  useSubmitPortalChangeRequest: () => mutation,
}));

jest.mock("@/hooks/api/feedbucket", () => ({
  useCreateFeedbucketWidget: () => mutation,
}));

jest.mock("@/hooks/api/build/changelog", () => ({
  useCreateChangelogEntry: () => mutation,
  useUpdateChangelogEntry: () => mutation,
}));

jest.mock("@/hooks/api/build/milestones", () => ({
  useCreateMilestone: () => mutation,
  useUpdateMilestone: () => mutation,
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: () => ({ data: { data: [] } }),
}));

jest.mock("@/components/ui/user-combobox", () => ({
  UserCombobox: () => <div data-testid="user-combobox" />,
}));

jest.mock("@/components/members/member-picker", () => ({
  MemberPicker: () => <div data-testid="member-picker" />,
}));

jest.mock("@/features/build/ticket-details/ticket-conflict-dialog", () => ({
  TicketConflictDialog: () => null,
}));

jest.mock("@/components/editor/tiptap-editor", () => ({
  TiptapEditor: ({ menuMode }: { menuMode?: string }) => (
    <div data-testid="tiptap" data-menu-mode={menuMode} />
  ),
}));

import { CreateViewSheet } from "@/features/build/views/saved-views/create-view-sheet";
import { CreateFeedbucketWidgetSheet } from "@/features/build/feedbucket/create-feedbucket-widget-sheet";
import { MilestoneUpsertSheet } from "@/features/build/milestones/milestone-upsert-sheet";
import { ActionItemFormSheet } from "@/features/build/meetings/action-item-form-sheet";
import { ChangelogSheet } from "@/features/build/roadmap/changelog-sheet";
import { WebhookFormSheet } from "@/features/build/webhooks/webhook-form-sheet";
import { PortalCrSheet } from "@/features/build/client-portal/portal-cr-sheet";
import type { WebhookFormValues } from "@/features/build/webhooks/webhook-schema";

function expectDialogRung(submitName: RegExp, formId: string) {
  expect(document.querySelector('[data-slot="dialog-content"]')).not.toBeNull();
  expect(document.querySelector('[data-slot="sheet-content"]')).toBeNull();
  expect(screen.getByRole("button", { name: submitName })).toHaveAttribute(
    "form",
    formId,
  );
}

function WebhookFormHarness() {
  const form = useForm<WebhookFormValues>({
    defaultValues: { url: "", events: [], secret: "" },
  });
  return (
    <WebhookFormSheet
      open
      onOpenChange={() => {}}
      isEditing={false}
      isPending={false}
      form={form}
      onSubmit={() => {}}
      onCancel={() => {}}
    />
  );
}

describe("FE-110 overlay rung for Build form overlays", () => {
  it("renders the saved-view form at the Dialog rung", () => {
    render(
      <CreateViewSheet
        projectId={1}
        open
        onOpenChange={() => {}}
        onCreated={() => {}}
      />,
    );
    expectDialogRung(/create view/i, "create-view-form");
  });

  it("renders the feedback-widget form at the Dialog rung", () => {
    render(
      <CreateFeedbucketWidgetSheet
        open
        projectId={1}
        defaultName="Feedback"
        onClose={() => {}}
      />,
    );
    expectDialogRung(/^create$/i, "feedbucket-widget-form");
  });

  it("renders the milestone form at the Dialog rung", () => {
    render(<MilestoneUpsertSheet projectId={1} onClose={() => {}} />);
    expectDialogRung(/create milestone/i, "milestone-form");
  });

  it("renders the action-item form at the Dialog rung", () => {
    render(
      <ActionItemFormSheet
        open
        onOpenChange={() => {}}
        mode="create"
        onSubmitCreate={() => {}}
        onSubmitEdit={() => {}}
        isPending={false}
        projectMembers={[]}
      />,
    );
    expectDialogRung(/add item/i, "action-item-form");
  });

  it("renders the changelog form at the Dialog rung", () => {
    render(<ChangelogSheet onClose={() => {}} />);
    expectDialogRung(/create entry/i, "changelog-form");
  });

  it("renders the webhook form at the Dialog rung", () => {
    render(<WebhookFormHarness />);
    expectDialogRung(/create webhook/i, "webhook-form");
  });

  it("keeps the change-request form at the Sheet rung for its toolbar-bearing editor", async () => {
    render(<PortalCrSheet projectId={1} open onOpenChange={() => {}} />);

    expect(document.querySelector('[data-slot="sheet-content"]')).not.toBeNull();
    expect(await screen.findByTestId("tiptap")).toHaveAttribute(
      "data-menu-mode",
      "static",
    );
  });
});
