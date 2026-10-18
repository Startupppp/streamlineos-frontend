import { act, renderHook } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-envelope";
import { submitWithFieldErrors } from "./submit-with-field-errors";

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

type Values = { name: string; code: string };

function renderForm() {
  return renderHook(() => useForm<Values>({ defaultValues: { name: "", code: "" } })).result;
}

beforeEach(() => jest.clearAllMocks());

describe("submitWithFieldErrors — ORG-B-013 duplicate code on every hierarchy form", () => {
  it("puts a duplicate-code 409 under Code with no toast carrying a raw code: prefix", async () => {
    const form = renderForm();
    const conflict = new ApiError("Branch code already exists", 409, "VALIDATION_FAILED", [
      { path: "code", message: "Code 'NORTH' is already used by the branch 'North'." },
    ]);

    await act(() => submitWithFieldErrors(form.current, ["name", "code"], () => Promise.reject(conflict)));

    expect(form.current.getFieldState("code").error?.message).toBe(
      "Code 'NORTH' is already used by the branch 'North'.",
    );
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("toasts a failure that names no field on the form", async () => {
    const form = renderForm();

    await act(() =>
      submitWithFieldErrors(form.current, ["name", "code"], () => Promise.reject(new ApiError("Server unavailable", 503))),
    );

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(form.current.getFieldState("code").error).toBeUndefined();
  });

  it("does nothing extra when the save succeeds", async () => {
    const form = renderForm();
    const submit = jest.fn().mockResolvedValue(undefined);

    await act(() => submitWithFieldErrors(form.current, ["name", "code"], submit));

    expect(submit).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
  });
});
