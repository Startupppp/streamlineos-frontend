import { recipientSchema } from "./add-recipient-schema";

const base = { email: "signer@example.test", roleName: "Signer", recipientType: "signer", routingOrder: 1, authMethod: "email_link" };
const accepts = (name: string) => recipientSchema.safeParse({ ...base, name }).success;

describe("the add-recipient form takes the names the server accepts", () => {
  it.each(["Asha Rao", "QA-TEST-SIGN-S1", "Agent 007", "Acme Pvt. Ltd.", "José Núñez", "अमित शर्मा"])("accepts %s", (name) => {
    expect(accepts(name)).toBe(true);
  });

  it.each(["a", "<b>x</b>", "-Leading dash"])("rejects %j", (name) => {
    expect(accepts(name)).toBe(false);
  });
});
