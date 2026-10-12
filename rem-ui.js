/* Muyan 2.0 visual controls and social code viewer. */
// Equalize adjacent descriptions using their actual wrapped text, including older QQ engines.
(()=>{
  const grid=document.querySelector('.cz-price-grid');
  if(!grid)return;
  let frame=0,lastWidth=0;
  const sync=()=>{
    frame=0;
    if(!grid.getClientRects().length)return;
    const cards=[...grid.querySelectorAll('.price-card')];
    cards.forEach(card=>card.querySelectorAll('.tier').forEach(el=>el.style.minHeight='0'));
    for(const selector of ['.price-card>h4','.price-card>.ver']){
      const rows=[...grid.querySelectorAll(selector)];
      rows.forEach(el=>el.style.minHeight='0');
      for(let i=0;i<rows.length;i+=2){
        const pair=rows.slice(i,i+2),height=Math.max(...pair.map(el=>el.getBoundingClientRect().height));
        pair.forEach(el=>el.style.minHeight=height+'px');
      }
    }
    for(let i=0;i<cards.length;i+=2){
      const left=[...cards[i].querySelectorAll('.tier')],right=[...cards[i+1].querySelectorAll('.tier')];
      left.forEach((row,j)=>{
        if(!right[j])return;
        const height=Math.max(row.getBoundingClientRect().height,right[j].getBoundingClientRect().height);
        row.style.minHeight=right[j].style.minHeight=height+'px';
      });
    }
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(sync)};
  document.querySelectorAll('.price-tab').forEach(el=>el.addEventListener('click',schedule));
  addEventListener('resize',schedule,{passive:true});
  if('ResizeObserver'in window)new ResizeObserver(entries=>{
    const width=entries[0].contentRect.width;
    if(width!==lastWidth){lastWidth=width;schedule()}
  }).observe(grid);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(schedule);
  schedule();
})();
// Finite entrance and tap transitions; disabled in QQ and for reduced-motion users.
(()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const quiet=()=>reduced.matches||document.body.classList.contains('qq-low-memory');
  if(quiet())return;
  if('IntersectionObserver'in window){
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      if(!quiet())entry.target.classList.add('soft-entered');
      observer.unobserve(entry.target);
    }),{threshold:.12});
    document.querySelectorAll('.contact-channel,.backup-notice,.retouch-guide,.price-example').forEach(el=>observer.observe(el));
  }
  let panelAnimation=null;
  document.querySelectorAll('.price-tab,.note-tab').forEach(button=>button.addEventListener('click',()=>{
    if(panelAnimation)panelAnimation.cancel();
    if(quiet())return;
    const panel=document.getElementById(button.dataset.p?'price-'+button.dataset.p:'note-'+button.dataset.note);
    if(panel&&panel.animate)panelAnimation=panel.animate(
      [{opacity:.8,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],
      {duration:240,easing:'cubic-bezier(.2,.75,.25,1)'}
    );
  }));
  const stop=()=>{if(reduced.matches&&panelAnimation)panelAnimation.cancel()};
  if(reduced.addEventListener)reduced.addEventListener('change',stop);
})();
/* Progressive visual enhancement only; gallery selection and navigation remain native. */
(()=>{
  const drawings={
    photo:'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8" cy="9" r="1.5"/><path d="m4 17 5-5 4 4 3-3 5 5"/>',
    camera:'<path d="M8 6 9.5 3h5L16 6h3a2 2 0 0 1 2 2v11H3V8a2 2 0 0 1 2-2Z"/><circle cx="12" cy="12.5" r="3.5"/>',
    spark:'<path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6Z"/><path d="M20 2v4m-2-2h4"/>',
    price:'<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18m-7 5h7m-17-9 12-2"/>',
    contact:'<path d="M20 15a3 3 0 0 1-3 3H9l-5 3v-6a7 7 0 0 1 0-9 12 12 0 0 1 14 0 7 7 0 0 1 2 9Z"/><path d="M8 11h8"/>',
    notes:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 9h6M9 13h6M9 17h4"/>',
    top:'<path d="M5 4h14m-7 17V8m-5 5 5-5 5 5"/>',
    refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 6.1A8 8 0 0 1 20 12M4 12a8 8 0 0 0 13.9 5.9"/>'
  };
  const icon=key=>'<svg class="comfort-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+drawings[key]+'</svg>';
  document.querySelectorAll('.quick-action').forEach(button=>{
    const key=button.id==='bookingQuickOpen'?'contact':{works:'photo',price:'price',notes:'notes',contact:'contact',top:'top'}[button.dataset.jump];
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
})();

;
(()=>{
  const info={douyin:{name:'抖音',account:'85499600106',src:'images/social/douyin-original.jpg'},xiaohongshu:{name:'小红书',account:'5552489421',src:'images/social/xiaohongshu-original.jpg'}};
  const modal=document.getElementById('socialCodeModal'),closeButton=document.getElementById('socialCodeClose');
  const dialog=createDialogController(modal,closeButton,close);
  function close(){
    if(modal.hidden)return;
    modal.hidden=true;document.body.classList.remove('social-code-is-open');
    document.getElementById('socialCodeLarge').replaceChildren();
    dialog.close();
  }
  document.querySelectorAll('.social-code-open').forEach(button=>button.addEventListener('click',()=>{
    const item=info[button.dataset.social];if(!item)return;
    document.getElementById('socialCodeTitle').textContent=item.name+' · 慕言';
    document.getElementById('socialCodeAccount').textContent=item.name+'号：'+item.account;
    document.getElementById('socialCodeInstructions').textContent='请使用'+item.name+' App 扫码，或保存原始分享图后识别。';
    const original=document.getElementById('socialCodeOriginal');original.href=item.src;original.download=item.name+'-慕言-原始分享图.jpg';
    const code=button.querySelector('.social-code').cloneNode(true);
    code.querySelector('img').loading='eager';
    document.getElementById('socialCodeLarge').replaceChildren(code);
    modal.hidden=false;document.body.classList.add('social-code-is-open');dialog.open(button);
  }));
  closeButton.addEventListener('click',close);
  modal.addEventListener('click',event=>{if(event.target===modal)close();});
})();

;
/* User-driven interactions only: no permanent rendering loop. */
(()=>{
 const progress=document.getElementById('readingProgress');
 const sections=['works','price','notes','contact'].map(id=>document.getElementById(id));
 const navLinks=[...document.querySelectorAll('#navLinks a')];let pending=0,current='';
 function sync(){
  pending=0;const end=Math.max(1,document.documentElement.scrollHeight-innerHeight);
  const amount=Math.max(0,Math.min(1,scrollY/end));let active='';
  sections.forEach(section=>{if(section.getBoundingClientRect().top<Math.min(220,innerHeight*.28))active=section.id;});
  if(Date.now()>=quickNavLockUntil)setActiveQuickJump(active||'top');
  progress.style.transform='scaleX('+amount+')';
  if(active!==current){current=active;navLinks.forEach(link=>{const selected=link.hash==='#'+active;link.classList.toggle('current',selected);if(selected)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});}
 }
 const schedule=()=>{if(!pending)pending=requestAnimationFrame(sync);};
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});addEventListener('pageshow',schedule);schedule();
})();

