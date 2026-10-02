import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { invitationResendContract } from "./extended-users-schema";

const document = JSON.parse(
  readFileSync(resolve(process.cwd(), "contracts/openapi.json"), "utf8"),
) as {
  paths: Record<
    string,
    {
      post?: {
        responses?: Record<
          string,
          { content?: { "application/json"?: { schema?: Record<string, unknown> } } }
        >;
      };
    }
  >;
};

describe("invitation resend contract", () => {
  it.each([
    { success: true, deliveryQueued: true, deliveryFailureReason: null },
    {
      success: true,
      deliveryQueued: false,
      deliveryFailureReason: "No email provider is configured, so the email could not be sent.",
    },
  ])("accepts the backend queue outcome", (response) => {
    expect(invitationResendContract.safeParse(response).success).toBe(true);
  });

  it("rejects the former success-only response and any raw token", () => {
    expect(invitationResendContract.safeParse({ success: true }).success).toBe(false);
    expect(
      invitationResendContract.strict().safeParse({
        success: true,
        deliveryQueued: true,
        deliveryFailureReason: null,
        rawToken: "secret",
      }).success,
    ).toBe(false);
  });

  it("vendors the generated response schema with both required queue fields", () => {
    const schema = document.paths["/users/invitations/{invitationId}/resend"]?.post
      ?.responses?.["200"]?.content?.["application/json"]?.schema as
      | { properties?: Record<string, unknown>; required?: string[] }
      | undefined;

    expect(schema?.required).toEqual(
      expect.arrayContaining(["success", "deliveryQueued", "deliveryFailureReason"]),
    );
    expect(schema?.properties).toHaveProperty("deliveryQueued");
    expect(schema?.properties).toHaveProperty("deliveryFailureReason");
    expect(schema?.properties).not.toHaveProperty("rawToken");
  });
});
