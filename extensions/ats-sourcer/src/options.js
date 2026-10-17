import { clearToken, normaliseBaseUrl, readSettings, writeSettings } from "./settings.js";

const el = (id) => document.getElementById(id);
const resultEl = el("result");

function showResult(message, tone) {
  resultEl.textContent = message;
  resultEl.hidden = false;
  if (tone) resultEl.dataset.tone = tone;
  else delete resultEl.dataset.tone;
}

async function run() {
  const settings = await readSettings();
  el("apiBaseUrl").value = settings.apiBaseUrl;
  el("token").value = settings.token;
  el("tokenExpiresAt").value = settings.tokenExpiresAt;

  el("form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const apiBaseUrl = normaliseBaseUrl(el("apiBaseUrl").value);
    if (!apiBaseUrl) {
      showResult("Enter an https address (or http://localhost for development).", "error");
      return;
    }

    const token = el("token").value.trim();
    if (!token) {
      showResult("Paste the sourcing token issued in Recruitment settings.", "error");
      return;
    }

    /*
      MV3 grants cross-origin access per host, and an install has none. Asking
      at the moment the recruiter names their own API is the one point where
      the prompt explains itself; requesting it at install time would ask for
      access to a host nobody has named yet.
    */
    const origin = `${new URL(apiBaseUrl).origin}/*`;
    const granted = await chrome.permissions.request({ origins: [origin] }).catch(() => false);
    if (!granted) {
      showResult(`Chrome did not grant access to ${origin}, so the extension cannot call it.`, "error");
      return;
    }

    await writeSettings({ apiBaseUrl, token, tokenExpiresAt: el("tokenExpiresAt").value.trim() });
    showResult("Saved. Open a profile page and click the toolbar button.");
  });

  el("forget").addEventListener("click", async () => {
    await clearToken();
    el("token").value = "";
    el("tokenExpiresAt").value = "";
    showResult("Token removed from this browser. It is still valid until you revoke it in StreamlineOS.");
  });
}

void run();
