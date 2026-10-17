/**
 * The two calls this extension makes, and the one place it decides what an
 * error means.
 */

export class SourcerError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "SourcerError";
    this.status = status;
  }
}

async function call(settings, path, init) {
  let response;
  try {
    response = await fetch(`${settings.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${settings.token}`,
        "Content-Type": "application/json",
        ...(init && init.headers),
      },
    });
  } catch {
    // A network failure and a rejected request need different advice, and only
    // this branch knows the request never reached StreamlineOS at all.
    throw new SourcerError("Could not reach StreamlineOS. Check the API address in Settings.", 0);
  }

  if (response.status === 401 || response.status === 403) {
    throw new SourcerError(
      "This sourcing token is no longer accepted. Issue a new one from Recruitment settings.",
      response.status,
    );
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    /*
      The API answers with `{ success: false, error: { message } }`. Reading
      the server's own sentence matters here: a plan-limit refusal and a
      validation refusal are both 4xx, and "Candidate limit reached on your
      plan" is the difference between a recruiter upgrading and a recruiter
      filing a bug.
    */
    const message =
      (payload && payload.error && payload.error.message) ||
      `StreamlineOS refused the request (${response.status}).`;
    throw new SourcerError(message, response.status);
  }

  return payload && typeof payload === "object" && "data" in payload ? payload.data : payload;
}

export function lookupProfile(settings, profileUrl) {
  const query = new URLSearchParams({ profileUrl });
  return call(settings, `/hr/recruitment/sourcing/profiles/lookup?${query.toString()}`, {
    method: "GET",
  });
}

export function saveProfile(settings, body) {
  return call(settings, "/hr/recruitment/sourcing/profiles", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
