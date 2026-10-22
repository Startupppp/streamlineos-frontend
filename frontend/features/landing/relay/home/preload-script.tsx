import { BOT_UA } from "@/features/landing/relay/utils/bot-ua";

const SCRIPT = `if(location.pathname==="/"&&!matchMedia("(prefers-reduced-motion: reduce)").matches&&!/${BOT_UA.source}/i.test(navigator.userAgent)){try{history.scrollRestoration="manual"}catch(e){}var d=document.documentElement;d.dataset.preload="";try{var o=new PerformanceObserver(function(l){if(!l.getEntries().some(function(e){return e.element&&e.element.tagName==="IMG"&&e.element.closest("main")}))return;o.disconnect();requestAnimationFrame(function(){d.dataset.preloadAway=""})});o.observe({type:"largest-contentful-paint",buffered:true})}catch(e){d.dataset.preloadAway=""}}`;

export const PreloadScript = ({ nonce }: { nonce?: string }) => (
  <script nonce={nonce} dangerouslySetInnerHTML={{ __html: SCRIPT }} />
);
