import { authScreenPlan, IMPLEMENTED_AUTH_METHODS } from "./auth-method-plan";
import type { SignAuthMethod } from "@/types/sign";

const ALL_METHODS: SignAuthMethod[] = [
  "email_link",
  "access_code",
  "otp_email",
  "otp_sms",
  "sso",
  "passkey",
  "kba",
  "id_verification",
];

describe("authScreenPlan", () => {
  it("names the phone for SMS codes and the inbox for email codes", () => {
    const sms = authScreenPlan("otp_sms");
    expect(sms).toMatchObject({ kind: "otp", channel: "sms" });
    expect(sms.kind === "otp" && sms.prompt).toMatch(/phone/i);
    expect(sms.kind === "otp" && sms.prompt).not.toMatch(/email/i);
    expect(sms.kind === "otp" && sms.sentMessage).toMatch(/phone/i);

    const email = authScreenPlan("otp_email");
    expect(email).toMatchObject({ kind: "otp", channel: "email" });
    expect(email.kind === "otp" && email.prompt).toMatch(/email/i);
  });

  // Pinned over the whole enum: a ninth method added to the backend and forgotten here would
  // otherwise default into the OTP branch and advertise a channel that refuses the request.
  it("offers a challenge only for methods the backend can complete", () => {
    for (const method of ALL_METHODS) {
      const plan = authScreenPlan(method);
      const offersAChallenge = plan.kind === "otp" || plan.kind === "access_code";
      expect(offersAChallenge).toBe(IMPLEMENTED_AUTH_METHODS.has(method));
    }
  });

  it("says which method is missing rather than failing anonymously", () => {
    for (const method of ["sso", "passkey", "kba", "id_verification"] as const) {
      const plan = authScreenPlan(method);
      expect(plan.kind).toBe("unavailable");
      expect(plan.kind === "unavailable" && plan.label).toBeTruthy();
    }
  });

  it("keeps access code on its own branch", () => {
    expect(authScreenPlan("access_code")).toEqual({ kind: "access_code" });
  });
});
