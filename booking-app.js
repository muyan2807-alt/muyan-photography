(() => {
  'use strict';
  const form=document.getElementById('bookingForm'), fields=document.getElementById('formFields');
  const status=document.getElementById('serviceStatus'), message=document.getElementById('formMessage');
  const submit=document.getElementById('submitBooking'), busy=document.getElementById('availability');
  let base=String(window.MUYAN_BOOKING?.apiBase||'').replace(/\/+$/,''), ready=false, pendingId='', lastPayload='', dateRequest=0, checking=false, completed=false, connectionVersion=0;
  const uid=()=>globalThis.crypto?.randomUUID?.()||Array.from(globalThis.crypto.getRandomValues(new Uint8Array(24)),x=>x.toString(16).padStart(2,'0')).join('');
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
    finally{clearTimeout(timer);}
  }
  function disconnected(text){
    if(completed)return;connectionVersion++;ready=false;submit.disabled=true;status.classList.add('error');
    status.replaceChildren(document.createTextNode(text+' '));const retry=document.createElement('button');retry.type='button';retry.textContent='重新连接';retry.addEventListener('click',()=>connect());status.append(retry);
  }
  async function connect(){
    if(checking||completed)return;checking=true;const version=connectionVersion;const retry=status.querySelector('button');if(retry)retry.disabled=true;
    try{const result=await api('/api/public/options');if(version!==connectionVersion||completed)return;form.elements.preferred_date.min=result.today;ready=true;submit.disabled=false;status.textContent='预约服务已连接 · 提交后由慕言与你确认档期。';status.classList.remove('error');}
    catch{if(version===connectionVersion)disconnected('暂时连接不到预约服务。请检查网络，或通过 QQ / 微信联系。');}
    finally{checking=false;}
  }
  form.elements.contact_type.addEventListener('change',()=>{const qq=form.elements.contact_type.value==='qq';document.getElementById('contactLabel').textContent=qq?'QQ 号码 *':'微信号 *';form.elements.contact.inputMode=qq?'numeric':'text';});
  form.elements.preferred_date.addEventListener('change',async()=>{
    const day=form.elements.preferred_date.value,version=++dateRequest;busy.textContent='';if(!day||!ready)return;
    try{const result=await api('/api/public/availability?from='+day+'&to='+day);if(version!==dateRequest)return;busy.textContent=result.busy.length?'该日期部分时间已有安排，可提交意向后沟通其他时间；最终以慕言确认为准。':'该日期暂未记录已确认安排，具体档期待沟通确认。';}
    catch{if(version===dateRequest)busy.textContent='暂时无法查看日期安排，可以先留下拍摄意向。';}
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!ready||!form.reportValidity())return;
    const values=Object.fromEntries(new FormData(form));values.people=Number(values.people);values.consent=form.elements.consent.checked;
    const signature=JSON.stringify(values);if(signature!==lastPayload){pendingId=uid();lastPayload=signature;}
    values.request_id=pendingId;fields.disabled=true;message.textContent='正在提交，请稍候…';message.classList.remove('error');
    try{
      const result=await api('/api/public/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(values)});
      completed=true;form.hidden=true;document.getElementById('success').hidden=false;document.getElementById('receiptId').textContent=result.id.slice(0,12).toUpperCase();document.getElementById('success').focus();status.hidden=true;
    }catch(error){message.textContent=error.message;message.classList.add('error');if(error.networkFailure)disconnected('连接已中断，请保留此页，重新联网后确认或重试提交。');if(error.status===409){pendingId='';lastPayload='';}}
    finally{fields.disabled=false;submit.disabled=!ready;}
  });
  const type=new URLSearchParams(location.search).get('type');if(['portrait','event','snow','effects'].includes(type))form.elements.shoot_type.value=type;
  window.addEventListener('offline',()=>disconnected('当前设备已断网，请保留此页，联网后再确认或重试提交。'));
  window.addEventListener('online',()=>setTimeout(connect,0));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)connect();});
  setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine&&!fields.disabled)connect();},freeNgrok?300000:30000);
  connect();
})();
