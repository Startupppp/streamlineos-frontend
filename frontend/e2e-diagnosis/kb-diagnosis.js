/**
 * Knowledge-base diagnosis script.
 * Run with: node kb-diagnosis.js
 * Uses Playwright (already installed in the project).
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:1000';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';
const EMAIL = 'demo@streamlineos.in';
const PASSWORD = 'Demo@2026!';

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR);

const log = (...args) => console.log('[DIAG]', ...args);

async function login(context) {
  log('--- LOGIN ---');
  // Step 1: get CSRF token
  const csrfRes = await context.request.get(`${BASE_URL}/api/auth/csrf`);
  const csrfBody = await csrfRes.json();
  const csrfToken = csrfBody.csrfToken;
  log('CSRF token:', csrfToken);

  // Step 2: POST credentials
  const loginRes = await context.request.post(`${BASE_URL}/api/auth/callback/credentials`, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    data: new URLSearchParams({
      csrfToken,
      email: EMAIL,
      password: PASSWORD,
      callbackUrl: `${BASE_URL}/dashboard`,
      json: 'true',
    }).toString(),
  });

  log('Login response status:', loginRes.status());
  const loginBody = await loginRes.text();
  log('Login response body (first 200 chars):', loginBody.slice(0, 200));

  // Grab cookies
  const cookies = await context.cookies();
  const sessionCookie = cookies.find(c => c.name.includes('session') || c.name.includes('authjs'));
  log('Session cookie found:', sessionCookie ? sessionCookie.name : 'NONE');
  log('All cookies:', cookies.map(c => `${c.name}=${c.value.slice(0, 20)}...`));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1440, height: 900 },
  });

  const consoleErrors = [];
  const networkRequests = [];

  // Collect console messages across ALL pages
  context.on('page', (page) => {
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleErrors.push({ type: msg.type(), text: msg.text(), url: page.url() });
      }
    });
    page.on('pageerror', err => {
      consoleErrors.push({ type: 'pageerror', text: err.message, url: page.url() });
    });
    page.on('request', req => {
      const url = req.url();
      if (url.includes('/kb/') || url.includes('knowledge-base')) {
        networkRequests.push({ method: req.method(), url, body: req.postData() || null });
      }
    });
    page.on('response', async res => {
      const url = res.url();
      if (url.includes('/kb/') || url.includes('knowledge-base')) {
        const entry = networkRequests.find(r => r.url === url && !r.status);
        if (entry) entry.status = res.status();
        else networkRequests.push({ method: res.request().method(), url, status: res.status() });
      }
    });
  });

  await login(context);

  const page = await context.newPage();

  // Also catch on this explicit page
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleErrors.push({ type: msg.type(), text: msg.text(), url: page.url() });
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push({ type: 'pageerror', text: err.message, url: page.url() });
  });
  page.on('request', req => {
    const url = req.url();
    if (url.includes('/kb/') || url.includes('/knowledge-base')) {
      networkRequests.push({ method: req.method(), url, body: req.postData() || null });
    }
  });
  page.on('response', async res => {
    const url = res.url();
    if (url.includes('/kb/') || url.includes('/knowledge-base')) {
      const entry = networkRequests.find(r => r.url === url && !r.status);
      if (entry) entry.status = res.status();
    }
  });

  // =====================
  // STEP 1: Navigate to /knowledge-base
  // =====================
  log('\n--- STEP 1: Navigate to /knowledge-base ---');
  try {
    await page.goto(`${BASE_URL}/knowledge-base`, { waitUntil: 'networkidle', timeout: 60000 });
  } catch (e) {
    log('Navigation timeout (non-fatal):', e.message);
  }
  log('Current URL after nav:', page.url());
  const kbTitle = await page.title();
  log('Page title:', kbTitle);

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-kb-home.png'), fullPage: true });
  log('Screenshot saved: 01-kb-home.png');

  // Check for visible content
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
  log('Page body text (first 500):', bodyText);

  // =====================
  // STEP 2: Click "New page" button
  // =====================
  log('\n--- STEP 2: Click New Page ---');

  // Look for "New page" button or any create button
  const newPageButton = await page.$('button:has-text("New page"), button:has-text("New Page"), button[aria-label*="new"], button[aria-label*="New"], [data-testid*="new-page"]');
  log('New page button found:', !!newPageButton);

  if (!newPageButton) {
    // Try to find any button that might create a page
    const allButtons = await page.$$eval('button', btns => btns.map(b => b.textContent?.trim()).filter(Boolean));
    log('All buttons on page:', allButtons);

    // Look for "+" or add icon buttons
    const plusBtn = await page.$('button:has-text("+"), [title*="new" i], [aria-label*="new page" i], [aria-label*="add page" i]');
    log('Plus/add button found:', !!plusBtn);
  }

  let pageDocUrl = null;

  if (newPageButton) {
    await newPageButton.click();
    log('Clicked New Page button');
  } else {
    // Try clicking something to create a page
    const addBtn = await page.$('[data-testid*="add"], button:has-text("Add"), a:has-text("New")');
    if (addBtn) {
      await addBtn.click();
      log('Clicked add button');
    } else {
      log('Could not find New Page button — looking for tree + button');
      // Try hovering over tree items and finding the + button
      const treeItem = await page.$('[role="treeitem"], .tree-item, [data-tree-item]');
      if (treeItem) {
        await treeItem.hover();
        await page.waitForTimeout(500);
        const inlineAdd = await page.$('button[aria-label*="add" i], button:has-text("+")');
        if (inlineAdd) {
          await inlineAdd.click();
          log('Clicked inline add button in tree');
        }
      }
    }
  }

  try {
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    log('No navigation after click (may be expected):', e.message.slice(0, 100));
  }

  pageDocUrl = page.url();
  log('URL after clicking New Page:', pageDocUrl);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-after-new-page.png'), fullPage: true });
  log('Screenshot saved: 02-after-new-page.png');

  // Check if we're on a page doc route
  const isOnPageDoc = pageDocUrl.includes('/knowledge-base/pages/') || pageDocUrl.includes('/knowledge-base/');
  log('Is on page doc route:', isOnPageDoc);

  // If not on a page doc yet, try to find and navigate to one
  if (!pageDocUrl.includes('/pages/')) {
    log('Not on page doc — trying to find a link to a page doc');
    const pageLink = await page.$('a[href*="/knowledge-base/pages/"]');
    if (pageLink) {
      const href = await pageLink.getAttribute('href');
      log('Found page link:', href);
      await page.goto(`${BASE_URL}${href}`, { waitUntil: 'networkidle', timeout: 30000 });
      pageDocUrl = page.url();
      log('Navigated to page doc:', pageDocUrl);
    }
  }

  // =====================
  // STEP 3: On page doc — title, body, network
  // =====================
  log('\n--- STEP 3: Page Document Interaction ---');
  log('Current URL:', page.url());

  // 3a: Capture all console errors (already collecting)

  // Look for the title textarea/input
  const titleSelectors = [
    'textarea[placeholder="Untitled"]',
    'input[placeholder="Untitled"]',
    '[data-testid="page-title"]',
    '.page-title',
    'h1[contenteditable]',
    '[placeholder="Untitled"]',
    'textarea.title',
    'input.title',
  ];

  let titleEl = null;
  for (const sel of titleSelectors) {
    titleEl = await page.$(sel);
    if (titleEl) {
      log('Found title element with selector:', sel);
      break;
    }
  }

  if (!titleEl) {
    log('Title element NOT found — listing all inputs/textareas:');
    const allInputs = await page.$$eval('input, textarea, [contenteditable="true"]', els =>
      els.map(el => ({
        tag: el.tagName,
        placeholder: el.getAttribute('placeholder'),
        class: el.className?.slice(0, 80),
        contenteditable: el.getAttribute('contenteditable'),
      }))
    );
    log('All inputs/textareas/contenteditable:', JSON.stringify(allInputs, null, 2));
  }

  // Clear network log for step 3b
  const step3NetworkReqs = [];
  const step3ReqHandler = (req) => {
    const url = req.url();
    if (url.includes('/kb/') || url.includes('/api/')) {
      step3NetworkReqs.push({ method: req.method(), url, body: req.postData() || null });
    }
  };
  const step3ResHandler = async (res) => {
    const url = res.url();
    if (url.includes('/kb/') || url.includes('/api/')) {
      const entry = step3NetworkReqs.find(r => r.url === url && !r.status);
      if (entry) entry.status = res.status();
    }
  };
  page.on('request', step3ReqHandler);
  page.on('response', step3ResHandler);

  // 3b: Type "Hello Wiki" into title
  if (titleEl) {
    log('Typing "Hello Wiki" into title...');
    await titleEl.click({ clickCount: 3 });
    await titleEl.fill('Hello Wiki');
    log('Typed "Hello Wiki" into title');
    await page.waitForTimeout(3000);
    log('Waited 3 seconds after typing title');
  } else {
    log('SKIPPED title typing — element not found');
  }

  log('Network requests after title typing:', JSON.stringify(step3NetworkReqs, null, 2));

  // 3c: Check tree update
  await page.waitForTimeout(2000);
  const treeText = await page.$$eval('[role="treeitem"], .tree-item, nav a, [data-sidebar]', els =>
    els.map(el => el.textContent?.trim()).filter(Boolean)
  );
  log('Tree items text after title change:', treeText.slice(0, 20));
  const treeHasHelloWiki = treeText.some(t => t.includes('Hello Wiki'));
  log('Tree shows "Hello Wiki":', treeHasHelloWiki);

  // 3d: Click into body and type
  const bodySelectors = [
    '.ProseMirror',
    '[data-testid="editor-body"]',
    '.tiptap',
    '[contenteditable="true"]:not([placeholder="Untitled"])',
    '.editor-content [contenteditable]',
    '[role="textbox"]',
  ];

  let bodyEl = null;
  for (const sel of bodySelectors) {
    bodyEl = await page.$(sel);
    if (bodyEl) {
      log('Found body editor with selector:', sel);
      break;
    }
  }

  const beforeBodyErrors = consoleErrors.length;

  if (bodyEl) {
    log('Clicking into body editor...');
    await bodyEl.click();
    await page.waitForTimeout(500);
    await page.keyboard.type('test content');
    log('Typed "test content" into body');
    await page.waitForTimeout(2500);
    log('Waited 2.5s after typing body');

    const bodyContent = await bodyEl.evaluate(el => el.textContent || el.innerHTML);
    log('Body element content:', bodyContent?.slice(0, 200));
  } else {
    log('Body editor NOT found');
    // Check all contenteditable
    const allEditable = await page.$$eval('[contenteditable]', els =>
      els.map(el => ({
        tag: el.tagName,
        contenteditable: el.getAttribute('contenteditable'),
        class: el.className?.slice(0, 80),
        text: el.textContent?.slice(0, 50),
      }))
    );
    log('All contenteditable elements:', JSON.stringify(allEditable, null, 2));
  }

  const afterBodyErrors = consoleErrors.slice(beforeBodyErrors);
  log('Console errors after body typing:', afterBodyErrors.map(e => e.text));

  // Screenshot the full page
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-page-doc.png'), fullPage: true });
  log('Screenshot saved: 03-page-doc.png');

  // =====================
  // STEP 4: Test dropdown (⋯ button)
  // =====================
  log('\n--- STEP 4: Tree item ⋯ dropdown ---');

  // Go back to knowledge-base to see the tree
  // Or find tree on the current page
  const treeItemEl = await page.$('[role="treeitem"], [data-tree-item], .sidebar-tree-item, nav li');
  log('Tree item element found:', !!treeItemEl);

  if (treeItemEl) {
    await treeItemEl.hover();
    await page.waitForTimeout(500);

    // Look for ⋯ or more button
    const moreBtn = await page.$('button[aria-label*="more" i], button[aria-label*="options" i], button:has-text("⋯"), button:has-text("..."), [data-testid*="more"], [role="button"][aria-haspopup]');
    log('More/⋯ button found:', !!moreBtn);

    if (moreBtn) {
      const moreBtnBounds = await moreBtn.boundingBox();
      log('More button position:', moreBtnBounds);

      await moreBtn.click();
      await page.waitForTimeout(500);

      // Check dropdown position
      const dropdown = await page.$('[role="menu"], [data-radix-popper-content-wrapper], .dropdown-menu, [data-state="open"][role="menu"]');
      log('Dropdown found:', !!dropdown);

      if (dropdown) {
        const dropdownBounds = await dropdown.boundingBox();
        log('Dropdown position:', dropdownBounds);
        log('More button position was:', moreBtnBounds);

        // Check if dropdown is near the button or at top-left
        const isTopLeft = dropdownBounds && dropdownBounds.x < 50 && dropdownBounds.y < 50;
        const isNearButton = dropdownBounds && moreBtnBounds &&
          Math.abs(dropdownBounds.x - moreBtnBounds.x) < 300 &&
          Math.abs(dropdownBounds.y - moreBtnBounds.y) < 200;
        log('Dropdown at top-left corner:', isTopLeft);
        log('Dropdown near button:', isNearButton);
      }

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-dropdown.png'), fullPage: true });
      log('Screenshot saved: 04-dropdown.png');
    }
  }

  // =====================
  // FINAL: Summary
  // =====================
  log('\n=== FINAL SUMMARY ===');
  log('All console errors/warnings (deduped):');
  const dedupedErrors = [];
  const seen = new Set();
  for (const e of consoleErrors) {
    if (!seen.has(e.text)) {
      seen.add(e.text);
      dedupedErrors.push(e);
    }
  }
  for (const e of dedupedErrors) {
    log(`  [${e.type.toUpperCase()}] ${e.text}`);
  }

  log('\nAll /kb/* network requests:');
  for (const r of networkRequests) {
    log(`  ${r.method} ${r.url} → ${r.status || 'pending'} | body: ${r.body ? r.body.slice(0, 200) : 'none'}`);
  }

  log('\nStep 3 network requests (title/body editing):');
  for (const r of step3NetworkReqs) {
    log(`  ${r.method} ${r.url} → ${r.status || 'pending'} | body: ${r.body ? r.body.slice(0, 200) : 'none'}`);
  }

  await browser.close();
  log('\nDone. Screenshots in:', SCREENSHOTS_DIR);
}

main().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
