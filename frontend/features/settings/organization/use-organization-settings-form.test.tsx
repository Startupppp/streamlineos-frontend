import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { createElement, type ReactNode } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useOrganizationSettingsForm } from "./use-organization-settings-form";

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const successToast = toast.success as jest.Mock;
const errorToast = toast.error as jest.Mock;

const testSchema = z.object({
  name: z.string().min(1, "Name is required"),
  note: z.string(),
});

type TestValues = z.infer<typeof testSchema>;
type TestPayload = { name: string; note: string | null };

const SERVER: TestValues = { name: "Acme", note: "first" };
const SUCCESS_MESSAGE = "Settings saved";

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

function useHarness(
  serverValues: TestValues,
  mutationFn: (payload: TestPayload) => Promise<{ ok: true }>,
) {
  const mutation = useMutation<{ ok: true }, Error, TestPayload>({ mutationFn });
  const settings = useOrganizationSettingsForm({
    resolver: zodResolver(testSchema),
    serverValues,
    mutation,
    successMessage: SUCCESS_MESSAGE,
  });
  const { errors, isDirty } = settings.form.formState;
  return { ...settings, errors, isDirty };
}

function renderSettingsForm(
  mutationFn: (payload: TestPayload) => Promise<{ ok: true }>,
  serverValues: TestValues = SERVER,
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return renderHook(
    (props: { serverValues: TestValues }) => useHarness(props.serverValues, mutationFn),
    { wrapper: wrapper(client), initialProps: { serverValues } },
  );
}

function toPayload(values: TestValues): TestPayload {
  return { name: values.name, note: values.note || null };
}

async function submit(
  result: { current: ReturnType<typeof useHarness> },
): Promise<void> {
  const { form, save } = result.current;
  await act(async () => {
    await form.handleSubmit((values) => save(toPayload(values)))();
  });
}

beforeEach(() => {
  successToast.mockClear();
  errorToast.mockClear();
});

describe("useOrganizationSettingsForm", () => {
  it("starts read-only and seeded from the server record", () => {
    const { result } = renderSettingsForm(jest.fn().mockResolvedValue({ ok: true }));
    expect(result.current.isEditing).toBe(false);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.form.getValues()).toEqual(SERVER);
  });

  it("enters edit mode and re-seeds from the server record", () => {
    const { result } = renderSettingsForm(jest.fn().mockResolvedValue({ ok: true }));
    act(() => {
      result.current.form.setValue("name", "stale draft", { shouldDirty: true });
    });
    act(() => result.current.handleEdit());
    expect(result.current.isEditing).toBe(true);
    expect(result.current.form.getValues()).toEqual(SERVER);
    expect(result.current.isDirty).toBe(false);
  });

  it("marks the form dirty once a field changes", () => {
    const { result } = renderSettingsForm(jest.fn().mockResolvedValue({ ok: true }));
    act(() => result.current.handleEdit());
    act(() => {
      result.current.form.setValue("name", "Changed", { shouldDirty: true });
    });
    expect(result.current.isDirty).toBe(true);
  });

  it("cancel leaves edit mode and discards the draft back to the server record", () => {
    const { result } = renderSettingsForm(jest.fn().mockResolvedValue({ ok: true }));
    act(() => result.current.handleEdit());
    act(() => {
      result.current.form.setValue("name", "Changed", { shouldDirty: true });
    });
    act(() => result.current.handleCancel());
    expect(result.current.isEditing).toBe(false);
    expect(result.current.form.getValues()).toEqual(SERVER);
    expect(result.current.isDirty).toBe(false);
  });

  it("submits the caller's payload, toasts and leaves edit mode on success", async () => {
    const mutationFn = jest.fn().mockResolvedValue({ ok: true });
    const { result } = renderSettingsForm(mutationFn);
    act(() => result.current.handleEdit());
    act(() => {
      result.current.form.setValue("name", "Renamed", { shouldDirty: true });
      result.current.form.setValue("note", "", { shouldDirty: true });
    });

    await submit(result);

    expect(mutationFn).toHaveBeenCalledTimes(1);
    expect(mutationFn.mock.calls[0]?.[0]).toEqual({ name: "Renamed", note: null });
    await waitFor(() => expect(result.current.isEditing).toBe(false));
    expect(successToast).toHaveBeenCalledWith(SUCCESS_MESSAGE);
    expect(errorToast).not.toHaveBeenCalled();
    expect(result.current.isDirty).toBe(false);
  });

  it("keeps the user's input and stays in edit mode when the mutation fails", async () => {
    const mutationFn = jest.fn().mockRejectedValue(new Error("Slug already taken"));
    const { result } = renderSettingsForm(mutationFn);
    act(() => result.current.handleEdit());
    act(() => {
      result.current.form.setValue("name", "Renamed", { shouldDirty: true });
    });

    await submit(result);

    await waitFor(() => expect(errorToast).toHaveBeenCalledWith("Slug already taken"));
    expect(successToast).not.toHaveBeenCalled();
    expect(result.current.isEditing).toBe(true);
    expect(result.current.form.getValues("name")).toBe("Renamed");
  });

  it("does not submit an invalid form", async () => {
    const mutationFn = jest.fn().mockResolvedValue({ ok: true });
    const { result } = renderSettingsForm(mutationFn);
    act(() => result.current.handleEdit());
    act(() => {
      result.current.form.setValue("name", "", { shouldDirty: true });
    });

    await submit(result);

    expect(mutationFn).not.toHaveBeenCalled();
    expect(result.current.errors.name?.message).toBe("Name is required");
    expect(result.current.isEditing).toBe(true);
  });

  it("ignores a second submit while the first is still in flight", async () => {
    let release: (value: { ok: true }) => void = () => undefined;
    const mutationFn = jest.fn(
      () => new Promise<{ ok: true }>((resolve) => { release = resolve; }),
    );
    const { result } = renderSettingsForm(mutationFn);
    act(() => result.current.handleEdit());

    await act(async () => {
      result.current.save({ name: "One", note: null });
      result.current.save({ name: "Two", note: null });
    });

    expect(mutationFn).toHaveBeenCalledTimes(1);
    expect(mutationFn.mock.calls[0]?.[0]).toEqual({ name: "One", note: null });

    await act(async () => {
      release({ ok: true });
    });
    await waitFor(() => expect(result.current.isSaving).toBe(false));

    await act(async () => {
      result.current.save({ name: "Three", note: null });
    });
    expect(mutationFn).toHaveBeenCalledTimes(2);
  });

  it("replaces the form with fresh server values while not editing", async () => {
    const { result, rerender } = renderSettingsForm(jest.fn().mockResolvedValue({ ok: true }));
    rerender({ serverValues: { name: "Acme Global", note: "second" } });
    await waitFor(() =>
      expect(result.current.form.getValues()).toEqual({ name: "Acme Global", note: "second" }),
    );
  });

  it("does not overwrite a dirty field when fresh server values arrive mid-edit", async () => {
    const { result, rerender } = renderSettingsForm(jest.fn().mockResolvedValue({ ok: true }));
    act(() => result.current.handleEdit());
    act(() => {
      result.current.form.setValue("name", "My unsaved edit", { shouldDirty: true });
    });

    rerender({ serverValues: { name: "Someone else's rename", note: "second" } });

    await waitFor(() => expect(result.current.form.getValues("note")).toBe("second"));
    expect(result.current.form.getValues("name")).toBe("My unsaved edit");
    expect(result.current.isEditing).toBe(true);
  });
});
