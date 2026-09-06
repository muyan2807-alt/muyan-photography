/* Muyan 2.0 visual controls and social code viewer. */
/* Progressive visual enhancement only; gallery selection and navigation remain native. */
(()=>{
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const quiet=()=>reduceMotion.matches||document.body.classList.contains('qq-low-memory');
  const drawings={
    photo:'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8" cy="9" r="1.5"/><path d="m4 17 5-5 4 4 3-3 5 5"/>',
    camera:'<path d="M8 6 9.5 3h5L16 6h3a2 2 0 0 1 2 2v11H3V8a2 2 0 0 1 2-2Z"/><circle cx="12" cy="12.5" r="3.5"/>',
    spark:'<path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6Z"/><path d="M20 2v4m-2-2h4"/>',
    price:'<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18m-7 5h7m-17-9 12-2"/>',
    contact:'<path d="M20 15a3 3 0 0 1-3 3H9l-5 3v-6a7 7 0 0 1 0-9 12 12 0 0 1 14 0 7 7 0 0 1 2 9Z"/><path d="M8 11h8"/>',
    share:'<circle cx="6" cy="12" r="3"/><circle cx="18" cy="5" r="3"/><circle cx="18" cy="19" r="3"/><path d="m9 10 6-3M9 14l6 3"/>',
    top:'<path d="M5 4h14m-7 17V8m-5 5 5-5 5 5"/>',
    refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 6.1A8 8 0 0 1 20 12M4 12a8 8 0 0 0 13.9 5.9"/>'
  };
  const icon=key=>'<svg class="comfort-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+drawings[key]+'</svg>';
  document.querySelectorAll('.quick-action').forEach(button=>{
    const key=button.id==='worksDockRefresh'?'refresh':button.id==='shareSite'?'share':{works:'photo',price:'price',contact:'contact',top:'top'}[button.dataset.jump];
    const holder=button.querySelector('span[aria-hidden="true"]');if(key&&holder)holder.innerHTML=icon(key);
  });
  document.querySelectorAll('.works-side-refresh,.refresh-btn').forEach(button=>{
    const holder=button.querySelector('span[aria-hidden="true"]');if(holder)holder.innerHTML=icon('refresh');
  });
  document.querySelectorAll('.work-tab').forEach(button=>{
    const key={zhengpian:'camera',changzhao:'photo',texiao:'spark'}[button.dataset.w];
    if(!key)return;
    const label=button.textContent.replace(/^(?:📷|🎪|✨)\s*/,'');
    button.textContent=label;
    const holder=document.createElement('span');holder.setAttribute('aria-hidden','true');holder.innerHTML=icon(key);button.prepend(holder);
  });
  document.querySelectorAll('.works-tabs,.price-tabs,.note-tabs,.cat-tabs').forEach(group=>{
    const indicator=document.createElement('span');
    indicator.className='selection-track';indicator.setAttribute('aria-hidden','true');
    group.appendChild(indicator);group.classList.add('has-selection-track');
    let frame=0;
    const sync=()=>{
      frame=0;
      const active=group.querySelector('button.active');
      if(!active||!active.offsetWidth){indicator.style.visibility='hidden';return;}
      indicator.style.visibility='visible';
      indicator.style.width=active.offsetWidth+'px';indicator.style.height=active.offsetHeight+'px';
      indicator.style.transform='translate('+active.offsetLeft+'px,'+active.offsetTop+'px)';
      if(!group.dataset.trackReady)requestAnimationFrame(()=>{group.dataset.trackReady='true';});
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(sync);};
    new MutationObserver(schedule).observe(group,{subtree:true,attributes:true,attributeFilter:['class']});
    if('ResizeObserver'in window){
      const resize=new ResizeObserver(schedule);resize.observe(group);
      group.querySelectorAll('button').forEach(button=>resize.observe(button));
    }else window.addEventListener('resize',schedule,{passive:true});
    if(document.fonts&&document.fonts.ready)document.fonts.ready.then(schedule);
    window.addEventListener('pageshow',schedule);sync();
  });
  // Freshly loaded thumbnails settle gently; failed images never become hidden.
  document.addEventListener('load',event=>{
    const image=event.target;
    if(quiet()||!(image instanceof HTMLImageElement)||!image.closest('.card')||!image.naturalWidth)return;
    image.classList.add('comfort-image');
  },true);
})();

;
(()=>{
  const info={douyin:{name:'抖音',account:'85499600106',src:'images/social/douyin-original.jpg'},xiaohongshu:{name:'小红书',account:'5552489421',src:'images/social/xiaohongshu-original.jpg'}};
  const modal=document.getElementById('socialCodeModal'),closeButton=document.getElementById('socialCodeClose');
  let opener=null,oldOverflow='';
  function close(){
    if(modal.hidden)return;
    modal.hidden=true;document.body.style.overflow=oldOverflow;document.body.classList.remove('social-code-is-open');
    document.getElementById('socialCodeLarge').replaceChildren();
    if(opener&&document.contains(opener))opener.focus({preventScroll:true});
  }
  document.querySelectorAll('.social-code-open').forEach(button=>button.addEventListener('click',()=>{
    const item=info[button.dataset.social];if(!item)return;
    if(typeof cancelGalleryTransition==='function')cancelGalleryTransition();
    opener=button;oldOverflow=document.body.style.overflow;
    document.getElementById('socialCodeTitle').textContent=item.name+' · 慕言';
    document.getElementById('socialCodeAccount').textContent=item.name+'号：'+item.account;
    document.getElementById('socialCodeInstructions').textContent='请使用'+item.name+' App 扫码，或保存原始分享图后识别。';
    const original=document.getElementById('socialCodeOriginal');original.href=item.src;original.download=item.name+'-慕言-原始分享图.jpg';
    const code=button.querySelector('.social-code').cloneNode(true);
    code.querySelector('img').loading='eager';
    document.getElementById('socialCodeLarge').replaceChildren(code);
    modal.hidden=false;document.body.style.overflow='hidden';document.body.classList.add('social-code-is-open');closeButton.focus({preventScroll:true});
  }));
  closeButton.addEventListener('click',close);
  modal.addEventListener('click',event=>{if(event.target===modal)close();});
  modal.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return;}
    if(event.key!=='Tab')return;
    const last=document.getElementById('socialCodeOriginal');
    if(event.shiftKey&&document.activeElement===closeButton){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();closeButton.focus();}
  });
})();
