/* Read-only daily views of one authenticated booking group. No IDs or permissions change. */
(() => {
  'use strict';
  const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
  function copy(value,seen=new Map()){
    if(value===null||typeof value!=='object')return value;
    if(seen.has(value))return seen.get(value);
    const result=Array.isArray(value)?[]:{};seen.set(value,result);
    for(const key of Object.keys(value))Object.defineProperty(result,key,{value:copy(value[key],seen),enumerable:true,configurable:true,writable:true});
    return result;
  }
  const text=value=>value===null||value===undefined?'':String(value);
  const normalLabel=value=>text(value).replace(/\s+/g,'').toLowerCase();
  function scope(label){
    const matched=text(label).trim().match(/^((?:D\s*\d+)|(?:第\s*\d+\s*天))(?:\s*[·•:：|｜/／\-]\s*|\s+)(.+)$/i);
    return matched?{prefix:matched[1].replace(/\s+/g,'').toUpperCase(),label:matched[2].trim()}:null;
  }
  function resident(label){return /^(?:cn(?:[/／]昵称)?|昵称|单主cn|拍摄类型|服务类型|服务项目|预约编号|意向编号|查询验证码|四位验证码|验证码|查询码|修改码)$/.test(normalLabel(label));}
  function knownDaily(label){
    return /^(?:角色|主角色|安排|拍摄安排|期望安排|申请安排|确认安排|期望时间|期望日期|拍摄时间|拍摄日期|日期|时间|拍摄形式|人数|拍摄人数|参与单主[/／]角色|每位出镜者.*|出镜者.*|参与者.*|同行.*|场地|外景[/／]棚拍|拍摄地点|期望地点|地点|地点顺序|地点[/／]场景顺序|地点[/／]场景安排|附加需求|附加服务|其他拍摄需求|场照套餐|本场套餐|套餐|拍摄风格|风格|备注|补充备注|所属作品.*|作品[/／]ip|后期效果.*|效果需求|效果|制作需求|后期类型|参考总价|原报价[/／]套餐说明|总价)$/.test(normalLabel(label));
  }
  function fieldsOf(plan){
    const a=Array.isArray(plan?.fields)?plan.fields.filter(field=>field&&typeof field.label==='string'):[];
    const b=Array.isArray(plan?.sourceFields)?plan.sourceFields.filter(field=>field&&typeof field.label==='string'):[];
    if(!a.length)return copy(b);
    const result=copy(a),counts=new Map(),key=field=>JSON.stringify([field.label,field.value]);
    a.forEach(field=>counts.set(key(field),(counts.get(key(field))||0)+1));
    b.forEach(field=>{const id=key(field),remaining=counts.get(id)||0;if(remaining)counts.set(id,remaining-1);else result.push(copy(field));});
    return result;
  }
  function blocksOf(fields){
    const common=[],shared=[],blocks=[];let block=null;
    for(const field of fields){
      const parsed=scope(field.label);
      if(!parsed){(resident(field.label)?common:shared).push(copy(field));continue;}
      const key=normalLabel(parsed.label);
      if(!block||block.prefix!==parsed.prefix||key===block.first){block={prefix:parsed.prefix,first:key,fields:[],original:[]};blocks.push(block);}
      block.fields.push({...copy(field),label:parsed.label});block.original.push(copy(field));
    }
    return {common,shared,blocks};
  }
  function fits(block,visit,index){
    const ordinal=block.prefix.match(/^第(\d+)天$/);if(ordinal&&Number(ordinal[1])!==index+1)return false;
    if(/^D\d+$/.test(block.prefix)&&visit.session&&block.prefix!==text(visit.session).replace(/\s+/g,'').toUpperCase())return false;
    const role=block.fields.find(field=>/^(?:角色|主角色)$/.test(normalLabel(field.label)));
    if(role&&text(role.value).trim()&&text(visit.character).trim()&&text(role.value).trim()!==text(visit.character).trim())return false;
    const day=text(visit.date||visit.preferred_date),schedule=block.fields.find(field=>/^(?:安排|拍摄安排|期望安排|申请安排|确认安排|期望时间|期望日期|拍摄时间|拍摄日期|日期|时间)$/.test(normalLabel(field.label)));
    const dates=schedule?text(schedule.value).match(/\d{4}-\d{2}-\d{2}/g):null;
    return !day||!dates||dates.includes(day);
  }
  function addonText(visit){
    if(Array.isArray(visit.addon_details)&&visit.addon_details.length)return visit.addon_details.map(item=>{
      if(typeof item==='string')return item;
      const label=text(item?.label||item?.id);if(!label)return '';
      return Number.isFinite(item.amount)&&!/(?:元|[+＋]\s*\d)/.test(label)?label+' · '+item.amount+' 元'+(item.pricing==='starting_at'?'起':''):label;
    }).filter(Boolean).join('；');
    const names={portrait_retouch_9:'9 张人像精修',city_pickup:'主城区包接包送',district_pickup:'区县包接送',multi_location_role:'多地点 / 同地点多角色',night:'夜景',rain:'雨景',travel:'旅拍'};
    return Array.isArray(visit.addons)?visit.addons.map(item=>typeof item==='string'?names[item]||item:text(item?.label||item?.id)).filter(Boolean).join('；'):'';
  }
  function rebuild(booking,visit,single){
    const fields=[],add=(label,value)=>{if(value!==null&&value!==undefined&&text(value).trim()!=='')fields.push({label,value:text(value)});};
    const kind=booking.service||booking.sub_category||booking.category;
    add('角色',visit.character);
    if(kind!=='effects'){
      add('拍摄安排',[visit.title,visit.session,visit.date||visit.preferred_date,visit.time_label||visit.preferred_time].filter(value=>value!==null&&value!==undefined&&text(value).trim()).join(' · '));
      const party=({single:'单人',double:'双人',multiple:'多人',group:'团片'})[visit.party_type]||text(visit.party_type);
      const people=Number.isInteger(visit.people)&&visit.people>0?visit.people+' 人':'';add('拍摄形式',[party,people].filter(Boolean).join(' · '));
      if(Array.isArray(visit.participants)&&visit.participants.length)add('每位出镜者 / 角色',visit.participants.map((person,index)=>(index+1)+'. '+text(person?.cn)+' / '+text(person?.character)).join('\n'));
      else if(visit.partner_nickname||visit.partner_character)add('同行单主 / 角色',[visit.partner_nickname,visit.partner_character].filter(Boolean).join(' / '));
      add('场照套餐',visit.package_label);add('拍摄风格',({bright:'亮灰',dark:'暗调'})[visit.shoot_style]||visit.shoot_style);
      add('场地',({outdoor:'外景',studio:'棚拍'})[visit.venue_type]||visit.venue_type);add('拍摄地点',visit.location);
      if(Array.isArray(visit.location_plan)&&visit.location_plan.length)add('地点 / 场景顺序',visit.location_plan.map((place,index)=>(index+1)+'. '+text(place)).join('\n'));
      add('附加需求',addonText(visit));
    }else{
      add('所属作品 / IP',visit.work_ip||visit.effectsIP||visit.ip);add('后期效果',visit.effect_description||visit.effectsBrief);
    }
    if(Number.isFinite(visit.reference_total))add('参考总价',visit.reference_total+' 元');
    else if(visit.reference_price_label)add('参考总价',visit.reference_price_label);
    else if(single&&Number.isFinite(booking.reference_total))add('参考总价',booking.reference_total+' 元');
    else if(single&&booking.reference_price_label)add('参考总价',booking.reference_price_label);
    add('备注',visit.notes);return fields;
  }
  function dailyFields(fields){
    return fields.map(field=>/^(?:拍摄类型|服务类型|服务项目)$/.test(normalLabel(field.label))&&typeof field.value==='string'
      ?{...field,value:field.value.replace(/\s*[·•|｜]\s*共\s*\d+\s*天\s*$/,'')}:field);
  }
  function split(booking){
    if(!booking||typeof booking!=='object')return {items:[],sharedFields:[]};
    const visits=Array.isArray(booking.visits)?booking.visits:[],count=visits.length,fields=fieldsOf(booking.plan);
    if(count<=1){
      const item=copy(booking);item._dailyProjection=true;item._sourceVisitCount=count;
      if(fields.length){item.plan={...(item.plan||{}),fields:copy(fields)};if(own(item.plan,'sourceFields'))item.plan.sourceFields=copy(fields);}
      else if(count===1)item.plan={...(item.plan||{}),fields:rebuild(booking,visits[0],true)};
      return {items:[item],sharedFields:[]};
    }
    const parsed=blocksOf(fields),mapped=parsed.blocks.length===count&&parsed.blocks.every((block,index)=>fits(block,visits[index],index));
    const shared=copy(parsed.shared);
    if(!mapped)for(const block of parsed.blocks)for(const field of block.original){const label=scope(field.label)?.label;if(label&&!knownDaily(label))shared.push(copy(field));}
    const items=visits.map((visit,index)=>{
      const item=copy(booking),daily=mapped?copy(parsed.blocks[index].fields):rebuild(booking,visit,false);
      item.visits=[copy(visit)];item._dailyProjection=true;item._sourceVisitCount=count;
      delete item.reference_total;delete item.reference_price_label;
      item.plan={...(item.plan||{}),fields:dailyFields([...copy(parsed.common),...daily])};
      delete item.plan.reference_total;delete item.plan.reference_price_label;
      if(own(item.plan,'sourceFields'))item.plan.sourceFields=copy(item.plan.fields);
      if(own(item,'sourceFields'))item.sourceFields=copy(item.plan.fields);
      if(own(item,'fields'))item.fields=copy(item.plan.fields);
      return item;
    });
    return {items,sharedFields:shared};
  }
  window.MuyanDailyPlans=Object.freeze({split});
})();
