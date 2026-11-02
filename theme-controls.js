'use strict';
(() => {
 const sun='<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>';
 const moon='<path d="M20 14a8.5 8.5 0 0 1-10-10A8.5 8.5 0 1 0 20 14Z"/>';
 function refresh(){
  document.querySelectorAll('.row-button[data-toggle-dark-mode]').forEach(b=>b.remove());
  document.querySelectorAll('#home .theme-toggle').forEach(button=>button.remove());
  const header=state.signedIn?document.querySelector('#page:not([hidden]) .page-header'):null;
  if(!header)return;
  let button=header.querySelector('.theme-toggle');if(!button){button=document.createElement('button');button.type='button';button.className='theme-toggle';button.dataset.toggleDarkMode='true';header.append(button);}
  const dark=document.body.classList.contains('dark-mode'),label=dark?'Change to light mode':'Change to dark mode';
  if(button.getAttribute('aria-label')!==label){button.setAttribute('aria-label',label);button.title=label;button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+(dark?sun:moon)+'</svg>';}
 }
 window.hubThemeControls={refresh};
 new MutationObserver(refresh).observe(document.querySelector('.app'),{childList:true,subtree:true});
 new MutationObserver(refresh).observe(document.body,{attributes:true,attributeFilter:['class']});
 setInterval(refresh,1500);refresh();
})();
