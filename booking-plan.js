/* One glass summary component for the form, submitted plan and customer lookup. */
(() => {
  'use strict';
  const formFields=[{"label":"所属作品 / IP","value":"等待填写作品","rowId":"summaryWorkRow","labelId":"","valueId":"summaryWork","hidden":true,"wide":false},{"label":"拍摄类型","value":"正片 · 单人","rowId":"","labelId":"summaryTypeLabel","valueId":"summaryType","hidden":false,"wide":false},{"label":"参考总价","value":"待沟通确认","rowId":"summaryPriceRow","labelId":"","valueId":"summaryPrice","hidden":true,"wide":false},{"label":"CN / 昵称","value":"等待填写 CN","rowId":"","labelId":"","valueId":"summaryNickname","hidden":false,"wide":false},{"label":"角色","value":"等待填写角色","rowId":"","labelId":"","valueId":"summaryRole","hidden":false,"wide":false},{"label":"每位出镜者 / 角色","value":"","rowId":"summaryParticipantsRow","labelId":"","valueId":"summaryParticipants","hidden":true,"wide":true},{"label":"地点 / 场景顺序","value":"","rowId":"summaryLocationsRow","labelId":"","valueId":"summaryLocations","hidden":true,"wide":true},{"label":"同行单主 / 角色","value":"等待填写同行信息","rowId":"summaryPartnerRow","labelId":"","valueId":"summaryPartner","hidden":true,"wide":false},{"label":"场照套餐","value":"等待选择套餐","rowId":"summaryPackageRow","labelId":"","valueId":"summaryPackage","hidden":true,"wide":false},{"label":"拍摄风格","value":"等待选择风格","rowId":"summaryStyleRow","labelId":"","valueId":"summaryStyle","hidden":true,"wide":false},{"label":"参加漫展","value":"等待选择漫展","rowId":"summaryEventRow","labelId":"","valueId":"summaryEvent","hidden":true,"wide":false},{"label":"期望时间","value":"还可以慢慢安排","rowId":"summaryTimeRow","labelId":"summaryTimeLabel","valueId":"summaryTime","hidden":false,"wide":false},{"label":"拍摄地点","value":"一起选个喜欢的地方","rowId":"summaryLocationRow","labelId":"","valueId":"summaryLocation","hidden":false,"wide":false},{"label":"附加需求","value":"","rowId":"summaryAddonsRow","labelId":"","valueId":"summaryAddons","hidden":true,"wide":false},{"label":"外景 / 棚拍","value":"","rowId":"summaryVenueRow","labelId":"","valueId":"summaryVenue","hidden":true,"wide":false},{"label":"效果需求","value":"","rowId":"summaryEffectRow","labelId":"","valueId":"summaryEffect","hidden":true,"wide":true},{"label":"备注","value":"","rowId":"summaryNotesRow","labelId":"","valueId":"summaryNotes","hidden":true,"wide":true}];
  const element=(tag,className='',value='')=>{const node=document.createElement(tag);if(className)node.className=className;node.textContent=String(value??'');return node;};
  const hasWideLabel=label=>/出镜者|参与单主|参与者|人员名单|地点.*顺序|地点.*安排|场景.*顺序|效果需求|后期效果|^备注/.test(label);
  const isCodeField=field=>/^(?:查询验证码|四位验证码|验证码|查询码|修改码)$/.test(String(field?.label||'').replace(/^(?:D\s*\d+|第\s*\d+\s*天)\s*[·•:：|｜/／-]\s*/i,'').replace(/\s+/g,''));
  const validCode=value=>typeof value==='string'&&/^\d{4}$/.test(value)?value:'';
  function codeOf(input={}){
    for(const source of [input,input.plan]){
      if(!source)continue;
      for(const key of ['verification_code','query_verification_code','edit_code']){const code=validCode(source[key]);if(code)return code;}
      for(const fields of [source.fields,source.sourceFields])for(const field of Array.isArray(fields)?fields:[]){const code=isCodeField(field)&&validCode(field.value);if(code)return code;}
    }
    return '';
  }
  const peopleField=field=>/出镜者|参与者|参与单主|人员名单|同行.*角色|CN.*角色/i.test(field.label);
  function card(root,input={},options={}){
    const form=options.form===true;
    let fields=(form?formFields:(Array.isArray(input.sourceFields)?input.sourceFields:Array.isArray(input.fields)?input.fields:[])).map(field=>({...field}));
    const code=form?'':codeOf(input);
    if(!form){
      const visit=input.visits?.length===1?input.visits[0]:input,solo=visit.party_type==='single'||Number(visit.people)===1;
      fields=fields.filter(field=>!isCodeField(field)&&!(solo&&peopleField(field)));
      const service=input.service_label||input.serviceLabel||({portrait:'正片拍摄',snow:'雪景拍摄',event:'场照拍摄',effects:'后期 / 特效'})[input.service];
      if(service&&!fields.some(field=>/^(?:拍摄类型|服务类型)$/.test(field.label)))fields.unshift({label:'拍摄类型',value:service});
      if(input.nickname&&!fields.some(field=>/^(?:CN\s*\/\s*昵称|CN|昵称)$/i.test(field.label)))fields.push({label:'CN / 昵称',value:input.nickname});
    }
    root.replaceChildren();root.classList.add('plan-card');
    const head=element('div','summary-heading plan-head'),spark=element('span','summary-spark','✧'),copy=element('div','plan-heading-copy');spark.setAttribute('aria-hidden','true');
    const title=element(options.headingTag==='h3'?'h3':'h2','plan-title',options.heading||'这次的小计划');
    if(form)title.id='summaryTitle';
    const subtitle=element('p','plan-subtitle',options.subtitle??(input.intent_number?'预约编号 '+input.intent_number:''));subtitle.hidden=!subtitle.textContent;
    copy.append(title,subtitle);head.append(spark,copy);
    const badge=element('span','plan-status',options.badge||'');badge.hidden=!badge.textContent;head.append(badge);root.append(head);
    const list=element('dl','summary-fields');
    for(const field of fields){
      if(!field||typeof field.label!=='string')continue;
      const wide=form?field.wide:typeof field.wide==='boolean'?field.wide:hasWideLabel(field.label);
      const row=element('div',wide?'details-summary-wide':''),label=element('dt','',field.label),value=element('dd','',field.value);
      if(form){if(field.rowId)row.id=field.rowId;if(field.labelId)label.id=field.labelId;if(field.valueId)value.id=field.valueId;row.hidden=field.hidden;}
      row.append(label,value);list.append(row);
    }
    const visible=Array.from(list.children).filter(row=>!row.hidden);
    if(visible.length%2)visible[visible.length-1].classList.add('summary-wide');
    root.append(list);
    if(code){const area=element('section','plan-verification'),label=element('span','plan-verification-label','查询／修改验证码'),digits=element('code','plan-verification-code',code),hint=element('small','plan-verification-hint','请截图妥善保存');area.setAttribute('aria-label','查询与修改验证码');area.append(label,digits,hint);root.append(area);}
    if(form){const days=element('div');days.id='serviceDaysSummary';days.hidden=true;root.append(days);}
    const foot=element('p','summary-foot',options.foot??input.foot??'意向先收好，档期沟通后再确认。');if(form)foot.id='summaryFoot';foot.hidden=!foot.textContent;root.append(foot);
    if(input.preview)root.append(element('p','plan-preview-note','本地预览 · 未登记真实预约'));
  }
  function snapshot(root){
    const fields=[];
    root.querySelectorAll('dl').forEach(list=>{
      if(list.hidden||list.parentElement.hidden)return;
      Array.from(list.children).filter(row=>!row.hidden).forEach(row=>{
        const label=row.querySelector('dt'),value=row.querySelector('dd');
        if(label&&value)fields.push({label:label.textContent,value:value.textContent,wide:row.matches('.details-summary-wide,.summary-wide')});
      });
    });
    return {fields,foot:root.querySelector('.summary-foot')?.textContent||''};
  }
  window.MuyanPlanImage=Object.freeze({card,snapshot,codeOf});
  const formCard=document.querySelector('.submission .summary-card');
  if(formCard)card(formCard,{}, {form:true,subtitle:'提交前，再看一眼这份期待。'});
})();
