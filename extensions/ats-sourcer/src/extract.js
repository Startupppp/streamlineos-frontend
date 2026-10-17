/**
 * The function that runs inside the profile page.
 *
 * It is injected with `chrome.scripting.executeScript({ func })`, which
 * serialises it and evaluates it in the page — so it must be entirely
 * self-contained. No imports, no closure over anything in this file.
 *
 * It only ever reads. Nothing here writes to the page, fires a network request
 * or runs unless the recruiter clicked the toolbar button on a tab they already
 * had open, which is the whole of "user-initiated only": there is no content
 * script registered in the manifest, so with the popup closed this extension
 * executes nothing at all.
 */
export function extractProfile() {
  const text = (selector) => {
    const node = document.querySelector(selector);
    const value = node && node.textContent ? node.textContent.trim() : "";
    return value.replace(/\s+/g, " ").slice(0, 300) || null;
  };

  const first = (selectors) => {
    for (const selector of selectors) {
      const value = text(selector);
      if (value) return value;
    }
    return null;
  };

  const host = location.hostname.replace(/^www\./, "");
  const onLinkedIn = host.endsWith("linkedin.com");
  const onNaukri = host.endsWith("naukri.com");
  const onGitHub = host.endsWith("github.com");

  /*
    Selector lists, longest-lived first, and a document-title fallback under
    all of them. A sourcing site rewrites its markup without warning, and the
    failure that matters is a silent one: a popup that renders a blank name
    invites a recruiter to save an empty candidate. Falling back to the tab
    title keeps a wrong-looking value visible and editable instead.
  */
  const nameSelectors = onLinkedIn
    ? ["h1.text-heading-xlarge", "main h1", "h1"]
    : onNaukri
      ? ["[itemprop='name']", ".candidate-name", "h1"]
      : onGitHub
        ? ["[itemprop='name']", ".vcard-fullname", "h1"]
        : ["h1"];

  const headlineSelectors = onLinkedIn
    ? [".text-body-medium.break-words", "main h1 + div"]
    : onNaukri
      ? [".designation", "[itemprop='jobTitle']"]
      : onGitHub
        ? ["[itemprop='description']", ".user-profile-bio"]
        : ["h2"];

  const locationSelectors = onLinkedIn
    ? ["span.text-body-small.inline.t-black--light.break-words"]
    : onNaukri
      ? [".location", "[itemprop='address']"]
      : onGitHub
        ? ["[itemprop='homeLocation']", ".p-label"]
        : [];

  const companySelectors = onLinkedIn
    ? ["[aria-label^='Current company'] span", "button[aria-label*='Current company'] span"]
    : onNaukri
      ? [".company-name", "[itemprop='worksFor']"]
      : onGitHub
        ? ["[itemprop='worksFor']", ".p-org"]
        : [];

  const docTitle = document.title.split(/[|–—-]/)[0].trim().slice(0, 200) || null;

  /*
    Contact details are read from the page only where the page already shows
    them to this recruiter. Nothing here opens a "contact info" panel, follows
    a link or calls an endpoint to reveal an address that is hidden — the
    consent the recruiter gives is for recording what is on screen, and it
    cannot cover data the extension went and fetched on its own.
  */
  const bodyText = document.body ? document.body.innerText.slice(0, 200000) : "";
  const emailMatch = bodyText.match(/[\w.+-]+@[\w-]+\.[\w.-]{2,}/);
  const phoneMatch = bodyText.match(/(?:\+\d{1,3}[\s-]?)?(?:\d[\s-]?){8,14}\d/);

  const skills = Array.from(document.querySelectorAll("[data-field='skill_card_skill_topic'] span, .skill-name, .pills-wrapper li"))
    .map((node) => (node.textContent || "").trim().replace(/\s+/g, " "))
    .filter((value) => value.length > 0 && value.length <= 80)
    .slice(0, 20);

  return {
    profileUrl: location.href,
    fullName: first(nameSelectors) || docTitle,
    headline: first(headlineSelectors),
    currentCompany: first(companySelectors),
    location: first(locationSelectors),
    email: emailMatch ? emailMatch[0].slice(0, 200) : null,
    phone: phoneMatch ? phoneMatch[0].trim().slice(0, 50) : null,
    skills: Array.from(new Set(skills)),
  };
}
