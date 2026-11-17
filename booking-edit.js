/* Extended customer requests are enabled only by a server capability flag.
   The original booking remains authoritative until the request is approved. */
(() => {
  'use strict';
  const partyNames={single:'单人',double:'双人',multiple:'多人'};
  const editableKeys=['character','party_type','people','package_id','shoot_style','venue_type','location','notes','preferred_date','event_id','event_slot_id','work_ip','effect_description'];
  const node=(tag,cls='',text='')=>{const result=document.createElement(tag);if(cls)result.className=cls;if(text)result.textContent=text;return result;};
  function create({root,booking,api,today,pastVisit,onChange}){
    let alive=true,sequence=0,catalog={},sessions=[],loadError='',loaded=false;
    const entries=[],schedules=new Map();
    const event=booking.service==='event',effects=booking.service==='effects';
    root.replaceChildren();
    const intro=node('div','change-request-intro');
    intro.append(node('strong','','把新的想法，留在这里。'),node('p','',effects?'所属作品 / IP、角色、效果需求和备注都可以申请调整，慕言确认前原计划继续有效。':'套餐、人数、风格、地点、同行信息和备注都可以申请调整。新增或移除拍摄日也需慕言确认，确认前原安排继续有效。'));
    const list=node('div','change-request-days'),footer=node('div','change-request-footer');
    const add=node('button','change-add-day','＋ 申请增加一个拍摄日');add.type='button';add.hidden=effects;
    const status=node('p','manage-status');status.setAttribute('role','status');
    footer.append(add,status);root.append(intro,list,footer);
    function signal(){if(alive){validateDays();onChange?.();window.MuyanPickers?.refresh();}}
    const countFor=entry=>entry.value.party_type==='double'?2:entry.value.party_type==='multiple'?Math.max(3,Math.min(20,Number(entry.value.people)||3)):1;
    function membersFor(visit){
      const items=Array.isArray(visit.participants)?visit.participants.map(item=>({cn:String(item.cn||''),character:String(item.character||'')})):[];
      if(!items.length)items.push({cn:booking.nickname||'',character:visit.character||''});
      if(!items[1]&&(visit.partner_nickname||visit.partner_character))items.push({cn:visit.partner_nickname||'',character:visit.partner_character||''});
      return items;
    }
    function field(entry,key,title,type='text',options={}){
      const label=node('label','',title+(options.required?' *':''));
      const input=node(type==='select'||type==='number'?'select':type==='textarea'?'textarea':'input');
      if(input.tagName==='INPUT')input.type=type;
      input.id='request-'+entry.key+'-'+key;input.dataset.field=key;
      if(options.required)input.required=true;
      if(options.max)input.maxLength=options.max;
      if(options.placeholder)input.placeholder=options.placeholder;
      if(type==='number')for(let number=options.min||1;number<=20;number++)input.append(new Option(number+' 人',String(number)));
      if(type==='textarea')input.rows=3;
      if(type==='date')input.min=today;
      if(type==='select'){
        input.append(new Option(options.placeholder||'请选择',''));
        (options.items||[]).forEach(([value,copy])=>input.append(new Option(copy,value)));
        const current=entry.value[key];
        if(current&&!Array.from(input.options).some(option=>option.value===current))input.append(new Option('原选择：'+current,current));
      }
      input.value=entry.value[key]??'';
      if(key==='shoot_style'&&type==='text')input.value={bright:'亮灰',dark:'暗调'}[input.value]||input.value;
      input.addEventListener('input',()=>{
        entry.value[key]=type==='number'?(input.value===''?'':Number(input.value)):input.value;
        if(key==='character')entry.members?.setPrimary({cn:entry.primaryCN,character:input.value});
        if(key==='people'&&input.validity.valid)entry.members?.setCount(countFor(entry));
        signal();
      });
      label.append(input);entry.controls[key]=input;entry.labels[key]=label;
      return label;
    }
    function active(){return entries.filter(entry=>!entry.removed);}
    function validateDays(){
      const seen=new Set();let problem='';
      for(const entry of active()){
        const day=entry.value.preferred_date;
        entry.card.classList.toggle('has-day-conflict',Boolean(day&&seen.has(day)));
        if(day&&seen.has(day))problem='同一天只能保留一个拍摄安排，请更换日期或移除重复的一天。';
        if(day)seen.add(day);
      }
      const cancel=entries.some(entry=>entry.removed)&&!active().some(entry=>!entry.history);
      status.textContent=problem||loadError||(cancel?'将申请取消这份预约中全部尚未开始的安排，须慕言确认；确认前原计划仍有效。':'费用与变更后的安排，以慕言确认结果为准。');
      status.classList.toggle('is-cancel-request',cancel);
      status.classList.toggle('error',Boolean(problem||loadError));
      add.disabled=!loaded||active().length>=31||booking.can_add_visits===false;
      return !problem;
    }
    function party(entry){
      const value=entry.value,kind=value.party_type;
      const allowed=event||booking.service==='snow'?['single','double']:['single','double','multiple'];
      if(!allowed.includes(kind))return;
      const people=entry.controls.people;
      people.disabled=kind!=='multiple'||entry.roleLocked;entry.labels.people.hidden=kind!=='multiple';
      if(kind!=='multiple'){value.people=kind==='double'?2:1;people.value=value.people;}
      else if(!value.people||value.people<3){value.people=3;people.value=3;}
      if(entry.membersHost)entry.membersHost.hidden=countFor(entry)===1;
      entry.members?.setCount(countFor(entry));
      entry.members?.setDisabled(entry.removed||entry.roleLocked);
      if(event)packages(entry);
    }
    function addonState(entry){
      const selected=(entry.value.addons||[]).includes('multi_location_role');
      entry.locationsHost.hidden=!selected;entry.locations.setDisabled(!selected||entry.removed||entry.history);
      if(entry.labels.location){entry.labels.location.hidden=selected;entry.controls.location.disabled=selected||entry.removed||entry.history;}
    }
    function renderAddons(entry){
      if(booking.service!=='portrait'||!entry.addonsHost)return;
      entry.addonsHost.replaceChildren();
      const items=(catalog.portrait_addons||[]).filter(item=>item.id!=='travel').sort((a,b)=>{
        const rank=item=>item.id==='portrait_retouch_9'?0:item.id==='district_pickup'?2:1;
        return rank(a)-rank(b);
      });
      items.forEach(item=>{
        const label=node('label','addon-choice'),input=node('input');input.type='checkbox';input.value=item.id;input.checked=(entry.value.addons||[]).includes(item.id);
        const saved=(entry.original.addons||[]).includes(item.id)?entry.original.addon_details?.find(value=>value.id===item.id):null;
        const differs=saved&&(saved.amount!==item.amount||saved.pricing!==item.pricing),copy=node('span','',differs?(saved.label||item.label.replace(/\s*[+＋]\s*\d+(?:\.\d+)?(?:\s*元)?\s*$/,'')+(Number.isFinite(saved.amount)?' +'+saved.amount:'')):item.label);
        if(differs)copy.append(node('small','field-help addon-snapshot-note','保留原约定；当前新选 '+(Number.isFinite(item.amount)?item.amount+' 元':'按沟通报价')));
        label.append(input,copy);entry.addonsHost.append(label);
        input.addEventListener('change',()=>{const chosen=new Set(entry.value.addons||[]);input.checked?chosen.add(item.id):chosen.delete(item.id);entry.value.addons=[...chosen];if(item.id==='multi_location_role')entry.locationChoiceChanged=true;addonState(entry);signal();});
      });
      addonState(entry);
    }
    function packages(entry){
      const select=entry.controls.package_id,current=entry.value.package_id;
      const table=schedules.get(entry.value.event_id),items=(table?.packages||catalog.event_packages||[]).filter(item=>!item.party_type||item.party_type===entry.value.party_type);
      select.replaceChildren(new Option('选择本日套餐',''));
      items.forEach(item=>select.append(new Option(item.label,item.id)));
      const matches=items.some(item=>item.id===current);
      if(!matches&&current===entry.original.package_id&&entry.value.party_type===entry.original.party_type&&entry.value.event_id===entry.original.event_id){
        select.append(new Option((entry.original.package_label||'原预约套餐')+' · 保留原约定',current));
      }else if(!matches)entry.value.package_id='';
      select.value=entry.value.package_id||'';
      const chosen=items.find(item=>item.id===select.value);
      entry.packageNote.textContent=(chosen?.description||'更换套餐后，费用由慕言重新确认；这里不会直接修改原账单。')+(chosen?.pricing?.kind==='base_plus_retouch'?' 仅套餐内全部照片均精修时享受套餐优惠，部分精修不享受套餐减免。':'');
    }
    function sessionOptions(entry){
      const select=entry.controls.event_id;select.replaceChildren(new Option('选择活动与拍摄日',''));
      for(const day of sessions){
        const option=new Option([day.title,day.session,day.date].filter(Boolean).join(' · '),day.id);
        option.disabled=Boolean(day.date&&day.date<today);select.append(option);
      }
      if(entry.value.event_id&&!sessions.some(day=>day.id===entry.value.event_id))select.append(new Option([entry.original.title,entry.original.session,entry.original.date,'原预约日'].filter(Boolean).join(' · '),entry.value.event_id));
      select.value=entry.value.event_id||'';
    }
    async function schedule(entry,force=false){
      const id=entry.value.event_id,version=++entry.generation,select=entry.controls.event_slot_id;
      if(force)schedules.delete(id);
      if(!id){entry.loading=false;select.replaceChildren(new Option('请先选择拍摄日',''));select.disabled=true;packages(entry);signal();return;}
      entry.loading=true;select.disabled=true;select.replaceChildren(new Option('正在读取本日档期…',''));entry.error='';
      entry.retry.disabled=true;
      try{
        let table=schedules.get(id),fetched=false;
        if(!table){table=(await api('/api/public/event-schedules/'+encodeURIComponent(id))).schedule;if(!table||!Array.isArray(table.slots))throw Error('本日档期暂不可用');fetched=true;}
        if(!alive||entry.generation!==version)return;
        if(fetched)schedules.set(id,table);
        entry.value.preferred_date=table.date;
        select.replaceChildren(new Option('选择拍摄时段',''));
        for(const slot of table.slots){
          const own=entries.some(item=>!item.isNew&&item.original.event_id===id&&item.original.event_slot_id===slot.id);
          const state=own?'本人原时段 · 可申请保留':slot.can_book?'可预约':slot.status==='occupied'?'已占用':'暂不可选';
          const option=new Option(slot.start.slice(11,16)+'–'+slot.end.slice(11,16)+' · '+state,slot.id);
          option.disabled=!own&&!slot.can_book;option.dataset.slotStatus=own?'current':slot.can_book?'available':slot.status==='occupied'?'occupied':'unavailable';option.dataset.statusLabel=state;select.append(option);
        }
        if(entry.value.event_id===entry.original.event_id&&entry.original.event_slot_id&&!Array.from(select.options).some(option=>option.value===entry.original.event_slot_id)){
          const option=new Option((entry.original.time_label||'原时段')+' · 当前预约 · 可保留',entry.original.event_slot_id);option.dataset.statusLabel='当前预约 · 可保留';option.dataset.slotStatus='current';select.append(option);
        }
        select.value=entry.value.event_slot_id||'';
        if(!select.value||select.selectedOptions[0]?.disabled){entry.value.event_slot_id='';select.value='';}
        select.disabled=entry.removed||entry.history||entry.original.can_edit_time===false;packages(entry);
      }catch(error){
        if(!alive||entry.generation!==version)return;
        entry.error='本日档期暂时无法读取，请点击重新读取。';
        const original=!entry.isNew&&id===entry.original.event_id&&entry.original.event_slot_id;
        select.replaceChildren(new Option(original?'保留原时段，或重试读取档期':'档期读取失败，请重试',''));
        if(original){
          const option=new Option((entry.original.time_label||'原预约时段')+' · 保留原安排',entry.original.event_slot_id);option.dataset.slotStatus='current';option.dataset.statusLabel='原安排 · 可保留';select.append(option);
          if(entry.value.event_slot_id===entry.original.event_slot_id)select.value=entry.original.event_slot_id;
          else entry.value.event_slot_id='';
          select.disabled=entry.removed||entry.history||entry.original.can_edit_time===false;packages(entry);
          entry.error='公开档期暂不可用；可保留原时段申请调整资料。改期请重试读取或联系慕言。';
        }else select.disabled=true;
      }
      entry.loading=false;entry.scheduleError.textContent=entry.error;entry.retry.hidden=false;entry.retry.disabled=entry.removed||entry.history;entry.retry.textContent=entry.error?'重新读取本日档期':'刷新本日档期 ↻';signal();
    }
    function updateHeading(entry){
      const title=entry.value.event_id?sessions.find(day=>day.id===entry.value.event_id):null;
      entry.heading.textContent=effects?(entry.removed?'申请取消本次制作':'调整后期制作需求'):entry.removed?'申请移除此拍摄日':(entry.isNew?'新增拍摄日':'调整拍摄日')+(title?' · '+title.session+' · '+title.date:entry.value.preferred_date?' · '+entry.value.preferred_date:'');
    }
    function insert(visit,isNew=false){
      const original={...visit,preferred_date:visit.date||visit.preferred_date||'',party_type:visit.party_type||'single'};
      if(effects){original.work_ip=visit.work_ip??booking.work_ip??booking.plan?.fields?.find(field=>/所属作品|作品.*IP/.test(field.label))?.value??'';original.effect_description=visit.effect_description??booking.effect_description??booking.plan?.fields?.find(field=>/效果|制作需求/.test(field.label))?.value??'';}
      const entry={key:String(++sequence),original,value:{...original,addons:[...(original.addons||[])]},isNew,removed:false,roleLocked:visit.can_edit_role===false,controls:{},labels:{},generation:0,error:''};
      entry.originalMembers=membersFor(original);entry.originalLocationPlan=Array.isArray(original.location_plan)?[...original.location_plan]:[];
      entry.legacyLocations=!isNew&&(original.addons||[]).includes('multi_location_role')&&!entry.originalLocationPlan.length;entry.locationsTouched=false;
      entry.primaryCN=entry.originalMembers[0]?.cn||booking.nickname||'';
      entry.value.people=original.people??(original.party_type==='double'?2:original.party_type==='multiple'?'':1);
      const card=entry.card=node('section','manage-edit-day change-request-day');card.dataset.id=visit.id||'';card.dataset.editable=String(!pastVisit(visit));
      if(!isNew&&(pastVisit(visit)||visit.can_request_changes===false||visit.can_edit===false||visit.can_edit_role===false&&visit.can_edit_time===false)){
        entry.history=true;card.classList.add('is-history');card.append(node('h3','',[(visit.session||''),visit.date].filter(Boolean).join(' · ')),node('p','manage-notice','角色：'+(visit.character||'—')),node('p','history-visit-note',pastVisit(visit)?'已过预约时间，仅供查看，不可修改。':'本日安排暂不可在线修改，请联系慕言核对。'));list.append(card);entries.push(entry);return entry;
      }
      const head=node('div','change-day-heading');entry.heading=node('h3');
      const remove=node('button','change-remove-day',isNew?'移除':effects?'申请取消本次制作':'申请移除此日');remove.type='button';
      remove.disabled=!isNew&&(visit.can_remove===false||!effects&&visit.can_edit_time===false);
      head.append(entry.heading,remove);const content=entry.content=node('div','change-day-content');card.append(head,content);entries.push(entry);list.append(card);
      if(!effects){
      if(event){
        content.append(field(entry,'event_id','活动与拍摄日','select',{required:true}));sessionOptions(entry);
        const time=field(entry,'event_slot_id','拍摄时段','select',{required:true});entry.controls.event_slot_id.dataset.showUnavailable='true';content.append(time);
        entry.scheduleError=node('p','manage-status error');entry.retry=node('button','text-button','刷新本日档期 ↻');entry.retry.type='button';entry.retry.addEventListener('click',()=>schedule(entry,true));content.append(entry.scheduleError,entry.retry);
        entry.controls.event_id.addEventListener('change',()=>{entry.value.event_id=entry.controls.event_id.value;entry.value.event_slot_id='';entry.value.preferred_date=sessions.find(day=>day.id===entry.value.event_id)?.date||'';updateHeading(entry);schedule(entry);});
      }else{
        const grid=node('div','field-grid');grid.append(field(entry,'preferred_date','期望日期','date',{required:true}));
        if(booking.service==='portrait'){
          const host=node('div','request-time-range');grid.append(host);
          entry.timeRange=window.MuyanBookingDetails.timeRange(host,{idPrefix:'request-'+entry.key+'-time',value:entry.value.preferred_time||'',required:true,disabled:visit.can_edit_time===false,onChange:()=>signal()});
        }
        content.append(grid);
        if(booking.service==='portrait')content.append(node('p','field-help','点选开始与结束时间，组成你希望拍摄的区间，实际档期与拍摄时长沟通后确认。'));
      }
      content.append(field(entry,'character','角色','text',{required:true,max:100,placeholder:'这一天想拍的角色'}));
        const grid=node('div','field-grid');grid.append(field(entry,'party_type','拍摄人数 / 形式','select',{required:true,items:(event||booking.service==='snow'?['single','double']:['single','double','multiple']).map(value=>[value,partyNames[value]])}),field(entry,'people','具体人数','number',{required:true,min:3}));content.append(grid);
      if(event){
        content.append(field(entry,'package_id','本日套餐','select',{required:true}));entry.packageNote=node('p','field-help');content.append(entry.packageNote);
        entry.controls.package_id.addEventListener('change',()=>packages(entry));
      }
      content.append(field(entry,'shoot_style','拍摄风格',event?'select':'text',event?{required:true,items:[['bright','亮灰'],['dark','暗调']]}:{max:150,placeholder:'希望保留或调整的风格、氛围'}));
      if(booking.service==='portrait')content.append(field(entry,'venue_type','外景 / 棚拍','select',{items:[['outdoor','外景'],['studio','棚拍']]}));
      if(!effects)content.append(field(entry,'location','期望拍摄地点','text',{max:150,placeholder:event?'具体拍摄地点以群聊通知为准':'希望拍摄的地点，可写待沟通'}));
      const membersHost=entry.membersHost=node('div','request-members');content.append(membersHost);
      entry.members=window.MuyanBookingDetails.participants(membersHost,{idPrefix:'request-'+entry.key+'-member',items:entry.originalMembers,count:countFor(entry),showPrimary:false,primary:{cn:entry.primaryCN,character:entry.originalMembers[0]?.character||entry.value.character||''},onChange:()=>signal()});
      if(booking.service==='portrait'){
        const addons=node('section','request-addons');addons.append(node('h4','','其他拍摄需求'));
        entry.addonsHost=node('div','addon-choices');addons.append(entry.addonsHost);content.append(addons);
        entry.locationsHost=node('div','request-location-plan');content.append(entry.locationsHost);
        entry.locations=window.MuyanBookingDetails.locations(entry.locationsHost,{idPrefix:'request-'+entry.key+'-location',items:entry.originalLocationPlan.length?entry.originalLocationPlan:entry.legacyLocations?[entry.value.location||'']:[],required:!entry.legacyLocations,onChange:()=>{entry.locationsTouched=true;entry.locationsHost.querySelectorAll('input').forEach(input=>input.required=true);signal();}});
        renderAddons(entry);
      }
      }else{
        content.append(field(entry,'work_ip','所属作品 / IP','text',{required:true,max:100}),field(entry,'character','角色','text',{required:true,max:100}),field(entry,'effect_description','效果需求','textarea',{required:true,max:1000,placeholder:'希望呈现的特效、合成或后期效果'}));
      }
      content.append(field(entry,'notes','备注 / 其他需求','textarea',{max:event?700:1000,placeholder:'请补充希望调整的内容，慕言确认后才生效'}));
      entry.controls.party_type?.addEventListener('change',()=>{party(entry);signal();});
      if(entry.controls.preferred_date)entry.controls.preferred_date.addEventListener('change',()=>{updateHeading(entry);signal();});
      remove.addEventListener('click',()=>{
        if(entry.isNew){entry.generation++;entries.splice(entries.indexOf(entry),1);card.remove();}
        else{
          entry.removed=!entry.removed;entry.content.hidden=entry.removed;entry.controlsBeforeRemove=entry.controlsBeforeRemove||[];
          if(entry.removed){entry.controlsBeforeRemove=Array.from(entry.content.querySelectorAll('input,select,textarea,button'),control=>[control,control.disabled]);entry.controlsBeforeRemove.forEach(([control])=>control.disabled=true);}
          else{entry.controlsBeforeRemove.forEach(([control,disabled])=>control.disabled=disabled);entry.controlsBeforeRemove=[];if(event)schedule(entry);}
          entry.members?.setDisabled(entry.removed||entry.roleLocked);entry.timeRange?.setDisabled(entry.removed||visit.can_edit_time===false);if(entry.locations)addonState(entry);
          card.classList.toggle('is-removing',entry.removed);remove.textContent=entry.removed?'恢复保留':effects?'申请取消本次制作':'申请移除此日';updateHeading(entry);
        }
        signal();
      });
      if(!effects)party(entry);updateHeading(entry);
      entry.controls.character.disabled=visit.can_edit_role===false;
      if(entry.controls.party_type)entry.controls.party_type.disabled=entry.roleLocked;
      for(const key of ['preferred_date','preferred_time','event_id','event_slot_id'])if(entry.controls[key]&&visit.can_edit_time===false)entry.controls[key].disabled=true;
      if(event&&loaded)schedule(entry);return entry;
    }
    add.addEventListener('click',()=>{
      if(add.disabled)return;
      const entry=insert({character:'',party_type:'single',preferred_date:'',notes:''},true);signal();entry.card.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
      (window.MuyanPickers?.buttonFor(entry.controls.event_id||entry.controls.preferred_date)||entry.controls.character).focus({preventScroll:true});
    });
    (booking.visits||[]).forEach(visit=>insert(visit));
    const ready=(async()=>{
      const responses=await Promise.allSettled([api('/api/public/service-catalog'),...(event?[api('/api/public/event-options')]:[])]);
      if(!alive)return;
      if(responses[0].status==='fulfilled')catalog=window.MuyanBookingDetails.normalizeCatalog(responses[0].value);
      if(event&&responses[1].status==='fulfilled')sessions=(responses[1].value.items||[]).flatMap(item=>(item.sessions||[]).map(day=>({...day,title:day.title||item.title})));
      if(responses.some(result=>result.status==='rejected'))loadError='部分可选信息暂时无法读取，请刷新最新计划后重试。';
      loaded=true;
      entries.filter(entry=>!entry.history).forEach(renderAddons);
      await Promise.all(entries.filter(entry=>!entry.history&&event).map(entry=>{sessionOptions(entry);updateHeading(entry);return schedule(entry);}));signal();
    })();
    function serialize(){
      if(!loaded)throw Error('可选信息仍在读取，请稍等。');
      if(active().some(entry=>!entry.history&&entry.loading))throw Error('正在读取所选拍摄日的档期，请稍等后再提交。');
      if(loadError||active().some(entry=>!entry.history&&entry.error&&(entry.isNew||entry.value.event_id!==entry.original.event_id||entry.value.event_slot_id!==entry.original.event_slot_id)))throw Error(loadError||'请先重新读取失败的拍摄日档期。');
      if(!validateDays())throw Error(status.textContent);
      const visits=[],remove_visit_ids=[];
      for(const entry of entries){
        if(entry.history)continue;
        if(entry.removed){remove_visit_ids.push(entry.original.id);continue;}
        const patch=entry.isNew?{client_id:'new-'+entry.key}:{id:entry.original.id};
        for(const key of editableKeys){
          if(!(key in entry.controls)&&!['preferred_date'].includes(key))continue;
          if(entry.controls[key]?.disabled&&key!=='people')continue;
          let value=entry.value[key]??'';
          if(typeof value==='string')value=value.trim();
          const prior=key==='people'?(entry.original.people??(entry.original.party_type==='double'?2:entry.original.party_type==='single'?1:'')):(entry.original[key]??'');
          if(entry.isNew||value!==prior)patch[key]=value;
        }
        if(event&&(entry.isNew||patch.event_id||patch.event_slot_id)){patch.event_id=entry.value.event_id;patch.event_slot_id=entry.value.event_slot_id;}
        if(entry.timeRange&&entry.original.can_edit_time!==false){
          const time=entry.timeRange.value();if(!time)throw Error('请填写有效的开始与结束时间。');
          if(entry.isNew||time!==(entry.original.preferred_time||''))patch.preferred_time=time;
        }
        if(entry.members){
        const members=entry.members.value();
        if(members.length!==countFor(entry)||members.some(item=>!item.cn.trim()||!item.character.trim()))throw Error('请填写每位出镜者的 CN 和角色。');
        if(entry.isNew||JSON.stringify(members)!==JSON.stringify(entry.originalMembers))patch.participants=members;
        if(event){
          const partner=members[1]||{cn:'',character:''};
          if(entry.isNew||partner.cn!==(entry.original.partner_nickname||''))patch.partner_nickname=partner.cn;
          if(entry.isNew||partner.character!==(entry.original.partner_character||''))patch.partner_character=partner.character;
        }
        }
        if(entry.locations){
          if(entry.isNew||JSON.stringify(entry.value.addons)!==JSON.stringify(entry.original.addons||[]))patch.addons=[...entry.value.addons];
          const locations=entry.value.addons.includes('multi_location_role')?entry.legacyLocations&&!entry.locationsTouched?entry.originalLocationPlan:entry.locations.value():entry.locationChoiceChanged?[]:entry.originalLocationPlan;
          if(entry.isNew||JSON.stringify(locations)!==JSON.stringify(entry.originalLocationPlan))patch.location_plan=locations;
          if(entry.locationChoiceChanged&&!entry.value.addons.includes('multi_location_role'))patch.location=String(entry.value.location||'').trim();
        }
        if(entry.isNew||Object.keys(patch).length>1)visits.push(patch);
      }
      if(!visits.length&&!remove_visit_ids.length)throw Error('尚未修改内容，请先调整需要申请变更的信息。');
      return {change_mode:'request',visits,remove_visit_ids};
    }
    return Object.freeze({ready,serialize,destroy(){alive=false;entries.forEach(entry=>{entry.generation++;entry.members?.destroy();entry.timeRange?.destroy();entry.locations?.destroy();});},refreshHistory(){
      let changed=false;
      entries.forEach(entry=>{if(!entry.isNew&&!entry.history&&pastVisit(entry.original)){changed=true;entry.history=true;entry.removed=false;entry.members?.setDisabled(true);entry.timeRange?.setDisabled(true);entry.locations?.setDisabled(true);entry.card.classList.add('is-history');entry.card.querySelectorAll('input,select,textarea,button').forEach(control=>control.disabled=true);entry.heading.textContent='已过预约时间 · 仅供查看';}});if(changed)signal();
    }});
  }
  window.MuyanBookingEdit=Object.freeze({create});
})();
