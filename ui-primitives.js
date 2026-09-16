/* Shared keyboard and modal behavior. Gallery loading remains independent. */
function bindTabKeys(group,selector){
  group.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    const tabs=[...group.querySelectorAll(selector)],current=tabs.indexOf(document.activeElement);
    if(current<0)return;
    event.preventDefault();
    const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(current+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    tabs[next].focus();tabs[next].click();
  });
}
function createDialogController(modal,initialFocus,onEscape){
  let opened=false,opener=null,overflow='',background=[];
  const controls=()=>[...modal.querySelectorAll('button,a[href],select,input,textarea,[tabindex]')]
    .filter(el=>!el.disabled&&el.tabIndex>=0&&el.getClientRects().length);
  const containFocus=event=>{if(opened&&!modal.contains(event.target))initialFocus.focus({preventScroll:true})};
  modal.addEventListener('keydown',event=>{
    if(!opened)return;
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onEscape();return}
    if(event.key!=='Tab')return;
    const available=controls(),first=available[0],last=available[available.length-1];
    if(!first){event.preventDefault();initialFocus.focus();return}
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  });
  return{
    open(button){
      if(opened)return;
      opened=true;opener=button||document.activeElement;overflow=document.body.style.overflow;
      if(typeof cancelGalleryTransition==='function')cancelGalleryTransition();
      if(typeof releaseOriginalWarm==='function')releaseOriginalWarm();
      document.body.style.overflow='hidden';document.body.classList.add('dialog-is-open');
      initialFocus.focus({preventScroll:true});
      background=[...document.querySelectorAll('.nav,.hero,main,footer,.quick-actions,.works-side-refresh,.rem-side-companion')]
        .map(el=>({el,inert:el.inert,aria:el.getAttribute('aria-hidden')}));
      background.forEach(({el})=>{el.inert=true;el.setAttribute('aria-hidden','true')});
      document.addEventListener('focusin',containFocus);
    },
    close({resume=true}={}){
      if(!opened)return;
      opened=false;document.removeEventListener('focusin',containFocus);
      background.forEach(({el,inert,aria})=>{el.inert=inert;if(aria===null)el.removeAttribute('aria-hidden');else el.setAttribute('aria-hidden',aria)});
      background=[];document.body.style.overflow=overflow;document.body.classList.remove('dialog-is-open');
      if(opener&&document.contains(opener))opener.focus({preventScroll:true});
      if(resume&&typeof resumeCurrentOriginalWarm==='function')resumeCurrentOriginalWarm();
    }
  };
}
