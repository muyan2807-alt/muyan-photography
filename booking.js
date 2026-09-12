(()=>{
  const modal=document.getElementById('bookingModal'),closeButton=document.getElementById('bookingClose');
  const status=document.getElementById('bookingStatus'),select=document.getElementById('bookingQQAccount');
  const tabs=[...modal.querySelectorAll('[data-booking-tab]')];
  let opener=null,oldOverflow='',background=[],generation=0;
  const mobile=/Android|iPhone|iPad|iPod|HarmonyOS|Mobile/i.test(navigator.userAgent)||navigator.maxTouchPoints>0;
  function updateQQ(){
    const small=select.value==='2389375218',uin=small?'2389375218':'2745867337';
    const image=document.getElementById('bookingQQImage');
    image.src=small?'images/qq-small.png':'images/qq.png';image.width=small?582:934;image.height=small?583:892;
    image.alt='QQ '+(small?'小号 ':'大号 ')+uin+' 的二维码';
    document.getElementById('bookingQQCopy').dataset.bookingCopy=uin;
    // Best-effort legacy client links, only followed on an explicit visitor click.
    document.getElementById('bookingQQLaunch').href=mobile
      ?'mqq://'
      :'tencent://message/?uin='+uin+'&Site=qq&Menu=yes';
    status.textContent='';
  }
  function choose(key){
    generation++;
    tabs.forEach(tab=>{const on=tab.dataset.bookingTab===key;tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1});
    document.getElementById('bookingWechat').hidden=key!=='wechat';
    document.getElementById('bookingQQ').hidden=key!=='qq';
    status.textContent='';
    modal.querySelectorAll('section:not([hidden]) img').forEach(image=>image.loading='eager');
  }
  function open(button){
    if(!modal.hidden)return;
    opener=button;oldOverflow=document.body.style.overflow;
    if(typeof cancelGalleryTransition==='function')cancelGalleryTransition();
    if(typeof releaseOriginalWarm==='function')releaseOriginalWarm();
    document.body.classList.add('booking-is-open');modal.hidden=false;document.body.style.overflow='hidden';
    updateQQ();choose('qq');closeButton.focus({preventScroll:true});
    background=[...document.querySelectorAll('.nav,.hero,main,footer,.quick-actions,.works-side-refresh,.rem-side-companion')].map(el=>({el,inert:el.inert,aria:el.getAttribute('aria-hidden')}));
    background.forEach(({el})=>{el.inert=true;el.setAttribute('aria-hidden','true')});
  }
  function close(){
    if(modal.hidden)return;
    generation++;modal.hidden=true;document.body.classList.remove('booking-is-open');document.body.style.overflow=oldOverflow;
    background.forEach(({el,inert,aria})=>{el.inert=inert;if(aria===null)el.removeAttribute('aria-hidden');else el.setAttribute('aria-hidden',aria)});background=[];
    if(opener&&document.contains(opener))opener.focus({preventScroll:true});
    if(typeof resumeCurrentOriginalWarm==='function')resumeCurrentOriginalWarm();
  }
  document.querySelectorAll('[data-booking-open]').forEach(button=>button.addEventListener('click',event=>{
    event.preventDefault();event.stopImmediatePropagation();open(button);
  },true));
  tabs.forEach(tab=>tab.addEventListener('click',()=>choose(tab.dataset.bookingTab)));
  modal.querySelector('.booking-tabs').addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();const current=tabs.indexOf(document.activeElement);
    const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(current+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    choose(tabs[next].dataset.bookingTab);tabs[next].focus();
  });
  select.addEventListener('change',()=>{generation++;updateQQ()});
  modal.querySelectorAll('[data-booking-copy]').forEach(button=>button.addEventListener('click',async()=>{
    const token=generation,value=button.dataset.bookingCopy;
    try{await copyPlainText(value);if(token===generation&&!modal.hidden)status.textContent='已复制 '+value+'，请到对应 App 搜索添加。'}
    catch{if(token===generation&&!modal.hidden)status.textContent='复制未成功，请手动复制：'+value}
  }));
  document.getElementById('bookingQQLaunch').addEventListener('click',()=>{
    const token=++generation,value=select.value==='2389375218'?'2389375218':'2745867337';
    status.textContent='正在复制 '+value+' 并尝试打开 QQ…';
    // Start clipboard work within the click gesture; let the native link open the client immediately.
    copyPlainText(value).then(()=>{
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
  modal.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return}
    if(event.key!=='Tab')return;
    const controls=[...modal.querySelectorAll('button,a[href],select,[tabindex="0"]')].filter(el=>!el.disabled&&el.tabIndex>=0&&el.getClientRects().length);
    const first=controls[0],last=controls[controls.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  });
})();
