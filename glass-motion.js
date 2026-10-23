/* Optional presentation only: content, navigation and image loading never wait for motion. */
(()=>{
  if(!Element.prototype.animate)return;
  const root=document.documentElement,reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const ease='cubic-bezier(.16,1,.3,1)';
  const active=new Map(),running=new Set(),timers=new Set(),transient=new Set();
  let pageAway=false;
  const enabled=()=>!reduced.matches&&!document.hidden&&!pageAway;
  const visible=el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight};
  function play(el,frames,options={},channel='enter'){
    if(!el||!el.isConnected||!enabled())return null;
    let channels=active.get(el);if(!channels){channels=new Map();active.set(el,channels)}
    channels.get(channel)?.cancel();
    const animation=el.animate(frames,{duration:500,easing:ease,...options});
    animation.id='muyan-glass-'+channel;channels.set(channel,animation);running.add(animation);
    const release=()=>{
      running.delete(animation);
      if(channels.get(channel)===animation)channels.delete(channel);
      if(!channels.size&&active.get(el)===channels)active.delete(el);
    };
    animation.finished.then(release,release);return animation;
  }
  function later(fn,delay){
    const id=setTimeout(()=>{timers.delete(id);if(enabled())fn()},delay);timers.add(id);
  }
  function removeEffect(node){node.remove();transient.delete(node)}
  function finishEffect(animation,node){
    if(animation)animation.finished.then(()=>removeEffect(node),()=>removeEffect(node));else removeEffect(node);
  }
  function stop(){
    timers.forEach(clearTimeout);timers.clear();
    running.forEach(a=>a.cancel());running.clear();active.clear();
    transient.forEach(node=>node.remove());transient.clear();
  }
  function sync(){root.classList.toggle('glass-motion-paused',!enabled());if(!enabled())stop()}
  root.classList.add('glass-motion-ready');
  const ambient=document.createElement('div');ambient.className='glass-ambient';ambient.setAttribute('aria-hidden','true');
  ambient.innerHTML='<span class="ambient-blue"></span><span class="ambient-lilac"></span>';
  document.body.prepend(ambient);sync();
  document.addEventListener('visibilitychange',sync);
  addEventListener('pagehide',()=>{pageAway=true;sync()});
  addEventListener('pageshow',()=>{pageAway=false;sync()});
  reduced.addEventListener?.('change',sync);

  const surfaceSelector='.service-lead,main>section,.price-card,.portrait-terms,.extra-card,.fx-card,.contact-channel,.policy-notice,.backup-notice,.retouch-guide,.price-example,.quote';
  document.querySelectorAll(surfaceSelector).forEach(el=>el.classList.add('glass-surface'));
  function sheen(el,delay=0){
    if(!enabled()||!visible(el)||el.querySelector(':scope > .glass-sheen'))return;
    const frame=document.createElement('span'),beam=document.createElement('i');
    frame.className='glass-sheen';frame.setAttribute('aria-hidden','true');frame.appendChild(beam);
    el.appendChild(frame);transient.add(frame);
    finishEffect(play(beam,[
      {transform:'translateX(-100%)',opacity:0},
      {transform:'translateX(-35%)',opacity:.5,offset:.38},
      {transform:'translateX(100%)',opacity:0}
    ],{duration:1100,delay,easing:'cubic-bezier(.35,.1,.25,1)',fill:'backwards'},'sheen'),frame);
  }
  function reveal(el,delay=0){
    if(!enabled()||!visible(el))return;
    play(el,[{opacity:.66,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:540,delay,fill:'backwards'});
    if(el.classList.contains('glass-surface'))sheen(el,delay+80);
  }
  if('IntersectionObserver'in window){
    const arrivals=new IntersectionObserver(entries=>{
      let order=0;
      entries.forEach(entry=>{
        if(!entry.isIntersecting)return;
        arrivals.unobserve(entry.target);
        const delay=(order++%3)*65;
        const boot=window.muyanEntryBoot;
        if(boot?.active)later(()=>reveal(entry.target,delay),Math.max(0,boot.startedAt+1950-performance.now()));
        else reveal(entry.target,delay);
      });
    },{threshold:.1});
    document.querySelectorAll('.sec-head,.service-lead,.price-card,.portrait-terms,.extra-card,.fx-card,.contact-channel,.policy-notice,.backup-notice,.retouch-guide,.price-example,.quote').forEach(el=>arrivals.observe(el));
    const atmosphere=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('motion-visible',entry.isIntersecting)),{threshold:0});
    document.querySelectorAll('.hero,.service-lead').forEach(el=>atmosphere.observe(el));
  }

  // Pointer-down gives instant touch feedback; keyboard activation uses the centre.
  const touchSelector='button:not(:disabled),summary,.quick-action,.snow-booking-cta,.booking-button';
  const ripples=new WeakMap();
  function touch(target,x,y){
    if(!enabled()||!target||target.getAttribute('aria-disabled')==='true')return;
    const old=ripples.get(target);if(old){old.animation?.cancel();removeEffect(old.frame)}
    const rect=target.getBoundingClientRect();if(!rect.width||!rect.height)return;
    if(getComputedStyle(target).position==='static')target.classList.add('has-glass-feedback');
    const frame=document.createElement('span'),light=document.createElement('i');
    const size=Math.min(360,Math.max(90,Math.hypot(rect.width,rect.height)*1.4));
    frame.className='glass-touch';frame.setAttribute('aria-hidden','true');
    light.style.cssText='width:'+size+'px;height:'+size+'px;left:'+(x-rect.left-size/2)+'px;top:'+(y-rect.top-size/2)+'px';
    frame.appendChild(light);target.appendChild(frame);transient.add(frame);
    const animation=play(light,[{opacity:.8,transform:'scale(.15)'},{opacity:0,transform:'scale(1.25)'}],{duration:620,easing:'cubic-bezier(.2,.65,.2,1)'},'touch');
    ripples.set(target,{frame,animation});finishEffect(animation,frame);
  }
  document.addEventListener('pointerdown',event=>{
    if(event.button!==0||event.isPrimary===false)return;
    const target=event.target instanceof Element?event.target.closest(touchSelector):null;
    if(target)touch(target,event.clientX,event.clientY);
  },{passive:true});
  document.addEventListener('click',event=>{
    if(event.detail!==0)return;
    const target=event.target instanceof Element?event.target.closest(touchSelector):null;
    if(target){const r=target.getBoundingClientRect();touch(target,r.left+r.width/2,r.top+r.height/2)}
  });

  let panelTargets=[];
  document.querySelectorAll('.price-tab,.note-tab').forEach(button=>button.addEventListener('click',()=>{
    panelTargets.forEach(el=>active.get(el)?.get('enter')?.cancel());panelTargets=[];
    const panel=document.getElementById(button.dataset.p?'price-'+button.dataset.p:'note-'+button.dataset.note);
    if(!panel||!enabled())return;
    const children=[...panel.querySelectorAll(':scope > .price-grid > .price-card,:scope > .price-grid > .portrait-terms,:scope > .price-wrap > .price-grid > .price-card,:scope > .fx-card,:scope > .zp-head,:scope > .faq-group,:scope > .faq')];
    panelTargets=(children.length?children:[panel]).filter(visible);
    panelTargets.slice(0,6).forEach((el,i)=>reveal(el,Math.min(i*55,165)));
  }));
  // Native details opens immediately. Only its visible contents receive a finite fade.
  document.querySelectorAll('details').forEach(details=>details.addEventListener('toggle',()=>{
    const children=[...details.children].filter(el=>el.tagName!=='SUMMARY');
    children.forEach(el=>active.get(el)?.get('enter')?.cancel());
    if(details.open)children.filter(visible).slice(0,4).forEach((el,i)=>play(el,[{opacity:.6,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:310,delay:i*35,fill:'backwards'}));
  }));
  // Observe new rows without touching the gallery's queue, loading or scroll position.
  document.querySelectorAll('.grid').forEach(grid=>{
    new MutationObserver(()=>{
      if(!enabled()||!visible(grid))return;
      [...grid.querySelectorAll('.photo-row')].filter(visible).slice(0,4).forEach((row,i)=>play(row,[{opacity:.65,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:480,delay:i*45,fill:'backwards'},'gallery'));
    }).observe(grid,{childList:true});
  });
  const lightbox=document.getElementById('lb'),largeImage=document.getElementById('lbImg');
  let animatedPhoto='';
  largeImage?.addEventListener('load',()=>{
    if(lightbox?.classList.contains('show')&&animatedPhoto!==largeImage.alt){
      animatedPhoto=largeImage.alt;
      play(largeImage,[{opacity:.7,transform:'scale(.985)'},{opacity:1,transform:'scale(1)'}],{duration:340},'photo');
    }
  });
  if(lightbox)new MutationObserver(()=>{
    if(!lightbox.classList.contains('show')){animatedPhoto='';active.get(largeImage)?.get('photo')?.cancel()}
  }).observe(lightbox,{attributes:true,attributeFilter:['class']});
})();
