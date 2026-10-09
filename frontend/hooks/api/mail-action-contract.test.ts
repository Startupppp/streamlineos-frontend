import { mailActionSuccessContract } from "./mail-schema";

it("accepts the action response emitted by the mail controller", () => {
  expect(mailActionSuccessContract.parse({ ok: true })).toEqual({ ok: true });
  expect(mailActionSuccessContract.safeParse({ success: true }).success).toBe(false);
});
