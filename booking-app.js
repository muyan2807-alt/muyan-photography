(() => {
  'use strict';
  const $=id=>document.getElementById(id), partyLabels={single:'单人',double:'双人',multiple:'多人'};
  const titles={portrait:'正片拍摄',snow:'雪景拍摄',effects:'后期制作',event:'场照拍摄'};
  const parties={portrait:'single',snow:'single',event:'single'},drafts={portrait:'',snow:'',event:''};
  let mode='portrait',catalog=null,schedule=null,selectedSlot=null,tableLoading=false,tableGeneration=0;
  let ready=false,sending=false,completed=false,receipt=null,channel='qq',qqAccount='main',signature='',requestId='',initializing=false;
  const apiBase=String(window.MUYAN_BOOKING?.apiBase||'').replace(/\/+$/,'');
  const freeNgrok=/\.ngrok-free\.(dev|app)$/.test(new URL(apiBase||location.href).hostname);
  const params=new URLSearchParams(location.search),sources=['top','works','price','notes','contact'];
  const home=new URL('./',location.href),from=sources.includes(params.get('from'))?params.get('from'):'works';

  let eventOptions=[],selectedOption=null,eventFlow='new',templateDay=0;
  let planAsset=null,planAssetJob=null,planGeneration=0,celebrationTimer=0;
  let booted=false,restoringDraft=false,draftDirty=false,pendingSubmission=false,draftSaveTimer=0,savedExpiryTimer=0,pendingAddonIds=null,pendingEventRestore=null,requestedScheduleId='';
  // Only a display template. No synthetic IDs can be submitted to the live API.
  const eventTemplateTimes=Array.from({length:22},(_,i)=>{const minutes=570+i*20;return String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');});
  const eventTemplates=[
    {id:'chongqing-meng22',title:'重庆梦二十二动漫展（2.13-2.14）',days:[{session:'D1',date:'2027-02-13'},{session:'D2',date:'2027-02-14'}]},
    {id:'shijiexian-202701',title:'世界线（1.23—25）',days:[{session:'D1',date:'2027-01-23'},{session:'D2',date:'2027-01-24'},{session:'D3',date:'2027-01-25'}]}
  ];
  const selectedTemplate=()=>eventTemplates.find(item=>item.id===selectedOption?.id);
  const visits=new Map();let customerFeatures={};
  const service=()=>mode==='event'?'event':$('subCategory').value||'portrait';
  const say=(message,error=false)=>{$('formMessage').textContent=message;$('formMessage').classList.toggle('error',error);};
  function step(index){document.querySelectorAll('.steps li').forEach((item,i)=>item.classList.toggle('current',i===index));}
  async function api(path,options={}){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try{const response=await fetch(apiBase+path,{...options,cache:'no-store',credentials:'omit',signal:controller.signal,headers:{...(freeNgrok?{'ngrok-skip-browser-warning':'1'}:{}),...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});const value=await response.json().catch(()=>null);if(!response.ok||!value?.ok){const error=Error(value?.error||'暂时无法连接预约服务，请稍后重试。');error.status=response.status;throw error;}return value;}
    catch(error){if(error.name==='AbortError'||error instanceof TypeError)throw Error('连接暂时中断。请保留表单，恢复连接后重试同一份意向。');throw error;}
    finally{clearTimeout(timer);}
  }
  function submitState(){$('submit').disabled=sending;$('submitText').textContent=completed?'意向已收到 · 查看联系方式':service()==='event'&&eventFlow==='friend'?'提交场照排单':'提交'+titles[service()]+'意向';}
  function edited(){stashVisit();renderVisitCards();if(selectedSlot?.can_book)clearTimeError();if(completed){completed=false;say('');}submitState();queueDraftSave();}
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
  function renderForm(){
    const kind=service(),effects=kind==='effects';
    ['portrait','snow','effects'].forEach(name=>panel(name+'Details',kind===name));panel('eventRegistration',kind==='event');
    $('eventDetails').hidden=kind!=='event';$('eventSelections').hidden=kind!=='event';$('eventSelectionCount').hidden=kind!=='event';$('commonCharacterField').hidden=effects;$('character').disabled=effects;
    $('notesField').hidden=effects;$('notes').disabled=effects;
    $('portraitPeopleField').hidden=!(kind==='portrait'&&parties.portrait==='multiple');$('portraitPeople').disabled=$('portraitPeopleField').hidden;
    panel('eventPartner',kind==='event'&&parties.event==='double');$('portraitPartyHelp').hidden=!(kind==='portrait'&&parties.portrait==='multiple');
    $('choosePortrait').classList.toggle('selected',mode==='portrait');$('chooseEvent').classList.toggle('selected',mode==='event');
    $('choosePortrait').setAttribute('aria-pressed',String(mode==='portrait'));$('chooseEvent').setAttribute('aria-pressed',String(mode==='event'));
    $('chooseSnow').setAttribute('aria-pressed',String(kind==='snow'));$('chooseEffects').setAttribute('aria-pressed',String(effects));
    $('detailHeading').textContent={portrait:'聊聊这次的拍摄',snow:'聊聊这次的雪景拍摄',effects:'说说你想要的后期效果',event:'记录这次的漫展相遇'}[kind];
    $('detailIntro').textContent={portrait:'选好日期和地点，剩下的灵感一起补全。',snow:'选一个期待的日子，一起去看雪。',effects:'告诉我希望呈现的画面和角色。',event:'填写 CN、角色、套餐、风格，以及一起出镜的伙伴。'}[kind];
    $('notesLabel').textContent=kind==='event'?'其他拍摄需求':'拍摄想法 / 想补充的事';$('notes').maxLength=kind==='event'?700:1000;
    if(kind==='event'&&visits.size&&!selectedSlot){['character','package','eventStyle','partnerNickname','partnerCharacter','notes'].forEach(id=>$(id).disabled=true);}
    $('currentCharacterLabel').textContent=kind==='event'&&schedule?'角色 · '+schedule.session:'角色';
    if(kind==='event'&&schedule)$('detailIntro').textContent=!selectedSlot&&visits.size?'当前仅查看 '+schedule.session+'，选择本日时段后可填写资料，也可以直接提交已经选好的日期。':'当前填写 '+schedule.session+' · '+schedule.date+' 的资料，其他日期会分别保留。';
    ['portrait','snow','event'].forEach(renderParty);renderSpecial();updateSummary();submitState();updateSiteLinks(kind);window.MuyanPickers?.refresh();
  }
  function selectService(next){
    if(sending)return;stashVisit();clearValidation();const previous=service();if(previous!=='effects')drafts[previous]=$('notes').value;
    mode=next==='event'?'event':'portrait';$('subCategory').value=['snow','effects'].includes(next)?next:'';
    if(next!=='effects')$('notes').value=drafts[next]||'';else $('effectsCharacter').value=$('character').value;
    if(['snow','effects'].includes(next))$('specialServices').open=true;
    if(next==='event'&&schedule)activateVisit();edited();renderForm();step(0);
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
    const items=catalog.portrait_addons.filter(item=>item.id!=='travel'),priority=items.find(item=>item.id==='portrait_retouch_9');
    const ordered=priority?[priority,...items.filter(item=>item!==priority)]:items;
    ordered.forEach(item=>{const label=document.createElement('label');label.className='addon-choice'+(item.id==='portrait_retouch_9'?' addon-retouch':'');const input=document.createElement('input');input.type='checkbox';input.value=item.id;input.checked=checked.has(item.id);const text=document.createElement('span');text.textContent=item.label;label.append(input,text);input.addEventListener('change',()=>{edited();updateSummary();});$('portraitAddons').append(label);});applySavedAddons();
  }
  function balanceSummary(list){const items=Array.from(list.children).filter(item=>!item.hidden);Array.from(list.children).forEach(item=>item.classList.remove('summary-wide'));if(items.length%2)items[items.length-1]?.classList.add('summary-wide');}
  function updateSummary(){
    stashVisit();
    const kind=service(),effects=kind==='effects';$('summaryPriceRow').hidden=!['portrait','snow'].includes(kind);$('summaryPrice').textContent=referencePrice();$('summaryTypeLabel').textContent=effects?'服务类型':'拍摄类型';$('summaryType').textContent=effects?'后期 / 特效':(kind==='snow'?'雪景':kind==='event'?'场照':'正片')+' · '+partyLabels[parties[kind]];
    $('summaryNickname').textContent=$('nickname').value.trim()||'等待填写 CN';
    $('summaryRole').textContent=(effects?$('effectsCharacter'):$('character')).value.trim()||'等待填写角色';
    $('summaryWorkRow').hidden=!effects;$('summaryWork').textContent=$('effectsIP').value.trim()||'等待填写作品';$('summaryTimeRow').hidden=effects;$('summaryLocationRow').hidden=effects;
    $('summaryTimeLabel').textContent=kind==='snow'?'期望日期':'期望时间';
    $('summaryTime').textContent=kind==='event'?(schedule&&selectedSlot?schedule.session+' · '+schedule.date+' '+selectedSlot.start.slice(11,16)+'–'+selectedSlot.end.slice(11,16):'先选一个漫展时段'):kind==='snow'?($('snowDate').value||'选择一个期望日期'):($('portraitDate').value?$('portraitDate').value+' · '+$('portraitTime').value:'还可以慢慢安排');
    $('summaryLocation').textContent=kind==='event'?'以群聊通知为准':kind==='snow'?(catalog?.snow.description||'主城出发 · 雪景地'):$('location').value.trim()||'一起选个喜欢的地方';
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
    }
    renderVisitCards();window.MuyanPickers?.refresh();balanceSummary(document.querySelector('.submission .summary-card dl'));

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
  function renderPackagePrice(){const item=(schedule?.packages||catalog?.event_packages||[]).find(p=>p.id===$('package').value),root=$('packagePricing');root.replaceChildren();root.hidden=!item;if(!item)return;const title=document.createElement('strong'),copy=document.createElement('p');title.textContent=item.label;copy.textContent=item.description;root.append(title,copy);if(item.pricing?.kind==='base_plus_retouch'){const note=document.createElement('p');note.className='variable-price-note';note.textContent='这里显示的是基础费用，不是最终总价。精修张数及最终尾款以沟通确认为准。';root.append(note);}}
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
      customerFeatures=options.customer_features||{};catalog=values;$('portraitDate').min=options.today;$('snowDate').min=options.today;renderAddons();renderForm();ready=true;
      $('serviceStatus').textContent='';$('serviceStatus').hidden=true;$('serviceStatus').classList.remove('error');
      try{await loadEventOptions();if(visits.size)await recheckVisits();if(pendingEventRestore){const warning=await reconcileRestoredEvent();if(warning)say(warning,true);}}catch(error){
        tableGeneration++;schedule=null;selectedSlot=null;tableLoading=false;$('timeTable').textContent='活动时间表暂时无法读取，请稍后重试。';
        $('selectedTimeHint').textContent='时间表暂不可用，请稍后重试。';if(service()==='event')say(error.message,true);
      }
    }catch(error){ready=false;$('serviceStatus').hidden=false;$('serviceStatus').textContent=error.message;$('serviceStatus').classList.add('error');const retry=document.createElement('button');retry.type='button';retry.className='text-button';retry.textContent='重新连接';retry.addEventListener('click',start);$('serviceStatus').append(retry)}
    finally{initializing=false;submitState();refreshSavedState()}
  }
  function payload(){
    const kind=service();const body={category:mode,nickname:$('nickname').value.trim(),character:(kind==='effects'?$('effectsCharacter'):$('character')).value.trim(),contact_type:$('contactType').value,contact:$('contact').value.trim(),consent:$('consent').checked};
    if(kind==='effects')return {...body,sub_category:'effects',work_ip:$('effectsIP').value.trim(),effect_description:$('effectsBrief').value.trim()};
    body.notes=$('notes').value.trim();body.party_type=parties[kind];
    if(kind==='snow')return {...body,sub_category:'snow',preferred_date:$('snowDate').value};
    if(kind==='portrait'){Object.assign(body,{sub_category:'',preferred_date:$('portraitDate').value,preferred_time:$('portraitTime').value,venue_type:$('venueType').value,location:$('location').value.trim(),needs_pickup:Array.from($('portraitAddons').querySelectorAll('input:checked')).some(input=>catalog?.portrait_addons.find(item=>item.id===input.value)?.requires_pickup),addons:Array.from($('portraitAddons').querySelectorAll('input:checked'),input=>input.value)});if(parties.portrait==='multiple')body.people=Number($('portraitPeople').value);}
    else{
      stashVisit();const items=visitList();if(!items.length||items.some(visitError))throw Error('请补全每一天的时段、角色、套餐和风格。');
      if(customerFeatures.event_batch_v1)return {category:'event',nickname:body.nickname,contact_type:body.contact_type,contact:body.contact,consent:body.consent,registration_flow:eventFlow,visits:items.map(value=>({event_id:value.event_id,event_slot_id:value.event_slot_id,character:value.character,party_type:value.party_type,package_id:value.package_id,shoot_style:value.shoot_style,partner_nickname:value.partner_nickname,partner_character:value.partner_character,notes:value.notes}))};
      if(items.length>1)throw Error('多日预约服务暂未开放，请联系慕言确认。');
      const value=items[0];Object.assign(body,{event_id:value.event_id,event_slot_id:value.event_slot_id,character:value.character,party_type:value.party_type,package_id:value.package_id,shoot_style:value.shoot_style,partner_nickname:value.partner_nickname,partner_character:value.partner_character,registration_flow:eventFlow,notes:value.notes});
    }
    return body;
  }
  function busy(value){sending=value;$('formFields').disabled=value;document.querySelectorAll('.service-choices button,.special-choices button,#sessionChoices button,#openExhibition').forEach(button=>button.disabled=value);submitState();refreshSavedState();}
  $('bookingForm').addEventListener('submit',async event=>{
    event.preventDefault();if(sending)return;if(completed&&receipt){openContacts();return;}if(!validateSubmission())return;if(!ready){say('表单服务暂时无法连接，请重新连接后提交。',true);$('serviceStatus').hidden=false;revealInvalid($('serviceStatus'));return;}if(service()==='event'&&(initializing||tableLoading)){say('正在核对时段，请稍候再提交。',true);revealInvalid($('timeTable'));return;}
    let body;try{body=payload();}catch(error){say(error.message,true);if(service()==='event')$('openExhibition').focus();return;}
    const next=JSON.stringify(body);if(next!==signature){requestId=crypto.randomUUID();signature=next;}body.request_id=requestId;const submitted=service(),submittedPlan=capturePlan();pendingSubmission=true;saveDraftNow(true);busy(true);say('正在收好你的'+(submitted==='effects'?'制作需求':'拍摄意向')+'…');
    try{const result=await api(service()==='event'&&customerFeatures.event_batch_v1?'/api/public/event/booking-batches':'/api/public/'+mode+'/bookings',{method:'POST',body:JSON.stringify(body)});receipt={...result,service:result.service||submitted,registrationFlow:eventFlow,nickname:body.nickname,character:body.character,intent_number:typeof result.intent_number==='string'?result.intent_number:'',plan:{...submittedPlan,id:result.id,intent_number:typeof result.intent_number==='string'?result.intent_number:'',preview:Boolean(result.preview)}};completed=true;saveReceipt();say('意向已收到，请保存小计划，发给慕言继续确认。');openContacts(true);}
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
  function visitError(value){return !value.available?'原时段已不可选，请重新选择':!value.character?'请填写本日角色':!value.package_id?'请选择本日套餐':!['bright','dark'].includes(value.shoot_style)?'请选择本日风格':value.party_type==='double'&&(!value.partner_nickname||!value.partner_character)?'请补全本日同行信息':'';}
  function renderVisitCards(){
    const root=$('eventSelections');root.replaceChildren();const items=visitList();$('eventSelectionCount').textContent=customerFeatures.event_batch_v1?(items.length?'已选 '+items.length+' 天 · 每天最多一个时段':'可选择多天，每天最多一个时段'):(items.length?'已选 '+items.length+' 天 · 当前每次可登记一天':'当前每次可登记一个拍摄日，多天安排请联系慕言。');
    items.forEach(value=>{
      const card=document.createElement('article'),head=document.createElement('div'),title=document.createElement('strong'),text=document.createElement('p'),actions=document.createElement('div');
      const error=visitError(value);card.className='event-day-card'+(schedule?.id===value.event_id?' is-current':'')+(error?' is-unavailable':'');card.dataset.date=value.date;
      head.className='event-day-head';title.textContent=value.session+' · '+value.date+' '+value.start.slice(11,16)+'–'+value.end.slice(11,16);head.append(title);
      text.textContent=(value.character||'角色待填写')+' · '+(value.package_label||'套餐待选择')+' · '+(value.shoot_style==='bright'?'亮灰':value.shoot_style==='dark'?'暗调':'风格待选择');
      actions.className='event-day-actions';const edit=document.createElement('button'),remove=document.createElement('button');edit.type=remove.type='button';edit.textContent='填写／修改这天';remove.textContent='移除这天';edit.disabled=remove.disabled=sending;
      edit.addEventListener('click',async()=>{if(sending)return;const option=eventOptions.find(item=>item.id===value.option_id);if(!option){say('原活动暂不可用，请联系慕言。',true);return;}stashVisit();await chooseEventOption(option,true);if(schedule?.id!==value.event_id)await loadSchedule(value.event_id,true);$('customerSection').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
      remove.addEventListener('click',()=>{if(sending)return;visits.delete(value.date);if(schedule?.date===value.date){selectedSlot=null;renderTable();}renderForm();edited();updateSummary();});
      actions.append(edit,remove);card.append(head,text);if(error){const note=document.createElement('p');note.className='unavailable-note';note.textContent=error;card.append(note);}card.append(actions);root.append(card);
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
    const fields=Array.from(document.querySelectorAll('.submission .summary-card dl>div')).filter(item=>!item.hidden).map(item=>({label:item.querySelector('dt').textContent,value:item.querySelector('dd').textContent}));
    return {nickname:$('nickname').value.trim(),fields,foot:$('summaryFoot').textContent};
  }
  function renderReceiptPlan(){
    const root=$('receiptPlan');root.replaceChildren();
    const heading=document.createElement('div');heading.className='summary-heading';
    const spark=document.createElement('span');spark.className='summary-spark';spark.setAttribute('aria-hidden','true');spark.textContent='✧';
    const copy=document.createElement('div'),title=document.createElement('h3'),intro=document.createElement('p');title.textContent='这次的小计划';intro.textContent='保存或截图，发给慕言确认。';copy.append(title,intro);heading.append(spark,copy);
    const list=document.createElement('dl');
    receipt.plan.fields.forEach(field=>{const item=document.createElement('div'),label=document.createElement('dt'),value=document.createElement('dd');label.textContent=field.label;value.textContent=field.value;item.append(label,value);list.append(item);});
    const foot=document.createElement('p');foot.className='summary-foot';foot.textContent=receipt.plan.foot;root.append(heading,list,foot);balanceSummary(list);
  }
  function renderCredential(){
    const value=receipt.verification_code||receipt.edit_code,code=typeof value==='string'&&/^\d{4}$/.test(value)?value:'';
    $('editCredential').hidden=!code;$('editCodeValue').textContent=code;
  }
  $('saveEditCredential').addEventListener('click',()=>{
    const code=receipt?.verification_code||receipt?.edit_code;if(typeof code!=='string'||!/^\d{4}$/.test(code))return;
    const text='慕言预约验证凭证\nCN：'+receipt.nickname+'\n预约编号：'+displayIntentNumber(receipt)+'\n验证码：'+code+'\n请妥善保存，勿转发给他人。验证码不保存在浏览器草稿或小计划图片中。';
    const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='慕言预约验证凭证.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  let planAssetReceipt=null;
  function preparePlanImage(){
    if(planAssetReceipt===receipt&&planAssetJob)return planAssetJob;
    const current=receipt,generation=++planGeneration;planAssetReceipt=current;
    if(planAsset)URL.revokeObjectURL(planAsset.url);planAsset=null;
    $('planImageFallback').hidden=true;$('planImagePreview').removeAttribute('src');$('receiptPlan').hidden=true;$('planSaveStatus').textContent='正在准备计划图…';
    planAssetJob=new Promise((resolve,reject)=>{
      try{window.MuyanPlanImage.render(current.plan).toBlob(blob=>blob?resolve(blob):reject(Error('图片暂未生成')),'image/png');}catch(error){reject(error);}
    }).then(blob=>{
      if(generation!==planGeneration||receipt!==current)return null;
      const asset={blob,url:URL.createObjectURL(blob)};planAsset=asset;$('planImagePreview').src=asset.url;$('planImageFallback').hidden=false;$('planSaveStatus').textContent='可直接截图；计划较长时，可用长截图或长按图片保存。';return asset;
    }).catch(()=>{if(generation===planGeneration){$('receiptPlan').hidden=false;$('planSaveStatus').textContent='计划图暂未生成，可先截图下方的文字计划，发给慕言确认。';planAssetJob=null;}return null;});
    return planAssetJob;
  }
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
    channel='qq';qqAccount='main';$('contactQQAccount').value='main';const effects=receipt.service==='effects';
    $('successTitle').textContent=effects?'后期需求已收到':receipt.service==='event'&&receipt.registrationFlow==='friend'?'场照排单已收到':'拍摄意向已收到';
    document.querySelector('.dialog-intro').textContent=receipt.registrationFlow==='friend'&&receipt.service==='event'?'已有好友：截图保存计划图，发到现有聊天中确认。':'截图保存计划图，再添加慕言确认安排。';
    $('contactFooter').textContent=effects?'制作效果、费用和交付安排，以双方沟通确认为准。':receipt.service==='event'?'提交意向不代表档期已确认。确认预约后，由慕言拉你进拍摄群；具体安排以群聊通知为准。':'提交意向不代表档期已确认，具体安排以沟通结果为准。';
    if(receipt.preview){$('successTitle').textContent='预览填写完成';document.querySelector('.dialog-intro').textContent='仅作本地预览，未发送或占用档期，可截图核对计划。';}
    $('contactFooter').textContent+=' 如需更正本次信息，请联系慕言调整原预约，无需重复提交。';document.querySelector('.result-home-link').href=siteURL(receipt.service,from);
    $('receiptId').textContent=displayIntentNumber(receipt);renderReceiptPlan();preparePlanImage();renderContact();renderCredential();step(2);
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
    if(control.validity.patternMismatch)return control.id==='contact'?'请填写 5 至 15 位有效 QQ 号码。':'请按提示填写正确格式。';
    if(control.validity.rangeUnderflow||control.validity.rangeOverflow)return control.type==='date'?'请重新选择有效的期望日期。':'拍摄人数请填写 3 至 20 人。';
    if(control.validity.badInput)return '请填写正确的数字或日期。';
    const label=control.closest('label')?.cloneNode(true);label?.querySelectorAll('input,select,textarea,.field-error,.required').forEach(item=>item.remove());
    const name=(label?.textContent||'这一项').trim().replace(/\s+/g,' ');
    return (control.tagName==='SELECT'?'请选择':'请填写')+name+'。';
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
  function validateSubmission(){
    const invalid=[];
    document.querySelectorAll('#bookingForm input,#bookingForm select,#bookingForm textarea').forEach(control=>{
      if(control.disabled||!control.willValidate)return;
      if(!control.checkValidity()){markFieldError(control);invalid.push(control);}else clearFieldError(control);
    });
    if(service()==='event'&&ready&&!initializing&&!tableLoading&&(!visits.size||visitList().some(visitError))){
      markFieldError($('timeTable'),visits.size?'请在已选日期中补全角色、套餐和风格，或重新选择不可用的时段。':schedule?'请至少选择一天的可提交时段。':'本场时段尚未开放，暂时不能提交场照排单。');invalid.push($('timeTable'));
    }else clearTimeError();
    invalid.sort((a,b)=>a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1);
    if(invalid.length){say('请补全红框标出的内容，再提交这次的意向。',true);revealInvalid(invalid[0]);return false;}
    return true;
  }
  ['input','change'].forEach(type=>$('bookingForm').addEventListener(type,event=>{const control=event.target;if(control.matches('input,select,textarea')&&control.classList.contains('field-invalid')&&control.validity.valid)clearFieldError(control);}));

  function displayIntentNumber(item){
    const number=item.intent_number||item.plan?.intent_number;
    return typeof number==='string'&&number.trim()?number.trim():String(item.id||'').slice(0,12).toUpperCase();
  }

  const localRecords=window.MuyanBookingStorage||{read:()=>null,write:()=>false,remove:()=>false,available:false};
  const draftFields=['nickname','character','contactType','contact','portraitDate','portraitTime','portraitPeople','venueType','location','snowDate','effectsBrief','effectsIP','effectsCharacter','eventStyle','partnerNickname','partnerCharacter'];
  const noteKinds=['portrait','snow','event'];
  function refreshSavedState(message=''){
    clearTimeout(savedExpiryTimer);
    const draft=localRecords.read('draft'),last=localRecords.read('receipt');
    $('restoreDraft').hidden=!draft;$('viewLastPlan').hidden=!last;$('clearSaved').hidden=!draft&&!last;
    $('restoreDraft').disabled=sending||restoringDraft;$('viewLastPlan').disabled=sending;$('clearSaved').disabled=sending||restoringDraft;
    $('savedState').textContent=message||(!localRecords.available?'当前浏览器无法保存记录，离开前请先保存小计划图片。':draft&&last?'未完成的草稿和上次小计划已保存在本机。':draft?'有一份未完成的草稿，可以继续填写。':last?'上次小计划已保存在本机，可重新查看与保存。':'填写进度与最近一次小计划，可在本机保留24小时。');
    const expires=[draft?.expiresAt,last?.expiresAt].filter(Boolean);
    if(expires.length)savedExpiryTimer=setTimeout(()=>refreshSavedState(),Math.max(25,Math.min(...expires)-Date.now()+25));
  }
  function captureDraft(){
    const values={};draftFields.forEach(id=>values[id]=$(id).value);
    const notesByService={...drafts};if(service()!=='effects')notesByService[service()]=$('notes').value;
    return {service:service(),values,parties:{...parties},notesByService,eventFlow,templateDay,
      addonIds:Array.from($('portraitAddons').querySelectorAll('input:checked'),input=>input.value),
      eventVisits:visitList(),event:{optionId:selectedOption?.id||'',sessionId:requestedScheduleId||schedule?.id||'',slotId:selectedSlot?.id||'',packageId:$('package').value},
      retry:{requestId,signature,uncertain:pendingSubmission}};
  }
  function meaningfulDraft(data){
    return ['nickname','contact','character','portraitDate','snowDate','effectsBrief','effectsIP','effectsCharacter','partnerNickname','partnerCharacter','location'].some(id=>String(data.values[id]||'').trim())||Object.values(data.notesByService).some(value=>String(value).trim())||data.addonIds.length||data.event.slotId||Object.values(data.parties).some(party=>party!=='single');
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
    const ok=localRecords.write('receipt',value);refreshSavedState(ok?'小计划已保存在本机，24小时内可重新查看。':'小计划已收到，但本机保存不可用，请先保存图片。');
  }
  function applySavedAddons(){
    if(!pendingAddonIds||!catalog)return;
    const wanted=new Set(pendingAddonIds);$('portraitAddons').querySelectorAll('input').forEach(input=>input.checked=wanted.has(input.value));pendingAddonIds=null;
  }
  function putSavedField(id,value){
    if(typeof value!=='string')return;const input=$(id);
    if(input.tagName==='SELECT'){if(Array.from(input.options).some(option=>option.value===value))input.value=value;}
    else input.value=value.slice(0,input.maxLength>0?input.maxLength:150);
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
      noteKinds.forEach(name=>drafts[name]=typeof data.notesByService[name]==='string'?data.notesByService[name].slice(0,name==='event'?700:1000):'');
      if(kind!=='effects')$('notes').value=drafts[kind];$('consent').checked=false;
      pendingAddonIds=Array.isArray(data.addonIds)?data.addonIds.filter(id=>typeof id==='string').slice(0,20):[];applySavedAddons();
      selectEventFlow(data.eventFlow==='friend'?'friend':'new');templateDay=Number.isInteger(data.templateDay)&&data.templateDay>=0&&data.templateDay<=2?data.templateDay:0;
      contactType();renderForm();step(1);
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
    return value&&typeof value.id==='string'&&value.id.length<=150&&['portrait','snow','effects','event'].includes(value.service)&&typeof value.nickname==='string'&&value.nickname.length<=40&&value.plan&&Array.isArray(value.plan.fields)&&value.plan.fields.length>0&&value.plan.fields.length<=20&&value.plan.fields.every(field=>field&&typeof field.label==='string'&&field.label.length<=80&&typeof field.value==='string'&&field.value.length<=2000)&&typeof value.plan.foot==='string'&&value.plan.foot.length<=300;
  }
  $('restoreDraft').addEventListener('click',()=>restoreSavedDraft().catch(()=>{restoringDraft=false;refreshSavedState('填写信息已恢复，时间表暂时无法核对，请重新连接。');}));
  $('viewLastPlan').addEventListener('click',()=>{
    if(sending)return;const record=localRecords.read('receipt');
    if(!record){refreshSavedState('上次小计划已过期或不存在。');return;}
    if(!validSavedReceipt(record.value)){localRecords.remove('receipt');refreshSavedState('保存的小计划暂时无法读取，请联系慕言核实。');return;}
    receipt=record.value;openContacts(false);
  });
  $('clearSaved').addEventListener('click',()=>{
    if(sending||restoringDraft)return;clearTimeout(draftSaveTimer);draftDirty=false;localRecords.remove('draft');localRecords.remove('receipt');
    refreshSavedState('本机保存记录已清除，当前页面的填写内容仍保留。');
  });
  window.addEventListener('pagehide',()=>saveDraftNow());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)saveDraftNow();else refreshSavedState();});

  function referencePrice(){
    const kind=service();
    if(kind==='snow'){
      const value=Number(parties.snow==='double'?catalog?.snow.double_per_person:catalog?.snow.single_per_person);
      if(!Number.isFinite(value)||value<=0)return '待沟通确认';
      return parties.snow==='double'?(value*2)+' 元／两人（'+value+' 元／人）':value+' 元／人';
    }
    if(kind!=='portrait')return '';
    // Match the public main-site base prices. No deposits or balances are shown here.
    const base={single:329,double:429}[parties.portrait];if(!base)return '按人数与需求沟通报价';
    let total=base,starting=false,discuss=false;
    $('portraitAddons').querySelectorAll('input:checked').forEach(input=>{
      const item=catalog?.portrait_addons.find(item=>item.id===input.value);if(!item)return;
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
