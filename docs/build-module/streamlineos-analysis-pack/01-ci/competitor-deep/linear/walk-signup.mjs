import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const EVIDENCE = '/workspace/streamlineos-ci/competitor-deep/linear/evidence';
const EMAIL = 'pxcci1790824792@uberip.com';
const WORKSPACE = 'PXC-CI-Linear-20261001';
fs.mkdirSync(EVIDENCE, { recursive: true });

const browser = await chromium.connectOverCDP('http://127.0.0.1:9249');
const context = browser.contexts()[0] || await browser.newContext();
const page = context.pages().find(p => !p.url().startsWith('devtools://')) || await context.newPage();

async function shot(name) {
  const p = path.join(EVIDENCE, `${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  console.log('SHOT', name, page.url());
  return p;
}

async function dump() {
  const text = await page.evaluate(() => document.body?.innerText?.slice(0, 4000) || '');
  const links = await page.evaluate(() => [...document.querySelectorAll('a,button,[role=button]')].slice(0,80).map(el => ({
    tag: el.tagName, text: (el.innerText||el.getAttribute('aria-label')||'').trim().slice(0,80),
    href: el.href || null, type: el.getAttribute('type')
  })));
  console.log('URL', page.url());
  console.log('TEXT_SNIP', JSON.stringify(text.slice(0,1500)));
  console.log('CONTROLS', JSON.stringify(links, null, 2));
}

console.log('Navigating to signup...');
await page.goto('https://linear.app/signup', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(3000);
await shot('01-signup-landing');
await dump();

// Try to find email input / continue with email
const emailSelectors = [
  'input[type=email]',
  'input[name=email]',
  'input[placeholder*="mail" i]',
  'input[autocomplete=email]',
];
let filled = false;
for (const sel of emailSelectors) {
  const el = await page.$(sel);
  if (el) {
    await el.click({ clickCount: 3 });
    await el.fill(EMAIL);
    filled = true;
    console.log('Filled email via', sel);
    break;
  }
}

if (!filled) {
  // Look for "Continue with email" or similar
  const emailBtn = page.getByRole('button', { name: /email/i }).first();
  if (await emailBtn.count()) {
    await emailBtn.click();
    await page.waitForTimeout(2000);
    await shot('02-email-path');
    await dump();
    for (const sel of emailSelectors) {
      const el = await page.$(sel);
      if (el) {
        await el.fill(EMAIL);
        filled = true;
        console.log('Filled email after click via', sel);
        break;
      }
    }
  }
}

await shot('03-after-email-fill');
await dump();

// Click continue/submit if present
const continueBtn = page.getByRole('button', { name: /continue|sign up|create|get started|next/i }).first();
if (await continueBtn.count()) {
  console.log('Clicking continue...');
  await continueBtn.click();
  await page.waitForTimeout(4000);
  await shot('04-after-continue');
  await dump();
}

// Save state note
fs.writeFileSync('/workspace/streamlineos-ci/competitor-deep/linear/walk-state.json', JSON.stringify({
  url: page.url(),
  email: EMAIL,
  workspace: WORKSPACE,
  filled,
  ts: new Date().toISOString()
}, null, 2));

console.log('DONE phase1');
// keep connection - don't close browser
await browser.close(); // disconnect only
