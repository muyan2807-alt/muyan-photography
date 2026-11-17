(() => {
  'use strict';
  const $=id=>document.getElementById(id), partyLabels={single:'单人',double:'双人',multiple:'多人'};
  const titles={portrait:'正片拍摄',snow:'雪景拍摄',effects:'后期制作',event:'场照拍摄'};
  const parties={portrait:'single',snow:'single',event:'single'},drafts={portrait:'',snow:'',event:'',effects:''};
  let mode='portrait',catalog=null,schedule=null,selectedSlot=null,tableLoading=false,tableGeneration=0;
  let ready=false,sending=false,completed=false,receipt=null,channel='qq',qqAccount='main',signature='',requestId='',initializing=false;
  const apiBase=String(window.MUYAN_BOOKING?.apiBase||'').replace(/\/+$/,'');
  const freeNgrok=/\.ngrok-free\.(dev|app)$/.test(new URL(apiBase||location.href).hostname);
  const params=new URLSearchParams(location.search),sources=['top','works','price','notes','contact'];
  const home=new URL('./',location.href),from=sources.includes(params.get('from'))?params.get('from'):'works';
  const detailUI=window.MuyanBookingDetails;
  const detailChanged=()=>{edited();updateSummary();step(1);};
  const timeEditor=detailUI.timeRange($('portraitTimeRange'),{idPrefix:'portraitRange',onChange:value=>{$('portraitTime').value=value;detailChanged();}});
  const peopleEditors=Object.fromEntries(['portrait','snow'].map(kind=>[kind,detailUI.participants($(kind+'Participants'),{idPrefix:kind+'Person',onChange:detailChanged,...(kind==='portrait'?{showPrimary:false,compact:true}:{})})]));
  const locationEditor=detailUI.locations($('portraitLocationPlan'),{idPrefix:'portraitLocation',onChange:detailChanged});

  let eventOptions=[],selectedOption=null,eventFlow='new',templateDay=0;
  let celebrationTimer=0;
  let booted=false,restoringDraft=false,draftDirty=false,pendingSubmission=false,draftSaveTimer=0,savedExpiryTimer=0,pendingAddonIds=null,pendingEventRestore=null,requestedScheduleId='';
  let savedToastTimer=0,savedWelcomeChecked=false,savedToastPointer=false,savedStorageWarningShown=false;
  // Only a display template. No synthetic IDs can be submitted to the live API.
  const eventTemplateTimes=Array.from({length:22},(_,i)=>{const minutes=570+i*20;return String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');});
  const eventTemplates=[
    {id:'chongqing-meng22',title:'重庆梦二十二动漫展（2.13-2.14）',days:[{session:'D1',date:'2027-02-13'},{session:'D2',date:'2027-02-14'}]},
    {id:'shijiexian-202701',title:'世界线（1.23—25）',days:[{session:'D1',date:'2027-01-23'},{session:'D2',date:'2027-01-24'},{session:'D3',date:'2027-01-25'}]}
  ];
  const selectedTemplate=()=>eventTemplates.find(item=>item.id===selectedOption?.id);
  const visits=new Map();let customerFeatures={};
  const serviceDays={portrait:new Map(),snow:new Map()},activeServiceDay={portrait:'',snow:''},validatedServiceDays=new Set(),validatedEventDays=new Set();let serviceDaySequence=0,loadingServiceDay=false;
  const service=()=>mode==='event'?'event':$('subCategory').value||'portrait';
  const say=(message,error=false)=>{$('formMessage').textContent=message;$('formMessage').classList.toggle('error',error);};
  const multiLocation=()=>Boolean($('portraitAddons').querySelector('input[value="multi_location_role"]:checked'));
  const peopleCount=kind=>parties[kind]==='double'?2:parties[kind]==='multiple'?Math.max(3,Math.min(20,Number($('portraitPeople').value)||3)):1;
  const dayList=kind=>Array.from(serviceDays[kind]?.values()||[]);
  const dayKey=()=> 'shoot-day-'+(++serviceDaySequence);
  function emptyServiceDay(kind){return {key:dayKey(),preferred_date:'',preferred_time:'',time_start:'',time_end:'',character:'',party_type:'single',people:1,venue_type:'outdoor',location:'',addons:[],participants:[],location_plan:[],notes:''};}
  function stashServiceDay(){
    const kind=service();if(loadingServiceDay||!serviceDays[kind])return;
    syncDetails();const key=activeServiceDay[kind]||dayKey();activeServiceDay[kind]=key;
    const previous=serviceDays[kind].get(key),start=kind==='portrait'?$('portraitRange-start').value:'',end=kind==='portrait'?$('portraitRange-end').value:'',legacy=kind==='portrait'&&!start&&!end&&previous?.preferred_time&&!previous.preferred_time.includes('–')?previous.preferred_time:'';
    serviceDays[kind].set(key,{key,preferred_date:$(kind==='snow'?'snowDate':'portraitDate').value,preferred_time:kind==='portrait'?timeEditor.value()||legacy:'',time_start:start,time_end:end,character:$('character').value.trim(),party_type:parties[kind],people:peopleCount(kind),venue_type:kind==='portrait'?$('venueType').value:'',location:kind==='portrait'?$('location').value.trim():'',addons:kind==='portrait'?Array.from($('portraitAddons').querySelectorAll('input:checked'),input=>input.value):[],participants:peopleEditors[kind].value(),location_plan:kind==='portrait'?locationEditor.value():[],notes:$('notes').value.trim()});
  }
  function activateServiceDay(kind,key){
    let value=serviceDays[kind].get(key);
    if(!value){value=emptyServiceDay(kind);serviceDays[kind].set(value.key,value);key=value.key;}
    loadingServiceDay=true;activeServiceDay[kind]=key;
    parties[kind]=['single','double','multiple'].includes(value.party_type)&&!(kind==='snow'&&value.party_type==='multiple')?value.party_type:'single';
    $(kind==='snow'?'snowDate':'portraitDate').value=value.preferred_date||'';$('character').value=value.character||'';$('notes').value=value.notes||'';drafts[kind]=$('notes').value;
    peopleEditors[kind].setCount(value.people||1);peopleEditors[kind].setValue(value.participants||[]);
    if(kind==='portrait'){
      $('portraitPeople').value=String(value.party_type==='multiple'?Math.max(3,value.people||3):3);$('venueType').value=typeof value.venue_type==='string'?value.venue_type:'outdoor';$('location').value=value.location||'';
      timeEditor.setValue(value.preferred_time||'');$('portraitRange-start').value=value.time_start||$('portraitRange-start').value;$('portraitRange-end').value=value.time_end||$('portraitRange-end').value;$('portraitTime').value=timeEditor.value();
      locationEditor.setValue(value.location_plan||[]);pendingAddonIds=Array.isArray(value.addons)?value.addons.slice():[];applySavedAddons();
    }
    loadingServiceDay=false;clearValidation();renderForm();
  }
  function serviceDayError(value,kind){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value.preferred_date||'')||value.preferred_date<$(kind==='snow'?'snowDate':'portraitDate').min)return {id:kind==='snow'?'snowDate':'portraitDate',message:'请选择本日有效的期望日期。'};
    if(kind==='portrait'&&(!/^([01]\d|2[0-3]):[0-5]\d–([01]\d|2[0-3]):[0-5]\d$/.test(value.preferred_time||'')||value.preferred_time.slice(6)<=value.preferred_time.slice(0,5)))return {id:!value.time_start?'portraitRange-start':'portraitRange-end',message:'请选择本日有效的开始与结束时间。'};
    if(!value.character)return {id:'character',message:'请填写本日角色。'};
    if(kind==='portrait'&&!['outdoor','studio'].includes(value.venue_type))return {id:'venueType',message:'请选择本日外景或棚拍。'};
    if(!Array.isArray(value.participants)||value.participants.length!==value.people)return {id:kind+'Person-1-cn',message:'请补全本日每位出镜者的信息。'};
    for(let index=1;index<value.people;index++)for(const key of ['cn','character'])if(!value.participants[index]?.[key]?.trim())return {id:kind+'Person-'+index+'-'+key,message:'请填写本日第 '+(index+1)+' 位出镜者的 '+(key==='cn'?'CN':'角色')+'。'};
    if(kind==='portrait'&&value.addons.includes('multi_location_role')&&(!value.location_plan.length||value.location_plan.some(location=>!String(location).trim())))return {id:'portraitLocation-'+Math.max(0,value.location_plan.findIndex(location=>!String(location).trim())),message:'请补全本日地点 / 场景顺序。'};
    return null;
  }
  function renderServiceDays(){
    const kind=service(),root=$('serviceDaySelections'),visible=Boolean(serviceDays[kind]);$('serviceDayPanel').hidden=!visible;if(!visible)return;
    const days=dayList(kind);root.replaceChildren();$('serviceDayCount').textContent=(kind==='snow'?'雪景':'正片')+' · 已安排 '+days.length+' 天，正在填写第 '+Math.max(1,days.findIndex(day=>day.key===activeServiceDay[kind])+1)+' 天';$('addServiceDay').disabled=$('copyServiceDay').disabled=sending||days.length>=31;
    days.forEach((day,index)=>{
      const card=document.createElement('article'),head=document.createElement('div'),title=document.createElement('strong'),copy=document.createElement('p'),actions=document.createElement('div'),edit=document.createElement('button'),remove=document.createElement('button');
      card.className='event-day-card'+(day.key===activeServiceDay[kind]?' is-current':'');card.dataset.dayKey=day.key;head.className='event-day-head';title.textContent='第 '+(index+1)+' 天 · '+(day.preferred_date||'日期待选择');head.append(title);
      copy.textContent=(day.character||'角色待填写')+' · '+(partyLabels[day.party_type]||'单人')+(kind==='portrait'?' · '+(day.preferred_time||'时间待选择'):'');
      const error=serviceDayError(day,kind);if(error){const attempted=validatedServiceDays.has(day.key);if(attempted)card.classList.add('is-unavailable');const note=document.createElement('p');note.className=attempted?'unavailable-note':'field-help';note.textContent=(attempted?'':'待填写 · ')+error.message;copy.append(document.createElement('br'),note);}
      actions.className='event-day-actions';edit.type=remove.type='button';edit.textContent=day.key===activeServiceDay[kind]?'正在填写':'填写／修改这天';remove.textContent='移除这天';edit.disabled=sending;remove.disabled=sending||days.length<=1;
      edit.addEventListener('click',()=>{if(sending)return;stashServiceDay();activateServiceDay(kind,day.key);queueDraftSave();$('customerSection').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
      remove.addEventListener('click',()=>{if(sending||serviceDays[kind].size<=1)return;stashServiceDay();serviceDays[kind].delete(day.key);if(activeServiceDay[kind]===day.key)activateServiceDay(kind,dayList(kind)[Math.min(index,serviceDays[kind].size-1)].key);edited();updateSummary();});
      actions.append(edit,remove);card.append(head,copy,actions);root.append(card);
    });
  }
  $('addServiceDay').addEventListener('click',()=>{const kind=service();if(sending||!serviceDays[kind]||serviceDays[kind].size>=31)return;stashServiceDay();const day=emptyServiceDay(kind);serviceDays[kind].set(day.key,day);activateServiceDay(kind,day.key);edited();updateSummary();say('已保留其他日期的填写内容，请安排这一天。');$('customerSection').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
  $('copyServiceDay').addEventListener('click',()=>{
    const kind=service();if(sending||!serviceDays[kind]||serviceDays[kind].size>=31)return;stashServiceDay();const source=serviceDays[kind].get(activeServiceDay[kind]);if(!source)return;
    const day=emptyServiceDay(kind);day.party_type=source.party_type;day.people=source.people;day.venue_type='';day.participants=Array.from({length:day.people},(_,index)=>({cn:index?source.participants[index]?.cn||'':$('nickname').value.trim(),character:''}));
    serviceDays[kind].set(day.key,day);activateServiceDay(kind,day.key);edited();updateSummary();say('已沿用人数与 CN。日期、角色、时间、地点、附加需求和备注请重新填写。');$('customerSection').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  });
  function eventCopyState(){
    const source=visitList().filter(value=>value.date!==schedule?.date).at(-1),selected=service()==='event'&&Boolean(schedule&&selectedSlot);
    const dirty=Boolean($('character').value.trim()||$('package').value||$('eventStyle').value||$('partnerNickname').value.trim()||$('partnerCharacter').value.trim()||$('notes').value.trim()||parties.event!=='single');
    return {source,enabled:selected&&Boolean(source)&&!dirty&&!sending&&!tableLoading,dirty,selected};
  }
  function renderEventCopy(){
    const state=eventCopyState(),source=state.source;$('copyEventBasics').disabled=!state.enabled;
    $('copyEventBasicsHint').textContent=!state.selected?'先选择本日时段，再沿用另一日的基础信息。':!source?'已有另一日安排后，可沿用那天的人数和同行 CN。':state.dirty?'本日已有填写内容，不会自动覆盖；如需调整，请手动修改。':'来源：'+source.session+' · '+source.date+'。只沿用人数和同行 CN，本日时段保留；角色、风格、套餐和备注需重新填写。';
  }
  $('copyEventBasics').addEventListener('click',()=>{
    const state=eventCopyState();if(!state.enabled)return;parties.event=state.source.party_type==='double'?'double':'single';$('partnerNickname').value=parties.event==='double'?state.source.partner_nickname||'':'';renderPackages(false);edited();renderForm();say('已沿用 '+state.source.session+' 的人数和同行 CN；本日时段未改变，请填写本日的角色、风格和套餐。');
  });
  function syncDetails(){
    const kind=service(),primary={cn:$('nickname').value.trim(),character:$('character').value.trim()};
    timeEditor.setDisabled(kind!=='portrait');
    for(const name of ['portrait','snow']){
      const count=peopleCount(name),visible=kind===name&&count>1;
      peopleEditors[name].setCount(count);peopleEditors[name].setPrimary(primary);peopleEditors[name].setDisabled(!visible);$(name+'Participants').hidden=!visible;
    }
    const planned=kind==='portrait'&&multiLocation();$('portraitLocationPlan').hidden=!planned;locationEditor.setDisabled(!planned);
    $('locationField').hidden=planned;$('location').disabled=kind!=='portrait'||planned;
  }
  function step(index){document.querySelectorAll('.steps li').forEach((item,i)=>item.classList.toggle('current',i===index));}
  async function api(path,options={}){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try{const response=await fetch(apiBase+path,{...options,cache:'no-store',credentials:'omit',signal:controller.signal,headers:{...(freeNgrok?{'ngrok-skip-browser-warning':'1'}:{}),...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});const value=await response.json().catch(()=>null);if(!response.ok||!value?.ok){const error=Error(value?.error||'暂时无法连接预约服务，请稍后重试。');error.status=response.status;throw error;}return value;}
    catch(error){if(error.name==='AbortError'||error instanceof TypeError)throw Error('连接暂时中断。请保留表单，恢复连接后重试同一份意向。');throw error;}
    finally{clearTimeout(timer);}
  }
  function submitState(){$('submit').disabled=sending;$('submitText').textContent=completed?'意向已收到 · 查看联系方式':service()==='event'&&eventFlow==='friend'?'提交场照排单':'提交'+titles[service()]+'意向';renderEventCopy();queueReadiness();}
  function edited(){stashVisit();stashServiceDay();renderVisitCards();renderServiceDays();renderEventCopy();queueReadiness();if(selectedSlot?.can_book)clearTimeError();if(completed){completed=false;say('');}submitState();queueDraftSave();}
  function panel(id,visible){$(id).hidden=!visible;$(id).querySelectorAll('input,select,textarea,button').forEach(control=>control.disabled=!visible);}
  function renderParty(kind){$(kind+'Party').querySelectorAll('[data-party]').forEach(button=>{const active=button.dataset.party===parties[kind];button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});}
  function siteURL(kind,section,notes=''){
    const url=new URL(home.href);url.searchParams.set('service',kind);if(notes)url.searchParams.set('notes',notes);url.hash=section;return url.pathname+url.search+url.hash;
  }
  function updateSiteLinks(kind){
    document.querySelectorAll('[data-booking-return]').forEach(link=>link.href=siteURL(kind,from));
    const note=kind==='event'?'cz':kind==='portrait'&&parties.portrait==='multiple'?'group':kind==='effects'?'general':'zp';
    document.querySelector('.notes-link').href=siteURL(kind,'notes',note);
  }
  function positionServiceIdentity(kind){
    const target=$(kind==='portrait'?'portraitIdentityRow':kind==='snow'?'snowIdentityRow':kind==='event'?'eventIdentityRow':'roleFieldParking');
    const field=$('commonCharacterField');if(field.parentElement!==target)target.prepend(field);
  }
  function renderForm(){
    const kind=service(),effects=kind==='effects';positionServiceIdentity(kind);
    ['portrait','snow','effects'].forEach(name=>panel(name+'Details',kind===name));panel('eventRegistration',kind==='event');
    $('eventDetails').hidden=kind!=='event';$('eventSelections').hidden=kind!=='event';$('eventSelectionCount').hidden=kind!=='event';$('commonCharacterField').hidden=effects;$('character').disabled=effects;
    $('notesField').hidden=false;$('notes').disabled=false;
    $('portraitPeopleField').hidden=!(kind==='portrait'&&parties.portrait==='multiple');$('portraitPeople').disabled=$('portraitPeopleField').hidden;$('portraitPeopleRow').hidden=$('portraitPeopleField').hidden;
    panel('eventPartner',kind==='event'&&parties.event==='double');$('portraitPartyHelp').hidden=!(kind==='portrait'&&parties.portrait==='multiple');
    $('choosePortrait').classList.toggle('selected',mode==='portrait');$('chooseEvent').classList.toggle('selected',mode==='event');
    $('choosePortrait').setAttribute('aria-pressed',String(mode==='portrait'));$('chooseEvent').setAttribute('aria-pressed',String(mode==='event'));
    $('chooseSnow').setAttribute('aria-pressed',String(kind==='snow'));$('chooseEffects').setAttribute('aria-pressed',String(effects));
    $('detailHeading').textContent={portrait:'聊聊这次的拍摄',snow:'聊聊这次的雪景拍摄',effects:'说说你想要的后期效果',event:'记录这次的漫展相遇'}[kind];
    $('detailIntro').textContent={portrait:'选好日期和地点，剩下的灵感一起补全。',snow:'选一个期待的日子，一起去看雪。',effects:'告诉我希望呈现的画面和角色。',event:'填写 CN、角色、套餐、风格，以及一起出镜的伙伴。'}[kind];
    $('notesLabel').textContent=kind==='effects'?'补充备注（可选）':kind==='event'?'其他拍摄需求':'拍摄想法 / 想补充的事';$('notes').maxLength=kind==='event'?700:1000;$('notes').placeholder=kind==='effects'?'想补充的制作细节、交付要求，或其他希望提前沟通的事…':'想拍的氛围、动作参考、时间限制，或想提前沟通的小细节…';
    if(kind==='event'&&visits.size&&!selectedSlot){['character','package','eventStyle','partnerNickname','partnerCharacter','notes'].forEach(id=>$(id).disabled=true);}
    $('currentCharacterLabel').textContent=kind==='event'&&schedule?'角色 · '+schedule.session:'角色';
    if(kind==='event'&&schedule)$('detailIntro').textContent=!selectedSlot&&visits.size?'当前仅查看 '+schedule.session+'，选择本日时段后可填写资料，也可以直接提交已经选好的日期。':'当前填写 '+schedule.session+' · '+schedule.date+' 的资料，其他日期会分别保留。';
    ['portrait','snow','event'].forEach(renderParty);syncDetails();renderSpecial();updateSummary();submitState();updateSiteLinks(kind);window.MuyanPickers?.refresh();
  }
  function selectService(next){
    if(sending)return;stashVisit();stashServiceDay();clearValidation();const previous=service();drafts[previous]=$('notes').value;
    mode=next==='event'?'event':'portrait';$('subCategory').value=['snow','effects'].includes(next)?next:'';
    $('notes').value=drafts[next]||'';if(next==='effects'&&!$('effectsCharacter').value.trim())$('effectsCharacter').value=$('character').value;
    if(['snow','effects'].includes(next))$('specialServices').open=true;
    if(serviceDays[next])activateServiceDay(next,activeServiceDay[next]||dayList(next)[0]?.key);
    if(next==='event'&&schedule)activateVisit();edited();renderForm();step(0);
  }
  $('choosePortrait').addEventListener('click',()=>selectService('portrait'));$('chooseEvent').addEventListener('click',()=>selectService('event'));
  $('chooseSnow').addEventListener('click',()=>selectService('snow'));$('chooseEffects').addEventListener('click',()=>selectService('effects'));
  ['portrait','snow','event'].forEach(kind=>$(kind+'Party').querySelectorAll('[data-party]').forEach(button=>button.addEventListener('click',()=>{if(sending)return;parties[kind]=button.dataset.party;if(kind==='event')renderPackages(false);edited();renderForm();step(1);})));
  $('effectsCharacter').addEventListener('input',()=>{if(service()==='effects')$('character').value=$('effectsCharacter').value;});
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
    const items=catalog.portrait_addons.filter(item=>item.id!=='travel'),priority=items.find(item=>item.id==='portrait_retouch_9');
    const last=items.find(item=>item.id==='district_pickup');
    const ordered=[...(priority?[priority]:[]),...items.filter(item=>item!==priority&&item!==last),...(last?[last]:[])];
    ordered.forEach(item=>{const label=document.createElement('label');label.className='addon-choice'+(item.id==='portrait_retouch_9'?' addon-retouch':'');const input=document.createElement('input');input.type='checkbox';input.value=item.id;input.checked=checked.has(item.id);const text=document.createElement('span');text.textContent=item.label;label.append(input,text);input.addEventListener('change',()=>{edited();updateSummary();});$('portraitAddons').append(label);});applySavedAddons();
  }
  function balanceSummary(list){const items=Array.from(list.children).filter(item=>!item.hidden);Array.from(list.children).forEach(item=>item.classList.remove('summary-wide'));if(items.length%2)items[items.length-1]?.classList.add('summary-wide');}
  function updateSummary(){
    syncDetails();
    stashVisit();stashServiceDay();
    const kind=service(),effects=kind==='effects';$('summaryPriceRow').hidden=!['portrait','snow'].includes(kind);$('summaryPrice').textContent=referencePrice();$('summaryTypeLabel').textContent=effects?'服务类型':'拍摄类型';$('summaryType').textContent=effects?'后期 / 特效':(kind==='snow'?'雪景':kind==='event'?'场照':'正片')+' · '+partyLabels[parties[kind]];
    $('summaryNickname').textContent=$('nickname').value.trim()||'等待填写 CN';
    $('summaryRole').textContent=(effects?$('effectsCharacter'):$('character')).value.trim()||'等待填写角色';
    $('summaryWorkRow').hidden=!effects;$('summaryWork').textContent=$('effectsIP').value.trim()||'等待填写作品';$('summaryTimeRow').hidden=effects;$('summaryLocationRow').hidden=effects;
    $('summaryEffectRow').hidden=!effects;$('summaryEffect').textContent=$('effectsBrief').value.trim()||'等待填写后期效果';$('summaryNotesRow').hidden=!$('notes').value.trim();$('summaryNotes').textContent=$('notes').value.trim();$('summaryVenueRow').hidden=kind!=='portrait';$('summaryVenue').textContent=$('venueType').value==='studio'?'棚拍':'外景';
    $('summaryTimeLabel').textContent=kind==='snow'?'期望日期':'期望时间';
    $('summaryTime').textContent=kind==='event'?(schedule&&selectedSlot?schedule.session+' · '+schedule.date+' '+selectedSlot.start.slice(11,16)+'–'+selectedSlot.end.slice(11,16):'先选一个漫展时段'):kind==='snow'?($('snowDate').value||'选择一个期望日期'):($('portraitDate').value?$('portraitDate').value+' · '+$('portraitTime').value:'还可以慢慢安排');
    $('summaryLocation').textContent=kind==='event'?'以群聊通知为准':kind==='snow'?(catalog?.snow.description||'主城出发 · 雪景地'):multiLocation()?'按下方地点顺序安排':$('location').value.trim()||'一起选个喜欢的地方';
    $('summaryParticipantsRow').hidden=!['portrait','snow'].includes(kind)||peopleCount(kind)<2;
    $('summaryParticipants').textContent=['portrait','snow'].includes(kind)?peopleEditors[kind].value().map((person,index)=>(index+1)+'. '+(person.cn||'CN 待填写')+' / '+(person.character||'角色待填写')).join('\n'):'';
    $('summaryLocationsRow').hidden=kind!=='portrait'||!multiLocation();$('summaryLocations').textContent=locationEditor.value().map((value,index)=>(index+1)+'. '+(value||'地点 / 场景待填写')).join('\n');
    $('summaryFoot').textContent=effects?'想法先收好，制作细节一起确认。':kind==='event'?'确认预约后由慕言拉群，具体安排以群聊通知为准。':kind==='snow'?(parties.snow==='double'?'双人拼单总价按两人计算，档期沟通后再确认。':'单人费用按一人展示，档期沟通后再确认。'):parties.portrait==='multiple'?'按人数与需求报价，具体费用沟通后确认。':'参考总价不含拍摄所需杂费，未定费用另行沟通确认。';
    const event=kind==='event';$('summaryEventRow').hidden=!event;$('summaryEvent').textContent=selectedOption?.title||schedule?.title||'等待选择漫展';$('summaryPartnerRow').hidden=!event||parties.event!=='double';$('summaryPackageRow').hidden=!event;$('summaryStyleRow').hidden=!event;
    $('summaryPartner').textContent=[$('partnerNickname').value.trim(),$('partnerCharacter').value.trim()].filter(Boolean).join(' / ')||'等待填写同行信息';
    $('summaryPackage').textContent=$('package').value?$('package').selectedOptions[0].textContent:'等待选择套餐';
    $('summaryStyle').textContent={bright:'亮灰',dark:'暗调'}[$('eventStyle').value]||'等待选择风格';
    const selectedAddons=Array.from($('portraitAddons').querySelectorAll('input:checked')).map(input=>catalog?.portrait_addons.find(item=>item.id===input.value)).filter(Boolean);$('summaryAddonsRow').hidden=kind!=='portrait'||!selectedAddons.length;$('summaryAddons').textContent=selectedAddons.map(item=>item.label).join('；');
    if(event&&!schedule&&selectedTemplate()){const days=selectedTemplate().days,day=days[templateDay]||days[0];$('summaryTime').textContent=day.session+' · '+day.date+' · 时段待开放';}
    if(event&&visits.size){
      const items=visitList(),format=value=>value.session+' · '+value.date;
      $('summaryType').textContent='场照 · 共 '+items.length+' 天';$('summaryEvent').textContent=[...new Set(items.map(value=>value.title))].join('；');
      $('summaryTime').textContent=items.map(value=>format(value)+' '+value.start.slice(11,16)+'–'+value.end.slice(11,16)).join('\n');
      $('summaryRole').textContent=items.map(value=>value.session+'：'+(value.character||'待填写')).join('\n');
      $('summaryPackage').textContent=items.map(value=>value.session+'：'+(value.package_label||'待选择')).join('\n');
      $('summaryStyle').textContent=items.map(value=>value.session+'：'+({bright:'亮灰',dark:'暗调'}[value.shoot_style]||'待选择')).join('\n');
      $('summaryPartnerRow').hidden=!items.some(value=>value.party_type==='double');$('summaryPartner').textContent=items.filter(value=>value.party_type==='double').map(value=>value.session+'：'+value.partner_nickname+' / '+value.partner_character).join('\n');
      const notes=items.filter(value=>value.notes.trim());$('summaryNotesRow').hidden=!notes.length;$('summaryNotes').textContent=notes.map(value=>value.session+'：'+value.notes).join('\n');
    }
    renderVisitCards();renderServiceDays();renderServiceDaySummary();renderEventCopy();queueReadiness();window.MuyanPickers?.refresh();balanceSummary(document.querySelector('.submission .summary-card dl'));

  }
  function serviceDayFields(kind){
    const days=dayList(kind),fields=[{label:'拍摄类型',value:(kind==='snow'?'雪景':'正片')+' · 共 '+days.length+' 天'},{label:'CN / 昵称',value:$('nickname').value.trim()||'等待填写 CN'}];
    days.forEach((day,index)=>{
      const prefix='第 '+(index+1)+' 天 · ',participants=day.participants.map((person,personIndex)=>({cn:personIndex?person.cn:$('nickname').value.trim(),character:personIndex?person.character:day.character}));
      fields.push({label:prefix+'拍摄安排',value:(day.preferred_date||'日期待选择')+(kind==='portrait'?' · '+(day.preferred_time||'时间待选择'):'')},{label:prefix+'拍摄形式',value:(partyLabels[day.party_type]||'单人')+' · '+day.people+' 人'},{label:prefix+'出镜者 / 角色',value:participants.map((person,personIndex)=>(personIndex+1)+'. '+(person.cn||'CN 待填写')+' / '+(person.character||'角色待填写')).join('\n')});
      if(kind==='portrait')fields.push({label:prefix+'外景 / 棚拍',value:day.venue_type==='studio'?'棚拍':'外景'},{label:prefix+'地点 / 场景顺序',value:day.addons.includes('multi_location_role')?day.location_plan.map((location,placeIndex)=>(placeIndex+1)+'. '+(location||'地点待填写')).join('\n'):day.location||'地点待沟通'},{label:prefix+'附加需求',value:day.addons.map(id=>catalog?.portrait_addons.find(item=>item.id===id)?.label||id).join('；')||'未选附加需求'});
      else fields.push({label:prefix+'拍摄地点',value:catalog?.snow.description||'主城出发 · 雪景地'});
      fields.push({label:prefix+'参考总价',value:referencePrice(kind,day)},{label:prefix+'备注',value:day.notes||'暂无补充'});
    });return fields;
  }
  function renderServiceDaySummary(){
    const kind=service(),multiple=Boolean(serviceDays[kind]&&serviceDays[kind].size>1),root=$('serviceDaysSummary');root.hidden=!multiple;document.querySelector('.submission .summary-card>dl').hidden=multiple;root.replaceChildren();if(!multiple)return;
    const list=document.createElement('dl');
    serviceDayFields(kind).forEach(field=>{const row=document.createElement('div'),label=document.createElement('dt'),value=document.createElement('dd');row.className='summary-wide';label.textContent=field.label;value.textContent=field.value;row.append(label,value);list.append(row);});root.append(list);$('summaryFoot').textContent='各日安排独立填写，档期与费用以双方逐日确认为准。';
  }
  function selectEventFlow(value){
    if(sending)return;eventFlow=value;['new','friend'].forEach(flow=>{const button=$(flow==='new'?'eventNew':'eventFriend'),active=value===flow;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    $('eventFlowHint').textContent=value==='friend'?'提交排单后，请截图保存“这次的小计划”，发到与慕言的现有聊天中确认。':'提交排单后，请截图保存“这次的小计划”；添加慕言后，将计划图发来确认。';
    document.querySelector('.steps li:nth-child(2) .step-label').textContent=value==='friend'?'填写排单':'填写提交';
    edited();if(value==='friend'){$('exhibitionContent').hidden=false;$('openExhibition').setAttribute('aria-expanded','true');$('openExhibition').querySelector('.expand-icon').textContent='−';}
  }
  $('eventNew').addEventListener('click',()=>selectEventFlow('new'));$('eventFriend').addEventListener('click',()=>selectEventFlow('friend'));
  function renderTemplate(){
    const template=selectedTemplate();if(!template)return;const day=template.days[templateDay]||template.days[0];$('tableTitle').textContent=day.session+' · '+day.date;
    const root=$('timeTable'),table=document.createElement('table');table.setAttribute('aria-label',day.session+' 场照时间表，时段待开放');
    const head=document.createElement('thead'),heading=document.createElement('tr');['拍摄时段','状态','选择'].forEach(text=>{const th=document.createElement('th');th.scope='col';th.textContent=text;heading.append(th);});head.append(heading);table.append(head);
    const body=document.createElement('tbody');eventTemplateTimes.forEach(time=>{const row=document.createElement('tr'),label=document.createElement('td'),state=document.createElement('td'),action=document.createElement('td'),button=document.createElement('button');label.className='time';label.textContent=time;state.className='slot-status unavailable';state.textContent='待开放';button.type='button';button.disabled=true;button.textContent='暂未开放';action.append(button);row.append(label,state,action);body.append(row);});table.append(body);root.replaceChildren(table);
    $('sessionChoices').querySelectorAll('button').forEach((button,i)=>{button.classList.toggle('active',i===templateDay);button.setAttribute('aria-pressed',String(i===templateDay));});
    $('selectedTimeHint').textContent='本场时间表待开放，请稍后再来选择时段。';updateSummary();
  }
  $('openExhibition').addEventListener('click',()=>{if(sending)return;const open=$('exhibitionContent').hidden;$('exhibitionContent').hidden=!open;$('openExhibition').setAttribute('aria-expanded',String(open));$('openExhibition').querySelector('.expand-icon').textContent=open?'−':'＋';});
  function renderTable(){
    const root=$('timeTable');root.replaceChildren();if(!schedule)return;
    $('tableTitle').textContent=schedule.session+' · '+schedule.date;const table=document.createElement('table');table.setAttribute('aria-label',schedule.session+' 场照时段占用情况');
    const head=document.createElement('thead'),tr=document.createElement('tr');['拍摄时段','状态','选择'].forEach(label=>{const th=document.createElement('th');th.textContent=label;th.scope='col';tr.append(th);});head.append(tr);table.append(head);const body=document.createElement('tbody');
    schedule.slots.forEach(slot=>{const row=document.createElement('tr');if(selectedSlot?.id===slot.id)row.className='selected';const time=document.createElement('td');time.className='time';time.textContent=slot.start.slice(11,16)+' — '+slot.end.slice(11,16);const state=document.createElement('td'),tag=document.createElement('span');tag.className='slot-status '+slot.status;tag.textContent={available:'可提交意向',occupied:'已占用',unavailable:'暂不开放'}[slot.status];state.append(tag);const action=document.createElement('td'),button=document.createElement('button');button.type='button';button.disabled=!slot.can_book||sending;button.textContent=selectedSlot?.id===slot.id?'已选择 ✓':slot.can_book?'选这个时段':'不可选';button.setAttribute('aria-label',(selectedSlot?.id===slot.id?'已选择 ':'选择 ')+time.textContent);button.setAttribute('aria-pressed',String(selectedSlot?.id===slot.id));button.addEventListener('click',()=>{if(sending||tableLoading)return;if(!customerFeatures.event_batch_v1&&visits.size&&!visits.has(schedule.date)){say('当前每次可登记一个拍摄日。如需更换日期，请先移除已选日期；多天安排请联系慕言。',true);return;}stashVisit();selectedSlot=slot;edited();renderForm();renderTable();updateSummary();say('同一天重新选择会替换原时段，其他日期保持不变。');});action.append(button);row.append(time,state,action);body.append(row);});table.append(body);root.append(table);
    $('selectedTimeHint').textContent=selectedSlot?schedule.session+' · '+schedule.date+' '+selectedSlot.start.slice(11,16)+'–'+selectedSlot.end.slice(11,16)+'，已选中此时段。':'请在上方时间表选择一个可提交意向的时段。';
  }
  function renderPackages(keep=false){
    const previous=keep?$('package').value:'';const items=(schedule?.packages||catalog?.event_packages||[]).filter(item=>!item.party_type||item.party_type===parties.event);$('package').replaceChildren();
    if(!items.length){$('package').append(new Option('具体套餐提交后沟通',''));}
    else{const placeholder=new Option('请选择'+partyLabels[parties.event]+'场照套餐','');placeholder.disabled=true;placeholder.selected=true;$('package').append(placeholder);['basic','retouch',''].forEach(processing=>{const group=document.createElement('optgroup');group.label=processing==='basic'?'普修套餐':processing==='retouch'?'精修套餐':'其他套餐';items.filter(item=>(item.processing||'')===processing).forEach(item=>group.append(new Option(item.label,item.id)));if(group.children.length)$('package').append(group);});if(items.some(item=>item.id===previous))$('package').value=previous;}
    $('package').required=items.length>0;$('packageRequired').hidden=!items.length;
    $('packageHint').textContent='选择'+partyLabels[parties.event]+'套餐，查看张数和费用。';renderPackagePrice();
  }
  function renderPackagePrice(){const item=(schedule?.packages||catalog?.event_packages||[]).find(p=>p.id===$('package').value),root=$('packagePricing');root.replaceChildren();root.hidden=!item;if(!item)return;const title=document.createElement('strong'),copy=document.createElement('p');title.textContent=item.label;copy.textContent=item.description;root.append(title,copy);if(item.pricing?.kind==='base_plus_retouch'){const note=document.createElement('p');note.className='variable-price-note';note.textContent='这里显示的是基础费用，不是最终总价。精修张数及最终尾款以沟通确认为准；仅套餐内全部照片均精修时，享受套餐优惠，部分精修不享受套餐减免。';root.append(note);}}
  $('package').addEventListener('change',()=>{renderPackagePrice();updateSummary();});
  async function loadSchedule(id,keep=false){
    stashVisit();requestedScheduleId=id;
    const generation=++tableGeneration,old=keep?selectedSlot?.id:null;tableLoading=true;$('refreshTable').disabled=true;if(!keep){selectedSlot=null;schedule=null;$('timeTable').textContent='正在加载这个场次的时间表…';renderPackages(false);updateSummary();}submitState();
    try{const response=await api('/api/public/event-schedules/'+encodeURIComponent(id));if(generation!==tableGeneration)return;schedule=response.schedule;selectedSlot=schedule.slots.find(slot=>slot.id===old&&slot.can_book)||null;$('sessionChoices').querySelectorAll('button').forEach(button=>{const active=button.dataset.id===id;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});renderPackages(keep);activateVisit();renderTable();updateSummary();}
    catch(error){if(generation===tableGeneration){schedule=null;selectedSlot=null;$('timeTable').textContent='时间表暂时无法加载，请重新选择场次。';renderPackages(false);updateSummary();say(error.message,true);}}
    finally{if(generation===tableGeneration){tableLoading=false;$('refreshTable').disabled=false;submitState();}}
  }
  $('refreshTable').addEventListener('click',()=>{if(!sending)start();});
  async function chooseEventOption(option,keep=false){
    stashVisit();const previous=keep?schedule?.id:null,previousSlot=keep?selectedSlot?.id:null,previousPackage=keep?$('package').value:'';
    if(selectedOption?.id!==option?.id)templateDay=0;
    selectedOption=option;requestedScheduleId='';tableGeneration++;schedule=null;selectedSlot=null;tableLoading=false;
    $('eventOptionTitle').textContent=option?.title||'场照活动暂未开放';
    $('openExhibition').disabled=!option;
    $('sessionChoices').replaceChildren();$('timeTable').replaceChildren();
    $('tableTitle').textContent='选择一场，看看时间安排';$('refreshTable').disabled=!option;
    renderPackages(keep);updateSummary();submitState();
    $('eventOptionChoices').querySelectorAll('button').forEach(button=>{const active=button.dataset.id===option?.id;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    const sessions=option?.sessions||[];
    if(!sessions.length){
      const text=option?.message||'本场时间表待开放，请稍后再来查看。';
      $('tableTitle').textContent=(option?.title||'场照')+' · 时间表待开放';$('timeTable').textContent=text;$('selectedTimeHint').textContent=text;
      const template=selectedTemplate();
      if(template){
        template.days.forEach((day,i)=>{const button=document.createElement('button');button.type='button';const name=document.createElement('strong'),date=document.createElement('small');name.textContent=day.session;date.textContent=day.date;button.append(name,date);button.addEventListener('click',()=>{if(sending)return;templateDay=i;renderTemplate();edited();});$('sessionChoices').append(button);});renderTemplate();
      }
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
    const data=await api('/api/public/event-options');eventOptions=(data.items||[]).map(option=>({...option,title:eventTemplates.find(item=>item.id===option.id)?.title||option.title}));
    // Announce this exhibition before backend setup. These are display-only days,
    // never schedule/slot IDs; only real public API sessions can be submitted.
    const worldline=eventTemplates.find(item=>item.id==='shijiexian-202701');
    if(!eventOptions.some(item=>item.id===worldline.id))eventOptions=[...eventOptions,{id:worldline.id,title:worldline.title,state:'awaiting_schedule',sessions:[]}];
    const choices=$('eventOptionChoices');choices.replaceChildren();choices.hidden=eventOptions.length<=1;
    eventOptions.forEach(option=>{const button=document.createElement('button');button.type='button';button.dataset.id=option.id;button.textContent=option.title;button.addEventListener('click',async()=>{if(!sending){await chooseEventOption(option);edited();}});choices.append(button)});
    await chooseEventOption(eventOptions.find(option=>option.id===(selectedOption?.id||params.get('event')))||eventOptions[0]||null,true);
  }
  async function start(){
    if(initializing||sending)return;initializing=true;submitState();
    try{
      const [options,values]=await Promise.all([api('/api/public/options'),api('/api/public/service-catalog')]);
      customerFeatures=options.customer_features||{};catalog=detailUI.normalizeCatalog(values);$('portraitDate').min=options.today;$('snowDate').min=options.today;renderAddons();renderForm();ready=true;
      $('serviceStatus').textContent='';$('serviceStatus').hidden=true;$('serviceStatus').classList.remove('error');
      try{await loadEventOptions();if(visits.size)await recheckVisits();if(pendingEventRestore){const warning=await reconcileRestoredEvent();if(warning)say(warning,true);}}catch(error){
        tableGeneration++;schedule=null;selectedSlot=null;tableLoading=false;$('timeTable').textContent='活动时间表暂时无法读取，请稍后重试。';
        $('selectedTimeHint').textContent='时间表暂不可用，请稍后重试。';if(service()==='event')say(error.message,true);
      }
    }catch(error){ready=false;$('serviceStatus').hidden=false;$('serviceStatus').textContent=error.message;$('serviceStatus').classList.add('error');const retry=document.createElement('button');retry.type='button';retry.className='text-button';retry.textContent='重新连接';retry.addEventListener('click',start);$('serviceStatus').append(retry)}
    finally{initializing=false;submitState();refreshSavedState()}
  }
  function payload(){
    stashServiceDay();
    const kind=service();const body={category:mode,nickname:$('nickname').value.trim(),character:(kind==='effects'?$('effectsCharacter'):$('character')).value.trim(),contact_type:$('contactType').value,contact:$('contact').value.trim(),consent:$('consent').checked};
    if(kind==='effects'){
      const notes=$('notes').value.trim();if(notes&&!customerFeatures.booking_details_v2)throw Error('补充备注的在线提交暂未开放，请保留填写内容，联系慕言确认。');
      return {...body,sub_category:'effects',work_ip:$('effectsIP').value.trim(),effect_description:$('effectsBrief').value.trim(),...(customerFeatures.booking_details_v2?{notes}:{})};
    }
    if(serviceDays[kind]?.size>1){
      if(!customerFeatures.portrait_batch_v1||!customerFeatures.booking_details_v2)throw Error('多日'+(kind==='snow'?'雪景':'正片')+'预约暂未开放在线提交，所有日期已保留，请联系慕言确认。');
      return {category:'portrait',sub_category:kind==='snow'?'snow':'',nickname:body.nickname,contact_type:body.contact_type,contact:body.contact,consent:body.consent,visits:dayList(kind).map(day=>{
        const value={preferred_date:day.preferred_date,character:day.character,party_type:day.party_type,people:day.people,participants:day.participants.map((person,index)=>index?{...person}:{cn:body.nickname,character:day.character}),location:day.addons.includes('multi_location_role')?day.location_plan[0]:day.location,addons:day.addons.slice(),location_plan:day.addons.includes('multi_location_role')?day.location_plan.slice():[],notes:day.notes};
        if(kind==='portrait')Object.assign(value,{preferred_time:day.preferred_time,venue_type:day.venue_type});return value;
      })};
    }
    body.notes=$('notes').value.trim();body.party_type=parties[kind];
    if(['portrait','snow'].includes(kind)){
      if((peopleCount(kind)>1||kind==='portrait'&&multiLocation())&&!customerFeatures.booking_details_v2)throw Error('这类详细拍摄安排的在线提交暂未开放，请保留填写内容，联系慕言确认。');
      if(customerFeatures.booking_details_v2)body.participants=peopleEditors[kind].value();
    }
    if(kind==='snow')return {...body,sub_category:'snow',preferred_date:$('snowDate').value};
    if(kind==='portrait'){Object.assign(body,{sub_category:'',preferred_date:$('portraitDate').value,preferred_time:timeEditor.value(),venue_type:$('venueType').value,location:multiLocation()?locationEditor.value()[0]:$('location').value.trim(),needs_pickup:Array.from($('portraitAddons').querySelectorAll('input:checked')).some(input=>catalog?.portrait_addons.find(item=>item.id===input.value)?.requires_pickup),addons:Array.from($('portraitAddons').querySelectorAll('input:checked'),input=>input.value)});if(parties.portrait==='multiple')body.people=Number($('portraitPeople').value);if(multiLocation()&&customerFeatures.booking_details_v2)body.location_plan=locationEditor.value();}
    else{
      stashVisit();const items=visitList();if(!items.length||items.some(visitError))throw Error('请补全每一天的时段、角色、套餐和风格。');
      if(customerFeatures.event_batch_v1)return {category:'event',nickname:body.nickname,contact_type:body.contact_type,contact:body.contact,consent:body.consent,registration_flow:eventFlow,visits:items.map(value=>({event_id:value.event_id,event_slot_id:value.event_slot_id,character:value.character,party_type:value.party_type,package_id:value.package_id,shoot_style:value.shoot_style,partner_nickname:value.partner_nickname,partner_character:value.partner_character,notes:value.notes,...(customerFeatures.booking_details_v2?{participants:[{cn:body.nickname,character:value.character},...(value.party_type==='double'?[{cn:value.partner_nickname,character:value.partner_character}]:[])]}:{})}))};
      if(items.length>1)throw Error('多日预约服务暂未开放，请联系慕言确认。');
      const value=items[0];Object.assign(body,{event_id:value.event_id,event_slot_id:value.event_slot_id,character:value.character,party_type:value.party_type,package_id:value.package_id,shoot_style:value.shoot_style,partner_nickname:value.partner_nickname,partner_character:value.partner_character,registration_flow:eventFlow,notes:value.notes});
    }
    return body;
  }
  function busy(value){sending=value;$('formFields').disabled=value;document.querySelectorAll('.service-choices button,.special-choices button,#sessionChoices button,#openExhibition').forEach(button=>button.disabled=value);submitState();refreshSavedState();}
  $('bookingForm').addEventListener('submit',async event=>{
    event.preventDefault();if(sending)return;if(completed&&receipt){openContacts();return;}if(!validateSubmission())return;if(!ready){say('表单服务暂时无法连接，请重新连接后提交。',true);$('serviceStatus').hidden=false;revealInvalid($('serviceStatus'));return;}if(service()==='event'&&(initializing||tableLoading)){say('正在核对时段，请稍候再提交。',true);revealInvalid($('timeTable'));return;}
    let body;try{body=payload();}catch(error){say(error.message,true);if(service()==='event')$('openExhibition').focus();return;}
    const next=JSON.stringify(body);if(next!==signature){requestId=crypto.randomUUID();signature=next;}body.request_id=requestId;
    if(new TextEncoder().encode(JSON.stringify(body)).length>16000){say('本次填写内容较多，请精简备注后重试；如需保留全部细节，请联系慕言确认。',true);return;}
    const submitted=service(),submittedPlan=capturePlan();pendingSubmission=true;saveDraftNow(true);busy(true);say('正在收好你的'+(submitted==='effects'?'制作需求':'拍摄意向')+'…');
    try{const endpoint=service()==='event'&&customerFeatures.event_batch_v1?'/api/public/event/booking-batches':serviceDays[service()]?.size>1?'/api/public/portrait/booking-batches':'/api/public/'+mode+'/bookings';const result=await api(endpoint,{method:'POST',body:JSON.stringify(body)});receipt={...result,service:result.service||submitted,registrationFlow:eventFlow,nickname:body.nickname,character:body.character||'',intent_number:typeof result.intent_number==='string'?result.intent_number:'',plan:{...submittedPlan,id:result.id,intent_number:typeof result.intent_number==='string'?result.intent_number:'',preview:Boolean(result.preview)}};completed=true;saveReceipt();say('意向已收到，请保存小计划，发给慕言继续确认。');openContacts(true);}
    catch(error){say(error.message,true);if(error.status>=400&&error.status<500)pendingSubmission=false;if(error.status===409){requestId='';signature='';if(submitted==='event')await loadEventOptions();}saveDraftNow(true);}
    finally{busy(false);renderForm();}
  });
  const visitList=()=>Array.from(visits.values()).sort((a,b)=>a.date.localeCompare(b.date));
  function stashVisit(){
    if(service()!=='event'||!schedule||!selectedSlot)return;
    const pkg=(schedule.packages||catalog?.event_packages||[]).find(item=>item.id===$('package').value);
    visits.set(schedule.date,{option_id:selectedOption?.id||'',event_id:schedule.id,event_slot_id:selectedSlot.id,date:schedule.date,session:schedule.session,title:selectedOption?.title||schedule.title,start:selectedSlot.start,end:selectedSlot.end,available:Boolean(selectedSlot.can_book),character:$('character').value.trim(),party_type:parties.event,package_id:$('package').value,package_label:pkg?.label||'',shoot_style:$('eventStyle').value,partner_nickname:$('partnerNickname').value.trim(),partner_character:$('partnerCharacter').value.trim(),notes:$('notes').value.trim()});
  }
  function activateVisit(){
    if(service()!=='event'||!schedule)return;
    const saved=visits.get(schedule.date),value=saved?.event_id===schedule.id?saved:null;
    selectedSlot=value?schedule.slots.find(item=>item.id===value.event_slot_id&&item.can_book)||null:null;
    parties.event=value?.party_type||'single';$('character').value=value?.character||'';$('eventStyle').value=value?.shoot_style||'';
    $('partnerNickname').value=value?.partner_nickname||'';$('partnerCharacter').value=value?.partner_character||'';$('notes').value=value?.notes||'';drafts.event=$('notes').value;
    renderPackages(false);if(value&&Array.from($('package').options).some(item=>item.value===value.package_id))$('package').value=value.package_id;
    renderPackagePrice();renderForm();
  }
  function visitIssue(value){return !value.available?{id:'timeTable',message:'原时段已不可选，请重新选择。'}:!value.character?{id:'character',message:'请填写本日角色。'}:!value.package_id?{id:'package',message:'请选择本日套餐。'}:!['bright','dark'].includes(value.shoot_style)?{id:'eventStyle',message:'请选择本日风格。'}:value.party_type==='double'&&!value.partner_nickname?{id:'partnerNickname',message:'请填写本日同行 CN。'}:value.party_type==='double'&&!value.partner_character?{id:'partnerCharacter',message:'请填写本日同行角色。'}:null;}
  function visitError(value){return visitIssue(value)?.message||'';}
  function renderVisitCards(){
    const root=$('eventSelections');root.replaceChildren();const items=visitList();$('eventSelectionCount').textContent=customerFeatures.event_batch_v1?(items.length?'已选 '+items.length+' 天 · 每天最多一个时段':'可选择多天，每天最多一个时段'):(items.length?'已选 '+items.length+' 天 · 当前每次可登记一天':'当前每次可登记一个拍摄日，多天安排请联系慕言。');
    items.forEach(value=>{
      const card=document.createElement('article'),head=document.createElement('div'),title=document.createElement('strong'),text=document.createElement('p'),actions=document.createElement('div');
      const error=visitError(value),attempted=validatedEventDays.has(value.event_id)||!value.available;card.className='event-day-card'+(schedule?.id===value.event_id?' is-current':'')+(error&&attempted?' is-unavailable':'');card.dataset.date=value.date;
      head.className='event-day-head';title.textContent=value.session+' · '+value.date+' '+value.start.slice(11,16)+'–'+value.end.slice(11,16);head.append(title);
      text.textContent=(value.character||'角色待填写')+' · '+(value.package_label||'套餐待选择')+' · '+(value.shoot_style==='bright'?'亮灰':value.shoot_style==='dark'?'暗调':'风格待选择');
      actions.className='event-day-actions';const edit=document.createElement('button'),remove=document.createElement('button');edit.type=remove.type='button';edit.textContent='填写／修改这天';remove.textContent='移除这天';edit.disabled=remove.disabled=sending;
      edit.addEventListener('click',async()=>{if(sending)return;const option=eventOptions.find(item=>item.id===value.option_id);if(!option){say('原活动暂不可用，请联系慕言。',true);return;}stashVisit();await chooseEventOption(option,true);if(schedule?.id!==value.event_id)await loadSchedule(value.event_id,true);$('customerSection').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
      remove.addEventListener('click',()=>{if(sending)return;visits.delete(value.date);if(schedule?.date===value.date){selectedSlot=null;renderTable();}renderForm();edited();updateSummary();});
      actions.append(edit,remove);card.append(head,text);if(error){const note=document.createElement('p');note.className=attempted?'unavailable-note':'field-help';note.textContent=(attempted?'':'待填写 · ')+error;card.append(note);}card.append(actions);root.append(card);
    });
  }
  async function recheckVisits(){
    const cache=new Map();await Promise.all(visitList().map(async value=>{
      try{if(!cache.has(value.event_id))cache.set(value.event_id,api('/api/public/event-schedules/'+encodeURIComponent(value.event_id)));const data=(await cache.get(value.event_id)).schedule;
        const slot=data.slots.find(item=>item.id===value.event_slot_id),pkg=(data.packages||catalog.event_packages).find(item=>item.id===value.package_id&&(!item.party_type||item.party_type===value.party_type));
        value.available=Boolean(data.date===value.date&&slot?.can_book);if(slot){value.start=slot.start;value.end=slot.end;}if(value.package_id&&!pkg){value.package_id='';value.package_label='';}else if(pkg)value.package_label=pkg.label;
      }catch{value.available=false;}
    }));
    if(schedule&&selectedSlot&&!visits.get(schedule.date)?.available)selectedSlot=null;
    updateSummary();
  }
  function restoreVisitRecords(items){
    visits.clear();if(!Array.isArray(items))return;
    for(const value of items.slice(0,31)){
      if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value.date)||!eventOptions.some(item=>item.id===value.option_id))continue;
      const clean={};for(const key of ['option_id','event_id','event_slot_id','date','session','title','start','end','character','party_type','package_id','package_label','shoot_style','partner_nickname','partner_character','notes'])clean[key]=typeof value[key]==='string'?value[key].slice(0,key==='notes'?700:200):'';
      if(!['single','double'].includes(clean.party_type))continue;clean.available=false;visits.set(clean.date,clean);
    }
  }

  function capturePlan(){
    updateSummary();
    return {nickname:$('nickname').value.trim(),...window.MuyanPlanImage.snapshot(document.querySelector('.submission .summary-card'))};
  }
  function renderReceiptPlan(){
    window.MuyanPlanImage.card($('receiptPlan'),{...receipt.plan,intent_number:displayIntentNumber(receipt),verification_code:window.MuyanPlanImage.codeOf(receipt)},{badge:'意向已收到'});
    $('planSaveStatus').textContent=window.MuyanPlanImage.codeOf(receipt)?'请截图保存小计划及验证码；内容较长时，请使用长截图。':'这是本机保存的小计划，不含验证码；查询或修改时，请使用提交后保存的验证码重新验证。';
  }
  function renderCredential(){
    const code=window.MuyanPlanImage.codeOf(receipt);
    $('editCredential').hidden=!code;$('editCodeValue').textContent=code;
  }
  $('saveEditCredential').addEventListener('click',()=>{
    const code=window.MuyanPlanImage.codeOf(receipt);if(!code)return;
    const text='慕言预约验证凭证\nCN：'+receipt.nickname+'\n预约编号：'+displayIntentNumber(receipt)+'\n验证码：'+code+'\n请妥善保存，勿转发给他人。验证码可随小计划主动截图保存，不会自动保存在浏览器草稿或本机记录中。';
    const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='慕言预约验证凭证.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  function finishCompletion(focus=true){
    clearTimeout(celebrationTimer);$('contactDialog').classList.remove('is-celebrating');if($('successCelebration').open)$('successCelebration').close();$('successCelebration').hidden=true;$('completionPetals').replaceChildren();$('contactResultBody').inert=false;
    if(focus&&$('contactDialog').open)$('closeContact').focus({preventScroll:true});
  }
  function celebrateCompletion(){
    finishCompletion(false);if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const root=$('completionPetals');
    for(let i=0;i<14;i++){const petal=document.createElement('i'),angle=(i/14)*Math.PI*2;petal.style.setProperty('--x',Math.cos(angle)*(110+(i%4)*28)+'px');petal.style.setProperty('--y',Math.sin(angle)*(95+(i%3)*25)-24+'px');petal.style.setProperty('--r',(i%2?-1:1)*(40+i*23)+'deg');petal.style.setProperty('--delay',(i%4)*25+'ms');root.append(petal);}
    $('contactResultBody').inert=true;$('successCelebration').hidden=false;$('successCelebration').showModal();$('contactDialog').classList.add('is-celebrating');$('skipCompletion').focus({preventScroll:true});
    celebrationTimer=setTimeout(()=>finishCompletion(),1100);
  }
  $('skipCompletion').addEventListener('click',()=>finishCompletion());
  $('successCelebration').addEventListener('cancel',event=>{event.preventDefault();finishCompletion();});
  function openContacts(celebrate=false){
    hideSavedReminder();
    channel='qq';qqAccount='main';$('contactQQAccount').value='main';const effects=receipt.service==='effects';
    $('successTitle').textContent=effects?'后期需求已收到':receipt.service==='event'&&receipt.registrationFlow==='friend'?'场照排单已收到':'拍摄意向已收到';
    document.querySelector('.dialog-intro').textContent=receipt.registrationFlow==='friend'&&receipt.service==='event'?'已有好友：截图保存计划图，发到现有聊天中确认。':'截图保存计划图，再添加慕言确认安排。';
    $('contactFooter').textContent=effects?'制作效果、费用和交付安排，以双方沟通确认为准。':receipt.service==='event'?'提交意向不代表档期已确认。确认预约后，由慕言拉你进拍摄群；具体安排以群聊通知为准。':'提交意向不代表档期已确认，具体安排以沟通结果为准。';
    if(receipt.preview){$('successTitle').textContent='预览填写完成';document.querySelector('.dialog-intro').textContent='仅作本地预览，未发送或占用档期，可截图核对计划。';}
    $('contactFooter').textContent+=' 如需更正本次信息，请联系慕言调整原预约，无需重复提交。';document.querySelector('.result-home-link').href=siteURL(receipt.service,from);
    $('receiptId').textContent=displayIntentNumber(receipt);renderReceiptPlan();renderContact();renderCredential();step(2);
    if(!$('contactDialog').open)$('contactDialog').showModal();$('contactDialog').scrollTop=0;if(celebrate)celebrateCompletion();
  }
  function currentContact(){
    const channels=receipt.contacts?.channels||[];
    if(channel==='qq'&&qqAccount==='small')return {number:'2389375218',copy_value:'2389375218',qr_url:'images/qq-small.png',copy_label:'复制 QQ 小号'};
    return channels.find(item=>item.id===channel)||(channel==='qq'?{number:'2745867337',copy_value:'2745867337',qr_url:'images/qq.png',copy_label:'复制 QQ 号'}:{number:'mi20180709',copy_value:'mi20180709',qr_url:'images/wechat.png',copy_label:'复制微信号'});
  }
  function renderContact(){
    const item=currentContact(),qq=channel==='qq',small=qq&&qqAccount==='small';
    $('contactQQ').classList.toggle('active',qq);$('contactWechat').classList.toggle('active',!qq);$('contactQQ').setAttribute('aria-pressed',String(qq));$('contactWechat').setAttribute('aria-pressed',String(!qq));$('contactQQAccountField').hidden=!qq;$('qqAddHelp').hidden=!qq;
    $('contactQR').src=item.qr_url||new URL('images/'+(qq?'qq.png':'wechat.png'),location.href).href;$('contactQR').alt=qq?'慕言 QQ '+(small?'小号':'大号')+'二维码':'慕言微信二维码';$('contactKind').textContent=qq?'QQ '+(small?'小号':'大号'):'微信号';
    $('copyNumber').replaceChildren(document.createTextNode(item.number));const hint=document.createElement('span');hint.textContent='点击复制 ↗';$('copyNumber').append(hint);$('copyButton').textContent=item.copy_label||('复制'+(qq?' QQ 号':'微信号'));
    $('contactHelp').textContent=qq?'复制所选 QQ 号后，在 QQ 搜索添加，或使用 QQ 扫码。':'复制微信号后，在微信搜索添加，或使用微信扫码。';$('copyStatus').textContent='';
    $('planSendHint').textContent='添加慕言'+(qq?' QQ':'微信')+'后，请将计划图截图发给他。慕言看到后，也会主动联系你。'+(receipt.registrationFlow==='friend'&&receipt.service==='event'?'已有好友，直接发到现有聊天即可。':'');
  }
  async function copyContact(){const item=currentContact(),qq=channel==='qq';try{await navigator.clipboard.writeText(item.copy_value||item.number);$('copyStatus').textContent=(qq?'QQ 号':'微信号')+'已复制。';}catch{$('copyStatus').textContent='暂时无法自动复制，请手动复制上方号码。';}}
  $('copyNumber').addEventListener('click',copyContact);$('copyButton').addEventListener('click',copyContact);
  $('contactQQAccount').addEventListener('change',()=>{qqAccount=$('contactQQAccount').value;renderContact();});
  $('contactQQ').addEventListener('click',()=>{channel='qq';renderContact();});$('contactWechat').addEventListener('click',()=>{channel='wechat';renderContact();});
  $('closeContact').addEventListener('click',()=>$('contactDialog').close());
  $('contactDialog').addEventListener('close',()=>finishCompletion(false));

  function clearFieldError(control){
    control.classList.remove('field-invalid');control.removeAttribute('aria-invalid');
    const id=control.id+'Error',error=$(id);if(error)error.remove();
    const descriptions=(control.getAttribute('aria-describedby')||'').split(/\s+/).filter(value=>value&&value!==id);
    if(descriptions.length)control.setAttribute('aria-describedby',descriptions.join(' '));else control.removeAttribute('aria-describedby');
  }
  function fieldMessage(control){
    if(control.id==='consent')return '请先查阅并同意拍摄注意事项。';
    if(control.validity.customError)return control.validationMessage;
    if(control.validity.patternMismatch)return control.id==='contact'?'请填写 5 至 15 位有效 QQ 号码。':'请按提示填写正确格式。';
    if(control.validity.rangeUnderflow||control.validity.rangeOverflow)return control.type==='date'?'请重新选择有效的期望日期。':'拍摄人数请填写 3 至 20 人。';
    if(control.validity.badInput)return '请填写正确的数字或日期。';
    const label=control.closest('label')?.cloneNode(true);label?.querySelectorAll('input,select,textarea,.field-error,.required').forEach(item=>item.remove());
    const name=(label?.textContent||'这一项').trim().replace(/\s+/g,' ');
    return (control.tagName==='SELECT'||control.type==='date'||control.dataset.picker==='time'?'请选择':'请填写')+name+'。';
  }
  function markFieldError(control,message){
    clearFieldError(control);control.classList.add('field-invalid');control.setAttribute('aria-invalid','true');
    const error=document.createElement('span');error.id=control.id+'Error';error.className='field-error';error.textContent=message||fieldMessage(control);
    const label=control.closest('label');if(control.id==='consent'&&label)label.after(error);else (label||control.parentElement).append(error);
    control.setAttribute('aria-describedby',((control.getAttribute('aria-describedby')||'')+' '+error.id).trim());
  }
  function clearTimeError(){clearFieldError($('timeTable'));}
  function clearValidation(){document.querySelectorAll('#bookingForm .field-invalid,#timeTable.field-invalid').forEach(clearFieldError);}
  function revealInvalid(control){
    if(control.id==='timeTable'){$('exhibitionContent').hidden=false;$('openExhibition').setAttribute('aria-expanded','true');$('openExhibition').querySelector('.expand-icon').textContent='−';}
    let parent=control.parentElement;while(parent){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}
    requestAnimationFrame(()=>{const target=window.MuyanPickers?.buttonFor(control)||control;target.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});target.focus({preventScroll:true});});
  }
  let readinessFrame=0,issueNavigationBusy=false;
  const invalidControl=control=>!control.disabled&&control.willValidate&&(!control.checkValidity()||control.required&&!control.value.trim());
  function firstSubmissionIssue(){
    const kind=service();
    for(const id of ['nickname','contactType','contact'])if(invalidControl($(id)))return {id,message:fieldMessage($(id))};
    const seen=new Set();
    for(const [index,day] of (serviceDays[kind]?dayList(kind):[]).entries()){
      const issue=seen.has(day.preferred_date)&&day.preferred_date?{id:kind==='snow'?'snowDate':'portraitDate',message:'同一天只能保留一份拍摄安排，请更换日期或移除重复的一天。'}:serviceDayError(day,kind);seen.add(day.preferred_date);
      if(issue)return {...issue,key:day.key,index};
    }
    if(kind==='event'){
      if(!visits.size)return {id:'timeTable',message:schedule?'请至少选择一天的可提交时段。':'请先选择漫展与开放场次。'};
      for(const [index,visit] of visitList().entries()){const issue=visitIssue(visit);if(issue)return {...issue,eventVisit:visit,index};}
    }
    const current=Array.from(document.querySelectorAll('#bookingForm input,#bookingForm select,#bookingForm textarea')).find(control=>control.id!=='consent'&&invalidControl(control));
    if(current)return {id:current.id,message:fieldMessage(current)};
    if(!ready||initializing||kind==='event'&&tableLoading)return {id:kind==='event'?'timeTable':'serviceStatus',message:'预约服务正在核对，请稍后再试。',waiting:true};
    try{payload();}catch(error){return {id:'submit',message:error.message,waiting:true};}
    if(invalidControl($('consent')))return {id:'consent',message:fieldMessage($('consent'))};
    return null;
  }
  function queueReadiness(){
    if(readinessFrame)return;readinessFrame=requestAnimationFrame(()=>{
      readinessFrame=0;const issue=firstSubmissionIssue(),button=$('submissionReadiness');button.disabled=!issue||sending;button.textContent=issue?(issue.waiting?'暂未就绪：':'还差：')+(Number.isInteger(issue.index)?'第 '+(issue.index+1)+' 天 · ':'')+issue.message:'资料已齐，可以提交';
    });
  }
  async function revealSubmissionIssue(issue){
    if(!issue||issueNavigationBusy)return;issueNavigationBusy=true;
    try{
      if(issue.key){validatedServiceDays.add(issue.key);renderServiceDays();}
      if(issue.eventVisit){validatedEventDays.add(issue.eventVisit.event_id);renderVisitCards();}
      if(issue.key&&issue.key!==activeServiceDay[service()]){stashServiceDay();activateServiceDay(service(),issue.key);}
      if(issue.eventVisit&&schedule?.id!==issue.eventVisit.event_id){
        const option=eventOptions.find(value=>value.id===issue.eventVisit.option_id);if(option){stashVisit();await chooseEventOption(option,true);if(schedule?.id!==issue.eventVisit.event_id)await loadSchedule(issue.eventVisit.event_id,true);}
      }
      const control=$(issue.id)||$('formMessage');if(control.id==='serviceStatus'){control.hidden=false;control.textContent=issue.message;}markFieldError(control,issue.message);revealInvalid(control);
    }catch(error){say(error.message||'暂时无法定位这一天，请在已选日期中重新选择。',true);}finally{issueNavigationBusy=false;queueReadiness();}
  }
  $('submissionReadiness').addEventListener('click',()=>{stashServiceDay();stashVisit();const issue=firstSubmissionIssue();if(issue)revealSubmissionIssue(issue);else queueReadiness();});
  function validateSubmission(){
    if(issueNavigationBusy){say('正在切换到需要补充的日期，请稍后再试。');return false;}
    stashServiceDay();stashVisit();const issue=firstSubmissionIssue();
    if(issue){say((Number.isInteger(issue.index)?'第 '+(issue.index+1)+' 天有待完善的信息。':'')+issue.message,true);revealSubmissionIssue(issue);return false;}
    clearValidation();queueReadiness();return true;
  }
  ['input','change'].forEach(type=>$('bookingForm').addEventListener(type,event=>{const control=event.target;if(control.matches('input,select,textarea')&&control.classList.contains('field-invalid')&&control.validity.valid)clearFieldError(control);}));

  function displayIntentNumber(item){
    const number=item.intent_number||item.plan?.intent_number;
    return typeof number==='string'&&number.trim()?number.trim():String(item.id||'').slice(0,12).toUpperCase();
  }

  const localRecords=window.MuyanBookingStorage||{read:()=>null,write:()=>false,remove:()=>false,available:false};
  const draftFields=['nickname','character','contactType','contact','portraitDate','portraitTime','portraitRange-start','portraitRange-end','portraitPeople','venueType','location','snowDate','effectsBrief','effectsIP','effectsCharacter','eventStyle','partnerNickname','partnerCharacter'];
  const noteKinds=['portrait','snow','event','effects'];
  function hideSavedReminder(){
    clearTimeout(savedToastTimer);savedToastTimer=0;savedToastPointer=false;$('savedBooking').hidden=true;$('openSavedRecords').setAttribute('aria-expanded','false');
  }
  function scheduleSavedReminderHide(){
    clearTimeout(savedToastTimer);
    if($('savedBooking').hidden||savedToastPointer||$('savedBooking').contains(document.activeElement))return;
    savedToastTimer=setTimeout(hideSavedReminder,6000);
  }
  function showSavedReminder(focus=false){
    if($('contactDialog').open)return;
    $('savedBooking').hidden=false;$('openSavedRecords').setAttribute('aria-expanded','true');scheduleSavedReminderHide();
    if(focus){const action=$('savedBooking').querySelector('.saved-actions button:not([hidden]):not(:disabled)');(action||$('closeSavedReminder')).focus({preventScroll:true});}
  }
  function refreshSavedState(message=''){
    clearTimeout(savedExpiryTimer);
    const draft=localRecords.read('draft'),last=localRecords.read('receipt'),hasRecords=Boolean(draft||last);
    $('restoreDraft').hidden=!draft;$('viewLastPlan').hidden=!last;$('clearSaved').hidden=!hasRecords;$('openSavedRecords').hidden=!hasRecords;
    $('restoreDraft').disabled=sending||restoringDraft;$('viewLastPlan').disabled=sending;$('clearSaved').disabled=sending||restoringDraft;$('openSavedRecords').disabled=sending||restoringDraft;
    const copy=message||(!localRecords.available?'当前浏览器无法保存记录，离开前请先截图保存小计划。':draft&&last?'未完成的草稿和上次小计划还在本机。':draft?'有一份未完成的草稿，可以继续填写。':last?'上次小计划仍在本机，可重新查看。':'本机暂时没有草稿或小计划。');
    if($('savedState').textContent!==copy)$('savedState').textContent=copy;
    if(booted&&!savedWelcomeChecked){savedWelcomeChecked=true;if(hasRecords)showSavedReminder();}
    if(message&&/无法保存|未能保存|保存不可用/.test(message)&&!savedStorageWarningShown){savedStorageWarningShown=true;showSavedReminder();}
    const expires=[draft?.expiresAt,last?.expiresAt].filter(Boolean);
    if(expires.length)savedExpiryTimer=setTimeout(()=>refreshSavedState(),Math.max(25,Math.min(...expires)-Date.now()+25));
  }
  function captureDraft(){
    stashServiceDay();
    const values={};draftFields.forEach(id=>values[id]=$(id).value);
    const notesByService={...drafts};notesByService[service()]=$('notes').value;
    return {service:service(),values,parties:{...parties},notesByService,eventFlow,templateDay,participants:{portrait:peopleEditors.portrait.value(),snow:peopleEditors.snow.value()},locationPlan:locationEditor.value(),servicePlans:{portrait:dayList('portrait'),snow:dayList('snow')},activeServiceDays:{...activeServiceDay},
      addonIds:Array.from($('portraitAddons').querySelectorAll('input:checked'),input=>input.value),
      eventVisits:visitList(),event:{optionId:selectedOption?.id||'',sessionId:requestedScheduleId||schedule?.id||'',slotId:selectedSlot?.id||'',packageId:$('package').value},
      retry:{requestId,signature,uncertain:pendingSubmission}};
  }
  function meaningfulDraft(data){
    return ['nickname','contact','character','portraitDate','snowDate','effectsBrief','effectsIP','effectsCharacter','partnerNickname','partnerCharacter','location'].some(id=>String(data.values[id]||'').trim())||Object.values(data.notesByService).some(value=>String(value).trim())||data.addonIds.length||data.event.slotId||Object.values(data.parties).some(party=>party!=='single')||Object.values(data.servicePlans||{}).some(items=>items.length>1||items.some(day=>day.character||day.preferred_date||day.time_start||day.time_end));
  }
  function saveDraftNow(force=false){
    clearTimeout(draftSaveTimer);if(!booted||restoringDraft||completed||(!draftDirty&&!force))return;
    const data=captureDraft();if(!meaningfulDraft(data))return;
    const ok=localRecords.write('draft',data);draftDirty=false;refreshSavedState(ok?'草稿已保存在本机，24小时内可恢复。':'当前浏览器未能保存草稿，请保留页面或先截图。');
  }
  function queueDraftSave(){
    if(!booted||restoringDraft||sending)return;draftDirty=true;clearTimeout(draftSaveTimer);draftSaveTimer=setTimeout(saveDraftNow,220);
  }
  function saveReceipt(){
    clearTimeout(draftSaveTimer);draftDirty=false;pendingSubmission=false;localRecords.remove('draft');
    const value={id:String(receipt.id),service:receipt.service,registrationFlow:receipt.registrationFlow,nickname:receipt.nickname,character:receipt.character,preview:Boolean(receipt.preview),intent_number:receipt.intent_number||'',plan:receipt.plan};
    const ok=localRecords.write('receipt',value);refreshSavedState(ok?'小计划已保存在本机，24小时内可重新查看。':'小计划已收到，但本机保存不可用，请先截图保存。');
  }
  function applySavedAddons(){
    if(!pendingAddonIds||!catalog)return;
    const wanted=new Set(pendingAddonIds);$('portraitAddons').querySelectorAll('input').forEach(input=>input.checked=wanted.has(input.value));pendingAddonIds=null;
  }
  function putSavedField(id,value){
    if(typeof value!=='string')return;const input=$(id);
    if(id==='portraitTime'){timeEditor.setValue(value);input.value=timeEditor.value();return;}
    if(input.tagName==='SELECT'){if(Array.from(input.options).some(option=>option.value===value))input.value=value;}
    else input.value=value.slice(0,input.maxLength>0?input.maxLength:150);
  }
  function restoreServicePlans(data,currentKind){
    if(!data.servicePlans||typeof data.servicePlans!=='object'){
      stashServiceDay();if(currentKind==='portrait'&&data.values?.portraitTime&&!timeEditor.value()){const day=serviceDays.portrait.get(activeServiceDay.portrait);if(day)day.preferred_time=String(data.values.portraitTime).slice(0,100);}return;
    }
    for(const kind of ['portrait','snow']){
      serviceDays[kind].clear();activeServiceDay[kind]='';
      const source=Array.isArray(data.servicePlans[kind])?data.servicePlans[kind].slice(0,31):[];
      for(const raw of source){
        if(!raw||typeof raw!=='object')continue;const day=emptyServiceDay(kind);
        for(const [key,max] of [['preferred_date',10],['preferred_time',100],['time_start',5],['time_end',5],['character',100],['venue_type',20],['location',150],['notes',1000]])day[key]=typeof raw[key]==='string'?raw[key].slice(0,max):day[key];
        day.party_type=(kind==='portrait'?['single','double','multiple']:['single','double']).includes(raw.party_type)?raw.party_type:'single';day.people=day.party_type==='double'?2:day.party_type==='multiple'?Math.max(3,Math.min(20,Math.trunc(Number(raw.people)||3))):1;
        day.addons=Array.isArray(raw.addons)?raw.addons.filter(id=>typeof id==='string').slice(0,20):[];day.location_plan=Array.isArray(raw.location_plan)?raw.location_plan.slice(0,10).map(value=>String(value||'').slice(0,150)):[];day.participants=Array.isArray(raw.participants)?raw.participants.slice(0,20).map(person=>({cn:String(person?.cn||'').slice(0,40),character:String(person?.character||'').slice(0,100)})):[];
        serviceDays[kind].set(day.key,day);if(raw.key===data.activeServiceDays?.[kind])activeServiceDay[kind]=day.key;
      }
      if(!activeServiceDay[kind])activeServiceDay[kind]=dayList(kind)[0]?.key||'';
    }
    if(serviceDays[currentKind])activateServiceDay(currentKind,activeServiceDay[currentKind]);
  }
  async function reconcileRestoredEvent(){
    const remembered=pendingEventRestore;if(!remembered||!ready)return;
    pendingEventRestore=null;
    if(remembered.visits){restoreVisitRecords(remembered.visits);await recheckVisits();}
    const option=eventOptions.find(item=>item.id===remembered.optionId);
    if(!option){selectedSlot=null;renderTable();updateSummary();submitState();return '原活动暂不可选，请重新选择漫展和时段。';}
    await chooseEventOption(option,false);
    if(!option.sessions?.length&&selectedTemplate()){
      templateDay=selectedTemplate().days[remembered.templateDay]?remembered.templateDay:0;
      if(Array.from($('package').options).some(item=>item.value===remembered.packageId))$('package').value=remembered.packageId;
      renderPackagePrice();renderTemplate();return '原场次尚未开放，已恢复所选日期；开放后才能选择时段。';
    }
    const session=option.sessions?.find(item=>item.id===remembered.sessionId);
    if(!session){selectedSlot=null;renderTable();updateSummary();submitState();return '原场次尚未开放或已变更，请重新选择时段。';}
    if(schedule?.id!==session.id)await loadSchedule(session.id,false);
    selectedSlot=schedule?.slots.find(slot=>slot.id===remembered.slotId&&slot.can_book)||null;
    if(Array.from($('package').options).some(item=>item.value===remembered.packageId))$('package').value=remembered.packageId;
    renderPackagePrice();renderTable();updateSummary();submitState();
    return selectedSlot?'':'原时段已不可选，请重新选择；已填写的其他信息已恢复。';
  }
  async function restoreSavedDraft(){
    if(sending||restoringDraft)return;const record=localRecords.read('draft');if(!record){refreshSavedState('草稿已过期或不存在，请重新填写。');return;}
    const data=record.value;if(!data.values||!data.parties||!data.notesByService){localRecords.remove('draft');refreshSavedState('这份草稿暂时无法恢复，请重新填写。');return;}
    clearTimeout(draftSaveTimer);restoringDraft=true;refreshSavedState();
    try{
      ['portrait','snow','event'].forEach(kind=>{const allowed=kind==='portrait'?['single','double','multiple']:['single','double'];parties[kind]=allowed.includes(data.parties[kind])?data.parties[kind]:'single';});
      const kind=['portrait','snow','effects','event'].includes(data.service)?data.service:'portrait';selectService(kind);
      draftFields.forEach(id=>putSavedField(id,data.values[id]));
      ['portrait','snow'].forEach(name=>peopleEditors[name].setValue(data.participants?.[name]||[]));locationEditor.setValue(data.locationPlan||[]);
      noteKinds.forEach(name=>drafts[name]=typeof data.notesByService[name]==='string'?data.notesByService[name].slice(0,name==='event'?700:1000):'');
      $('notes').value=drafts[kind];$('consent').checked=false;
      pendingAddonIds=Array.isArray(data.addonIds)?data.addonIds.filter(id=>typeof id==='string').slice(0,20):[];applySavedAddons();
      selectEventFlow(data.eventFlow==='friend'?'friend':'new');templateDay=Number.isInteger(data.templateDay)&&data.templateDay>=0&&data.templateDay<=2?data.templateDay:0;
      contactType();restoreServicePlans(data,kind);renderForm();step(1);
      const retry=data.retry||{};requestId=typeof retry.requestId==='string'&&/^[\w-]{1,100}$/.test(retry.requestId)?retry.requestId:'';signature=typeof retry.signature==='string'&&retry.signature.length<20000?retry.signature:'';pendingSubmission=Boolean(retry.uncertain&&requestId&&signature);
      let note='草稿已恢复，请核对信息，并重新勾选拍摄注意事项。';
      if(kind==='event'){
        const value=data.event||{};pendingEventRestore={optionId:String(value.optionId||''),sessionId:String(value.sessionId||''),slotId:String(value.slotId||''),packageId:String(value.packageId||''),templateDay,visits:data.eventVisits};
        if(ready&&!initializing){await loadEventOptions();const warning=await reconcileRestoredEvent();if(warning)note=warning;}
        else note+=' 时段联网后会重新核对。';
      }
      if(pendingSubmission)note+=' 上次提交结果待确认，请先核实，避免重复登记。';
      draftDirty=false;refreshSavedState(note);say(note);
    }finally{restoringDraft=false;refreshSavedState($('savedState').textContent);}
  }
  function validSavedReceipt(value){
    return value&&typeof value.id==='string'&&value.id.length<=150&&['portrait','snow','effects','event'].includes(value.service)&&typeof value.nickname==='string'&&value.nickname.length<=40&&value.plan&&Array.isArray(value.plan.fields)&&value.plan.fields.length>0&&value.plan.fields.length<=512&&value.plan.fields.every(field=>field&&typeof field.label==='string'&&field.label.length<=80&&typeof field.value==='string'&&field.value.length<=6000)&&typeof value.plan.foot==='string'&&value.plan.foot.length<=300;
  }
  $('restoreDraft').addEventListener('click',()=>restoreSavedDraft().then(()=>{showSavedReminder();scheduleSavedReminderHide();}).catch(()=>{restoringDraft=false;refreshSavedState('填写信息已恢复，时间表暂时无法核对，请重新连接。');showSavedReminder();}));
  $('viewLastPlan').addEventListener('click',()=>{
    if(sending)return;const record=localRecords.read('receipt');
    if(!record){refreshSavedState('上次小计划已过期或不存在。');return;}
    if(!validSavedReceipt(record.value)){localRecords.remove('receipt');refreshSavedState('保存的小计划暂时无法读取，请联系慕言核实。');return;}
    receipt=record.value;openContacts(false);
  });
  $('clearSaved').addEventListener('click',()=>{
    if(sending||restoringDraft)return;clearTimeout(draftSaveTimer);draftDirty=false;localRecords.remove('draft');localRecords.remove('receipt');
    refreshSavedState('本机保存记录已清除，当前页面的填写内容仍保留。');showSavedReminder();
  });
  $('openSavedRecords').addEventListener('click',()=>{refreshSavedState();showSavedReminder(true);});
  $('closeSavedReminder').addEventListener('click',()=>{hideSavedReminder();if(!$('openSavedRecords').hidden)$('openSavedRecords').focus({preventScroll:true});});
  $('savedBooking').addEventListener('pointerenter',()=>{savedToastPointer=true;clearTimeout(savedToastTimer);});
  $('savedBooking').addEventListener('pointerleave',()=>{savedToastPointer=false;scheduleSavedReminderHide();});
  $('savedBooking').addEventListener('focusin',()=>clearTimeout(savedToastTimer));
  $('savedBooking').addEventListener('focusout',()=>queueMicrotask(scheduleSavedReminderHide));
  window.addEventListener('pageshow',event=>{if(event.persisted){refreshSavedState();if(localRecords.read('draft')||localRecords.read('receipt'))showSavedReminder();}});
  window.addEventListener('pagehide',()=>saveDraftNow());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)saveDraftNow();else refreshSavedState();});

  function referencePrice(kind=service(),snapshot=null){
    const party=snapshot?.party_type||parties[kind];
    if(kind==='snow'){
      const value=Number(party==='double'?catalog?.snow.double_per_person:catalog?.snow.single_per_person);
      if(!Number.isFinite(value)||value<=0)return '待沟通确认';
      return party==='double'?(value*2)+' 元／两人（'+value+' 元／人）':value+' 元／人';
    }
    if(kind!=='portrait')return '';
    // Match the public main-site base prices. No deposits or balances are shown here.
    const base={single:329,double:429}[party];if(!base)return '按人数与需求沟通报价';
    let total=base,starting=false,discuss=false;
    (snapshot?snapshot.addons:Array.from($('portraitAddons').querySelectorAll('input:checked'),input=>input.value)).forEach(id=>{
      const item=catalog?.portrait_addons.find(item=>item.id===id);if(!item)return;
      if(['fixed_addition','starting_at'].includes(item.pricing)&&Number.isFinite(item.amount)){total+=item.amount;if(item.pricing==='starting_at')starting=true;}else discuss=true;
    });
    return Number(total.toFixed(2))+' 元'+(starting?'起':'')+(discuss?'＋待议费用':'');
  }

  window.addEventListener('offline',()=>{if(['127.0.0.1','localhost'].includes(location.hostname))return;ready=false;submitState();$('serviceStatus').hidden=false;$('serviceStatus').textContent='当前设备已离线，请保留表单，联网后再重试。';$('serviceStatus').classList.add('error');});window.addEventListener('online',()=>start());
  window.addEventListener('beforeunload',event=>{
    if(completed)return;
    if(['nickname','contact','character','notes','portraitDate','snowDate','effectsBrief','effectsIP','effectsCharacter','partnerNickname','partnerCharacter'].some(id=>$(id).value.trim())){event.preventDefault();event.returnValue='';}
  });
  contactType();
  const initial=params.get('type');selectService(['portrait','event','snow','effects'].includes(initial)?initial:'portrait');booted=true;refreshSavedState();start();
})();
