import { chromium } from "playwright";
const BASE = "http://localhost:1000";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";
function parseSetCookies(res){const raw=res.headers.getSetCookie?res.headers.getSetCookie():[];return raw.map(c=>{const[p]=c.split(";");const i=p.indexOf("=");return{name:p.slice(0,i),value:p.slice(i+1)};});}
async function login(){const jar=new Map();const r=await fetch(`${BASE}/api/auth/csrf`,{headers:{"user-agent":UA}});for(const c of parseSetCookies(r))jar.set(c.name,c.value);const{csrfToken}=await r.json();const body=new URLSearchParams({csrfToken,email:"demo@streamlineos.in",password:"Demo@2026!",callbackUrl:`${BASE}/projects`,json:"true"});const ch=[...jar.entries()].map(([k,v])=>`${k}=${v}`).join("; ");const lr=await fetch(`${BASE}/api/auth/callback/credentials`,{method:"POST",redirect:"manual",headers:{"user-agent":UA,"content-type":"application/x-www-form-urlencoded",cookie:ch},body});for(const c of parseSetCookies(lr))jar.set(c.name,c.value);return[...jar.entries()].map(([name,value])=>({name,value,url:BASE}));}
const cookies=await login();
const browser=await chromium.launch();
const ctx=await browser.newContext({userAgent:UA,viewport:{width:1440,height:900}});
await ctx.addCookies(cookies);
const page=await ctx.newPage();
await page.goto(`${BASE}${process.argv[2]||"/projects/templates"}`,{waitUntil:"domcontentloaded",timeout:90000});
await page.waitForLoadState("networkidle",{timeout:25000}).catch(()=>{});
await page.waitForTimeout(2000);
const info=await page.evaluate(()=>{
  const out=[];
  let el=document.querySelector("main");
  let depth=0;
  while(el && depth<12){
    const r=el.getBoundingClientRect();
    const cs=getComputedStyle(el);
    out.push({depth,tag:el.tagName,cls:(el.className||"").toString().slice(0,90),h:Math.round(r.height),display:cs.display,overflow:cs.overflowY,radix:el.hasAttribute("data-radix-scroll-area-viewport")||!!el.querySelector(":scope > [data-radix-scroll-area-viewport]")});
    // descend into the tallest/first meaningful child
    let next=null; let maxH=-1;
    for(const c of el.children){const cr=c.getBoundingClientRect(); if(cr.height>maxH){maxH=cr.height; next=c;}}
    el=next; depth++;
  }
  return out;
});
console.log(JSON.stringify(info,null,1));
await browser.close();
