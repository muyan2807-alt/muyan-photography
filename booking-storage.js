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
  function read(kind){
    if(!allowed(kind))return null;
    try{
      const raw=localStorage.getItem(key(kind));if(!raw)return null;
      if(raw.length>60000){remove(kind);return null;}
      const record=JSON.parse(raw),now=Date.now();
      if(record?.schema!==1||!Number.isFinite(record.savedAt)||record.savedAt>now+60000||record.expiresAt!==record.savedAt+ttl||record.expiresAt<=now||!record.value||typeof record.value!=='object'){remove(kind);return null;}
      return record;
    }catch{remove(kind);return null;}
  }
  function write(kind,value){
    if(!allowed(kind))return false;
    const savedAt=Date.now(),record={schema:1,savedAt,expiresAt:savedAt+ttl,value};
    try{const raw=JSON.stringify(record);if(raw.length>60000)return false;localStorage.setItem(key(kind),raw);return true;}catch{available=false;return false;}
  }
  window.MuyanBookingStorage=Object.freeze({read,write,remove,get available(){return available;}});
})();
