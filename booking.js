(()=>{
  const modal=document.getElementById('bookingModal'),closeButton=document.getElementById('bookingClose');
  const status=document.getElementById('bookingStatus'),select=document.getElementById('bookingQQAccount');
  const tabs=[...modal.querySelectorAll('[data-booking-tab]')];
  // Main site <-> booking links share a small, validated service context.
  const serviceKeys=['portrait','event','snow','effects'];
  const contextParams=new URLSearchParams(location.search);
  const incomingService=serviceKeys.includes(contextParams.get('service'))?contextParams.get('service'):null;
  const workServices={zhengpian:'portrait',changzhao:'event',texiao:'effects'},priceServices={zp:'portrait',cz:'event',tx:'effects'};
  let lastService=incomingService||'portrait';
  document.querySelectorAll('.work-tab').forEach(button=>button.addEventListener('click',()=>{lastService=workServices[button.dataset.w]||lastService;}));
  document.querySelectorAll('.price-tab').forEach(button=>button.addEventListener('click',()=>{lastService=priceServices[button.dataset.p]||lastService;}));
  document.querySelectorAll('.note-tab').forEach(button=>button.addEventListener('click',()=>{lastService=button.dataset.note==='cz'?'event':'portrait';}));
  function currentService(section){
    if(section==='works')return workServices[document.querySelector('.work-tab.active')?.dataset.w]||lastService;
    if(section==='price')return priceServices[document.querySelector('.price-tab.active')?.dataset.p]||lastService;
    if(section==='notes')return document.querySelector('.note-tab.active')?.dataset.note==='cz'?'event':lastService==='effects'?'effects':'portrait';
    return lastService;
  }
  if(incomingService){
    const section=location.hash.slice(1);
    if(section==='works')document.querySelector('.work-tab[data-w="'+({portrait:'zhengpian',snow:'zhengpian',event:'changzhao',effects:'texiao'}[incomingService])+'"]').click();
    if(section==='price')document.querySelector('.price-tab[data-p="'+({portrait:'zp',snow:'zp',event:'cz',effects:'tx'}[incomingService])+'"]').click();
    if(section==='notes'){
      const requested=contextParams.get('notes');
      const note=['zp','cz','group'].includes(requested)?requested:incomingService==='event'?'cz':incomingService==='effects'?null:'zp';
      if(note){const fold=document.querySelector('.notice-fold');if(fold)fold.open=true;document.querySelector('.note-tab[data-note="'+note+'"]').click();}
    }
    lastService=incomingService;
  }
  const bookingPath=new URL('booking.html',location.href).pathname;
  document.querySelectorAll('a[href]').forEach(link=>{
    const original=new URL(link.getAttribute('href'),location.href);
    if(original.origin!==location.origin||original.pathname!==bookingPath)return;
    const explicitSource=original.searchParams.get('from'),explicitType=original.searchParams.get('type');
    link.addEventListener('click',()=>{
      const section=explicitSource||document.querySelector('.quick-action.is-active')?.dataset.jump||'top';
      const next=new URL(original.href);next.searchParams.set('from',section);
      next.searchParams.set('type',serviceKeys.includes(explicitType)?explicitType:currentService(section));
      link.href=next.pathname+next.search+next.hash;
    });
  });
  let generation=0;
  const dialog=createDialogController(modal,closeButton,close);
  const mobile=/Android|iPhone|iPad|iPod|HarmonyOS|Mobile/i.test(navigator.userAgent)||navigator.maxTouchPoints>0;
  function updateQQ(){
    clearManualCopy();
    const small=select.value==='2389375218',uin=small?'2389375218':'2745867337';
    const image=document.getElementById('bookingQQImage');
    image.src=small?'images/qq-small.png':'images/qq.png';image.width=small?582:934;image.height=small?583:892;
    image.alt='QQ '+(small?'小号 ':'大号 ')+uin+' 的二维码';
    document.getElementById('bookingQQLabel').textContent=small?'QQ 小号二维码':'QQ 大号二维码';
    document.getElementById('bookingQQCopy').dataset.bookingCopy=uin;
    // Best-effort legacy client links, only followed on an explicit visitor click.
    document.getElementById('bookingQQLaunch').href=mobile
      ?'mqq://'
      :'tencent://message/?uin='+uin+'&Site=qq&Menu=yes';
    status.textContent='';
  }
  function choose(key){
    clearManualCopy();
    generation++;
    tabs.forEach(tab=>{const on=tab.dataset.bookingTab===key;tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1});
    document.getElementById('bookingWechat').hidden=key!=='wechat';
    document.getElementById('bookingQQ').hidden=key!=='qq';
    status.textContent='';
    modal.querySelectorAll('section:not([hidden]) img').forEach(image=>image.loading='eager');
  }
  function open(button){
    if(!modal.hidden)return;
    document.body.classList.add('booking-is-open');modal.hidden=false;
    updateQQ();choose('qq');dialog.open(button);
  }
  function close(){
    if(modal.hidden)return;
    generation++;clearManualCopy();modal.hidden=true;document.body.classList.remove('booking-is-open');dialog.close();
  }
  document.querySelectorAll('[data-booking-open]').forEach(button=>button.addEventListener('click',event=>{
    event.preventDefault();event.stopImmediatePropagation();open(button);
  },true));
  tabs.forEach(tab=>tab.addEventListener('click',()=>choose(tab.dataset.bookingTab)));
  bindTabKeys(modal.querySelector('.booking-tabs'),'[data-booking-tab]');
  select.addEventListener('change',()=>{generation++;updateQQ()});
  modal.querySelectorAll('[data-booking-copy]').forEach(button=>button.addEventListener('click',async()=>{
    const token=generation,value=button.dataset.bookingCopy;
    try{await copyPlainText(value,button,()=>token===generation&&!modal.hidden);if(token===generation&&!modal.hidden)status.textContent='已复制 '+value+'，请到对应 App 搜索添加。'}
    catch{if(token===generation&&!modal.hidden)status.textContent='复制未成功，请手动复制：'+value}
  }));
  document.getElementById('bookingQQLaunch').addEventListener('click',event=>{
    const token=++generation,value=select.value==='2389375218'?'2389375218':'2745867337';
    status.textContent='正在复制 '+value+' 并尝试打开 QQ…';
    // Start clipboard work within the click gesture; let the native link open the client immediately.
    copyPlainText(value,event.currentTarget,()=>token===generation&&!modal.hidden).then(()=>{
      if(token===generation&&!modal.hidden)status.textContent='已复制 '+value+'，正在尝试打开 QQ；打开后请粘贴搜索。';
    }).catch(()=>{
      if(token===generation&&!modal.hidden)status.textContent='已尝试打开 QQ，但复制未成功。请手动输入：'+value;
    });
  });
  document.getElementById('bookingWechatLaunch').addEventListener('click',()=>{
    status.textContent='正在尝试打开微信；请搜索 mi20180709 添加。若没有打开，请手动打开微信。';
  });
  closeButton.addEventListener('click',close);
  modal.addEventListener('click',event=>{if(event.target===modal)close()});
})();
