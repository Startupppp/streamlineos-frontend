import { readSettings, tokenExpired } from "./settings.js";
import { extractProfile } from "./extract.js";
import { lookupProfile, saveProfile, SourcerError } from "./api.js";

const el = (id) => document.getElementById(id);
const statusEl = el("status");
const formEl = el("form");
const resultEl = el("result");
const consentEl = el("consent");
const saveEl = el("save");

function setStatus(message, tone) {
  statusEl.textContent = message;
  if (tone) statusEl.dataset.tone = tone;
  else delete statusEl.dataset.tone;
}

function showResult(message, tone) {
  resultEl.textContent = message;
  resultEl.hidden = false;
  if (tone) resultEl.dataset.tone = tone;
  else delete resultEl.dataset.tone;
}

function trimmedOrNull(id) {
  const value = el(id).value.trim();
  return value === "" ? null : value;
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

async function run() {
  el("settingsLink").addEventListener("click", (event) => {
    event.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  const settings = await readSettings();
  if (!settings.apiBaseUrl || !settings.token) {
    setStatus("Not connected yet. Open Settings and paste a sourcing token.", "error");
    return;
  }
  if (tokenExpired(settings.tokenExpiresAt)) {
    setStatus("Your sourcing token has expired. Issue a new one in Recruitment settings.", "error");
    return;
  }

  const tab = await activeTab();
  if (!tab || !tab.id || !tab.url || !/^https?:/.test(tab.url)) {
    setStatus("Open a candidate's profile page, then click this button again.", "error");
    return;
  }

  /*
    The injection is what makes this user-initiated. `activeTab` grants access
    to this one tab, for this one click, because the recruiter clicked the
    toolbar button on it — it expires on navigation and there is no standing
    permission to any site.
  */
  let profile;
  try {
    const [injected] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractProfile,
    });
    profile = injected && injected.result ? injected.result : null;
  } catch {
    setStatus("Chrome would not let the extension read this page.", "error");
    return;
  }
  if (!profile) {
    setStatus("Nothing could be read from this page.", "error");
    return;
  }

  el("fullName").value = profile.fullName ?? "";
  el("headline").value = profile.headline ?? "";
  el("currentCompany").value = profile.currentCompany ?? "";
  el("location").value = profile.location ?? "";
  el("email").value = profile.email ?? "";
  el("phone").value = profile.phone ?? "";
  el("profileUrl").textContent = profile.profileUrl;
  formEl.hidden = false;

  /*
    Every extracted value is shown in an editable field rather than posted
    straight through. A selector that has drifted produces a visibly wrong name
    the recruiter fixes in two seconds; the same drift behind a one-click save
    produces a candidate record nobody notices is wrong.
  */
  setStatus("Check what was read, then consent and save.");

  try {
    const known = await lookupProfile(settings, profile.profileUrl);
    if (known && known.candidateId) {
      setStatus(
        `Already in StreamlineOS as ${known.firstName} ${known.lastName} (${known.status}). Saving again fills blanks only.`,
        "known",
      );
    }
  } catch (error) {
    // A failed lookup is not a failed save. Say so and let them try.
    setStatus(
      error instanceof SourcerError
        ? `Could not check for an existing candidate: ${error.message}`
        : "Could not check for an existing candidate.",
      "error",
    );
  }

  consentEl.addEventListener("change", () => {
    saveEl.disabled = !consentEl.checked;
  });

  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!consentEl.checked) return;

    const fullName = el("fullName").value.trim();
    if (!fullName) {
      showResult("A name is required before this can be saved.", "error");
      return;
    }

    saveEl.disabled = true;
    saveEl.textContent = "Saving…";
    resultEl.hidden = true;

    const skills = Array.isArray(profile.skills) ? profile.skills : [];

    try {
      const saved = await saveProfile(settings, {
        profileUrl: profile.profileUrl,
        fullName,
        headline: trimmedOrNull("headline"),
        currentCompany: trimmedOrNull("currentCompany"),
        location: trimmedOrNull("location"),
        email: trimmedOrNull("email"),
        phone: trimmedOrNull("phone"),
        note: trimmedOrNull("note"),
        skills,
        consent: true,
      });

      const kept =
        saved.keptExisting && saved.keptExisting.length > 0
          ? ` Left the existing ${saved.keptExisting.join(", ")} alone.`
          : "";
      showResult(
        saved.outcome === "created"
          ? `Saved ${saved.firstName} ${saved.lastName} as a new candidate.`
          : `Matched an existing candidate and filled the blanks.${kept}`,
      );
      saveEl.textContent = "Saved";
    } catch (error) {
      showResult(
        error instanceof SourcerError ? error.message : "The save did not go through.",
        "error",
      );
      saveEl.textContent = "Save candidate";
      saveEl.disabled = false;
    }
  });
}

void run();
