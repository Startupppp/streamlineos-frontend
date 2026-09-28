import { render, screen, act, fireEvent, waitFor, within } from "@testing-library/react";
import {
  SAMPLE_WEBHOOK,
  mockDeleteMutateAsync,
  mockUpdateMutate,
  mockUpdateMutateAsync,
  mockUseBuildListKeyboard,
  st,
} from "./webhook-page-test-harness";
import { ProjectWebhooksPage } from "./project-webhooks-page";

describe("ProjectWebhooksPage — edit Sheet (BLD-X-FE-SETTINGS-WH-036)", () => {
  it("opens the Sheet in edit mode when onEdit is called on a webhook card — title changes to Edit Webhook", async () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getByRole("button", { name: /edit-webhook/i }));
    await waitFor(() => {
      expect(screen.getByText("Edit Webhook")).toBeInTheDocument();
    });
  });

  it("submitting the edit form calls updateWebhook.mutate with url, events and version", async () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getByRole("button", { name: /edit-webhook/i }));
    await waitFor(() => screen.getByText("Edit Webhook"));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => {
      expect(mockUpdateMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          webhookId: SAMPLE_WEBHOOK.id,
          version: SAMPLE_WEBHOOK.version,
          url: SAMPLE_WEBHOOK.url,
          events: SAMPLE_WEBHOOK.events,
        }),
        expect.any(Object),
      );
    });
  });

  it("wires onEdit into the keyboard hook so the e shortcut has a target now that update accepts url and events", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    const lastArgs = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
    expect(typeof lastArgs?.onEdit).toBe("function");
  });

  it("does not wire onEdit when the viewer cannot manage — the e shortcut must fail closed", () => {
    st.accessState = "denied";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    const lastArgs = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
    expect(lastArgs?.onEdit).toBeUndefined();
  });

  it("the onEdit callback the keyboard hook receives opens the Sheet in edit mode for the focused row", async () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    const onEdit = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0]?.onEdit;
    await act(async () => { onEdit?.(0); });
    expect(screen.getByText("Edit Webhook")).toBeInTheDocument();
  });

  it("an out-of-range focused index does not open the Sheet, so a stale focus after a page change cannot edit the wrong row", async () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    const onEdit = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0]?.onEdit;
    await act(async () => { onEdit?.(9); });
    expect(screen.queryByText("Edit Webhook")).not.toBeInTheDocument();
  });

  it("the Sheet shows New Webhook title before any edit is triggered — the title is create-mode by default", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getByRole("button", { name: /add webhook/i }));
    expect(screen.getByText("New Webhook")).toBeInTheDocument();
  });
});

describe("ProjectWebhooksPage — 409 conflict UX on toggle (BLD-X-FE-SETTINGS-WH-037)", () => {
  it("a 409 from updateWebhook opens the conflict overlay comparing the server value with the submitted one, instead of only a toast", async () => {
    st.accessState = "granted";
    st.webhooks = [{ ...SAMPLE_WEBHOOK, isActive: true }];
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getAllByRole("button", { name: /toggle-off/i })[0]);
    const [[, options]] = mockUpdateMutate.mock.calls as [
      [unknown, { onError?: (e: unknown) => void }],
    ];
    act(() => {
      options.onError?.({ status: 409, details: { currentVersion: 5 } });
    });
    expect(
      screen.getByText("This webhook changed while you were editing"),
    ).toBeInTheDocument();
    expect(screen.getByText("On the server now")).toBeInTheDocument();
    expect(screen.getByText("Enabled")).toBeInTheDocument();
    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });

  it("Keep my changes resubmits the patch with the server's current version, so the retry cannot collide on the stale token", async () => {
    st.accessState = "granted";
    st.webhooks = [{ ...SAMPLE_WEBHOOK, isActive: true, version: 9 }];
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getAllByRole("button", { name: /toggle-off/i })[0]);
    const [[, options]] = mockUpdateMutate.mock.calls as [
      [unknown, { onError?: (e: unknown) => void }],
    ];
    act(() => {
      options.onError?.({ status: 409, details: { currentVersion: 9 } });
    });
    mockUpdateMutate.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /keep my changes/i }));
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        webhookId: SAMPLE_WEBHOOK.id,
        version: 9,
        isActive: false,
      }),
      expect.any(Object),
    );
  });

  it("Discard my changes closes the conflict overlay without issuing another write", async () => {
    st.accessState = "granted";
    st.webhooks = [{ ...SAMPLE_WEBHOOK, isActive: true }];
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getAllByRole("button", { name: /toggle-off/i })[0]);
    const [[, options]] = mockUpdateMutate.mock.calls as [
      [unknown, { onError?: (e: unknown) => void }],
    ];
    act(() => {
      options.onError?.({ status: 409, details: { currentVersion: 5 } });
    });
    mockUpdateMutate.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /discard my changes/i }));
    await waitFor(() => {
      expect(
        screen.queryByText("This webhook changed while you were editing"),
      ).not.toBeInTheDocument();
    });
    expect(mockUpdateMutate).not.toHaveBeenCalled();
  });

  it("the conflict overlay is absent before any 409 — paired with the open assertion so it cannot pass on a blank frame", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(
      screen.queryByText("This webhook changed while you were editing"),
    ).not.toBeInTheDocument();
  });

  it("a non-409 error from updateWebhook shows the plain toast — the 409 branch does not swallow other errors", async () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getAllByRole("button", { name: /toggle-off/i })[0]);
    const [[, options]] = mockUpdateMutate.mock.calls as [
      [unknown, { onError?: (e: unknown) => void }],
    ];
    const { toast } = jest.requireMock("sonner") as { toast: { error: jest.Mock } };
    act(() => {
      options.onError?.(new Error("network error"));
    });
    expect(toast.error).toHaveBeenCalledWith(expect.not.stringMatching(/conflict/i));
  });
});

