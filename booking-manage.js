(() => {
  'use strict';
  const $=id=>document.getElementById(id),base=String(window.MUYAN_BOOKING?.apiBase||'').replace(/\/+$/,''),ngrok=/\.ngrok-free\.(dev|app)$/.test(new URL(base||location.href).hostname);
  let serverOffset=0,historyTimer=0,supported=false,today='',lookupBusy=false,authorized=[],authToken='',expiresAt=0,expiryTimer=0,booking=null,editRequest='',editSignature='',withdrawRequest='',withdrawSignature='',generation=0,editingBusy=false;
  function message(id,text,error=false){$(id).textContent=text;$(id).classList.toggle('error',error);}
  function planCard(root,fields,subtitle,foot,heading='这次的小计划'){
    root.replaceChildren();const head=document.createElement('div'),spark=document.createElement('span'),copy=document.createElement('div'),title=document.createElement('h2'),intro=document.createElement('p'),list=document.createElement('dl'),note=document.createElement('p');
    head.className='summary-heading';spark.className='summary-spark';spark.setAttribute('aria-hidden','true');spark.textContent='✧';title.textContent=heading;intro.textContent=subtitle;copy.append(title,intro);head.append(spark,copy);
    fields.slice(0,24).forEach(field=>{const item=document.createElement('div'),label=document.createElement('dt'),value=document.createElement('dd');label.textContent=String(field.label).slice(0,80);value.textContent=String(field.value||'待沟通').slice(0,3000);item.append(label,value);list.append(item);});
    if(list.children.length%2)list.lastChild?.classList.add('summary-wide');note.className='summary-foot';note.textContent=foot;root.append(head,list,note);
  }
  function fullPlan(root=$('verifiedPlan'),value=booking){
    const booking=value;
    const items=booking.visits||[],event=booking.service==='event',snow=booking.service==='snow',effects=booking.service==='effects',parties={single:'单人',double:'双人',multiple:'多人'};
    const join=fn=>items.map(value=>(event?value.session+'：':'')+fn(value)).join('\n');
    const fallback=[{label:'拍摄类型',value:(booking.service_label||'拍摄意向')+(event?' · '+items.length+' 天':items[0]?.party_type?' · '+(parties[items[0].party_type]||''):'' )},{label:'CN / 昵称',value:booking.nickname},{label:'角色',value:join(value=>value.character)}];
    if(event)fallback.push({label:'参加漫展',value:[...new Set(items.map(value=>value.title).filter(Boolean))].join('；')},{label:'场照套餐',value:join(value=>value.package_label||'以原预约为准')});
    if(!effects)fallback.push({label:'期望时间',value:join(value=>[value.date,value.time_label||value.preferred_time].filter(Boolean).join(' · '))},{label:'拍摄地点',value:event?'以群聊通知为准':snow?'主城出发 · 雪景地':items[0]?.location||'一起选个喜欢的地方'});
    if(!event&&!effects)fallback.splice(1,0,{label:'参考总价',value:Number.isFinite(booking.reference_total)?booking.reference_total+' 元'+(snow&&items[0]?.party_type==='double'?'／两人':''):booking.reference_price_label||'以原预约及沟通为准'});
    const fields=Array.isArray(booking.plan?.fields)&&booking.plan.fields.length?booking.plan.fields.filter(value=>value&&typeof value.label==='string'&&typeof value.value==='string'):fallback;
    planCard(root,fields,'已验证 · '+(booking.intent_number||'我的预约'),booking.plan?.foot||(historical(booking)?'历史约单仅供查看，不能修改时间与角色。':pendingChange(booking)?'慕言确认改期前，原档期继续有效。':'以下为已填写的安排；如需调整，请在下方修改并提交确认。'),pendingChange(booking)?historical(booking)?'原档期 · 历史记录':'原档期 · 当前有效':'这次的小计划');
  }
  async function api(path,options={}){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch(base+path,{...options,credentials:'omit',cache:'no-store',signal:controller.signal,headers:{...(ngrok?{'ngrok-skip-browser-warning':'1'}:{}),...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});
      const value=await response.json().catch(()=>null);if(!response.ok||!value?.ok){const error=Error(value?.error||'暂时无法完成请求，请稍后重试或联系慕言。');error.status=response.status;error.code=value?.code;error.retryAfter=response.headers.get('Retry-After');throw error;}return value;
    }catch(error){if(error.name==='AbortError'||error instanceof TypeError)throw Error('连接暂时中断，请保留页面后重试。');throw error;}finally{clearTimeout(timer);}
  }
  function validate(form){
    let first=null;form.querySelectorAll('input,select,textarea').forEach(input=>{const invalid=!input.disabled&&input.willValidate&&!input.checkValidity();input.classList.toggle('field-invalid',invalid);if(invalid){input.setAttribute('aria-invalid','true');first=first||input;}else input.removeAttribute('aria-invalid');});
    if(first){const target=window.MuyanPickers?.buttonFor(first)||first;target.scrollIntoView({block:'center'});target.focus();return false;}return true;
  }
  function logout(note='已退出查看与修改，请重新输入验证码查询。'){
    generation++;clearTimeout(expiryTimer);clearTimeout(historyTimer);authToken='';expiresAt=0;booking=null;editRequest='';editSignature='';withdrawRequest='';withdrawSignature='';$('editVisits').replaceChildren();$('verifiedPlan').replaceChildren();$('editSection').hidden=true;$('lookupVerificationCode').value='';authorized=[];$('lookupResults').replaceChildren();$('resultGroupsSummary').hidden=true;$('pendingPlan').replaceChildren();$('pendingPlan').hidden=true;message('lookupMessage',note);
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
  const historical=value=>value.is_history===true||Boolean(value.visits?.length&&value.visits.every(pastVisit));
  const editableVisit=visit=>!pastVisit(visit)&&(visit.can_edit_role!==false||visit.can_edit_time!==false);
  const pendingChange=value=>Boolean(value?.pending_plan||value?.pending_change?.status==='pending');
  const editableBooking=value=>Boolean(value&&!historical(value)&&!pendingChange(value)&&value.can_edit!==false&&value.visits?.some(editableVisit));
  function historyTag(root,value){
    const badge=document.createElement('p');badge.className='booking-period-tag'+(historical(value)?' is-history':'');
    badge.textContent=historical(value)?'历史约单 · 仅供查看':pendingChange(value)?'当前预约 · 改期待确认':value.visits?.some(pastVisit)?'当前预约 · 含历史场次':'当前预约';root.prepend(badge);
  }
  function renderResults(){
    const root=$('lookupResults');root.replaceChildren();const old=authorized.filter(item=>historical(item.booking)),current=authorized.filter(item=>!historical(item.booking));
    $('resultGroupsSummary').hidden=!authorized.length;$('resultGroupsSummary').textContent='当前预约 '+current.length+' 份 · 历史约单 '+old.length+' 份';
    if(authorized.length<=1)return;
    for(const [label,items] of [['当前预约',current],['历史约单',old]]){
      if(!items.length)continue;const section=document.createElement('section'),heading=document.createElement('h3'),list=document.createElement('div');heading.className='manage-group-title';heading.textContent=label+'（'+items.length+'）';list.className='manage-results';
      items.forEach(item=>{const card=document.createElement('article'),button=document.createElement('button');card.className='summary-card manage-plan-card';fullPlan(card,item.booking);historyTag(card,item.booking);button.type='button';button.className='primary';button.textContent=historical(item.booking)?'查看历史计划':pendingChange(item.booking)?'查看改期申请':'查看／修改这份安排';button.addEventListener('click',()=>activateItem(item).catch(error=>message('lookupMessage',error.message,true)));card.append(button);list.append(card);});
      section.append(heading,list);root.append(section);
    }
  }
  function historicalVisitCard(card,visit){
    card.replaceChildren();card.dataset.editable='false';card.classList.add('is-history');const title=document.createElement('h3'),copy=document.createElement('p'),note=document.createElement('p');
    title.textContent=(visit.session?visit.session+' · ':'')+(visit.date||'历史安排');copy.className='manage-notice';copy.textContent='角色：'+(visit.character||'—')+'\n时间：'+(visit.time_label||visit.preferred_time||visit.date||'以原预约为准');note.className='history-visit-note';note.textContent='已过预约时间，仅供查看，不可修改。';card.append(title,copy,note);
  }
  function applyEditAvailability(){
    if(!booking){$('editForm').hidden=true;$('editTitle').hidden=true;$('saveChanges').disabled=true;return;}
    $('planIntro').textContent=historical(booking)?'这是已经过预约时间的历史记录，可以查看原计划，不能修改。':pendingChange(booking)?'原档期与申请的新档期分别列在下方。新档期须慕言确认后才生效，也可以撤回本次申请。':'请核对当前小计划。改期需要慕言确认后才生效。';
    const canEdit=editableBooking(booking);$('editForm').hidden=!canEdit;$('editTitle').hidden=!canEdit;$('saveChanges').disabled=editingBusy||!canEdit;
    $('historyNotice').hidden=canEdit;$('historyNotice').textContent=historical(booking)?'这是一份历史约单，已过预约时间。原计划仍可查看，时间与角色均不可修改。':pendingChange(booking)?'改期申请待慕言确认，原档期继续有效。可撤回申请，或刷新确认状态；请勿重复提交。':'这份安排暂不支持在线修改，请联系慕言核对。';
  }
  function refreshHistoryState(){
    renderResults();if(booking){
      Array.from($('editVisits').children).forEach(card=>{const visit=booking.visits.find(item=>item.id===card.dataset.id);if(visit&&pastVisit(visit)&&card.dataset.editable!=='false')historicalVisitCard(card,visit);});
      applyEditAvailability();fullPlan();historyTag($('verifiedPlan'),booking);
    }
    clearTimeout(historyTimer);const deadlines=authorized.flatMap(item=>(item.booking.visits||[]).map(visitDeadline)).filter(value=>Number.isFinite(value)&&value>now());
    if(deadlines.length){const delta=Math.min(...deadlines)-now()+30;if(delta<15*60*1000)historyTimer=setTimeout(refreshHistoryState,Math.max(30,delta));}
  }
  function showPendingPlan(){
    const plan=booking?.pending_plan,fields=Array.isArray(plan?.fields)?plan.fields:[];$('pendingPlan').hidden=!fields.length;$('pendingPlan').replaceChildren();
    if(fields.length)planCard($('pendingPlan'),fields,'慕言确认后才生效',plan.foot||'这次调整尚待确认，原档期继续保留。','申请的新档期 · 待确认');
    $('withdrawChange').hidden=!pendingChange(booking);$('withdrawChange').disabled=editingBusy||!booking?.pending_change?.id;
    $('refreshPlan').hidden=false;$('refreshPlan').textContent=pendingChange(booking)?'刷新确认状态':'刷新最新计划';
  }
  async function refreshSavedPlan(data={}){
    const id=booking?.id;if(!id||!authToken)return;
    if(!data.booking)data=await api('/api/public/customer/bookings/'+encodeURIComponent(id),{headers:{Authorization:'Bearer '+authToken}});
    if(!data.booking||data.booking.id!==id||!Array.isArray(data.booking.visits))throw Error('最新计划暂未加载，当前仍显示原计划，请勿重复提交。');
    if(!booking||booking.id!==id||!authToken)return;setServerTime(data.server_now);
    booking={...data.booking,...(data.pending_plan?{pending_plan:data.pending_plan}:{})};const item=authorized.find(item=>item.booking.id===id);if(item)item.booking=booking;
    editRequest='';editSignature='';renderResults();await renderBooking();refreshHistoryState();
  }

  function scheduleExpiry(){
    clearTimeout(expiryTimer);if(!authorized.length)return;
    expiryTimer=setTimeout(()=>logout('验证已过期，请重新填写 CN、联系方式和验证码。'),Math.max(1,Math.min(...authorized.map(item=>item.localExpiresAt))-Date.now()));
  }
  async function activateItem(item){
    if(editingBusy)return;if(Date.now()>=item.localExpiresAt){logout('验证已过期，请重新查询。');return;}
    authToken=item.access_token;expiresAt=item.localExpiresAt;booking=item.booking;editRequest='';editSignature='';
    const current=booking;await renderBooking();if(booking!==current||!authToken)return;
    $('editSection').hidden=false;scheduleExpiry();refreshHistoryState();message('editMessage',historical(booking)?'历史计划已展示，仅供查看。':pendingChange(booking)?'改期申请待慕言确认，以下展示当前计划和本次申请。':'已验证，可在下方核对计划与调整安排。');
    $('editSection').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }
  $('lookupForm').addEventListener('submit',async event=>{
    event.preventDefault();if(lookupBusy||editingBusy)return;
    if(!validate($('lookupForm'))){message('lookupMessage','请填写 CN、有效的联系方式和四位数字验证码。',true);return;}
    if(!supported){message('lookupMessage','自助查询与修改暂未开放，请联系慕言核对原预约。',true);return;}
    const body={nickname:$('lookupCN').value.trim(),contact_type:$('lookupContactType').value,contact:$('lookupContact').value.trim(),verification_code:$('lookupVerificationCode').value};
    logout('');lookupBusy=true;$('lookupSubmit').disabled=true;message('lookupMessage','正在验证并查询你的安排…');
    try{
      const data=await api('/api/public/customer/lookup',{method:'POST',body:JSON.stringify(body)});
      setServerTime(data.server_now);const items=Array.isArray(data.items)?data.items:[];
      if(!items.length||items.some(item=>typeof item.access_token!=='string'||!item.access_token||!item.booking||typeof item.booking.id!=='string'))throw Error('未能验证预约信息，请核对 CN、联系方式和验证码后重试。');
      const now=Date.now();authorized=items.slice(0,50).map(item=>({...item,localExpiresAt:now+Math.min(Math.max(Number(item.expires_in)||900,1),900)*1000}));
      scheduleExpiry();message('lookupMessage','验证通过，已找到 '+authorized.length+' 份安排。'+(authorized.length>1?'请选择需要查看或修改的一份。':''));
      renderResults();if(authorized.length===1)await activateItem(authorized[0]);
    }catch(error){logout('');message('lookupMessage',error.message,true);$('lookupVerificationCode').focus();}
    finally{body.verification_code='';$('lookupVerificationCode').value='';lookupBusy=false;$('lookupSubmit').disabled=false;}
  });

  async function renderBooking(){
    const current=++generation;const root=$('editVisits');root.replaceChildren();$('editConsent').checked=false;fullPlan();historyTag($('verifiedPlan'),booking);showPendingPlan();
    $('editBookingSummary').textContent=(booking.intent_number||'我的预约')+'\n'+(booking.nickname||'')+' · '+(booking.service_label||'拍摄意向');
    const entries=Array.isArray(booking.visits)?booking.visits:[];
    if(!entries.length)throw Error('当前预约暂无可在线修改的拍摄信息，请联系慕言。');
    await Promise.all(entries.map(async (visit,index)=>{
      const card=document.createElement('section');card.className='manage-edit-day';card.dataset.id=visit.id;card.dataset.event=visit.event_id||'';card.dataset.editable=String(editableVisit(visit));
      if(pastVisit(visit)){historicalVisitCard(card,visit);root.append(card);return;}
      const heading=document.createElement('h3');heading.textContent=(visit.session?visit.session+' · ':'')+(visit.date||'后期制作');card.append(heading);
      const roleLabel=document.createElement('label');roleLabel.textContent='角色 *';const role=document.createElement('input');role.id='editRole'+index;role.required=true;role.maxLength=100;role.value=visit.character||'';role.className='edit-role';roleLabel.append(role);card.append(roleLabel);
      if(visit.event_id){
        const label=document.createElement('label');label.textContent='拍摄时段 *';const select=document.createElement('select');select.id='editTime'+index;select.required=true;select.className='edit-slot';label.append(select);card.append(label);
        const placeholder=new Option('正在读取本日时段…','');select.append(placeholder);select.disabled=true;
        try{
          const data=await api('/api/public/event-schedules/'+encodeURIComponent(visit.event_id));if(current!==generation)return;
          select.replaceChildren();data.schedule.slots.filter(slot=>slot.can_book||slot.id===visit.event_slot_id).forEach(slot=>{select.append(new Option(slot.start.slice(11,16)+'–'+slot.end.slice(11,16)+(slot.id===visit.event_slot_id?' · 当前时段':''),slot.id));});
          if(!Array.from(select.options).some(option=>option.value===visit.event_slot_id)){select.append(new Option((visit.time_label||'原时段')+' · 当前时段',visit.event_slot_id));}
          select.value=visit.event_slot_id;select.disabled=visit.can_edit_time===false;
        }catch{
          select.replaceChildren(new Option((visit.time_label||'原时段')+' · 请联系慕言改期',visit.event_slot_id));select.value=visit.event_slot_id;select.disabled=true;
        }
        const info=document.createElement('p');info.className='manage-notice';info.textContent='套餐：'+(visit.package_label||'以原预约为准')+'。同一天只能保留一个时段。';card.append(info);
      }else if(booking.service!=='effects'){
        const dateLabel=document.createElement('label');dateLabel.textContent='期望日期 *';const date=document.createElement('input');date.type='date';date.id='editDate'+index;date.required=true;date.min=today;date.value=visit.date||'';date.className='edit-date';date.disabled=visit.can_edit_time===false;dateLabel.append(date);card.append(dateLabel);
        if(booking.service==='portrait'){const timeLabel=document.createElement('label');timeLabel.textContent='期望时间';const time=document.createElement('select');time.id='editPeriod'+index;time.className='edit-period';['待沟通','上午','下午','晚上','全天均可'].forEach(value=>time.append(new Option(value,value)));time.value=visit.preferred_time||'待沟通';time.disabled=visit.can_edit_time===false;timeLabel.append(time);card.append(timeLabel);}
      }
      role.disabled=visit.can_edit_role===false;root.append(card);
    }));
    if(current!==generation)return;
    Array.from(root.children).sort((a,b)=>entries.findIndex(item=>item.id===a.dataset.id)-entries.findIndex(item=>item.id===b.dataset.id)).forEach(card=>root.append(card));
    applyEditAvailability();window.MuyanPickers?.refresh();
  }
  $('editForm').addEventListener('submit',async event=>{
    event.preventDefault();if(editingBusy)return;if(!authToken||Date.now()>=expiresAt){logout('验证已过期，请重新验证。');return;}
    refreshHistoryState();if(!editableBooking(booking)){message('editMessage',historical(booking)?'已过预约时间的历史约单不可修改。':'当前安排不可修改，请查看待确认申请或联系慕言。',true);return;}
    if(!validate($('editForm'))){message('editMessage','请补全角色、时间，并勾选确认。',true);return;}
    const items=Array.from($('editVisits').children).filter(card=>card.dataset.editable==='true').map(card=>({id:card.dataset.id,character:card.querySelector('.edit-role').value,...(card.dataset.event?{event_id:card.dataset.event,event_slot_id:card.querySelector('.edit-slot').value}:card.querySelector('.edit-date')?{preferred_date:card.querySelector('.edit-date').value,...(card.querySelector('.edit-period')?{preferred_time:card.querySelector('.edit-period').value}:{})}:{})}));
    const body={version:booking.version,consent:true,visits:items};const next=JSON.stringify(body);if(next!==editSignature){editRequest=crypto.randomUUID();editSignature=next;}body.request_id=editRequest;
    const controls=Array.from($('editForm').querySelectorAll('input,select,.site-picker-button'),input=>[input,input.disabled]);
    editingBusy=true;$('saveChanges').disabled=true;$('logoutEdit').disabled=true;controls.forEach(([input])=>input.disabled=true);message('editMessage','正在保存调整…');
    try{
      const data=await api('/api/public/customer/bookings/'+encodeURIComponent(booking.id)+'/changes',{method:'POST',headers:{Authorization:'Bearer '+authToken},body:JSON.stringify(body)});
      try{
        await refreshSavedPlan(data);message('editMessage',pendingChange(booking)?'改期申请已提交，等待慕言确认；当前安排保持不变，请核对申请内容。':data.message||'修改已保存，以下为最新计划，请核对。');
        $('verifiedPlan').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
      }catch(error){message('editMessage','修改请求已收到，但最新计划暂未加载。当前仍显示原计划，请勿重复提交，可点击刷新计划核对。',true);$('refreshPlan').hidden=false;}

    }catch(error){
      if(error.status===403&&error.code==='history_read_only'){try{await refreshSavedPlan();}catch{}refreshHistoryState();message('editMessage','已过预约时间，此计划仅供查看。',true);}
      else if(error.status===401||error.status===403)logout('验证已失效，请重新查询并验证。');
      else if(error.status===409)logout('原时段已被占用或预约已更新。请重新查询、核对最新时段后再修改。');
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
      await refreshSavedPlan(data);message('editMessage','改期申请已撤回，原档期保持不变。');$('editSection').scrollIntoView({block:'start'});
    }catch(error){
      if(error.status===401||error.status===403)logout('验证已失效，请重新查询。');
      else if(error.status===409){try{await refreshSavedPlan();}catch{}message('editMessage','申请状态已更新，可能已被确认或处理，请核对当前计划。',true);}
      else message('editMessage',error.message+' 请核对状态后重试撤回。',true);
    }finally{editingBusy=false;$('withdrawChange').disabled=!booking?.pending_change?.id;$('logoutEdit').disabled=false;$('refreshPlan').disabled=false;applyEditAvailability();}
  });
  $('logoutEdit').addEventListener('click',()=>{if(!editingBusy)logout();});
  window.addEventListener('pagehide',()=>logout('离开页面后已退出修改，请重新验证。'));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&authToken){if(Date.now()>=expiresAt)logout('验证已过期，请重新验证。');else{refreshHistoryState();if(pendingChange(booking)&&!editingBusy)refreshSavedPlan().catch(()=>{});}}});
  api('/api/public/options').then(data=>{setServerTime(data.server_now);today=data.today||'';supported=Boolean(data.customer_features?.customer_manage_v1&&data.customer_features?.customer_lookup_code_v1);$('lookupSubmit').disabled=!supported;$('lookupForm').hidden=!supported;if(!supported){$('lookupSection').querySelector('.manage-intro').textContent='自助查询与修改暂未开放。如需核对角色、档期或改期安排，请先联系慕言确认。';$('lookupSection').querySelector('.manage-notice').hidden=true;message('lookupMessage','已有的预约登记仍可正常使用。');}}).catch(error=>message('lookupMessage',error.message,true));
})();
