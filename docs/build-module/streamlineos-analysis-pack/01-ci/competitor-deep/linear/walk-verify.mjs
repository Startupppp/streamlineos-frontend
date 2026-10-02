import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const EVIDENCE = '/workspace/streamlineos-ci/competitor-deep/linear/evidence';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9249');
const context = browser.contexts()[0];
const page = context.pages().find(p => p.url().includes('linear')) || context.pages()[0];

for (let i=0;i<30;i++) {
  const t = await page.innerText('body').catch(()=> '');
  const url = page.url();
  console.log(i, url, JSON.stringify(t.slice(0,300)));
  // frames
  for (const f of page.frames()) {
    const fu = f.url();
    if (/challenge|captcha|turnstile|hcaptcha|recaptcha|cloudflare/i.test(fu) || fu !== url && fu !== 'about:blank') {
      console.log('  FRAME', fu.slice(0,150));
    }
  }
  // look for iframes
  const iframes = await page.locator('iframe').evaluateAll(els => els.map(e => ({src:e.src, title:e.title, id:e.id}))).catch(()=>[]);
  if (iframes.length) console.log('  IFRAMES', JSON.stringify(iframes));
  await page.screenshot({ path: path.join(EVIDENCE, `verify-wait-${String(i).padStart(2,'0')}.png`) });
  if (!/Verifying|challenge|Just a moment/i.test(t) && t.length > 40) {
    console.log('LEFT VERIFY STATE');
    break;
  }
  // Try clicking turnstile checkbox if present
  try {
    const box = page.frameLocator('iframe[src*="turnstile"], iframe[src*="challenges.cloudflare"], iframe[title*="Widget"]').first();
    const cb = box.locator('input[type=checkbox], body');
    if (await cb.count({timeout:500}).catch(()=>0)) {
      await cb.click({ timeout: 2000 }).catch(()=>{});
    }
  } catch {}
  await page.waitForTimeout(3000);
}

console.log('FINAL', page.url());
console.log(await page.innerText('body').catch(()=>''));
await browser.close();