describe("ProjectWebhooksPage — bulk actions (BLD-X-FE-SETTINGS-WH-038)", () => {
  function selectFirstWebhook() {
    fireEvent.click(screen.getByRole("button", { name: "select-1" }));
  }

  it("shows no bulk action bar until a row is selected — the primary record itself is never selected", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(
      screen.queryByRole("region", { name: /webhook bulk actions/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the bulk action bar with the selected count once a row is selected", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    selectFirstWebhook();
    expect(
      screen.getByRole("region", { name: /webhook bulk actions/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });

  it("does not offer row selection when the viewer cannot manage — bulk writes fail closed", () => {
    st.accessState = "denied";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.queryByRole("button", { name: "select-1" })).not.toBeInTheDocument();
  });

  it("offers Disable but not Enable when every selected row is already active — the transition must be valid for all of them", () => {
    st.accessState = "granted";
    st.webhooks = [{ ...SAMPLE_WEBHOOK, isActive: true }];
    render(<ProjectWebhooksPage projectId="1" />);
    selectFirstWebhook();
    expect(screen.getByRole("button", { name: "Disable" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Enable" })).toBeDisabled();
  });

  it("offers Enable but not Disable when every selected row is inactive", () => {
    st.accessState = "granted";
    st.webhooks = [{ ...SAMPLE_WEBHOOK, isActive: false }];
    render(<ProjectWebhooksPage projectId="1" />);
    selectFirstWebhook();
    expect(screen.getByRole("button", { name: "Enable" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Disable" })).toBeDisabled();
  });

  it("offers neither Enable nor Disable on a mixed selection, because one request would be a no-op for half the rows", () => {
    st.accessState = "granted";
    st.webhooks = [
      { ...SAMPLE_WEBHOOK, id: 1, isActive: true },
      { ...SAMPLE_WEBHOOK, id: 2, url: "https://b.example.com", isActive: false },
    ];
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getByRole("button", { name: "select-1" }));
    fireEvent.click(screen.getByRole("button", { name: "select-2" }));
    expect(screen.getByRole("button", { name: "Enable" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Disable" })).toBeDisabled();
  });

  it("bulk Disable sends one update per selected row carrying that row's own version token", async () => {
    st.accessState = "granted";
    st.webhooks = [
      { ...SAMPLE_WEBHOOK, id: 1, isActive: true, version: 3 },
      { ...SAMPLE_WEBHOOK, id: 2, url: "https://b.example.com", isActive: true, version: 7 },
    ];
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getByRole("button", { name: "select-1" }));
    fireEvent.click(screen.getByRole("button", { name: "select-2" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Disable" }));
    });
    expect(mockUpdateMutateAsync).toHaveBeenCalledWith({ webhookId: 1, version: 3, isActive: false });
    expect(mockUpdateMutateAsync).toHaveBeenCalledWith({ webhookId: 2, version: 7, isActive: false });
  });

  it("reports the whole-batch result when every row succeeds", async () => {
    st.accessState = "granted";
    st.webhooks = [{ ...SAMPLE_WEBHOOK, isActive: true }];
    render(<ProjectWebhooksPage projectId="1" />);
    selectFirstWebhook();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Disable" }));
    });
    const { toast } = jest.requireMock("sonner") as { toast: { success: jest.Mock } };
    expect(toast.success).toHaveBeenCalledWith("1 webhook disabled");
  });

  it("names the rows that failed on a partial success, rather than reporting the batch as done", async () => {
    st.accessState = "granted";
    st.webhooks = [
      { ...SAMPLE_WEBHOOK, id: 1, isActive: true, version: 1 },
      { ...SAMPLE_WEBHOOK, id: 2, url: "https://b.example.com", isActive: true, version: 1 },
    ];
    mockUpdateMutateAsync.mockImplementation((vars?: unknown) => {
      const webhookId = (vars as { webhookId: number }).webhookId;
      return webhookId === 2 ? Promise.reject(new Error("boom")) : Promise.resolve();
    });
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getByRole("button", { name: "select-1" }));
    fireEvent.click(screen.getByRole("button", { name: "select-2" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Disable" }));
    });
    const { toast } = jest.requireMock("sonner") as { toast: { error: jest.Mock } };
    expect(toast.error).toHaveBeenCalledWith(
      "1 of 2 disabled. Failed: https://b.example.com",
    );
  });

  it("bulk delete confirms first and then deletes every selected row", async () => {
    st.accessState = "granted";
    st.webhooks = [{ ...SAMPLE_WEBHOOK, id: 1 }];
    render(<ProjectWebhooksPage projectId="1" />);
    selectFirstWebhook();
    fireEvent.click(
      within(screen.getByRole("region", { name: /webhook bulk actions/i })).getByRole(
        "button",
        { name: "Delete" },
      ),
    );
    const dialog = await screen.findByRole("alertdialog");
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    });
    expect(mockDeleteMutateAsync).toHaveBeenCalledWith(1);
  });

  it("clearing the selection removes the bulk bar", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    selectFirstWebhook();
    fireEvent.click(screen.getByRole("button", { name: /clear selection/i }));
    expect(
      screen.queryByRole("region", { name: /webhook bulk actions/i }),
    ).not.toBeInTheDocument();
  });

  it("drops the selection once the filter in the URL has changed, so a bulk action cannot apply to rows outside the filtered set", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    const { rerender } = render(<ProjectWebhooksPage projectId="1" />);
    selectFirstWebhook();
    expect(
      screen.getByRole("region", { name: /webhook bulk actions/i }),
    ).toBeInTheDocument();
    st.searchParams = new URLSearchParams("from=2026-02-01");
    rerender(<ProjectWebhooksPage projectId="1" />);
    expect(
      screen.queryByRole("region", { name: /webhook bulk actions/i }),
    ).not.toBeInTheDocument();
  });

  it("drops the selection when the cursor moves to another page, so Disable cannot hit rows the operator can no longer see", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    st.hasMore = true;
    st.nextCursor = 7;
    const { rerender } = render(<ProjectWebhooksPage projectId="1" />);
    selectFirstWebhook();
    st.pagerCursor = "7";
    rerender(<ProjectWebhooksPage projectId="1" />);
    expect(
      screen.queryByRole("region", { name: /webhook bulk actions/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps the selection across a re-render that changes neither the filter nor the page — paired with the two drop assertions above", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    const { rerender } = render(<ProjectWebhooksPage projectId="1" />);
    selectFirstWebhook();
    rerender(<ProjectWebhooksPage projectId="1" />);
    expect(
      screen.getByRole("region", { name: /webhook bulk actions/i }),
    ).toBeInTheDocument();
  });

  it("Esc clears the selection through the shared list keyboard hook", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    selectFirstWebhook();
    const onClearSelection =
      mockUseBuildListKeyboard.mock.calls.at(-1)?.[0]?.onClearSelection;
    act(() => {
      onClearSelection?.();
    });
    expect(
      screen.queryByRole("region", { name: /webhook bulk actions/i }),
    ).not.toBeInTheDocument();
  });
});

describe("ProjectWebhooksPage — density toggle (BLD-X-FE-SETTINGS-WH-039)", () => {
  it("starts compact, as the page contract requires compact by default", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByTestId("webhook-card")).toHaveAttribute("data-density", "compact");
  });

  it("switches the rows to comfortable density when the toggle is pressed", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getByRole("button", { name: "Compact" }));
    expect(screen.getByTestId("webhook-card")).toHaveAttribute(
      "data-density",
      "comfortable",
    );
  });

  it("switches back to compact on a second press, so the toggle is reversible", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getByRole("button", { name: "Compact" }));
    fireEvent.click(screen.getByRole("button", { name: "Comfortable" }));
    expect(screen.getByTestId("webhook-card")).toHaveAttribute("data-density", "compact");
  });
});

describe("ProjectWebhooksPage — bulk actions offline (BLD-X-FE-SETTINGS-WH-044)", () => {
  it("hides the bulk action bar while offline, because none of its commands can reach the server", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    (
      jest.requireMock("@/hooks/common/use-online-status") as {
        useOnlineStatus: jest.Mock;
      }
    ).useOnlineStatus.mockReturnValue(false);
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getByRole("button", { name: "select-1" }));
    expect(
      screen.queryByRole("region", { name: /webhook bulk actions/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the bulk action bar for the same selection when online — paired with the offline assertion above", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getByRole("button", { name: "select-1" }));
    expect(
      screen.getByRole("region", { name: /webhook bulk actions/i }),
    ).toBeInTheDocument();
  });
});
