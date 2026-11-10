/* Site-owned select and date dialogs; original fields retain validation and values. */
(() => {
  'use strict';
  const controls=new Map();let source=null,month=null;
  const dialog=document.createElement('dialog');dialog.id='sitePicker';dialog.setAttribute('aria-labelledby','pickerTitle');
  dialog.innerHTML='<div class="picker-heading"><h2 id="pickerTitle">请选择</h2><button type="button" class="picker-close" aria-label="关闭选择窗口">×</button></div><div id="pickerBody"></div><div class="picker-footer"><button type="button" class="picker-cancel">取消</button></div>';
  document.body.append(dialog);const body=dialog.querySelector('#pickerBody'),title=dialog.querySelector('h2');
  const labelFor=field=>field.getAttribute('data-picker-label')||field.closest('label')?.childNodes[0]?.textContent?.trim()||field.getAttribute('aria-label')||'请选择';
  const dateString=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  function refresh(field){
    const pairs=field&&controls.has(field)?[[field,controls.get(field)]]:[...controls];
    for(const [input,button] of pairs){
      button.disabled=input.disabled;button.textContent=input.tagName==='SELECT'?(input.selectedOptions[0]?.textContent||'请选择'):(input.value||'选择日期');
      button.classList.toggle('field-invalid',input.getAttribute('aria-invalid')==='true');
      if(input.getAttribute('aria-invalid')==='true')button.setAttribute('aria-invalid','true');else button.removeAttribute('aria-invalid');
      const described=input.getAttribute('aria-describedby');if(described)button.setAttribute('aria-describedby',described);else button.removeAttribute('aria-describedby');
      button.setAttribute('aria-label',labelFor(input)+'：'+button.textContent);
    }
  }
  function close(){if(dialog.open)dialog.close();}
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
  function open(input){
    if(input.disabled)return;source=input;title.textContent=labelFor(input);body.className=input.type==='date'?'picker-calendar':'picker-options';
    if(input.type==='date'){
      const value=input.value||input.min||dateString(new Date()),parts=value.split('-').map(Number);month=new Date(parts[0],parts[1]-1,1);renderCalendar();
    }else renderOptions();
    if(!dialog.open)dialog.showModal();
    const selected=body.querySelector('[aria-pressed="true"]');if(selected){selected.scrollIntoView({block:'nearest'});selected.focus({preventScroll:true});}
  }
  function enhance(input){
    if(controls.has(input)||input.multiple)return;
    const button=document.createElement('button');button.type='button';button.className='site-picker-button';button.id=input.id?input.id+'Picker':'';
    button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','sitePicker');button.addEventListener('click',event=>{event.preventDefault();open(input);});
    input.classList.add('site-picker-source');input.tabIndex=-1;input.setAttribute('aria-hidden','true');input.after(button);controls.set(input,button);refresh(input);
    input.closest('label')?.addEventListener('click',event=>{if(event.target===input||event.target===event.currentTarget){event.preventDefault();open(input);}});
    new MutationObserver(()=>refresh(input)).observe(input,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','class','aria-invalid','aria-describedby','min','max']});
  }
  function scan(root){if(root.matches?.('select,input[type="date"]'))enhance(root);root.querySelectorAll?.('select,input[type="date"]').forEach(enhance);}
  scan(document.body);new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(scan))).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('input',event=>{if(controls.has(event.target))refresh(event.target);});document.addEventListener('change',event=>{if(controls.has(event.target))refresh(event.target);});
  dialog.querySelector('.picker-close').addEventListener('click',close);dialog.querySelector('.picker-cancel').addEventListener('click',close);
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}});
  dialog.addEventListener('close',()=>{const button=controls.get(source);source=null;if(button&&!button.disabled)button.focus({preventScroll:true});});
  window.MuyanPickers=Object.freeze({refresh,buttonFor:input=>controls.get(input),open});
})();