/* 手机端的次要联系方式按需展开，桌面仍完整显示。 */
(()=>{
 const mobile=matchMedia('(max-width:720px)'),folds=[...document.querySelectorAll('.contact-fold')];
 function sync(){folds.forEach(fold=>fold.open=!mobile.matches);if(mobile.matches)setMenuOpen(false)}
 folds.forEach(fold=>fold.addEventListener('toggle',()=>{
   if(fold.open)fold.querySelectorAll('img').forEach(image=>image.loading='eager');
 }));
 mobile.addEventListener('change',sync);sync();
})();

/* 仅在作品区向下阅读收起手机底栏，离开作品区立即恢复。 */
(()=>{
 const dock=document.querySelector('.quick-actions');
 let lastY=scrollY,pending=0;
 function sync(){
   pending=0;const delta=scrollY-lastY;
   const rect=worksSection.getBoundingClientRect();
   const navBottom=document.querySelector('.nav')?.getBoundingClientRect().bottom||0;
   if(!(rect.top<innerHeight-90&&rect.bottom>navBottom+8)){
     dock.classList.remove('is-reading');lastY=scrollY;return;
   }
   if(Math.abs(delta)<8)return;
   dock.classList.toggle('is-reading',delta>0&&scrollY>100&&Date.now()>=quickNavLockUntil);
   lastY=scrollY;
 }
 addEventListener('scroll',()=>{if(!pending)pending=requestAnimationFrame(sync)},{passive:true});
 dock.addEventListener('focusin',()=>dock.classList.remove('is-reading'));
 document.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',()=>{
   dock.classList.remove('is-reading');lastY=scrollY;
 }));
 addEventListener('pageshow',()=>{dock.classList.remove('is-reading');lastY=scrollY});
})();
