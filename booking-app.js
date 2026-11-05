(() => {
  'use strict';
  const form=document.getElementById('bookingForm'),fields=document.getElementById('formFields');
  const status=document.getElementById('serviceStatus'),message=document.getElementById('formMessage');
  const submit=document.getElementById('submitBooking'),busy=document.getElementById('availability');
  const draftStatus=document.getElementById('draftStatus'),clearDraftButton=document.getElementById('clearDraft');
  const types=['portrait','event','snow','effects'],names={portrait:'正片',event:'场照',snow:'雪景',effects:'后期／特效'};
  const savedFields=['nickname','contact_type','contact','preferred_date','preferred_time','people','character','location','notes'];
  const prefix='muyan:booking-draft:v1:',lastTypeKey=prefix+'last-type',ttl=24*60*60*1000;
  const params=new URLSearchParams(location.search),sources=['top','works','price','notes','contact'];
  const home=new URL('./',location.href),from=sources.includes(params.get('from'))?params.get('from'):'works';
  document.querySelectorAll('[data-booking-return]').forEach(link=>link.href=home.pathname+'#'+from);
  let base=String(window.MUYAN_BOOKING?.apiBase||'').replace(/\/+$/,''),ready=false,pendingId='',lastPayload='',dateRequest=0,checking=false,completed=false,connectionVersion=0;
  let activeType='portrait',storageOK=true;
  const uid=()=>globalThis.crypto?.randomUUID?.()||Array.from(globalThis.crypto.getRandomValues(new Uint8Array(24)),x=>x.toString(16).padStart(2,'0')).join('');
  const defaultDraftText='草稿仅保存在此浏览器，24小时后失效，提交成功后清除。';
  function announce(text){if(draftStatus.textContent!==text)draftStatus.textContent=text;}
  function readStored(key){
    try{
      const raw=localStorage.getItem(key);if(!raw)return null;
      let data;try{data=JSON.parse(raw)}catch{localStorage.removeItem(key);return null}
      if(!data||!Number.isFinite(data.updatedAt)||Date.now()-data.updatedAt<0||Date.now()-data.updatedAt>ttl){localStorage.removeItem(key);return null}
      return data;
    }catch{storageOK=false;return null}
  }
  function removeStored(key){try{localStorage.removeItem(key)}catch{storageOK=false}}
  function values(){return Object.fromEntries(savedFields.map(name=>[name,form.elements[name].value]));}
  function hasContent(data=values()){return ['nickname','contact','preferred_date','character','location','notes'].some(name=>String(data[name]||'').trim());}
  function contactLabel(){const qq=form.elements.contact_type.value==='qq';document.getElementById('contactLabel').textContent=qq?'QQ 号码 *':'微信号 *';form.elements.contact.inputMode=qq?'numeric':'text';}
  function typeLabel(){const name=names[activeType];document.getElementById('formTitle').textContent=name+'预约意向';document.title=name+'预约意向 · 慕言';}
  function saveDraft(type=activeType){
    if(completed)return;
    const data=values();clearDraftButton.hidden=!hasContent(data);
    if(!hasContent(data)){removeStored(prefix+type);announce(defaultDraftText);return;}
    try{
      const updatedAt=Date.now();localStorage.setItem(prefix+type,JSON.stringify({version:1,type,updatedAt,values:data,pendingId,lastPayload}));
      localStorage.setItem(lastTypeKey,JSON.stringify({type,updatedAt}));storageOK=true;
      announce('草稿已保存在此浏览器，24小时内可恢复；提交成功后清除。');
    }catch{storageOK=false;announce('此浏览器无法自动保存草稿，请保留当前页面，或复制重要内容。');}
  }
  function restoreDraft(type){
    const record=readStored(prefix+type);
    if(!record||record.version!==1||record.type!==type||!record.values||typeof record.values!=='object')return false;
    for(const name of savedFields){
      const input=form.elements[name],value=record.values[name];if(typeof value!=='string')continue;
      if(input.tagName==='SELECT'&&![...input.options].some(option=>option.value===value))continue;
      if(name==='people'&&(!Number.isInteger(Number(value))||Number(value)<1||Number(value)>20))continue;
      input.value=input.maxLength>0?value.slice(0,input.maxLength):value;
    }
    pendingId=typeof record.pendingId==='string'&&/^[a-zA-Z0-9-]{8,128}$/.test(record.pendingId)?record.pendingId:'';
    lastPayload=typeof record.lastPayload==='string'&&record.lastPayload.length<16000?record.lastPayload:'';
    form.elements.consent.checked=false;contactLabel();clearDraftButton.hidden=!hasContent();
    announce('已恢复'+names[type]+'草稿。请核对内容，并重新勾选信息使用同意。');return true;
  }
  // Only this form's expiring keys are accessed; consent is never saved.
  types.forEach(type=>readStored(prefix+type));
  const lastType=readStored(lastTypeKey);
  activeType=types.includes(params.get('type'))?params.get('type'):types.includes(lastType?.type)?lastType.type:'portrait';
  form.elements.shoot_type.value=activeType;typeLabel();
  if(!restoreDraft(activeType))announce(storageOK?defaultDraftText:'此浏览器无法自动保存草稿，请保留当前页面。');
  clearDraftButton.hidden=!hasContent();
  form.addEventListener('input',()=>{contactLabel();saveDraft()});
  form.addEventListener('change',event=>{
    if(event.target===form.elements.shoot_type){
      saveDraft(activeType);activeType=form.elements.shoot_type.value;pendingId='';lastPayload='';form.elements.consent.checked=false;
      if(!restoreDraft(activeType))saveDraft(activeType);
      busy.textContent='';dateRequest++;typeLabel();
    }else saveDraft();
    contactLabel();
  });
  clearDraftButton.addEventListener('click',()=>{
    if(completed||fields.disabled||!confirm('清除当前类别的草稿和已填内容？'))return;
    removeStored(prefix+activeType);if(readStored(lastTypeKey)?.type===activeType)removeStored(lastTypeKey);
    form.reset();form.elements.shoot_type.value=activeType;pendingId='';lastPayload='';dateRequest++;busy.textContent='';message.textContent='';
    contactLabel();clearDraftButton.hidden=true;announce('当前类别草稿已清除。'+defaultDraftText);
  });
  window.addEventListener('beforeunload',event=>{
    if(completed||!hasContent())return;
    saveDraft();event.preventDefault();event.returnValue='';
  });
  window.addEventListener('pagehide',()=>saveDraft());
  if(base){try{const u=new URL(base);if(u.origin!==base||!['https:','http:'].includes(u.protocol)||(location.protocol==='https:'&&u.protocol!=='https:'))throw Error();}catch{status.textContent='预约暂未开放，请通过 QQ 或微信联系慕言。';status.classList.add('error');return;}}
  const freeNgrok=/\.ngrok-free\.(dev|app)$/.test(new URL(base||location.href).hostname);
  async function api(path,options={}){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),18000);
    try{
      const response=await fetch(base+path,{...options,headers:{...(freeNgrok?{'ngrok-skip-browser-warning':'1'}:{}),...(options.headers||{})},credentials:'omit',cache:'no-store',signal:controller.signal});
      const body=await response.json().catch(()=>null);
      if(!response.ok||!body?.ok){const error=Error(body?.error||'预约服务暂时无法连接，请稍后重试或通过 QQ / 微信联系。');error.status=response.status;throw error;}
      return body;
    }catch(error){if(error.name==='AbortError'||error instanceof TypeError){const failure=Error('连接超时或网络不可用，尚未确认提交结果。请重试同一份预约，或联系慕言核对。');failure.networkFailure=true;throw failure;}throw error;}
    finally{clearTimeout(timer)}
  }
  function disconnected(text){
    if(completed)return;connectionVersion++;ready=false;submit.disabled=true;status.classList.add('error');
    status.replaceChildren(document.createTextNode(text+' '));const retry=document.createElement('button');retry.type='button';retry.textContent='重新连接';retry.addEventListener('click',()=>connect());status.append(retry);
  }
  async function connect(){
    if(checking||completed)return;checking=true;const version=connectionVersion,retry=status.querySelector('button');if(retry)retry.disabled=true;
    try{const result=await api('/api/public/options');if(version!==connectionVersion||completed)return;form.elements.preferred_date.min=result.today;ready=true;submit.disabled=false;status.textContent='预约服务已连接 · 提交后由慕言与你确认档期。';status.classList.remove('error');}
    catch{if(version===connectionVersion)disconnected('暂时连接不到预约服务。请检查网络，或通过 QQ / 微信联系。');}
    finally{checking=false}
  }
  form.elements.preferred_date.addEventListener('change',async()=>{
    const day=form.elements.preferred_date.value,version=++dateRequest;busy.textContent='';if(!day||!ready)return;
    try{const result=await api('/api/public/availability?from='+day+'&to='+day);if(version!==dateRequest)return;busy.textContent=result.busy.length?'该日期部分时间已有安排，可提交意向后沟通其他时间；最终以慕言确认为准。':'该日期暂未记录已确认安排，具体档期待沟通确认。';}
    catch{if(version===dateRequest)busy.textContent='暂时无法查看日期安排，可以先留下拍摄意向。';}
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!ready||fields.disabled||!form.reportValidity())return;
    const data=Object.fromEntries(new FormData(form));data.people=Number(data.people);data.consent=form.elements.consent.checked;
    const signature=JSON.stringify(Object.fromEntries(Object.entries(data).filter(([key])=>key!=='consent')));if(signature!==lastPayload){pendingId=uid();lastPayload=signature;}
    data.request_id=pendingId;saveDraft();fields.disabled=true;clearDraftButton.disabled=true;message.textContent='正在提交，请稍候…';message.classList.remove('error');
    try{
      const result=await api('/api/public/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      if(typeof result.id!=='string'||!result.id)throw Error('提交结果不完整，请保留当前页面，联系慕言核对后再重试。');
      completed=true;removeStored(prefix+activeType);if(readStored(lastTypeKey)?.type===activeType)removeStored(lastTypeKey);
      form.hidden=true;document.getElementById('draftTools').hidden=true;document.getElementById('success').hidden=false;
      document.getElementById('receiptId').textContent=result.id.slice(0,12).toUpperCase();document.getElementById('success').focus();status.hidden=true;
    }catch(error){
      message.textContent=error.message;message.classList.add('error');
      if(error.networkFailure)disconnected('连接已中断，请保留此页，重新联网后确认或重试提交。');
      if(error.status===409){pendingId='';lastPayload='';}saveDraft();
    }finally{fields.disabled=false;clearDraftButton.disabled=false;submit.disabled=!ready;}
  });
  window.addEventListener('offline',()=>disconnected('当前设备已断网，请保留此页，联网后再确认或重试提交。'));
  window.addEventListener('online',()=>setTimeout(connect,0));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)saveDraft();else connect()});
  setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine&&!fields.disabled)connect();},freeNgrok?300000:30000);
  connect();
})();
