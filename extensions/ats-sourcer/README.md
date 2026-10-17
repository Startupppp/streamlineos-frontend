# StreamlineOS Sourcer (Chrome MV3)

Saves a profile the recruiter is already looking at into StreamlineOS Recruitment.

There is no build step. It is plain ES modules loaded from disk, which is deliberate: a
bundler between the source and the thing that handles a candidate's personal data is one
more place for a supply-chain problem to enter, and this extension is small enough not to
need one.

## Load it

1. `chrome://extensions` → enable **Developer mode**.
2. **Load unpacked** → choose this folder (`extensions/ats-sourcer`).
3. Click the extension → **Settings**.
4. In StreamlineOS: **HR → Recruitment → Settings → Connections → Sourcing extension →
   Issue token**. The token is shown once.
5. Paste the API address and the token. Chrome will ask to allow that host — that prompt is
   the extension asking for permission to call your own API, and refusing it stops the
   extension working.

## What it does and does not do

- **User-initiated only.** No content script is registered. With the popup closed, this
  extension runs no code on any page. Reading the page happens on the click, under
  `activeTab`, which expires when you navigate away.
- **Reads only what the page already shows you.** It does not open a "contact info" panel,
  follow a link, or call a site's API to reveal an address that was hidden.
- **The token never reaches the page.** It lives in `chrome.storage.local` and is used only
  from the popup, which runs in the extension's own origin.
- **Consent is per save.** The checkbox starts unchecked on every open and is never
  remembered.
- **One permission.** The token carries `hr:requisitions:manage` and nothing else, so a
  leaked token can add candidates — it cannot read offers, salaries or the rest of the
  pipeline. It expires on the deadline chosen when it was issued.

## Manual checklist

Run this against a real tenant before calling a change to this folder done. The API half is
covered by `sourced-profile.spec.ts` in the backend; this list is the half jest cannot see.

| # | Step | Expected |
|---|---|---|
| 1 | Click the toolbar button with no token saved | "Not connected yet. Open Settings…" and no form |
| 2 | Save settings with an `http://` non-localhost address | Refused with the https message; nothing stored |
| 3 | Decline Chrome's host permission prompt | "Chrome did not grant access to …"; nothing stored |
| 4 | Click the button on `chrome://extensions` | "Open a candidate's profile page…" |
| 5 | Open a LinkedIn profile, click the button | Name, headline and location fill in; the URL shows underneath |
| 6 | Try to press **Save candidate** before ticking consent | Button is disabled |
| 7 | Tick consent, save | "Saved … as a new candidate"; the candidate appears in HR → Recruitment → Candidates with source LinkedIn |
| 8 | Open the candidate in StreamlineOS | Notes carry "Sourced from a linkedin profile: …" |
| 9 | Click the button on the same profile again | Status reads "Already in StreamlineOS as …" before you save |
| 10 | Edit the company in StreamlineOS, then save from the extension again | "Matched an existing candidate… Left the existing currentCompany alone" — your edit survives |
| 11 | Save a profile whose page shows no email | Candidate is created; email column holds a `@sourced.invalid` placeholder and the popup reports no email |
| 12 | Revoke the token in **Settings → API tokens**, then save | "This sourcing token is no longer accepted. Issue a new one…" |
| 13 | Set the API address to a host that is down | "Could not reach StreamlineOS. Check the API address in Settings." |
| 14 | Sign in as a user without `hr:requisitions:manage` and try to issue a token | The issue button is not offered; the API refuses with 403 |
| 15 | Open the popup at a system dark theme | Panel renders dark; no unreadable text |

## Where the pieces are

| Path | What it is |
|---|---|
| `src/popup.*` | The only UI. Extraction is triggered here, the consent box lives here, the API call is made from here. |
| `src/extract.js` | The function injected into the page. Self-contained by necessity — `chrome.scripting` serialises it. |
| `src/api.js` | The two endpoints, and the decision about what each failure means. |
| `src/settings.js` | Storage and the base-URL normaliser. |
| `src/options.*` | Token entry and the host-permission request. |

Backend: `src/modules/hr/recruitment/sourcing-extension/` in `streamlineos-backend`.
