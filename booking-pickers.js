/* Site-owned select and date dialogs; original fields retain validation and values. */
(() => {
  'use strict';
  const controls=new Map();let source=null,month=null,timeDraft=null,placementFrame=0,closeFocus=null;
  const dialog=document.createElement('dialog');dialog.id='sitePicker';dialog.setAttribute('aria-labelledby','pickerTitle');
  dialog.innerHTML='<div class="picker-heading"><h2 id="pickerTitle">请选择</h2><button type="button" class="picker-close" aria-label="关闭选择窗口">×</button></div><div id="pickerBody"></div><div class="picker-footer"><button type="button" class="picker-cancel">取消</button></div>';
  document.body.append(dialog);const body=dialog.querySelector('#pickerBody'),title=dialog.querySelector('h2');
  const labelFor=field=>field.getAttribute('data-picker-label')||field.closest('label')?.childNodes[0]?.textContent?.trim()||field.getAttribute('aria-label')||'请选择';
  const dateString=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  function refresh(field){
    for(const [input,button] of controls){if(!input.isConnected){controls.delete(input);button.remove();}}
    const pairs=field&&controls.has(field)?[[field,controls.get(field)]]:[...controls];
    for(const [input,button] of pairs){
      button.disabled=input.disabled;const copy=input.tagName==='SELECT'?(input.selectedOptions[0]?.textContent||'请选择'):(input.value||(input.dataset.picker==='time'?'选择时间':'选择日期'));if(button.textContent!==copy)button.textContent=copy;
      button.classList.toggle('field-invalid',input.getAttribute('aria-invalid')==='true');
      if(input.getAttribute('aria-invalid')==='true')button.setAttribute('aria-invalid','true');else button.removeAttribute('aria-invalid');
      const described=input.getAttribute('aria-describedby');if(described)button.setAttribute('aria-describedby',described);else button.removeAttribute('aria-describedby');
      button.setAttribute('aria-label',labelFor(input)+'：'+button.textContent);button.setAttribute('aria-expanded',String(dialog.open&&source===input));
    }
  }
  function close(){if(dialog.open)dialog.close();}
  function placeOptions(){
    placementFrame=0;if(!dialog.open||dialog.dataset.mode!=='options'||!source)return;
    const anchor=controls.get(source);if(!anchor||!source.isConnected||source.disabled||!anchor.getClientRects().length){close();return;}
    const viewport=window.visualViewport,margin=12,gap=6,leftEdge=viewport?.offsetLeft||0,topEdge=viewport?.offsetTop||0;
    const viewWidth=viewport?.width||innerWidth,viewHeight=viewport?.height||innerHeight,rightEdge=leftEdge+viewWidth,bottomEdge=topEdge+viewHeight,r=anchor.getBoundingClientRect();
    if(r.bottom<=topEdge||r.top>=bottomEdge||r.right<=leftEdge||r.left>=rightEdge){close();return;}
    const width=Math.max(1,Math.min(r.width,viewWidth-margin*2));
    dialog.style.setProperty('--picker-anchor-width',width+'px');
    const style=getComputedStyle(dialog),chrome=['paddingTop','paddingBottom','borderTopWidth','borderBottomWidth'].reduce((sum,key)=>sum+(parseFloat(style[key])||0),0);
    const desired=Math.min(280,body.scrollHeight+chrome),below=Math.max(0,bottomEdge-margin-r.bottom-gap),above=Math.max(0,r.top-gap-topEdge-margin);
    const down=below>=desired||below>=above,maxHeight=Math.min(280,down?below:above);if(maxHeight<=chrome+1){close();return;}
    dialog.style.setProperty('--picker-anchor-max-height',maxHeight+'px');dialog.style.setProperty('--picker-list-max-height',Math.max(1,maxHeight-chrome)+'px');
    const height=dialog.getBoundingClientRect().height,left=Math.max(leftEdge+margin,Math.min(r.left,rightEdge-margin-width));
    const top=Math.max(topEdge+margin,Math.min(down?r.bottom+gap:r.top-gap-height,bottomEdge-margin-height));
    dialog.style.setProperty('--picker-anchor-left',left+'px');dialog.style.setProperty('--picker-anchor-top',top+'px');dialog.dataset.placement=down?'below':'above';
  }
  function schedulePlacement(){if(dialog.open&&dialog.dataset.mode==='options'&&!placementFrame)placementFrame=requestAnimationFrame(placeOptions);}
  function adjacentControl(reverse){
    const anchor=controls.get(source),scope=source?.closest('dialog[open],[aria-modal="true"]')||document;
    const items=[...scope.querySelectorAll('button,input,select,textarea,a[href],[tabindex]')].filter(item=>!dialog.contains(item)&&!item.disabled&&item.tabIndex>=0&&!item.closest('[inert]')&&item.getClientRects().length);
    const index=items.indexOf(anchor);return items[index+(reverse?-1:1)]||anchor;
  }
  window.addEventListener('resize',schedulePlacement,{passive:true});
  window.addEventListener('scroll',event=>{if(!dialog.contains(event.target))schedulePlacement();},{capture:true,passive:true});
  window.visualViewport?.addEventListener('resize',schedulePlacement,{passive:true});window.visualViewport?.addEventListener('scroll',schedulePlacement,{passive:true});
  function choose(value){if(!source||source.disabled)return;const input=source;input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));refresh(input);close();}
  function renderOptions(){
    body.replaceChildren();let group='';
    for(const option of source.options){
      const disabled=option.disabled||option.parentElement.disabled,showUnavailable=source.dataset.showUnavailable==='true';
      if(!option.value||disabled&&!showUnavailable)continue;
      const next=option.parentElement.tagName==='OPTGROUP'?option.parentElement.label:'';
      if(next&&next!==group){const h=document.createElement('h3');h.className='picker-group';h.textContent=next;body.append(h);}group=next;
      const button=document.createElement('button');button.type='button';button.className='picker-option';button.disabled=disabled;
      if(showUnavailable){const time=document.createElement('span'),state=document.createElement('span');button.classList.add('picker-slot-option');button.dataset.status=option.dataset.slotStatus||'';time.textContent=option.textContent.split(' · ')[0];state.className='picker-slot-state';state.textContent=option.dataset.statusLabel||'';button.append(time,state);button.setAttribute('aria-label',option.textContent);}
      else button.textContent=option.textContent;
      button.setAttribute('aria-pressed',String(option.selected));if(!disabled)button.addEventListener('click',()=>choose(option.value));body.append(button);
    }
    if(!body.children.length){const text=document.createElement('p');text.textContent='当前没有可选项目，请稍后重试。';body.append(text);}
  }
  function renderCalendar(){
    body.replaceChildren();const y=month.getFullYear(),m=month.getMonth();
    const bar=document.createElement('div');bar.className='calendar-nav';
    for(const [offset,label] of [[-1,'上个月'],[1,'下个月']]){
      const button=document.createElement('button');button.type='button';button.textContent=offset<0?'‹':'›';button.setAttribute('aria-label',label);
      button.addEventListener('click',()=>{month=new Date(y,m+offset,1);renderCalendar();});bar.append(button);
    }
    const heading=document.createElement('strong');heading.textContent=y+'年 '+(m+1)+'月';bar.insertBefore(heading,bar.lastChild);body.append(bar);
    const grid=document.createElement('div');grid.className='calendar-grid';
    for(const day of ['一','二','三','四','五','六','日']){const text=document.createElement('span');text.className='calendar-weekday';text.textContent=day;grid.append(text);}
    const offset=(new Date(y,m,1).getDay()+6)%7,count=new Date(y,m+1,0).getDate();
    for(let i=0;i<offset;i++){const blank=document.createElement('span');blank.setAttribute('aria-hidden','true');grid.append(blank);}
    for(let day=1;day<=count;day++){
      const value=dateString(new Date(y,m,day)),button=document.createElement('button');button.type='button';button.textContent=String(day);button.setAttribute('aria-label',value);
      button.disabled=Boolean(source.min&&value<source.min||source.max&&value>source.max);button.setAttribute('aria-pressed',String(source.value===value));
      button.addEventListener('click',()=>choose(value));grid.append(button);
    }
    body.append(grid);
  }
  const pad=value=>String(value).padStart(2,'0');
  function renderTime(){
    body.replaceChildren();
    const min=source.dataset.timeMin||'',value=pad(timeDraft.hour)+':'+pad(timeDraft.minute),valid=!min||value>min;
    const preview=document.createElement('p');preview.className='picker-time-value';preview.textContent=value;
    const hint=document.createElement('p');hint.className='picker-time-hint';hint.textContent=min?'请选择晚于 '+min+' 的结束时间':'分别点选小时和分钟';
    body.append(preview,hint);
    const columns=document.createElement('div');columns.className='picker-time-columns';
    for(const [kind,count,label] of [['hour',24,'小时'],['minute',60,'分钟']]){
      const group=document.createElement('section'),heading=document.createElement('h3'),list=document.createElement('div');
      heading.textContent=label;group.className='picker-time-column';list.className='picker-time-grid';list.setAttribute('role','group');list.setAttribute('aria-label',label);
      for(let number=0;number<count;number++){
        const button=document.createElement('button');button.type='button';button.className='picker-time-option';button.textContent=pad(number);button.dataset.timePart=kind;button.dataset.timeNumber=String(number);button.setAttribute('aria-label',pad(number)+(kind==='hour'?' 点':' 分'));button.setAttribute('aria-pressed',String(timeDraft[kind]===number));
        button.disabled=Boolean(min&&(kind==='hour'?pad(number)+':59'<=min:pad(timeDraft.hour)+':'+pad(number)<=min));
        button.addEventListener('click',()=>{timeDraft[kind]=number;timeDraft.focus=kind;renderTime();});list.append(button);
      }
      group.append(heading,list);columns.append(group);
    }
    const confirm=document.createElement('button');confirm.type='button';confirm.className='picker-confirm-time';confirm.textContent='选好 '+value;confirm.disabled=!valid;confirm.addEventListener('click',()=>choose(value));body.append(columns,confirm);
    requestAnimationFrame(()=>{
      if(!dialog.open||!source||source.dataset.picker!=='time')return;
      body.querySelectorAll('.picker-time-grid [aria-pressed="true"]').forEach(button=>button.scrollIntoView({block:'nearest'}));
      if(timeDraft.focus)body.querySelector('[data-time-part="'+timeDraft.focus+'"][aria-pressed="true"]')?.focus({preventScroll:true});
    });
  }
  function open(input){
    if(input.disabled)return;source=input;closeFocus=null;title.textContent=labelFor(input);const time=input.dataset.picker==='time';dialog.dataset.mode=time?'time':input.type==='date'?'calendar':'options';dialog.dataset.source=input.id||'';body.className=time?'picker-time':input.type==='date'?'picker-calendar':'picker-options';
    if(input.type==='date'){
      const value=input.value||input.min||dateString(new Date()),parts=value.split('-').map(Number);month=new Date(parts[0],parts[1]-1,1);renderCalendar();
    }else if(time){
      const value=/^\d{2}:\d{2}$/.test(input.value)?input.value:input.dataset.timeMin||'09:00',parts=value.split(':').map(Number);
      let minutes=parts[0]*60+parts[1];if(!input.value&&input.dataset.timeMin)minutes=Math.min(minutes+60,1439);
      timeDraft={hour:Math.floor(minutes/60),minute:minutes%60,focus:''};renderTime();
    }else renderOptions();
    if(!dialog.open)dialog.showModal();
    controls.get(input)?.setAttribute('aria-expanded','true');
    if(dialog.dataset.mode==='options')placeOptions();else delete dialog.dataset.placement;
    const selected=dialog.dataset.mode==='options'?(body.querySelector('[aria-pressed="true"]:not(:disabled)')||body.querySelector('button:not(:disabled)')):body.querySelector('[aria-pressed="true"]');if(selected&&dialog.open){selected.scrollIntoView({block:'nearest'});selected.focus({preventScroll:true});}
    schedulePlacement();
  }
  function enhance(input){
    if(controls.has(input)||input.multiple)return;
    const button=document.createElement('button');button.type='button';button.className='site-picker-button';button.id=input.id?input.id+'Picker':'';
    button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','sitePicker');button.setAttribute('aria-expanded','false');button.addEventListener('click',event=>{event.preventDefault();open(input);});
    input.classList.add('site-picker-source');input.tabIndex=-1;input.setAttribute('aria-hidden','true');input.after(button);controls.set(input,button);refresh(input);
    input.closest('label')?.addEventListener('click',event=>{if(event.target===input||event.target===event.currentTarget){event.preventDefault();open(input);}});
    new MutationObserver(()=>refresh(input)).observe(input,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','class','aria-invalid','aria-describedby','min','max']});
  }
  const pickerFields='select,input[type="date"],input[data-picker="time"]';
  function scan(root){if(root.matches?.(pickerFields))enhance(root);root.querySelectorAll?.(pickerFields).forEach(enhance);}
  scan(document.body);new MutationObserver(records=>{records.forEach(record=>record.addedNodes.forEach(scan));if(records.some(record=>record.removedNodes.length)){for(const [input] of controls){if(!input.isConnected)controls.delete(input);}}}).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('input',event=>{if(controls.has(event.target))refresh(event.target);});document.addEventListener('change',event=>{if(controls.has(event.target))refresh(event.target);});
  dialog.querySelector('.picker-close').addEventListener('click',close);dialog.querySelector('.picker-cancel').addEventListener('click',close);
  dialog.addEventListener('keydown',event=>{
    if(!dialog.open)return;
    if(dialog.dataset.mode==='options'){
      if(event.key==='Tab'){event.preventDefault();event.stopPropagation();closeFocus=adjacentControl(event.shiftKey);close();return;}
      if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
        event.preventDefault();event.stopPropagation();const options=[...body.querySelectorAll('.picker-option:not(:disabled)')];if(!options.length)return;
        const current=options.indexOf(document.activeElement),next=event.key==='Home'?0:event.key==='End'?options.length-1:event.key==='ArrowDown'?Math.min(options.length-1,current+1):Math.max(0,current<0?options.length-1:current-1);
        options[next].focus({preventScroll:true});options[next].scrollIntoView({block:'nearest'});
      }
      return;
    }
    if(event.key!=='Tab')return;
    const items=[...dialog.querySelectorAll('button,input,select,textarea,a[href],[tabindex]')].filter(item=>!item.disabled&&item.tabIndex>=0&&item.getClientRects().length);
    const first=items[0],last=items[items.length-1];if(!first)return;
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}});
  dialog.addEventListener('close',()=>{cancelAnimationFrame(placementFrame);placementFrame=0;const button=controls.get(source),focus=closeFocus||button;if(button)button.setAttribute('aria-expanded','false');source=null;timeDraft=null;closeFocus=null;if(focus&&!focus.disabled&&focus.isConnected)focus.focus({preventScroll:true});});
  window.MuyanPickers=Object.freeze({refresh,buttonFor:input=>controls.get(input),open});
})();
