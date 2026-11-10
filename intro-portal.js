/* Intro de Portal Distribuidora: el logo animado a pantalla completa al abrir cada app.
   Se usa con <script src="https://fabriziovischi10-a11y.github.io/ecommerceportal/intro-portal.js"></script> lo más arriba posible del <head>.
   - Sale una vez por sesión en cada app (al recargar la misma pestaña no se repite).
   - Tocar la pantalla o apretar una tecla lo saltea.
   - El logo es logo-portal.png, al lado de este archivo. */
(function(){
  "use strict";
  /* la pantalla de inicio vieja del TMS (.splash) ya no se muestra nunca */
  var viejo=document.createElement("style");viejo.textContent=".splash{display:none!important}";(document.head||document.documentElement).appendChild(viejo);
  var KEY="pi-intro:"+location.pathname;
  try{if(sessionStorage.getItem(KEY))return;sessionStorage.setItem(KEY,"1")}catch(e){}
  var base=(document.currentScript&&document.currentScript.src||"").replace(/[^\/]*$/,"");
  var IMG=base+"logo-portal.png";
  var quieto=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;

  var css=
  "#pi-intro{position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;cursor:pointer;"+
    "background:radial-gradient(900px 420px at 50% 42%,#FFFFFF,#F1F3F8);transition:opacity .45s ease,visibility .45s}"+
  "#pi-intro.pi-fuera{opacity:0;visibility:hidden}"+
  "#pi-intro .pi-logo{position:relative;width:min(760px,86vw);aspect-ratio:1670/531;opacity:0}"+
  "#pi-intro.pi-listo .pi-logo{opacity:1}"+
  "#pi-intro .pi-capa{position:absolute;inset:0;background:var(--pi-img) center/100% 100% no-repeat}"+
  "#pi-intro .pi-sim{position:absolute;inset:0;width:100%;height:100%;overflow:visible}"+
  "#pi-intro.pi-on .pi-sim{animation:pi-golpe .5s cubic-bezier(.3,1.6,.5,1) 1.7s both;transform-origin:13.65% 50%}"+
  "@keyframes pi-golpe{0%{transform:scale(1)}40%{transform:scale(1.04)}100%{transform:scale(1)}}"+
  "#pi-intro .pi-l{clip-path:inset(0 var(--d) 34% var(--i));opacity:0}"+
  "#pi-intro.pi-on .pi-l{animation:pi-sube .6s cubic-bezier(.2,.9,.25,1.15) both;animation-delay:calc(1.45s + var(--n) * 70ms)}"+
  "@keyframes pi-sube{0%{opacity:0;transform:translateY(16%);filter:blur(6px)}60%{opacity:1;filter:blur(0)}100%{opacity:1;transform:none}}"+
  "#pi-intro .pi-dist{clip-path:inset(68% 1.5% 15% 63.2%)}"+
  "#pi-intro.pi-on .pi-dist{animation:pi-barre .75s cubic-bezier(.65,0,.35,1) 2.1s both}"+
  "@keyframes pi-barre{from{clip-path:inset(68% 36.7% 15% 63.2%)}to{clip-path:inset(68% 1.5% 15% 63.2%)}}"+
  "#pi-intro .pi-brillo{background:none;-webkit-mask:var(--pi-img) center/100% 100% no-repeat;mask:var(--pi-img) center/100% 100% no-repeat;overflow:hidden;pointer-events:none}"+
  "#pi-intro .pi-brillo::before{content:'';position:absolute;top:-20%;bottom:-20%;width:18%;left:-30%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.85),transparent);transform:skewX(-18deg)}"+
  "#pi-intro.pi-on .pi-brillo::before{animation:pi-cruza 1.1s ease-in-out 2.9s both}"+
  "@keyframes pi-cruza{to{left:115%}}"+
  "#pi-intro .pi-salta{position:absolute;bottom:calc(22px + env(safe-area-inset-bottom,0px));left:0;right:0;text-align:center;font:600 13px/1 'Segoe UI',system-ui,sans-serif;color:#7A86A3;opacity:0;transition:opacity .4s .8s}"+
  "#pi-intro.pi-listo .pi-salta{opacity:.8}"+
  "@media (prefers-reduced-motion:reduce){#pi-intro .pi-capa,#pi-intro .pi-brillo::before,#pi-intro .pi-sim{animation:none!important}#pi-intro .pi-l{opacity:1}}";

  var P="M82 480V250C82 150 140 103 228 103C320 103 376 160 376 241C376 330 315 381 228 381L212 381";
  var letras=[[26.5,62.5],[38.5,48.6],[52.6,35.8],[64.2,24.7],[76.2,12.5],[89.1,1.5]];
  var html=
  '<div class="pi-logo" role="img" aria-label="Portal Distribuidora" style="--pi-img:url(\''+IMG+'\')">'+
   '<svg class="pi-sim" viewBox="0 0 1670 531" aria-hidden="true"><defs>'+
    '<image id="piLg" href="'+IMG+'" width="1670" height="531"/>'+
    '<path id="piRec" d="'+P+'"/>'+
    '<clipPath id="piSim"><rect width="430" height="531"/></clipPath>'+
    '<clipPath id="piFle"><rect x="138" y="316" width="75" height="132"/></clipPath>'+
    '<clipPath id="piCuerpo"><path d="M0 0H430V531H0ZM138 316V448H213V316Z" clip-rule="evenodd"/></clipPath>'+
    '<mask id="piMask" maskUnits="userSpaceOnUse" x="0" y="0" width="1670" height="531">'+
     '<path d="'+P+'" fill="none" stroke="#fff" stroke-width="96" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1">'+
      '<animate id="piTrazo" attributeName="stroke-dashoffset" values="1;0" dur="1.5s" begin="0.15s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".55 0 .25 1"/>'+
     '</path></mask></defs>'+
    '<use href="#piLg" clip-path="url(#piCuerpo)" mask="url(#piMask)"/>'+
    '<use href="#piLg" clip-path="url(#piSim)" opacity="0"><animate attributeName="opacity" from="0" to="1" dur=".3s" begin="piTrazo.end" fill="freeze"/></use>'+
    '<g opacity="0"><set attributeName="opacity" to="1" begin="piTrazo.begin" fill="freeze"/>'+
     '<animate attributeName="opacity" from="1" to="0" dur=".3s" begin="piTrazo.end" fill="freeze"/>'+
     '<g><animateMotion dur="1.5s" begin="piTrazo.begin" fill="freeze" rotate="auto" calcMode="spline" keyPoints="0;1" keyTimes="0;1" keySplines=".55 0 .25 1"><mpath href="#piRec"/></animateMotion>'+
      '<g transform="rotate(180) translate(-212 -381)"><use href="#piLg" clip-path="url(#piFle)"/></g></g></g>'+
   '</svg>'+
   letras.map(function(l,n){return'<div class="pi-capa pi-l" style="--i:'+l[0]+'%;--d:'+l[1]+'%;--n:'+n+'"></div>'}).join("")+
   '<div class="pi-capa pi-dist"></div><div class="pi-capa pi-brillo"></div>'+
  '</div><div class="pi-salta">Tocá para entrar</div>';

  var st=document.createElement("style");st.id="pi-intro-css";st.textContent=css;
  var ov=document.createElement("div");ov.id="pi-intro";ov.innerHTML=html;
  (document.head||document.documentElement).appendChild(st);
  var root=document.body||document.documentElement;root.appendChild(ov);
  if(!document.body)document.addEventListener("DOMContentLoaded",function(){if(ov.parentNode!==document.body)document.body.appendChild(ov)});

  var sim=ov.querySelector(".pi-sim");if(sim&&sim.pauseAnimations)sim.pauseAnimations();
  var fin=false,tFin=null;
  function cerrar(){if(fin)return;fin=true;clearTimeout(tFin);ov.classList.add("pi-fuera");
    removeEventListener("keydown",cerrar,true);setTimeout(function(){ov.remove();st.remove()},500)}
  ov.addEventListener("click",cerrar);addEventListener("keydown",cerrar,true);
  function play(){if(fin)return;ov.classList.add("pi-listo");void ov.offsetWidth;ov.classList.add("pi-on");
    if(sim&&sim.setCurrentTime){if(quieto){sim.setCurrentTime(10)}else{sim.setCurrentTime(0);sim.unpauseAnimations()}}
    tFin=setTimeout(cerrar,quieto?1200:4300)}
  /* arranca cuando el logo está cargado (si tarda, no bloquea la app) */
  var im=new Image(),ok=false;im.onload=function(){if(!ok){ok=true;play()}};im.onerror=cerrar;im.src=IMG;
  setTimeout(function(){if(!ok){ok=true;if(im.complete&&im.naturalWidth)play();else cerrar()}},2500);
})();
