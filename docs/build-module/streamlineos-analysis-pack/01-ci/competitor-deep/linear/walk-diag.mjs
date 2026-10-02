import { chromium } from 'playwright-core';
import fs from 'fs';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9249');
const context = browser.contexts()[0];
const page = context.pages()[0] || await context.newPage();

page.on('console', msg => console.log('CONSOLE', msg.type(), msg.text().slice(0,200)));
page.on('pageerror', err => console.log('PAGEERROR', err.message.slice(0,300)));
page.on('requestfailed', req => console.log('REQFAIL', req.url().slice(0,120), req.failure()?.errorText));

await page.goto('https://linear.app/signup', { waitUntil: 'networkidle', timeout: 90000 }).catch(e => console.log('goto err', e.message));
await page.waitForTimeout(8000);
console.log('URL', page.url());
console.log('TITLE', await page.title());
const html = await page.content();
fs.writeFileSync('/workspace/streamlineos-ci/competitor-deep/linear/evidence/signup-html.html', html.slice(0,50000));
console.log('HTML_LEN', html.length);
console.log('BODY', (await page.innerText('body').catch(()=>'' )).slice(0,2000));
await page.screenshot({ path: '/workspace/streamlineos-ci/competitor-deep/linear/evidence/01b-signup-diag.png' });

// Try login page too
await page.goto('https://linear.app/login', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(e => console.log('login goto', e.message));
await page.waitForTimeout(5000);
console.log('LOGIN URL', page.url());
console.log('LOGIN BODY', (await page.innerText('body').catch(()=>'' )).slice(0,2000));
await page.screenshot({ path: '/workspace/streamlineos-ci/competitor-deep/linear/evidence/01c-login.png' });

await browser.close();
