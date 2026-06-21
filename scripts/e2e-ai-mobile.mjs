import { chromium } from "playwright";
const BASE = "http://localhost:1000";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ userAgent: UA });
const jar = new Map();
const absorb = (r) => { for (const c of (r.headers.getSetCookie?.() ?? [])) { const [p] = c.split(";"); const i = p.indexOf("="); const k = p.slice(0,i).trim(), v = p.slice(i+1).trim(); if (v && v!=="deleted") jar.set(k,v); } };
const ch = () => [...jar.entries()].map(([k,v])=>`${k}=${v}`).join("; ");
const csrf = await fetch(`${BASE}/api/auth/csrf`,{headers:{"user-agent":UA}}); absorb(csrf);
const { csrfToken } = await csrf.json();
const cb = await fetch(`${BASE}/api/auth/callback/credentials`,{method:"POST",redirect:"manual",headers:{"content-type":"application/x-www-form-urlencoded",cookie:ch(),"user-agent":UA},body:new URLSearchParams({csrfToken,email:"demo@streamlineos.in",password:"Demo@2026!",callbackUrl:`${BASE}/post-signin`,json:"true"}).toString()}); absorb(cb);
await ctx.addCookies([...jar.entries()].map(([name,value])=>({name,value,domain:"localhost",path:"/",httpOnly:false,secure:false,sameSite:"Lax"})));
for (const vp of [{n:"mobile",w:375,h:812},{n:"desktop",w:1280,h:900}]) {
  const page = await ctx.newPage();
  await page.setViewportSize({width:vp.w,height:vp.h});
  await page.goto(`${BASE}/ai`,{waitUntil:"networkidle",timeout:45000});
  await page.waitForTimeout(1500);
  const info = await page.evaluate(()=>({ text: document.body.innerText.replace(/\s+/g," ").slice(0,160), cards: document.querySelectorAll('[data-slot=card],.grid > *').length }));
  await page.screenshot({path:`e2e-artifacts/_recheck_ai_${vp.n}.png`,fullPage:true});
  console.log(`${vp.n}: cards=${info.cards} :: ${info.text}`);
  await page.close();
}
await browser.close();
