import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const EVIDENCE = '/workspace/streamlineos-ci/competitor-deep/linear/evidence';
const EMAIL = 'pxcci1790824792@uberip.com';
const WORKSPACE = 'PXC-CI-Linear-20261001';
const MAIL_TOKEN = JSON.parse(fs.readFileSync('/workspace/streamlineos-ci/competitor-deep/linear/.account-secrets.json','utf8')).token_raw;
const JWT = JSON.parse(MAIL_TOKEN).token;

const browser = await chromium.connectOverCDP('http://127.0.0.1:9249');
const context = browser.contexts()[0];
let page = context.pages().find(p => p.url().includes('linear')) || context.pages()[0] || await context.newPage();

async function shot(name) {
  await page.screenshot({ path: path.join(EVIDENCE, `${name}.png`), fullPage: false });
  console.log('SHOT', name, page.url());
}
async function body() {
  const t = await page.innerText('body').catch(()=> '');
  console.log('BODY', t.slice(0,2000));
  return t;
}
async function waitStable(ms=2000) { await page.waitForTimeout(ms); }

async function pollMail(maxSec=120) {
  const start = Date.now();
  while ((Date.now()-start)/1000 < maxSec) {
    const res = await fetch('https://api.mail.tm/messages', { headers: { Authorization: `Bearer ${JWT}` }});
    const data = await res.json();
    const msgs = data['hydra:member'] || [];
    console.log('MAIL count', msgs.length);
    if (msgs.length) {
      const id = msgs[0].id;
      const full = await fetch(`https://api.mail.tm/messages/${id}`, { headers: { Authorization: `Bearer ${JWT}` }});
      const msg = await full.json();
      const text = (msg.text || msg.html || JSON.stringify(msg)).toString();
      console.log('MAIL subject', msg.subject);
      console.log('MAIL snip', text.slice(0,800));
      // extract code
      const m = text.match(/\b(\d{6})\b/) || text.match(/\b(\d{4,8})\b/);
      const link = text.match(/https?:\/\/[^\s"'<>]+linear[^\s"'<>]*/i);
      return { code: m?.[1], link: link?.[0], subject: msg.subject, text };
    }
    await new Promise(r => setTimeout(r, 4000));
  }
  return null;
}

// Go to signup
await page.goto('https://linear.app/signup', { waitUntil: 'domcontentloaded', timeout: 60000 });
await waitStable(5000);
// wait for Create your workspace
for (let i=0;i<20;i++) {
  const t = await page.innerText('body').catch(()=>'');
  if (t.includes('Continue with email') || t.includes('Create your workspace')) break;
  await waitStable(1500);
}
await shot('02-signup-ready');
await body();

// Click Continue with email
const emailBtn = page.getByRole('button', { name: /Continue with email/i });
if (await emailBtn.count()) {
  await emailBtn.click();
} else {
  // fallback text click
  await page.locator('text=Continue with email').first().click();
}
await waitStable(2500);
await shot('03-email-form');
await body();

// Fill email
const emailInput = page.locator('input[type=email], input[name=email], input[autocomplete=email]').first();
await emailInput.waitFor({ timeout: 15000 });
await emailInput.fill(EMAIL);
await shot('04-email-filled');

// Submit
const submit = page.getByRole('button', { name: /continue|sign up|submit|send/i }).first();
if (await submit.count()) {
  await submit.click();
} else {
  await emailInput.press('Enter');
}
await waitStable(4000);
await shot('05-after-email-submit');
await body();

// Check for OTP / magic link / password
const t = await page.innerText('body');
if (/code|verify|check your|magic|inbox|sent/i.test(t) || await page.locator('input[inputmode=numeric], input[autocomplete=one-time-code], input[name=code]').count()) {
  console.log('OTP/email verification likely — polling mail...');
  const mail = await pollMail(150);
  fs.writeFileSync('/workspace/streamlineos-ci/competitor-deep/linear/last-mail.json', JSON.stringify(mail, null, 2));
  if (mail?.code) {
    const codeInput = page.locator('input[inputmode=numeric], input[autocomplete=one-time-code], input[name=code], input[type=text]').first();
    await codeInput.fill(mail.code);
    await waitStable(1000);
    const cont = page.getByRole('button', { name: /continue|verify|confirm|submit/i }).first();
    if (await cont.count()) await cont.click();
    else await codeInput.press('Enter');
    await waitStable(4000);
    await shot('06-after-otp');
    await body();
  } else if (mail?.link) {
    console.log('Opening magic link', mail.link);
    await page.goto(mail.link, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitStable(5000);
    await shot('06-magic-link');
    await body();
  } else {
    console.log('NO MAIL YET');
  }
}

// If name/workspace prompts
await waitStable(2000);
let bt = await body();
if (/name|full name|what.*call/i.test(bt)) {
  const nameInput = page.locator('input[type=text], input[name=name]').first();
  if (await nameInput.count()) {
    await nameInput.fill('PXC CI Bot');
    const cont = page.getByRole('button', { name: /continue|next|create/i }).first();
    if (await cont.count()) await cont.click();
    await waitStable(3000);
    await shot('07-after-name');
    bt = await body();
  }
}
if (/workspace|organization|company/i.test(bt)) {
  const ws = page.locator('input[type=text], input[name=name], input[name=workspace]').first();
  if (await ws.count()) {
    await ws.fill(WORKSPACE);
    const cont = page.getByRole('button', { name: /continue|next|create|finish/i }).first();
    if (await cont.count()) await cont.click();
    await waitStable(5000);
    await shot('08-after-workspace');
    await body();
  }
}

fs.writeFileSync('/workspace/streamlineos-ci/competitor-deep/linear/walk-state.json', JSON.stringify({
  url: page.url(), email: EMAIL, workspace: WORKSPACE, ts: new Date().toISOString()
}, null, 2));
console.log('FINAL URL', page.url());
await browser.close();
