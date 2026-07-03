/**
 * Knowledge-base diagnosis script — v4 with JWE cookie injection (bypasses rate limit).
 * Run: node e2e-diagnosis/kb-diagnosis.js (from frontend directory)
 *
 * Selectors from source analysis:
 * - New page: Plus icon button (no aria-label) in wiki sidebar header
 * - Tree items: <div role="button"> in sidebar
 * - More button: <button aria-label="Page options">
 * - Title: <textarea placeholder="Untitled">
 * - Editor: .ProseMirror inside .document-editor
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const BASE_URL = 'http://localhost:1000';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';
const SCREENSHOTS = path.join(__dirname, 'screenshots');
fs.mkdirSync(SCREENSHOTS, { recursive: true });

const log = (...args) => console.log('[DIAG]', ...args);

function ss(page, name) {
  return page.screenshot({ path: path.join(SCREENSHOTS, name), fullPage: true });
}

async function getSessionToken() {
  log('Generating JWE session token via gen-auth-cookie.mjs...');
  try {
    const token = execSync('node e2e-diagnosis/gen-auth-cookie.mjs', {
      cwd: path.join(__dirname, '..'),
      timeout: 30000,
    }).toString().trim();
    log('Token generated, length:', token.length, 'starts with:', token.slice(0, 30));
    return token;
  } catch (e) {
    log('Token generation failed:', e.message);
    return null;
  }
}

async function main() {
  const sessionToken = await getSessionToken();
  if (!sessionToken) {
    log('Cannot proceed without session token');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 } });

  // Inject auth cookie
  await context.addCookies([{
    name: 'authjs.session-token',
    value: sessionToken,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
  }]);
  log('Injected authjs.session-token cookie');

  const page = await context.newPage();

  const consoleErrors = [];
  const kbNetworkLog = [];

  page.on('console', msg => {
    const t = msg.type();
    if (t === 'error' || t === 'warning') {
      consoleErrors.push({ type: t, text: msg.text(), url: page.url() });
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push({ type: 'pageerror', text: err.message, url: page.url() });
  });

  page.on('request', req => {
    const url = req.url();
    if (url.includes('/kb/')) {
      kbNetworkLog.push({ method: req.method(), url, body: req.postData() || null, status: null });
    }
  });
  page.on('response', async res => {
    const url = res.url();
    if (url.includes('/kb/')) {
      let responseBody = null;
      try { responseBody = await res.json(); } catch {}
      const entry = kbNetworkLog.slice().reverse().find(r => r.url === url && r.status === null);
      if (entry) { entry.status = res.status(); entry.responseBody = responseBody; }
    }
  });

  // Verify session works — use 'domcontentloaded' to avoid networkidle timeout on first compile
  log('--- VERIFY SESSION ---');
  try {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  } catch (e) {
    log('Dashboard nav timeout (continuing):', e.message.slice(0, 80));
  }
  // Wait a bit for any client-side redirect
  await page.waitForTimeout(5000);
  log('URL after /dashboard:', page.url());

  if (!page.url() || page.url() === 'about:blank') {
    log('Page stuck on about:blank — retrying navigation');
    try {
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'commit', timeout: 30000 });
      await page.waitForTimeout(5000);
    } catch (e) {
      log('Retry also failed:', e.message.slice(0, 60));
    }
    log('URL after retry:', page.url());
  }

  if (page.url().includes('/signin')) {
    log('ERROR: Session not accepted — still redirected to /signin');
    await ss(page, '00-session-fail.png').catch(() => {});
    await browser.close();
    return;
  }

  log('Session accepted! URL:', page.url());
  await ss(page, '00-post-login.png').catch(e => log('Screenshot failed:', e.message.slice(0, 60)));

  // =====================
  // STEP 1: Navigate to /knowledge-base
  // =====================
  log('\n--- STEP 1: /knowledge-base ---');
  try {
    await page.goto(`${BASE_URL}/knowledge-base`, { waitUntil: 'networkidle', timeout: 60000 });
  } catch (e) {
    log('KB nav timeout (continuing):', e.message.slice(0, 60));
  }

  log('URL:', page.url());
  log('Title:', await page.title());

  const step1Body = await page.evaluate(() => document.body.innerText.slice(0, 400));
  log('Body text:', step1Body);
  log('Console errors so far:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    consoleErrors.forEach(e => log('  EARLY ERROR:', e.type, e.text.slice(0, 100)));
  }

  await ss(page, '01-kb-home.png');

  // Wait for tree to load
  await page.waitForTimeout(3000);

  // =====================
  // STEP 2: Find + Click "New Page" button
  // The button is a shadcn Button (ghost, icon) with Plus icon in wiki sidebar header.
  // No aria-label in source (wiki-shell.tsx).
  // =====================
  log('\n--- STEP 2: New Page Button ---');

  // Dump all buttons in sidebar for inspection
  const sidebarBtns = await page.$$eval('aside button', btns => btns.map(b => ({
    text: b.textContent?.trim().slice(0, 30),
    ariaLabel: b.getAttribute('aria-label'),
    class: b.className?.slice(0, 60),
    svgPaths: Array.from(b.querySelectorAll('path')).map(p => p.getAttribute('d') || '').join('|').slice(0, 100),
  })));
  log('Sidebar buttons:', JSON.stringify(sidebarBtns, null, 2));

  let newPageBtn = null;
  for (const btn of await page.$$('aside button')) {
    const ariaLabel = await btn.getAttribute('aria-label');
    if (ariaLabel && (ariaLabel.includes('Collapse') || ariaLabel.includes('Expand'))) continue;
    const text = await btn.evaluate(el => el.textContent?.trim());
    if (text && text.length > 3) continue; // skip text buttons
    // Check for Plus SVG path
    const hasPlusPath = await btn.evaluate(el => {
      const paths = Array.from(el.querySelectorAll('path'));
      const svgHtml = el.querySelector('svg')?.innerHTML?.toLowerCase() || '';
      // Lucide Plus icon paths
      return svgHtml.includes('m12 5') || svgHtml.includes('h8') ||
        paths.some(p => {
          const d = (p.getAttribute('d') || '').toLowerCase();
          return d.includes('m12 5') || d.includes('m8 12h8') || (d.includes('v8') && d.includes('h8'));
        });
    });

    const visible = await btn.isVisible();
    if (visible) {
      log('Candidate button: ariaLabel=', ariaLabel, 'text=', text, 'hasPlusPath=', hasPlusPath);
    }
    if (visible && hasPlusPath) {
      newPageBtn = btn;
      log('Selected as New Page button (has Plus path, no aria-label conflict)');
      break;
    }
  }

  if (!newPageBtn) {
    log('Could not identify New Page button via SVG path — trying index-based');
    const allSidebarBtns = await page.$$('aside button');
    for (const btn of allSidebarBtns) {
      const al = await btn.getAttribute('aria-label');
      const text = await btn.evaluate(el => el.textContent?.trim());
      const visible = await btn.isVisible();
      log('  btn al=', al, 'text=', text, 'visible=', visible);
    }
  }

  const beforeUrl = page.url();
  let pageDocUrl = beforeUrl;

  if (newPageBtn) {
    log('Clicking New Page button...');
    await newPageBtn.click();
    try {
      await page.waitForURL(u => u.toString().includes('/knowledge-base/pages/'), { timeout: 15000 });
      pageDocUrl = page.url();
      log('Navigated to page doc:', pageDocUrl);
    } catch (e) {
      log('No /pages/ navigation:', page.url());
    }
  } else {
    // Fall back: navigate to an existing page from tree
    log('Fallback: looking for existing page links in tree...');
    const treeLinks = await page.$$eval('aside a[href*="/knowledge-base/pages/"]', links =>
      links.map(a => a.getAttribute('href'))
    );
    log('Tree page links:', treeLinks.slice(0, 5));

    if (treeLinks.length > 0) {
      await page.goto(`${BASE_URL}${treeLinks[0]}`, { waitUntil: 'networkidle', timeout: 30000 });
      pageDocUrl = page.url();
    } else {
      // Try clicking a tree node directly
      const treeBtn = await page.$('aside [role="button"]');
      if (treeBtn) {
        await treeBtn.click();
        try {
          await page.waitForURL(u => u.toString().includes('/pages/'), { timeout: 8000 });
          pageDocUrl = page.url();
        } catch {}
      }
    }
  }

  await ss(page, '02-after-new-page.png');
  log('URL after Step 2:', page.url());

  // =====================
  // STEP 3: Page document — title, body, network
  // =====================
  log('\n--- STEP 3: Page Document ---');
  log('URL:', page.url());
  await page.waitForTimeout(3000);
  await ss(page, '03a-initial.png');

  // 3a: console errors
  log('Console errors (count):', consoleErrors.length);
  consoleErrors.forEach(e => log(`  [${e.type}] ${e.text.slice(0, 100)}`));

  // Reset for tracking step-specific requests
  const titleKbReqs = [];
  page.on('request', req => {
    if (req.url().includes('/kb/')) titleKbReqs.push({ method: req.method(), url: req.url(), body: req.postData(), status: null });
  });
  page.on('response', async res => {
    if (res.url().includes('/kb/')) {
      const entry = titleKbReqs.slice().reverse().find(r => r.url === res.url() && r.status === null);
      if (entry) entry.status = res.status();
    }
  });

  // Find title
  const titleEl = await page.$('textarea[placeholder="Untitled"]');
  log('Title textarea[placeholder="Untitled"] found:', !!titleEl);

  if (!titleEl) {
    const allInpEditable = await page.$$eval('input, textarea, [contenteditable]', els =>
      els.map(el => ({ tag: el.tagName, ph: el.getAttribute('placeholder'), ce: el.getAttribute('contenteditable'), cls: el.className?.slice(0, 50) }))
    );
    log('All inputs/editables:', JSON.stringify(allInpEditable, null, 2));
  }

  const preTypingErrors = consoleErrors.length;

  // 3b: Type title
  if (titleEl) {
    log('Typing "Hello Wiki" in title...');
    await titleEl.click({ clickCount: 3 });
    await titleEl.fill('Hello Wiki');
    log('Typed. Waiting 3s for autosave (debounce=1500ms)...');
    await page.waitForTimeout(3000);
  } else {
    log('SKIPPED title typing');
    await page.waitForTimeout(3000);
  }

  const titleEditErrors = consoleErrors.slice(preTypingErrors);
  log('Console errors during title typing:', titleEditErrors.map(e => `[${e.type}] ${e.text}`));

  log('KB network requests during title edit:');
  titleKbReqs.forEach(r => log(`  ${r.method} ${r.url} → ${r.status} | body: ${r.body ? r.body.slice(0, 300) : 'none'}`));

  // 3c: Check tree update
  await page.waitForTimeout(2000);
  const treeTexts = await page.$$eval('aside [role="button"]', els =>
    els.map(el => el.textContent?.trim().slice(0, 60)).filter(Boolean)
  );
  log('Tree button texts after title change:', treeTexts);
  log('Shows "Hello Wiki":', treeTexts.some(t => t.includes('Hello Wiki')));

  // 3d: TipTap body editor
  const docEditorEl = await page.$('.document-editor');
  log('.document-editor element found:', !!docEditorEl);

  const prosemirrorEl = await page.$('.ProseMirror');
  log('.ProseMirror element found:', !!prosemirrorEl);

  // Check for Skeleton (loading indicator)
  const skeletonEl = await page.$('[class*="skeleton"], [class*="Skeleton"]');
  log('Skeleton found (editor loading):', !!skeletonEl);

  // Console errors that mention tiptap/chunk
  const tiptapErrors = consoleErrors.filter(e =>
    e.text.toLowerCase().includes('tiptap') ||
    e.text.toLowerCase().includes('chunk') ||
    e.text.toLowerCase().includes('module') ||
    e.text.toLowerCase().includes('cannot find') ||
    e.text.toLowerCase().includes('failed to fetch')
  );
  log('TipTap/module-related console errors:', tiptapErrors.map(e => e.text));

  // Body network tracking
  const bodyKbReqs = [];
  page.on('request', req => {
    if (req.url().includes('/kb/')) bodyKbReqs.push({ method: req.method(), url: req.url(), body: req.postData(), status: null });
  });
  page.on('response', async res => {
    if (res.url().includes('/kb/')) {
      const entry = bodyKbReqs.slice().reverse().find(r => r.url === res.url() && r.status === null);
      if (entry) entry.status = res.status();
    }
  });

  const preBodyErrors = consoleErrors.length;

  if (prosemirrorEl) {
    log('Clicking into .ProseMirror and typing "test content"...');
    await prosemirrorEl.click();
    await page.waitForTimeout(300);
    await page.keyboard.type('test content');
    log('Typed. Waiting 2.5s...');
    await page.waitForTimeout(2500);

    const bodyContent = await prosemirrorEl.evaluate(el => el.textContent || '').catch(() => '');
    log('Body content after typing:', bodyContent.slice(0, 200));
  } else {
    log('Body editor NOT found — listing .document-editor children:');
    if (docEditorEl) {
      const docEditorHTML = await docEditorEl.evaluate(el => el.innerHTML.slice(0, 500));
      log('.document-editor innerHTML:', docEditorHTML);
    } else {
      const pageBodyHTML = await page.evaluate(() => document.body.innerHTML.slice(0, 2000));
      log('Page body HTML (first 2000):', pageBodyHTML);
    }
  }

  const bodyErrors = consoleErrors.slice(preBodyErrors);
  log('Console errors during body typing:', bodyErrors.map(e => `[${e.type}] ${e.text}`));

  log('Body edit KB network requests:');
  bodyKbReqs.forEach(r => log(`  ${r.method} ${r.url} → ${r.status} | body: ${r.body ? r.body.slice(0, 300) : 'none'}`));

  await ss(page, '03-final.png');

  // =====================
  // STEP 4: Tree ⋯ dropdown
  // =====================
  log('\n--- STEP 4: Tree ⋯ Dropdown ---');

  try {
    await page.goto(`${BASE_URL}/knowledge-base`, { waitUntil: 'networkidle', timeout: 30000 });
  } catch {}
  await page.waitForTimeout(2000);

  const asideRoleBtns = await page.$$('aside [role="button"]');
  log('Tree [role="button"] count in aside:', asideRoleBtns.length);

  let dropdownDiagnosis = 'not-tested';
  let dropdownBox = null;
  let moreBtnBox = null;

  if (asideRoleBtns.length > 0) {
    const firstItem = asideRoleBtns[0];
    await firstItem.hover();
    await page.waitForTimeout(600);
    await ss(page, '04a-hover.png');

    // Look for "Page options" button (aria-label from page-tree-item.tsx source)
    const moreBtn = await page.$('button[aria-label="Page options"]');
    log('"Page options" button found after hover:', !!moreBtn);

    if (moreBtn) {
      moreBtnBox = await moreBtn.boundingBox();
      log('More button position:', moreBtnBox);

      await moreBtn.click();
      await page.waitForTimeout(600);

      const dropdown = await page.$('[role="menu"]');
      log('Dropdown [role="menu"] after click:', !!dropdown);

      if (dropdown) {
        dropdownBox = await dropdown.boundingBox();
        log('Dropdown position:', dropdownBox);

        const isAtTopLeft = dropdownBox && dropdownBox.x < 20 && dropdownBox.y < 20;
        const isNearBtn = dropdownBox && moreBtnBox &&
          Math.abs(dropdownBox.x - moreBtnBox.x) < 400 &&
          Math.abs(dropdownBox.y - moreBtnBox.y) < 300;

        dropdownDiagnosis = isAtTopLeft ? 'BUG: top-left (0,0)' : isNearBtn ? 'OK: adjacent to button' : 'MISPLACED: neither near button nor top-left';
        log('Dropdown diagnosis:', dropdownDiagnosis);
        log('IsAtTopLeft:', isAtTopLeft, 'IsNearButton:', isNearBtn);

        const menuItems = await page.$$eval('[role="menuitem"]', els => els.map(el => el.textContent?.trim()));
        log('Menu items:', menuItems);
      } else {
        log('No [role="menu"] — checking all data-state="open":');
        const openEls = await page.$$eval('[data-state="open"]', els =>
          els.map(el => ({ tag: el.tagName, role: el.getAttribute('role'), box: { x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y) } }))
        );
        log('data-state=open elements:', JSON.stringify(openEls));
        dropdownDiagnosis = 'no-dropdown-found';
      }

      await ss(page, '04-dropdown.png');
    } else {
      log('No Page options button — all visible buttons after hover:');
      const visibleBtns = await page.$$eval('button', btns =>
        btns.filter(b => b.offsetParent !== null)
          .map(b => ({ text: b.textContent?.trim().slice(0, 20), al: b.getAttribute('aria-label') }))
      );
      log('Visible buttons:', JSON.stringify(visibleBtns));
      dropdownDiagnosis = 'no-more-button-found';
    }
  } else {
    log('No tree items to test dropdown on');
    dropdownDiagnosis = 'no-tree-items';
  }

  // =====================
  // FINAL SUMMARY
  // =====================
  log('\n========== FINAL SUMMARY ==========');

  log('\n-- Console Errors/Warnings (deduped) --');
  const seen = new Set();
  const uniqueErrors = consoleErrors.filter(e => {
    if (seen.has(e.text)) return false;
    seen.add(e.text);
    return true;
  });
  if (!uniqueErrors.length) log('(none)');
  else uniqueErrors.forEach(e => log(`  [${e.type.toUpperCase()}] ${e.text}`));

  log('\n-- All /kb/* network requests --');
  if (!kbNetworkLog.length) log('(none)');
  else kbNetworkLog.forEach(r => {
    const bodyPreview = r.body ? r.body.slice(0, 300) : 'none';
    const respPreview = r.responseBody ? JSON.stringify(r.responseBody).slice(0, 100) : 'n/a';
    log(`  ${r.method} ${r.url} → ${r.status} | req-body: ${bodyPreview} | resp: ${respPreview}`);
  });

  log('\n-- Title-edit /kb/* requests --');
  if (!titleKbReqs.length) log('(none)');
  else titleKbReqs.forEach(r => log(`  ${r.method} ${r.url} → ${r.status} | body: ${r.body ? r.body.slice(0, 300) : 'none'}`));

  log('\n-- Body-edit /kb/* requests --');
  if (!bodyKbReqs.length) log('(none)');
  else bodyKbReqs.forEach(r => log(`  ${r.method} ${r.url} → ${r.status} | body: ${r.body ? r.body.slice(0, 300) : 'none'}`));

  log('\n-- DIAGNOSIS --');
  log('(a) Title save: check title-edit /kb/* requests above — PATCH with {title} should fire after 1.5s debounce');
  log('(b) Body editor editable: .ProseMirror found =', !!prosemirrorEl);
  log('(c) Dropdown: moreBtnBox =', JSON.stringify(moreBtnBox), '| dropdownBox =', JSON.stringify(dropdownBox), '| diagnosis =', dropdownDiagnosis);

  await browser.close();
  log('\nDone. Screenshots:', SCREENSHOTS);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
