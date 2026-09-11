/**
 * Spending a waitlist invitation.
 *
 * Same shape as `waitlist-client.ts` and for the same reason: a direct call to
 * the API from the browser, not a Next route handler. The rule is that the auth
 * bridge is the only business route handler in this app, and adding a second one
 * to proxy a public endpoint would be adding a hop that can fail for a benefit
 * nobody asked for.
 */

const GENERIC_ERROR = "Couldn't set up your workspace. Please try again.";

export interface ClaimValues {
  readonly token: string;
  readonly firstName: string;
  readonly lastName?: string;
  readonly companyName: string;
  readonly country?: string;
}

export type ClaimResult =
  | { ok: true; email: string; reference: string }
  | { ok: false; error: string };

export async function claimInvitation(values: ClaimValues): Promise<ClaimResult> {
  let res: Response;
  try {
    res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/waitlist/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: values.token,
        firstName: values.firstName,
        lastName: values.lastName || undefined,
        companyName: values.companyName,
        country: values.country || undefined,
      }),
    });
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }

  let body: { data?: { email?: string; reference?: string }; message?: string } = {};
  try {
    body = (await res.json()) as typeof body;
  } catch {
    // A body that will not parse is not a reason to lose the status code.
  }

  if (!res.ok) {
    /**
     * The server's own message, deliberately.
     *
     * "That invitation has already been used" and "that invitation has expired"
     * lead to different next actions -- one is reassurance, the other is asking
     * for a new link -- and flattening both into a generic failure sends
     * everybody to support.
     */
    return { ok: false, error: body.message ?? GENERIC_ERROR };
  }

  return {
    ok: true,
    email: body.data?.email ?? "",
    reference: body.data?.reference ?? "",
  };
}
