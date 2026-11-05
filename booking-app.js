(() => {
  'use strict';
  const $=id=>document.getElementById(id), partyLabels={single:'单人',double:'双人',multiple:'多人',group:'团片'};
  const titles={portrait:'正片拍摄',snow:'雪景拍摄',effects:'后期制作',event:'场照拍摄'};
  const parties={portrait:'single',snow:'single',event:'single'},drafts={portrait:'',snow:'',event:''};
  let mode='portrait',catalog=null,schedule=null,selectedSlot=null,tableLoading=false,tableGeneration=0;
  let ready=false,sending=false,completed=false,receipt=null,channel='qq',signature='',requestId='',initializing=false;
  const apiBase=String(window.MUYAN_BOOKING?.apiBase||'').replace(/\/+$/,'');
  const freeNgrok=/\.ngrok-free\.(dev|app)$/.test(new URL(apiBase||location.href).hostname);
  const params=new URLSearchParams(location.search),sources=['top','works','price','notes','contact'];
  const home=new URL('./',location.href),from=sources.includes(params.get('from'))?params.get('from'):'works';
  document.querySelectorAll('[data-booking-return]').forEach(link=>link.href=home.pathname+'#'+from);
  let eventOptions=[],selectedOption=null;
  const service=()=>mode==='event'?'event':$('subCategory').value||'portrait';
  const say=(message,error=false)=>{$('formMessage').textContent=message;$('formMessage').classList.toggle('error',error);};
  function step(index){document.querySelectorAll('.steps li').forEach((item,i)=>item.classList.toggle('current',i===index));}
  async function api(path,options={}){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try{const response=await fetch(apiBase+path,{...options,cache:'no-store',credentials:'omit',signal:controller.signal,headers:{...(freeNgrok?{'ngrok-skip-browser-warning':'1'}:{}),...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});const value=await response.json().catch(()=>null);if(!response.ok||!value?.ok){const error=Error(value?.error||'暂时无法连接预约服务，请稍后重试。');error.status=response.status;throw error;}return value;}
    catch(error){if(error.name==='AbortError'||error instanceof TypeError)throw Error('连接暂时中断。请保留表单，恢复连接后重试同一份意向。');throw error;}
    finally{clearTimeout(timer);}
  }
  function submitState(){$('submit').disabled=sending||(!completed&&(!ready||(service()==='event'&&(initializing||tableLoading||!schedule||!selectedSlot))));$('submitText').textContent=completed?'意向已收到 · 查看联系方式':'提交'+titles[service()]+'意向';}
  function edited(){if(completed){completed=false;say('');}submitState();}
  function panel(id,visible){$(id).hidden=!visible;$(id).querySelectorAll('input,select,textarea,button').forEach(control=>control.disabled=!visible);}
  function renderParty(kind){$(kind+'Party').querySelectorAll('[data-party]').forEach(button=>{const active=button.dataset.party===parties[kind];button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});}
  function renderForm(){
    const kind=service(),effects=kind==='effects';
    ['portrait','snow','effects'].forEach(name=>panel(name+'Details',kind===name));panel('eventRegistration',kind==='event');
    $('eventDetails').hidden=kind!=='event';$('commonCharacterField').hidden=effects;$('character').disabled=effects;
    $('notesField').hidden=effects;$('notes').disabled=effects;
    $('portraitPeopleField').hidden=!(kind==='portrait'&&['multiple','group'].includes(parties.portrait));$('portraitPeople').disabled=$('portraitPeopleField').hidden;
    panel('groupDetails',kind==='portrait'&&parties.portrait==='group');$('portraitPartyHelp').hidden=!(kind==='portrait'&&['multiple','group'].includes(parties.portrait));
    $('choosePortrait').classList.toggle('selected',mode==='portrait');$('chooseEvent').classList.toggle('selected',mode==='event');
    $('choosePortrait').setAttribute('aria-pressed',String(mode==='portrait'));$('chooseEvent').setAttribute('aria-pressed',String(mode==='event'));
    $('chooseSnow').setAttribute('aria-pressed',String(kind==='snow'));$('chooseEffects').setAttribute('aria-pressed',String(effects));
    $('detailHeading').textContent={portrait:'聊聊这次的拍摄',snow:'聊聊这次的雪景拍摄',effects:'说说你想要的后期效果',event:'记录这次的漫展相遇'}[kind];
    $('detailIntro').textContent={portrait:'单人和双人无需重复填写人数，多人或团片再填写具体人数。',snow:'选择单人或双人，留下期望日期和拍摄想法。',effects:'只需说明后期效果、所属作品 / IP 和角色。',event:'选择单人或双人，对应人数由系统自动确定。'}[kind];
    $('notesLabel').textContent=kind==='event'?'其他拍摄需求':'拍摄想法 / 想补充的事';
    ['portrait','snow','event'].forEach(renderParty);renderSpecial();updateSummary();submitState();
  }
  function selectService(next){
    if(sending)return;const previous=service();if(previous!=='effects')drafts[previous]=$('notes').value;
    mode=next==='event'?'event':'portrait';$('subCategory').value=['snow','effects'].includes(next)?next:'';
    if(next!=='effects')$('notes').value=drafts[next]||'';else $('effectsCharacter').value=$('character').value;
    if(['snow','effects'].includes(next))$('specialServices').open=true;
    edited();renderForm();step(0);
  }
  $('choosePortrait').addEventListener('click',()=>selectService('portrait'));$('chooseEvent').addEventListener('click',()=>selectService('event'));
  $('chooseSnow').addEventListener('click',()=>selectService('snow'));$('chooseEffects').addEventListener('click',()=>selectService('effects'));
  ['portrait','snow','event'].forEach(kind=>$(kind+'Party').querySelectorAll('[data-party]').forEach(button=>button.addEventListener('click',()=>{if(sending)return;parties[kind]=button.dataset.party;if(kind==='event')renderPackages(false);edited();renderForm();step(1);})));
  $('character').addEventListener('input',()=>{$('effectsCharacter').value=$('character').value;});$('effectsCharacter').addEventListener('input',()=>{$('character').value=$('effectsCharacter').value;});
  function contactType(){const qq=$('contactType').value==='qq';$('contactLabel').textContent=qq?'QQ 号码':'微信号';$('contact').inputMode=qq?'numeric':'text';$('contact').placeholder=qq?'方便与你联系的 QQ 号':'方便与你联系的微信号';if(qq){$('contact').pattern='[1-9][0-9]{4,14}';$('contact').title='请填写 5 至 15 位有效 QQ 号码';}else{$('contact').removeAttribute('pattern');$('contact').removeAttribute('title');}}
  $('contactType').addEventListener('change',contactType);
  document.querySelectorAll('#bookingForm input,#bookingForm select,#bookingForm textarea').forEach(input=>input.addEventListener('input',()=>{edited();updateSummary();step(1);}));
  function renderSpecial(){
    const kind=service(),root=$('specialInfo');root.replaceChildren();root.hidden=!catalog||!['snow','effects'].includes(kind);if(root.hidden)return;
    const title=document.createElement('h3'),copy=document.createElement('p'),price=document.createElement('p');price.className='special-price';
    if(kind==='snow'){title.textContent=catalog.snow.description;copy.textContent=catalog.snow.service_note+'。'+catalog.snow.billing_note+'。';price.textContent='双人拼单 '+catalog.snow.double_per_person+' 元/人 · 单人 '+catalog.snow.single_per_person+' 元/人';}
    else{title.textContent='把你的想法，变成画面里的另一种可能';copy.textContent='请说明希望的后期效果、所属作品与角色。素材、制作范围和交付安排通过 QQ / 微信沟通，具体费用以需求确认为准。';price.textContent=catalog.effects.options.map(item=>item.label).join(' · ');}
    root.append(title,copy,price);
  }
  function renderAddons(){
    const checked=new Set(Array.from($('portraitAddons').querySelectorAll('input:checked'),input=>input.value));$('portraitAddons').replaceChildren();
    catalog.portrait_addons.forEach(item=>{const label=document.createElement('label');label.className='addon-choice';const input=document.createElement('input');input.type='checkbox';input.value=item.id;input.checked=checked.has(item.id);const text=document.createElement('span');text.textContent=item.label;label.append(input,text);input.addEventListener('change',()=>{if(input.checked&&item.requires_pickup)$('pickup').value='yes';edited();});$('portraitAddons').append(label);});
  }
  $('pickup').addEventListener('change',()=>{if($('pickup').value==='no'&&catalog)$('portraitAddons').querySelectorAll('input').forEach(input=>{if(catalog.portrait_addons.find(item=>item.id===input.value)?.requires_pickup)input.checked=false;});});
  function updateSummary(){
    const kind=service(),effects=kind==='effects';$('summaryTypeLabel').textContent=effects?'服务类型':'拍摄类型';$('summaryType').textContent=effects?'后期 / 特效':(kind==='snow'?'雪景':kind==='event'?'场照':'正片')+' · '+partyLabels[parties[kind]];
    $('summaryRole').textContent=(effects?$('effectsCharacter'):$('character')).value.trim()||'等待填写角色';
    $('summaryWorkRow').hidden=!effects;$('summaryWork').textContent=$('effectsIP').value.trim()||'等待填写作品';$('summaryTimeRow').hidden=effects;$('summaryLocationRow').hidden=effects;
    $('summaryTimeLabel').textContent=kind==='snow'?'期望日期':'期望时间';
    $('summaryTime').textContent=kind==='event'?(schedule&&selectedSlot?schedule.session+' · '+schedule.date+' '+selectedSlot.start.slice(11,16)+'–'+selectedSlot.end.slice(11,16):'先选一个漫展时段'):kind==='snow'?($('snowDate').value||'选择一个期望日期'):($('portraitDate').value?$('portraitDate').value+' · '+$('portraitTime').value:'还可以慢慢安排');
    $('summaryLocation').textContent=kind==='event'?(schedule?.location||'以本场活动安排为准'):kind==='snow'?(catalog?.snow.description||'主城出发 · 雪景地'):$('location').value.trim()||'一起选个喜欢的地方';
    $('summaryFoot').textContent=effects?'想法先收好，制作细节一起确认。':'意向先收好，档期沟通后再确认。';
  }
  $('openExhibition').addEventListener('click',()=>{if(sending)return;const open=$('exhibitionContent').hidden;$('exhibitionContent').hidden=!open;$('openExhibition').setAttribute('aria-expanded',String(open));$('openExhibition').querySelector('.expand-icon').textContent=open?'−':'＋';});
  function renderTable(){
    const root=$('timeTable');root.replaceChildren();if(!schedule)return;
    $('tableTitle').textContent=schedule.session+' · '+schedule.date;const table=document.createElement('table');table.setAttribute('aria-label',schedule.session+' 场照时段占用情况');
    const head=document.createElement('thead'),tr=document.createElement('tr');['拍摄时段','状态','选择'].forEach(label=>{const th=document.createElement('th');th.textContent=label;th.scope='col';tr.append(th);});head.append(tr);table.append(head);const body=document.createElement('tbody');
    schedule.slots.forEach(slot=>{const row=document.createElement('tr');if(selectedSlot?.id===slot.id)row.className='selected';const time=document.createElement('td');time.className='time';time.textContent=slot.start.slice(11,16)+' — '+slot.end.slice(11,16);const state=document.createElement('td'),tag=document.createElement('span');tag.className='slot-status '+slot.status;tag.textContent={available:'可提交意向',occupied:'已占用',unavailable:'暂不开放'}[slot.status];state.append(tag);const action=document.createElement('td'),button=document.createElement('button');button.type='button';button.disabled=!slot.can_book||sending;button.textContent=selectedSlot?.id===slot.id?'已选择 ✓':slot.can_book?'选这个时段':'不可选';button.setAttribute('aria-label',(selectedSlot?.id===slot.id?'已选择 ':'选择 ')+time.textContent);button.setAttribute('aria-pressed',String(selectedSlot?.id===slot.id));button.addEventListener('click',()=>{if(sending||tableLoading)return;selectedSlot=slot;edited();renderTable();updateSummary();say('');});action.append(button);row.append(time,state,action);body.append(row);});table.append(body);root.append(table);
    $('selectedTimeHint').textContent=selectedSlot?schedule.session+' · '+schedule.date+' '+selectedSlot.start.slice(11,16)+'–'+selectedSlot.end.slice(11,16)+'，已选中此时段。':'请在上方时间表选择一个可提交意向的时段。';
  }
  function renderPackages(keep=false){
    const previous=keep?$('package').value:'';const items=(schedule?.packages||[]).filter(item=>!item.party_type||item.party_type===parties.event);$('package').replaceChildren();
    if(!items.length){$('package').append(new Option('具体套餐提交后沟通',''));}
    else{const placeholder=new Option('请选择'+partyLabels[parties.event]+'场照套餐','');placeholder.disabled=true;placeholder.selected=true;$('package').append(placeholder);['basic','retouch',''].forEach(processing=>{const group=document.createElement('optgroup');group.label=processing==='basic'?'普修套餐':processing==='retouch'?'精修套餐':'其他套餐';items.filter(item=>(item.processing||'')===processing).forEach(item=>group.append(new Option(item.label,item.id)));if(group.children.length)$('package').append(group);});if(items.some(item=>item.id===previous))$('package').value=previous;}
    $('package').required=items.length>0;$('packageRequired').hidden=!items.length;
    $('packageHint').textContent='已按官网同步'+partyLabels[parties.event]+'套餐、返图张数与费用说明。';renderPackagePrice();
  }
  function renderPackagePrice(){const item=schedule?.packages.find(p=>p.id===$('package').value),root=$('packagePricing');root.replaceChildren();root.hidden=!item;if(!item)return;const title=document.createElement('strong'),copy=document.createElement('p');title.textContent=item.label;copy.textContent=item.description;root.append(title,copy);if(item.pricing?.kind==='base_plus_retouch'){const note=document.createElement('p');note.className='variable-price-note';note.textContent='这里显示的是基础费用，不是最终总价。精修张数及最终尾款以沟通确认为准。';root.append(note);}}
  $('package').addEventListener('change',renderPackagePrice);
  async function loadSchedule(id,keep=false){
    const generation=++tableGeneration,old=keep?selectedSlot?.id:null;tableLoading=true;$('refreshTable').disabled=true;if(!keep){selectedSlot=null;schedule=null;$('timeTable').textContent='正在加载这个场次的时间表…';renderPackages(false);updateSummary();}submitState();
    try{const response=await api('/api/public/event-schedules/'+encodeURIComponent(id));if(generation!==tableGeneration)return;schedule=response.schedule;selectedSlot=schedule.slots.find(slot=>slot.id===old&&slot.can_book)||null;$('sessionChoices').querySelectorAll('button').forEach(button=>{const active=button.dataset.id===id;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});renderPackages(keep);renderTable();updateSummary();}
    catch(error){if(generation===tableGeneration){schedule=null;selectedSlot=null;$('timeTable').textContent='时间表暂时无法加载，请重新选择场次。';renderPackages(false);updateSummary();say(error.message,true);}}
    finally{if(generation===tableGeneration){tableLoading=false;$('refreshTable').disabled=false;submitState();}}
  }
  $('refreshTable').addEventListener('click',()=>{if(!sending)start();});
  async function chooseEventOption(option,keep=false){
    const previous=keep?schedule?.id:null,previousSlot=keep?selectedSlot?.id:null,previousPackage=keep?$('package').value:'';
    selectedOption=option;tableGeneration++;schedule=null;selectedSlot=null;tableLoading=false;
    $('eventOptionTitle').textContent=option?.title||'场照活动暂未开放';
    $('openExhibition').disabled=!option;
    $('sessionChoices').replaceChildren();$('timeTable').replaceChildren();
    $('tableTitle').textContent='选择一场，看看时间安排';$('refreshTable').disabled=!option;
    renderPackages(false);updateSummary();submitState();
    $('eventOptionChoices').querySelectorAll('button').forEach(button=>button.classList.toggle('active',button.dataset.id===option?.id));
    const sessions=option?.sessions||[];
    if(!sessions.length){
      const text=option?.message||'本场时间表待开放，请稍后再来查看。';
      $('tableTitle').textContent=(option?.title||'场照')+' · 时间表待开放';$('timeTable').textContent=text;$('selectedTimeHint').textContent=text;
      if(!option)$('exhibitionContent').hidden=false;
      return;
    }
    sessions.forEach(session=>{
      const button=document.createElement('button');button.type='button';button.dataset.id=session.id;button.setAttribute('aria-pressed','false');
      const label=document.createTextNode(session.session+' 场次'),date=document.createElement('small');date.textContent=session.date;button.append(label,date);
      button.addEventListener('click',()=>{if(sending)return;edited();loadSchedule(session.id);});$('sessionChoices').append(button);
    });
    const active=sessions.find(session=>session.id===previous)||sessions[0];
    await loadSchedule(active.id,Boolean(previous&&active.id===previous));
    if(keep&&schedule?.id===previous){
      selectedSlot=schedule.slots.find(slot=>slot.id===previousSlot&&slot.can_book)||null;
      if([...$('package').options].some(item=>item.value===previousPackage))$('package').value=previousPackage;
      renderPackagePrice();renderTable();updateSummary();submitState();
    }
  }
  async function loadEventOptions(){
    const data=await api('/api/public/event-options');eventOptions=data.items||[];
    const choices=$('eventOptionChoices');choices.replaceChildren();choices.hidden=eventOptions.length<=1;
    eventOptions.forEach(option=>{const button=document.createElement('button');button.type='button';button.dataset.id=option.id;button.textContent=option.title;button.addEventListener('click',()=>{if(!sending)chooseEventOption(option)});choices.append(button)});
    await chooseEventOption(eventOptions.find(option=>option.id===selectedOption?.id)||eventOptions[0]||null,true);
  }
  async function start(){
    if(initializing||sending)return;initializing=true;submitState();
    try{
      const [options,values]=await Promise.all([api('/api/public/options'),api('/api/public/service-catalog')]);
      catalog=values;$('portraitDate').min=options.today;$('snowDate').min=options.today;renderAddons();renderForm();ready=true;
      $('serviceStatus').textContent='预约服务已连接 · 提交意向后再一起确认安排';$('serviceStatus').classList.remove('error');
      try{await loadEventOptions()}catch(error){
        tableGeneration++;schedule=null;selectedSlot=null;tableLoading=false;$('timeTable').textContent='活动时间表暂时无法读取，请稍后重试。';
        $('selectedTimeHint').textContent='时间表暂不可用，请稍后重试。';if(service()==='event')say(error.message,true);
      }
    }catch(error){ready=false;$('serviceStatus').textContent=error.message;$('serviceStatus').classList.add('error');const retry=document.createElement('button');retry.type='button';retry.className='text-button';retry.textContent='重新连接';retry.addEventListener('click',start);$('serviceStatus').append(retry)}
    finally{initializing=false;submitState()}
  }
  function payload(){
    const kind=service();const body={category:mode,nickname:$('nickname').value.trim(),character:(kind==='effects'?$('effectsCharacter'):$('character')).value.trim(),contact_type:$('contactType').value,contact:$('contact').value.trim(),consent:$('consent').checked};
    if(kind==='effects')return {...body,sub_category:'effects',work_ip:$('effectsIP').value.trim(),effect_description:$('effectsBrief').value.trim()};
    body.notes=$('notes').value.trim();body.party_type=parties[kind];
    if(kind==='snow')return {...body,sub_category:'snow',preferred_date:$('snowDate').value};
    if(kind==='portrait'){Object.assign(body,{sub_category:'',preferred_date:$('portraitDate').value,preferred_time:$('portraitTime').value,venue_type:$('venueType').value,location:$('location').value.trim(),needs_pickup:$('pickup').value==='yes',addons:Array.from($('portraitAddons').querySelectorAll('input:checked'),input=>input.value)});if(['multiple','group'].includes(parties.portrait))body.people=Number($('portraitPeople').value);if(parties.portrait==='group')body.group_details={solo_shots:$('soloShots').checked,group_shots:$('groupShots').checked,combinations:$('combinations').value.trim()};}
    else{if(tableLoading||!schedule||!selectedSlot)throw Error('请先选择漫展、场次和可提交意向的时段。');Object.assign(body,{event_id:schedule.id,event_slot_id:selectedSlot.id,package_id:$('package').value});}
    return body;
  }
  function busy(value){sending=value;$('formFields').disabled=value;document.querySelectorAll('.service-choices button,.special-choices button,#sessionChoices button,#openExhibition').forEach(button=>button.disabled=value);submitState();}
  $('bookingForm').addEventListener('submit',async event=>{
    event.preventDefault();if(sending)return;if(completed&&receipt){openContacts();return;}if(!ready)return;if(!$('bookingForm').reportValidity())return;
    let body;try{body=payload();}catch(error){say(error.message,true);if(service()==='event')$('openExhibition').focus();return;}
    const next=JSON.stringify(body);if(next!==signature){requestId=crypto.randomUUID();signature=next;}body.request_id=requestId;const submitted=service();busy(true);say('正在收好你的'+(submitted==='effects'?'制作需求':'拍摄意向')+'…');
    try{const result=await api('/api/public/'+mode+'/bookings',{method:'POST',body:JSON.stringify(body)});receipt={...result,service:result.service||submitted};completed=true;say('意向已收到，请通过下方联系方式继续沟通。');openContacts();}
    catch(error){say(error.message,true);if(error.status===409){requestId='';signature='';if(submitted==='event')await loadEventOptions();}}
    finally{busy(false);renderForm();}
  });
  function openContacts(){channel='qq';const effects=receipt.service==='effects';$('successTitle').textContent=effects?'后期需求已收到。':'拍摄意向已收到。';document.querySelector('.dialog-intro').textContent=effects?'下一步，联系慕言，一起确认制作效果与交付安排。':'下一步，联系慕言，一起把这次拍摄安排好。';$('contactFooter').textContent=effects?'制作效果、费用和交付安排，以双方沟通确认为准。':'提交意向不代表档期已确认，具体安排以沟通结果为准。';$('receiptId').textContent=receipt.id.slice(0,12).toUpperCase();renderContact();step(2);if(!$('contactDialog').open)$('contactDialog').showModal();}
  function renderContact(){const item=receipt.contacts.channels.find(c=>c.id===channel),qq=channel==='qq';$('contactQQ').classList.toggle('active',qq);$('contactWechat').classList.toggle('active',!qq);$('contactQQ').setAttribute('aria-pressed',String(qq));$('contactWechat').setAttribute('aria-pressed',String(!qq));$('contactQR').src=item.qr_url||new URL('images/'+(qq?'qq.png':'wechat.png'),location.href).href;$('contactQR').alt=qq?'慕言 QQ 大号二维码':'慕言微信二维码';$('contactKind').textContent=qq?'QQ 大号':'微信号';$('copyNumber').replaceChildren(document.createTextNode(item.number));const hint=document.createElement('span');hint.textContent='点击复制 ↗';$('copyNumber').append(hint);$('copyButton').textContent=item.copy_label;$('contactHelp').textContent=item.help;$('copyStatus').textContent='';}
  async function copyContact(){const item=receipt.contacts.channels.find(c=>c.id===channel);try{await navigator.clipboard.writeText(item.copy_value);$('copyStatus').textContent=(channel==='qq'?'QQ 号':'微信号')+'已复制，可以打开应用添加。';}catch{$('copyStatus').textContent='暂时无法自动复制，请手动复制上方号码。';}}
  $('copyNumber').addEventListener('click',copyContact);$('copyButton').addEventListener('click',copyContact);$('contactQQ').addEventListener('click',()=>{channel='qq';renderContact();});$('contactWechat').addEventListener('click',()=>{channel='wechat';renderContact();});$('closeContact').addEventListener('click',()=>$('contactDialog').close());
  window.addEventListener('offline',()=>{if(['127.0.0.1','localhost'].includes(location.hostname))return;ready=false;submitState();$('serviceStatus').textContent='当前设备已离线，请保留表单，联网后再重试。';$('serviceStatus').classList.add('error');});window.addEventListener('online',()=>start());
  window.addEventListener('beforeunload',event=>{
    if(completed)return;
    if(['nickname','contact','character','notes','portraitDate','snowDate','effectsBrief','effectsIP'].some(id=>$(id).value.trim())){event.preventDefault();event.returnValue='';}
  });
  contactType();
  const initial=params.get('type');selectService(['portrait','event','snow','effects'].includes(initial)?initial:'portrait');start();
})();
