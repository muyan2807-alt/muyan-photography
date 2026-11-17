/* Small, local-only records. Never stores images, cookies or API responses. */
(() => {
  'use strict';
  const ttl=24*60*60*1000;
  const environment=['localhost','127.0.0.1'].includes(location.hostname)?'preview':'live';
  const prefix='muyan.booking.v1.'+environment+'.'+encodeURIComponent(new URL('./',location.href).pathname)+'.';
  let available=true;
  const key=kind=>prefix+kind;
  const allowed=kind=>kind==='draft'||kind==='receipt';
  function remove(kind){if(!allowed(kind))return false;try{localStorage.removeItem(key(kind));return true;}catch{available=false;return false;}}
  const credentialKey=key=>/^(?:verificationcode|editcode|queryverificationcode|accesstoken|authtoken|authorization|token)$/.test(String(key).replace(/[_\s-]/g,'').toLowerCase());
  const credentialLabel=label=>/^(?:查询验证码|四位验证码|验证码|查询码|修改码)$/.test(String(label||'').replace(/^(?:D\s*\d+|第\s*\d+\s*天)\s*[·•:：|｜/／-]\s*/i,'').replace(/\s+/g,''));
  function sanitize(value){
    if(Array.isArray(value))return value.filter(item=>!item||typeof item!=='object'||!credentialLabel(item.label)).map(sanitize);
    if(!value||typeof value!=='object')return value;
    return Object.fromEntries(Object.entries(value).filter(([name])=>!credentialKey(name)).map(([name,item])=>[name,sanitize(item)]));
  }
  function read(kind){
    if(!allowed(kind))return null;
    try{
      const raw=localStorage.getItem(key(kind));if(!raw)return null;
      if(raw.length>60000){remove(kind);return null;}
      const record=JSON.parse(raw),now=Date.now();
      if(record?.schema!==1||!Number.isFinite(record.savedAt)||record.savedAt>now+60000||record.expiresAt!==record.savedAt+ttl||record.expiresAt<=now||!record.value||typeof record.value!=='object'){remove(kind);return null;}
      const clean=sanitize(record);
      if(JSON.stringify(clean)!==raw)localStorage.setItem(key(kind),JSON.stringify(clean));
      return clean;
    }catch{remove(kind);return null;}
  }
  function write(kind,value){
    if(!allowed(kind))return false;
    const savedAt=Date.now(),record={schema:1,savedAt,expiresAt:savedAt+ttl,value:sanitize(value)};
    try{const raw=JSON.stringify(record);if(raw.length>60000)return false;localStorage.setItem(key(kind),raw);return true;}catch{available=false;return false;}
  }
  window.MuyanBookingStorage=Object.freeze({read,write,remove,get available(){return available;}});
})();
