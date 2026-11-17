(() => {
  'use strict';
  const $=id=>document.getElementById(id),base=String(window.MUYAN_BOOKING?.apiBase||'').replace(/\/+$/,''),ngrok=/\.ngrok-free\.(dev|app)$/.test(new URL(base||location.href).hostname);
  let serverOffset=0,historyTimer=0,supported=false,today='',lookupBusy=false,authorized=[],authToken='',expiresAt=0,expiryTimer=0,booking=null,editRequest='',editSignature='',withdrawRequest='',withdrawSignature='',generation=0,editingBusy=false;
  let expandedSupported=false,requestEditor=null,legacyTimeRanges=[],authEpoch=0;
  let planViews=new WeakMap(),selectedVisitId='';
  function message(id,text,error=false){$(id).textContent=text;$(id).classList.toggle('error',error);}
  function planCard(root,fields,subtitle,foot,heading='这次的小计划',context={}){
    const verification_code=window.MuyanPlanImage.codeOf(context)||authorized.find(item=>item.booking.id===context.id)?.verifiedCode||'';
    window.MuyanPlanImage.card(root,{...context,fields,verification_code},{heading,subtitle,foot});
  }
  function renderPlanCard(root,value){
    const booking=value;
    const items=booking.visits||[],event=booking.service==='event',snow=booking.service==='snow',effects=booking.service==='effects',parties={single:'单人',double:'双人',multiple:'多人'};
    const join=fn=>items.map(value=>(event?value.session+'：':'')+fn(value)).join('\n');
    const fallback=[{label:'拍摄类型',value:(booking.service_label||'拍摄意向')+(event?' · '+items.length+' 天':items[0]?.party_type?' · '+(parties[items[0].party_type]||''):'' )},{label:'CN / 昵称',value:booking.nickname},{label:'角色',value:join(value=>value.character)}];
    if(event)fallback.push({label:'参加漫展',value:[...new Set(items.map(value=>value.title).filter(Boolean))].join('；')},{label:'场照套餐',value:join(value=>value.package_label||'以原预约为准')});
    if(!effects)fallback.push({label:'期望时间',value:join(value=>[value.date,value.time_label||value.preferred_time].filter(Boolean).join(' · '))},{label:'拍摄地点',value:event?'以群聊通知为准':snow?'主城出发 · 雪景地':items[0]?.location||'一起选个喜欢的地方'});
    if(!event&&!effects&&!(booking._dailyProjection&&booking._sourceVisitCount>1&&!Number.isFinite(booking.reference_total)))fallback.splice(1,0,{label:'参考总价',value:Number.isFinite(booking.reference_total)?booking.reference_total+' 元'+(snow&&items[0]?.party_type==='double'?'／两人':''):booking.reference_price_label||'以原预约及沟通为准'});
    const fields=Array.isArray(booking.plan?.fields)&&booking.plan.fields.length?booking.plan.fields.filter(value=>value&&typeof value.label==='string'&&typeof value.value==='string'):fallback;
    if(!event&&!effects&&!(booking._dailyProjection&&booking._sourceVisitCount>1)&&Number.isFinite(booking.reference_total)&&!fields.some(field=>/参考(?:总价|费用)|原报价/.test(field.label))){
      fields.splice(1,0,{label:'参考总价',value:booking.reference_total+' 元'+(snow&&items[0]?.party_type==='double'?'／两人':'')});
    }
    if(items.some(visit=>visit.party_type!=='single'&&Number(visit.people)!==1&&Array.isArray(visit.participants)&&visit.participants.length>1)&&!fields.some(field=>/出镜者|参与者|参与单主|人员名单|CN.*角色/.test(field.label))){
      fields.push({label:'每位出镜者 CN / 角色',value:items.map(visit=>(visit.session||visit.date||'本次拍摄')+'\n'+(visit.participants||[]).map((person,index)=>(index+1)+'. '+person.cn+' / '+person.character).join('\n')).join('\n\n')});
    }
    if(items.some(visit=>Array.isArray(visit.location_plan)&&visit.location_plan.length)&&!fields.some(field=>/地点.*顺序|地点.*安排|场景.*顺序/.test(field.label))){
      fields.push({label:'地点 / 场景顺序',value:items.map(visit=>(visit.session||visit.date||'本次拍摄')+'\n'+(visit.location_plan||[]).map((place,index)=>(index+1)+'. '+place).join('\n')).join('\n\n')});
    }
    const pending=booking._displayPending===true;
    planCard(root,fields,pending?'慕言确认后才生效':'已验证 · '+(booking.intent_number||'我的预约'),pending?booking.plan?.foot||'这次申请尚待确认，原安排继续保留。':cancelled(booking)?'这份预约已取消，原计划保留供核对。':booking.plan?.foot||(historical(booking)?'历史约单仅供查看，不能申请修改。':pendingChange(booking)?'慕言确认调整前，原计划继续有效。':'以下为已填写的安排；如需调整，请在下方修改并提交确认。'),pending?booking._removedDisplay?'取消这次安排':'申请的新计划':pendingChange(booking)?historical(booking)?'原计划 · 历史记录':'原计划 · 当前有效':'这次的小计划',booking);
    const visit=booking.visits?.[0];root.dataset.groupId=booking.id||'';root.dataset.visitId=visit?.id||visit?.client_id||'';planViews.set(root,booking);
    root.classList.toggle('is-selected-plan',Boolean(selectedVisitId&&root.dataset.visitId===selectedVisitId));

  }
  function displayViews(value){
    const result=window.MuyanDailyPlans.split(value);
    result.items.forEach(view=>{const visit=view.visits?.[0];if(visit)view.is_history=visit.is_history===true;});
    return result;
  }
  function sharedPlanNotes(fields){
    if(!fields?.length)return null;const box=document.createElement('details'),heading=document.createElement('summary'),list=document.createElement('dl');box.className='manage-shared-details';heading.textContent='本份预约的共同说明';
    fields.forEach(field=>{const row=document.createElement('div'),label=document.createElement('dt'),value=document.createElement('dd');label.textContent=field.label;value.textContent=field.value;row.append(label,value);list.append(row);});box.append(heading,list);return box;
  }
  function fullPlan(root=$('verifiedPlan'),value=booking,extraViews=[]){
    const result=displayViews(value),views=value.visits?.length===0&&extraViews.length?extraViews:[...result.items,...extraViews];
    root.replaceChildren();root.classList.toggle('manage-plan-stack',views.length>1);root.classList.toggle('summary-card',views.length===1);root.classList.remove('plan-card');
    if(views.length===1){renderPlanCard(root,views[0]);historyTag(root,views[0]);}
    else views.forEach(view=>{const card=document.createElement('article');card.className='summary-card manage-plan-card'+(view._displayPending?' pending-plan':'');renderPlanCard(card,view);historyTag(card,view);root.append(card);});
    if(views.length>1){const common=sharedPlanNotes(result.sharedFields);if(common)root.append(common);}
  }
  function resultEntries(){return authorized.flatMap(item=>displayViews(item.booking).items.map(view=>({item,view})));}
  async function api(path,options={}){
    const epoch=authEpoch,bearer=options.headers?.Authorization;
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch(base+path,{...options,credentials:'omit',cache:'no-store',signal:controller.signal,headers:{...(ngrok?{'ngrok-skip-browser-warning':'1'}:{}),...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});
      const value=await response.json().catch(()=>null);if(!response.ok||!value?.ok){const error=Error(value?.error||'暂时无法完成请求，请稍后重试或联系慕言。');error.status=response.status;error.code=value?.code;error.retryAfter=response.headers.get('Retry-After');if(error.status===401&&bearer&&epoch===authEpoch)logout('验证已失效，请重新填写 CN、联系方式和验证码。');throw error;}return value;
    }catch(error){if(error.name==='AbortError'||error instanceof TypeError)throw Error('连接暂时中断，请保留页面后重试。');throw error;}finally{clearTimeout(timer);}
  }
  function validate(form){
    let first=null;form.querySelectorAll('input,select,textarea').forEach(input=>{const invalid=!input.disabled&&input.willValidate&&(!input.checkValidity()||input.required&&!input.value.trim());input.classList.toggle('field-invalid',invalid);if(invalid){input.setAttribute('aria-invalid','true');first=first||input;}else input.removeAttribute('aria-invalid');});
    if(first){if(form.id==='editForm')$('editFold').open=true;const target=window.MuyanPickers?.buttonFor(first)||first;target.scrollIntoView({block:'center'});target.focus();return false;}return true;
  }
  function logout(note='已退出查看与修改，请重新输入验证码查询。'){
    requestEditor?.destroy();requestEditor=null;
    legacyTimeRanges.forEach(range=>range.destroy());legacyTimeRanges=[];
    $('editFold').open=false;$('editFold').hidden=true;
    authEpoch++;generation++;planViews=new WeakMap();selectedVisitId='';clearTimeout(expiryTimer);clearTimeout(historyTimer);authToken='';expiresAt=0;booking=null;editRequest='';editSignature='';withdrawRequest='';withdrawSignature='';$('editVisits').replaceChildren();$('verifiedPlan').replaceChildren();$('editSection').hidden=true;$('editBookingSummary').textContent='';$('editConsent').checked=false;message('editMessage','');$('lookupVerificationCode').value='';authorized=[];$('lookupResults').replaceChildren();$('resultGroupsSummary').hidden=true;$('pendingPlan').replaceChildren();$('pendingPlan').hidden=true;message('lookupMessage',note);
  }
  function contactType(){const qq=$('lookupContactType').value==='qq';$('lookupContactLabel').textContent=qq?'QQ 号码':'微信号';$('lookupContact').inputMode=qq?'numeric':'text';if(qq)$('lookupContact').pattern='[1-9][0-9]{4,14}';else $('lookupContact').removeAttribute('pattern');}
  $('lookupContactType').addEventListener('change',contactType);contactType();
  document.addEventListener('input',event=>{if(event.target.matches('input,select,textarea')&&event.target.validity.valid){event.target.classList.remove('field-invalid');event.target.removeAttribute('aria-invalid');}});
  const now=()=>Date.now()+serverOffset;
  function setServerTime(value){const time=typeof value==='string'?Date.parse(value):NaN;if(Number.isFinite(time))serverOffset=time-Date.now();}
  function visitDeadline(visit){
    for(const key of ['edit_deadline','starts_at','confirmed_start','start']){const raw=visit[key];if(typeof raw==='string'&&raw.includes('T')){const value=Date.parse(/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)?raw:raw+'+08:00');if(Number.isFinite(value))return value;}}
    if(!/^\d{4}-\d{2}-\d{2}$/.test(visit.date||''))return Infinity;
    const time=String(visit.time_label||'').match(/^\s*(\d{2}:\d{2})/);
    return time?Date.parse(visit.date+'T'+time[1]+':00+08:00'):Date.parse(visit.date+'T00:00:00+08:00')+86400000;
  }
  const pastVisit=visit=>visit.is_history===true||visitDeadline(visit)<=now();
  const cancelled=value=>value?.status==='cancelled'||value?.is_cancelled===true;
  const historical=value=>cancelled(value)||value.is_history===true||Boolean(value.visits?.length&&value.visits.every(pastVisit));
  const editableVisit=visit=>!pastVisit(visit)&&(visit.can_edit_role!==false||visit.can_edit_time!==false);
  const pendingChange=value=>Boolean(value?.pending_plan||value?.pending_change?.status==='pending');
  const editableBooking=value=>Boolean(value&&!historical(value)&&!pendingChange(value)&&value.can_edit!==false&&value.visits?.some(editableVisit));
  function historyTag(root,value){
    if(root.classList.contains('manage-plan-stack')){root.querySelectorAll(':scope>.plan-card').forEach(card=>historyTag(card,planViews.get(card)||value));return;}
    value=planViews.get(root)||value;
    const slot=root.querySelector('.plan-status');
    if(slot&&value?._displayPending){slot.hidden=false;slot.textContent=value._removedDisplay?'取消待确认':'申请待确认';slot.classList.add('is-pending');return;}

    if(slot){slot.hidden=false;slot.textContent=cancelled(value)?'已取消':historical(value)?'历史记录':pendingChange(value)?'修改待确认':value.visits?.some(pastVisit)?'含历史场次':'当前预约';slot.classList.toggle('is-history',historical(value));return;}
    const badge=document.createElement('p');badge.className='booking-period-tag'+(historical(value)?' is-history':'');
    badge.textContent=cancelled(value)?'已取消 · 仅供查看':historical(value)?'历史约单 · 仅供查看':pendingChange(value)?'当前预约 · 修改待确认':value.visits?.some(pastVisit)?'当前预约 · 含历史场次':'当前预约';root.prepend(badge);
  }
  function renderResults(){
    const root=$('lookupResults');root.replaceChildren();const entries=resultEntries(),old=entries.filter(entry=>historical(entry.view)),current=entries.filter(entry=>!historical(entry.view));
    $('resultGroupsSummary').hidden=!entries.length;$('resultGroupsSummary').textContent='当前安排 '+current.length+' 次 · 历史／已取消 '+old.length+' 次';
    if(entries.length<=1)return;
    for(const [label,items] of [['当前预约',current],['历史／已取消',old]]){
      if(!items.length)continue;const section=document.createElement('section'),heading=document.createElement('h3'),list=document.createElement('div');heading.className='manage-group-title';heading.textContent=label+'（'+items.length+'）';list.className='manage-results';
      items.forEach(({item,view})=>{const card=document.createElement('article'),button=document.createElement('button');card.className='summary-card manage-plan-card';renderPlanCard(card,view);historyTag(card,view);button.type='button';button.className='primary';button.textContent=historical(view)?'查看这次历史安排':pendingChange(item.booking)?'查看这次修改申请':'查看／修改这次安排';button.addEventListener('click',()=>activateItem(item,view.visits?.[0]?.id||view.visits?.[0]?.client_id||'').catch(error=>message('lookupMessage',error.message,true)));card.append(button);list.append(card);});
      section.append(heading,list);root.append(section);
    }
  }
  function historicalVisitCard(card,visit){
    card.replaceChildren();card.dataset.editable='false';card.classList.add('is-history');const title=document.createElement('h3'),copy=document.createElement('p'),note=document.createElement('p');
    title.textContent=(visit.session?visit.session+' · ':'')+(visit.date||'历史安排');copy.className='manage-notice';copy.textContent='角色：'+(visit.character||'—')+'\n时间：'+(visit.time_label||visit.preferred_time||visit.date||'以原预约为准');note.className='history-visit-note';note.textContent='已过预约时间，仅供查看，不可修改。';card.append(title,copy,note);
  }
  function applyEditAvailability(){
    if(!booking){$('editFold').hidden=true;$('editFold').open=false;$('editForm').hidden=true;$('editTitle').hidden=true;$('saveChanges').disabled=true;return;}
    $('planIntro').textContent=cancelled(booking)?'这份预约已取消，原计划保留供核对，不能继续修改。':historical(booking)?'这是已经过预约时间的历史记录，可以查看原计划，不能修改。':pendingChange(booking)?'原计划与申请的新计划分别列在下方。调整须慕言确认后才生效，也可以撤回本次申请。':expandedSupported?booking.service==='effects'?'所属作品 / IP、角色、效果需求和备注都可以在下方申请调整，慕言确认后才生效。':'请核对当前小计划。套餐、人数、风格等信息及增减拍摄日，都可以在下方申请调整，慕言确认后才生效。':'请核对当前小计划。改期需要慕言确认后才生效。';
    const canEdit=editableBooking(booking);$('editFold').hidden=!canEdit;if(!canEdit)$('editFold').open=false;$('editForm').hidden=!canEdit;$('editTitle').hidden=!canEdit;$('saveChanges').disabled=editingBusy||!canEdit;
    $('historyNotice').hidden=canEdit;$('historyNotice').textContent=cancelled(booking)?'取消已生效，此记录仅供查看。如需重新安排，请联系慕言。':historical(booking)?'这是一份历史约单，已过预约时间。原计划仍可查看，不能申请修改。':pendingChange(booking)?'修改申请待慕言确认，原计划继续有效。可撤回申请，或刷新确认状态；请勿重复提交。':'这份安排暂不支持在线修改，请联系慕言核对。';
    $('saveChanges').textContent=expandedSupported?'提交修改申请':'确认修改';
  }
  function refreshHistoryState(){
    renderResults();if(booking){
      requestEditor?.refreshHistory();
      if(!requestEditor)Array.from($('editVisits').children).forEach(card=>{const visit=booking.visits.find(item=>item.id===card.dataset.id);if(visit&&pastVisit(visit)&&card.dataset.editable!=='false')historicalVisitCard(card,visit);});
      applyEditAvailability();fullPlan();historyTag($('verifiedPlan'),booking);
    }
    clearTimeout(historyTimer);const deadlines=authorized.flatMap(item=>(item.booking.visits||[]).map(visitDeadline)).filter(value=>Number.isFinite(value)&&value>now());
    if(deadlines.length){const delta=Math.min(...deadlines)-now()+30;if(delta<15*60*1000)historyTimer=setTimeout(refreshHistoryState,Math.max(30,delta));}
  }
  function showPendingPlan(){
    const plan=booking?.pending_plan,fields=Array.isArray(plan?.fields)?plan.fields:[];$('pendingPlan').hidden=!fields.length;$('pendingPlan').replaceChildren();
    if(fields.length){
      const proposed=Array.isArray(booking.pending_visits)?booking.pending_visits:booking.visits||[],pending={...booking,plan,visits:proposed,_displayPending:true};
      const removed=Array.isArray(booking.pending_visits)?displayViews(booking).items.filter(view=>view.visits?.[0]?.id&&!proposed.some(visit=>visit.id===view.visits[0].id)).map(view=>({...view,_displayPending:true,_removedDisplay:true,plan:{...view.plan,fields:[{label:'申请操作',value:'取消这次安排'},...(view.plan?.fields||[])],foot:'取消申请待慕言确认，原安排暂时继续保留。'}})):[];
      if(removed.length){
        const ownDay=field=>!['申请移除安排','申请移除的拍摄日'].includes(String(field?.label||'').trim());
        pending.plan={...plan,fields:fields.filter(ownDay)};
        if(Array.isArray(plan.sourceFields))pending.plan.sourceFields=plan.sourceFields.filter(ownDay);
      }
      fullPlan($('pendingPlan'),pending,removed);
    }
    $('withdrawChange').textContent='撤回本次修改申请';$('withdrawChange').hidden=!pendingChange(booking);$('withdrawChange').disabled=editingBusy||!booking?.pending_change?.id;
    $('refreshPlan').hidden=false;$('refreshPlan').textContent=pendingChange(booking)?'刷新确认状态':'刷新最新计划';
  }
  async function refreshSavedPlan(data={}){
    const epoch=authEpoch,token=authToken,id=booking?.id;if(!id||!authToken)return;
    if(!data.booking)data=await api('/api/public/customer/bookings/'+encodeURIComponent(id),{headers:{Authorization:'Bearer '+authToken}});
    if(!data.booking||data.booking.id!==id||!Array.isArray(data.booking.visits))throw Error('最新计划暂未加载，当前仍显示原计划，请勿重复提交。');
    if(epoch!==authEpoch||!booking||booking.id!==id||authToken!==token)return;setServerTime(data.server_now);
    booking={...data.booking,...(data.pending_plan?{pending_plan:data.pending_plan}:{})};const item=authorized.find(item=>item.booking.id===id);if(item)item.booking=booking;
    editRequest='';editSignature='';renderResults();await renderBooking();refreshHistoryState();
  }

  function scheduleExpiry(){
    clearTimeout(expiryTimer);if(!authorized.length)return;
    expiryTimer=setTimeout(()=>logout('验证已过期，请重新填写 CN、联系方式和验证码。'),Math.max(1,Math.min(...authorized.map(item=>item.localExpiresAt))-Date.now()));
  }
  async function activateItem(item,visitId=''){
    if(editingBusy)return;if(Date.now()>=item.localExpiresAt){logout('验证已过期，请重新查询。');return;}
    selectedVisitId=visitId;authToken=item.access_token;expiresAt=item.localExpiresAt;booking=item.booking;editRequest='';editSignature='';
    const current=booking;await renderBooking();if(booking!==current||!authToken)return;
    $('editSection').hidden=false;scheduleExpiry();refreshHistoryState();message('editMessage',historical(booking)?'历史计划已展示，仅供查看。':pendingChange(booking)?'改期申请待慕言确认，以下展示当前计划和本次申请。':'已验证，可在下方核对计划与调整安排。');
    const plans=[$('verifiedPlan'),...$('verifiedPlan').querySelectorAll('.plan-card')],target=plans.find(card=>selectedVisitId&&card.dataset.visitId===selectedVisitId)||$('editSection');
    $('editVisits').querySelectorAll('[data-id]').forEach(card=>card.classList.toggle('is-selected-day',Boolean(selectedVisitId&&card.dataset.id===selectedVisitId)));
    target.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }
  $('lookupForm').addEventListener('submit',async event=>{
    event.preventDefault();if(lookupBusy||editingBusy)return;
    if(!validate($('lookupForm'))){message('lookupMessage','请填写 CN、有效的联系方式和四位数字验证码。',true);return;}
    if(!supported){message('lookupMessage','自助查询与修改暂未开放，请联系慕言核对原预约。',true);return;}
    const body={nickname:$('lookupCN').value.trim(),contact_type:$('lookupContactType').value,contact:$('lookupContact').value.trim(),verification_code:$('lookupVerificationCode').value};
    logout('');const lookupEpoch=authEpoch;lookupBusy=true;$('lookupSubmit').disabled=true;message('lookupMessage','正在验证并查询你的安排…');
    try{
      const data=await api('/api/public/customer/lookup',{method:'POST',body:JSON.stringify(body)});
      if(lookupEpoch!==authEpoch)return;
      setServerTime(data.server_now);const items=Array.isArray(data.items)?data.items:[];
      if(!items.length||items.some(item=>typeof item.access_token!=='string'||!item.access_token||!item.booking||typeof item.booking.id!=='string'))throw Error('未能验证预约信息，请核对 CN、联系方式和验证码后重试。');
      const now=Date.now();authorized=items.slice(0,50).map(item=>({...item,verifiedCode:body.verification_code,localExpiresAt:now+Math.min(Math.max(Number(item.expires_in)||900,1),900)*1000}));
      const count=resultEntries().length;scheduleExpiry();message('lookupMessage','验证通过，已找到 '+count+' 次独立安排。'+(count>1?'请选择需要查看或修改的一次。':''));
      renderResults();if(count===1)await activateItem(authorized[0],authorized[0].booking.visits?.[0]?.id||'');
    }catch(error){logout('');message('lookupMessage',error.message,true);$('lookupVerificationCode').focus();}
    finally{body.verification_code='';$('lookupVerificationCode').value='';lookupBusy=false;$('lookupSubmit').disabled=false;}
  });

  async function renderBooking(){
    $('editFold').open=false;
    requestEditor?.destroy();requestEditor=null;
    legacyTimeRanges.forEach(range=>range.destroy());legacyTimeRanges=[];
    const current=++generation;const root=$('editVisits');root.replaceChildren();$('editConsent').checked=false;fullPlan();historyTag($('verifiedPlan'),booking);showPendingPlan();
    $('editBookingSummary').textContent=(booking.intent_number||'我的预约')+'\n'+(booking.nickname||'')+' · '+(booking.service_label||'拍摄意向');
    const entries=Array.isArray(booking.visits)?booking.visits:[];
    if(!entries.length){
      if(cancelled(booking)||booking.is_history===true){applyEditAvailability();return;}
      throw Error('当前预约暂无可在线修改的拍摄信息，请联系慕言。');
    }
    const note=booking.service==='event'?'cz':booking.service==='effects'?'general':booking.service==='portrait'&&entries.some(visit=>visit.party_type==='multiple')?'group':'zp';$('editForm').querySelector('.notes-link').href='./?service='+encodeURIComponent(booking.service)+'&notes='+note+'#notes';
    if(expandedSupported&&editableBooking(booking)){
      requestEditor=window.MuyanBookingEdit.create({root,booking,api,today,pastVisit,onChange:()=>{$('editConsent').checked=false;}});
      const editor=requestEditor;await editor.ready;if(current!==generation||requestEditor!==editor)return;
      applyEditAvailability();window.MuyanPickers?.refresh();return;
    }
    await Promise.all(entries.map(async (visit,index)=>{
      const card=document.createElement('section');card.className='manage-edit-day';card.dataset.id=visit.id;card.dataset.event=visit.event_id||'';card.dataset.editable=String(editableVisit(visit));
      if(pastVisit(visit)){historicalVisitCard(card,visit);root.append(card);return;}
      const heading=document.createElement('h3');heading.textContent=(visit.session?visit.session+' · ':'')+(visit.date||'后期制作');card.append(heading);
      const roleLabel=document.createElement('label');roleLabel.textContent='角色 *';const role=document.createElement('input');role.id='editRole'+index;role.required=true;role.maxLength=100;role.value=visit.character||'';role.className='edit-role';roleLabel.append(role);card.append(roleLabel);
      if(visit.event_id){
        const label=document.createElement('label');label.textContent='拍摄时段 *';const select=document.createElement('select');select.id='editTime'+index;select.required=true;select.className='edit-slot';select.dataset.showUnavailable='true';label.append(select);card.append(label);
        const placeholder=new Option('正在读取本日时段…','');select.append(placeholder);select.disabled=true;
        try{
          const data=await api('/api/public/event-schedules/'+encodeURIComponent(visit.event_id));if(current!==generation)return;
          select.replaceChildren();data.schedule.slots.forEach(slot=>{
            const own=slot.id===visit.event_slot_id,status=own?'current':slot.can_book?'available':slot.status==='occupied'?'occupied':'unavailable';
            const state={current:'当前预约 · 可保留',available:'可预约',occupied:'已占用',unavailable:'暂不可选'}[status];
            const option=new Option(slot.start.slice(11,16)+'–'+slot.end.slice(11,16)+' · '+state,slot.id);option.disabled=!own&&!slot.can_book;option.dataset.slotStatus=status;option.dataset.statusLabel=state;select.append(option);
          });
          if(!Array.from(select.options).some(option=>option.value===visit.event_slot_id)){select.append(new Option((visit.time_label||'原时段')+' · 当前时段',visit.event_slot_id));}
          select.value=visit.event_slot_id;select.disabled=visit.can_edit_time===false;
        }catch{
          select.replaceChildren(new Option((visit.time_label||'原时段')+' · 请联系慕言改期',visit.event_slot_id));select.value=visit.event_slot_id;select.disabled=true;
        }
        const info=document.createElement('p');info.className='manage-notice';info.textContent='套餐：'+(visit.package_label||'以原预约为准')+'。同一天只能保留一个时段。';card.append(info);
      }else if(booking.service!=='effects'){
        const dateLabel=document.createElement('label');dateLabel.textContent='期望日期 *';const date=document.createElement('input');date.type='date';date.id='editDate'+index;date.required=true;date.min=today;date.value=visit.date||'';date.className='edit-date';date.disabled=visit.can_edit_time===false;dateLabel.append(date);card.append(dateLabel);
        if(booking.service==='portrait'){
          const host=document.createElement('div'),time=document.createElement('input');time.type='hidden';time.className='edit-period';time.value=visit.preferred_time||'';card.append(host,time);
          const range=window.MuyanBookingDetails.timeRange(host,{idPrefix:'editRange'+index,value:time.value,required:true,disabled:visit.can_edit_time===false,onChange:()=>{time.value=range.value();$('editConsent').checked=false;}});
          legacyTimeRanges.push(range);
        }
      }
      role.disabled=visit.can_edit_role===false;root.append(card);
    }));
    if(current!==generation)return;
    Array.from(root.children).sort((a,b)=>entries.findIndex(item=>item.id===a.dataset.id)-entries.findIndex(item=>item.id===b.dataset.id)).forEach(card=>root.append(card));
    if(!expandedSupported&&!historical(booking)&&!pendingChange(booking)){
      const more=document.createElement('p'),link=document.createElement('a');more.className='manage-notice';more.textContent='需要调整套餐、人数、风格、地点、同行信息、备注或预约天数？';link.className='booking-manage-link';link.href='./?assist=contact#contact';link.textContent='联系慕言申请调整其他信息 ↗';more.append(link);root.append(more);
    }
    applyEditAvailability();window.MuyanPickers?.refresh();
  }
  $('editForm').addEventListener('submit',async event=>{
    event.preventDefault();if(editingBusy)return;if(!authToken||Date.now()>=expiresAt){logout('验证已过期，请重新验证。');return;}
    refreshHistoryState();if(!editableBooking(booking)){message('editMessage',historical(booking)?'已过预约时间的历史约单不可修改。':'当前安排不可修改，请查看待确认申请或联系慕言。',true);return;}
    if(!validate($('editForm'))){message('editMessage','请补全红框内的信息，并勾选确认。',true);return;}
    let changes;
    try{
      changes=requestEditor?requestEditor.serialize():{visits:Array.from($('editVisits').children).filter(card=>card.dataset.editable==='true').map(card=>({id:card.dataset.id,character:card.querySelector('.edit-role').value,...(card.dataset.event?{event_id:card.dataset.event,event_slot_id:card.querySelector('.edit-slot').value}:card.querySelector('.edit-date')?{preferred_date:card.querySelector('.edit-date').value,...(card.querySelector('.edit-period')?{preferred_time:card.querySelector('.edit-period').value}:{})}:{})}))};
    }catch(error){message('editMessage',error.message,true);return;}
    const body={version:booking.version,consent:true,...changes};const next=JSON.stringify(body);if(next!==editSignature){editRequest=crypto.randomUUID();editSignature=next;}body.request_id=editRequest;
    if(new TextEncoder().encode(JSON.stringify(body)).length>16000){message('editMessage','修改内容较多，请缩短备注后再提交。',true);return;}
    const controls=Array.from($('editForm').querySelectorAll('input,select,textarea,button'),input=>[input,input.disabled]);
    editingBusy=true;$('saveChanges').disabled=true;$('logoutEdit').disabled=true;controls.forEach(([input])=>input.disabled=true);message('editMessage','正在保存调整…');
    try{
      const data=await api('/api/public/customer/bookings/'+encodeURIComponent(booking.id)+'/changes',{method:'POST',headers:{Authorization:'Bearer '+authToken},body:JSON.stringify(body)});
      try{
        await refreshSavedPlan(data);if(!authToken||!booking)return;message('editMessage',pendingChange(booking)?'改期申请已提交，等待慕言确认；当前安排保持不变，请核对申请内容。':data.message||'修改已保存，以下为最新计划，请核对。');
        $('verifiedPlan').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
      }catch(error){message('editMessage','修改请求已收到，但最新计划暂未加载。当前仍显示原计划，请勿重复提交，可点击刷新计划核对。',true);$('refreshPlan').hidden=false;}

    }catch(error){
      if(error.status===403&&error.code==='history_read_only'){try{await refreshSavedPlan();}catch{}refreshHistoryState();message('editMessage','已过预约时间，此计划仅供查看。',true);}
      else if(error.status===401||error.status===403)logout('验证已失效，请重新查询并验证。');
      else if(error.status===409&&error.code==='pending_confirmation'){try{await refreshSavedPlan();}catch{}message('editMessage','已有申请待确认，请核对当前计划，可先撤回再修改。',true);}
      else if(error.status===409)message('editMessage','档期或预约状态已更新，本次填写仍保留。请检查占用情况，必要时刷新最新计划后重新申请。',true);
      else message('editMessage',error.message+' 修改内容已保留，可重试同一份调整。',true);
    }finally{controls.forEach(([input,disabled])=>{if(input.isConnected)input.disabled=disabled;});editingBusy=false;$('saveChanges').disabled=!editableBooking(booking);$('withdrawChange').disabled=!booking?.pending_change?.id;$('logoutEdit').disabled=false;}
  });
  $('refreshPlan').addEventListener('click',async()=>{if(editingBusy||!authToken)return;try{await refreshSavedPlan();message('editMessage','最新计划已加载，请核对。');}catch(error){message('editMessage',error.message,true);}});
  $('withdrawChange').addEventListener('click',async()=>{
    if(editingBusy||!authToken||!booking?.pending_change?.id)return;
    if(Date.now()>=expiresAt){logout('验证已过期，请重新查询。');return;}
    const id=booking.id,change=booking.pending_change.id,signature=id+'|'+change+'|'+booking.version;
    if(signature!==withdrawSignature){withdrawSignature=signature;withdrawRequest=crypto.randomUUID();}
    editingBusy=true;$('withdrawChange').disabled=true;$('logoutEdit').disabled=true;$('refreshPlan').disabled=true;message('editMessage','正在撤回本次改期申请…');
    try{
      const data=await api('/api/public/customer/bookings/'+encodeURIComponent(id)+'/changes/'+encodeURIComponent(change)+'/withdraw',{method:'POST',headers:{Authorization:'Bearer '+authToken},body:JSON.stringify({version:booking.version,request_id:withdrawRequest})});
      await refreshSavedPlan(data);if(!authToken||!booking)return;message('editMessage','改期申请已撤回，原档期保持不变。');$('editSection').scrollIntoView({block:'start'});
    }catch(error){
      if(error.status===401||error.status===403)logout('验证已失效，请重新查询。');
      else if(error.status===409){try{await refreshSavedPlan();}catch{}message('editMessage','申请状态已更新，可能已被确认或处理，请核对当前计划。',true);}
      else message('editMessage',error.message+' 请核对状态后重试撤回。',true);
    }finally{editingBusy=false;$('withdrawChange').disabled=!booking?.pending_change?.id;$('logoutEdit').disabled=false;$('refreshPlan').disabled=false;applyEditAvailability();}
  });
  $('logoutEdit').addEventListener('click',()=>{if(!editingBusy)logout();});
  window.addEventListener('pagehide',()=>logout('离开页面后已退出修改，请重新验证。'));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&authToken){if(Date.now()>=expiresAt)logout('验证已过期，请重新验证。');else{refreshHistoryState();if(pendingChange(booking)&&!editingBusy)refreshSavedPlan().catch(()=>{});}}});
  api('/api/public/options').then(data=>{
    setServerTime(data.server_now);today=data.today||'';
    supported=Boolean(data.customer_features?.customer_manage_v1&&data.customer_features?.customer_lookup_code_v1);
    expandedSupported=data.customer_features?.customer_change_request_v2===true&&data.customer_features?.booking_details_v2===true&&Boolean(window.MuyanBookingEdit&&window.MuyanBookingDetails);
    if(expandedSupported)$('lookupSection').querySelector('.manage-intro').textContent='输入填写预约时的 CN、联系方式和四位验证码，查看小计划，并申请调整时间、角色、套餐、人数及其他拍摄安排。';
    $('lookupSubmit').disabled=!supported;$('lookupForm').hidden=!supported;
    if(!supported){$('lookupSection').querySelector('.manage-intro').textContent='自助查询与修改暂未开放。如需核对角色、档期或改期安排，请先联系慕言确认。';$('lookupSection').querySelector('.manage-notice').hidden=true;message('lookupMessage','已有的预约登记仍可正常使用。');}
  }).catch(error=>message('lookupMessage',error.message,true));
})();
