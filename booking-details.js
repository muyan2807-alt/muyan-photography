/* Shared, local form editors. Their values are never sent without explicit API support. */
(() => {
  'use strict';
  const element=(tag,cls='',copy='')=>{const item=document.createElement(tag);if(cls)item.className=cls;if(copy)item.textContent=copy;return item;};
  const tidy=value=>String(value??'').trim();
  function normalizeTime(value){
    const raw=tidy(value);let match=raw.match(/^(\d{1,2}):(\d{2})$/);
    if(!match&&/^\d{3,4}$/.test(raw))match=[raw,raw.slice(0,-2),raw.slice(-2)];
    if(!match||Number(match[1])>23||Number(match[2])>59)return '';
    return match[1].padStart(2,'0')+':'+match[2];
  }
  function timeRange(host,{idPrefix,value='',required=true,disabled=false,onChange}={}){
    host.replaceChildren();host.classList.add('details-time-range');
    const grid=element('div','details-range-grid'),legacy=element('p','field-help details-legacy-time');
    const inputs=['开始时间','结束时间'].map((copy,index)=>{
      const label=element('label','',copy+(required?' *':'')),input=element('input');
      input.type='text';input.dataset.picker='time';input.id=idPrefix+(index?'-end':'-start');input.maxLength=5;input.inputMode='none';input.autocomplete='off';input.placeholder='点选时间';input.required=required;input.disabled=disabled;
      label.append(input);grid.append(label);return input;
    });
    host.append(grid,legacy);let previous='';
    function current(){const a=normalizeTime(inputs[0].value),b=normalizeTime(inputs[1].value);return a&&b&&b>a?a+'–'+b:'';}
    function validate(){
      const start=normalizeTime(inputs[0].value),end=normalizeTime(inputs[1].value);
      inputs.forEach((input,index)=>{const valid=index?end:start;input.setCustomValidity(input.disabled?'':tidy(input.value)&&!valid?'请重新选择有效时间。':'');});
      if(start&&end&&end<=start&&!inputs[1].disabled)inputs[1].setCustomValidity('结束时间需晚于开始时间。');
      inputs[1].dataset.timeMin=start;
      legacy.hidden=!previous;legacy.textContent=previous?'原意向：'+previous+'。请重新点选开始与结束时间。':'';
    }
    function emit(){previous='';validate();onChange?.(current());}
    inputs.forEach(input=>{input.addEventListener('input',emit);input.addEventListener('blur',()=>{const normalized=normalizeTime(input.value);if(normalized&&input.value!==normalized){input.value=normalized;emit();}});});
    function setValue(raw){
      const parts=String(raw||'').split(/\s*[–—~～至]\s*/);if(parts.length===1&&/^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/.test(String(raw)))parts.splice(0,1,...String(raw).split(/\s*-\s*/));
      const start=parts.length===2?normalizeTime(parts[0]):'',end=parts.length===2?normalizeTime(parts[1]):'';
      inputs[0].value=start;inputs[1].value=end;previous=raw&&(!start||!end)?String(raw).slice(0,100):'';validate();
    }
    setValue(value);
    return Object.freeze({value:current,setValue,setDisabled(state){inputs.forEach(input=>input.disabled=Boolean(state));validate();},destroy(){host.replaceChildren();}});
  }
  function participants(host,{idPrefix,items=[],count=1,primary={cn:'',character:''},showPrimary=true,compact=false,onChange}={}){
    host.replaceChildren();host.classList.add('details-participants');host.classList.toggle('is-compact',Boolean(compact));
    const heading=element('h3','','每位出镜者'),note=element('p','field-help','第一位沿用上方的 CN 与角色，请补全其余每位伙伴的信息。'),list=element('div','details-person-list');heading.hidden=note.hidden=Boolean(compact);host.append(heading,note,list);
    const rows=[];let size=1,isDisabled=false,first={cn:tidy(primary.cn),character:tidy(primary.character)};
    function row(index){
      const card=element('section','details-person');card.dataset.personIndex=String(index);card.append(element('h4','','第 '+(index+1)+' 位'));
      if(!index){const line=element('p','details-primary-person');card.append(line);list.append(card);return {card,line};}
      const grid=element('div','field-grid');const fields={};
      for(const [key,copy,max] of [['cn','CN / 昵称',40],['character','角色',100]]){
        const label=element('label','',copy+' *'),input=element('input');input.type='text';input.id=idPrefix+'-'+index+'-'+key;input.maxLength=max;input.required=true;input.placeholder=key==='cn'?'这位伙伴的 CN':'这位伙伴的角色';
        input.addEventListener('input',()=>{input.setCustomValidity(!input.disabled&&!tidy(input.value)?'请填写'+copy+'。':'');onChange?.(value());});label.append(input);grid.append(label);fields[key]=input;
      }
      card.append(grid);list.append(card);return {card,...fields};
    }
    function render(){
      while(rows.length<size)rows.push(row(rows.length));
      rows.forEach((item,index)=>{item.card.hidden=index>=size||index===0&&!showPrimary;if(index){for(const key of ['cn','character']){item[key].disabled=isDisabled||index>=size;item[key].setCustomValidity('');}}});
      rows[0].line.textContent=(first.cn||'CN 待填写')+' / '+(first.character||'角色待填写');
    }
    function setCount(number){size=Math.max(1,Math.min(20,Math.trunc(Number(number)||1)));render();}
    function setValue(values){
      const source=Array.isArray(values)?values.slice(0,20):[];while(rows.length<Math.max(size,source.length))rows.push(row(rows.length));
      rows.forEach((item,index)=>{if(index){item.cn.value=tidy(source[index]?.cn).slice(0,40);item.character.value=tidy(source[index]?.character).slice(0,100);}});render();
    }
    function value(){return Array.from({length:size},(_,index)=>index?{cn:tidy(rows[index].cn.value),character:tidy(rows[index].character.value)}:{...first});}
    setCount(count);setValue(items);
    return Object.freeze({value,setCount,setValue,setPrimary(next){first={cn:tidy(next?.cn),character:tidy(next?.character)};render();},setDisabled(state){isDisabled=Boolean(state);render();},destroy(){host.replaceChildren();}});
  }
  function locations(host,{idPrefix,items=[],required=true,onChange}={}){
    host.replaceChildren();host.classList.add('details-locations');
    const heading=element('h3','','地点 / 场景安排'),note=element('p','field-help','选择数量，再按希望的拍摄顺序填写；同一地点的不同角色也可分别列出。地点数量不会自动重复计费，具体费用以沟通确认为准。');
    const label=element('label','', '地点 / 场景数量'),count=element('select');count.id=idPrefix+'-count';for(let number=1;number<=10;number++)count.append(new Option(number+' 个',String(number)));label.append(count);
    const list=element('div','details-location-list');host.append(heading,note,label,list);let values=[],isDisabled=false;const rows=[];
    function update(){
      rows.forEach((row,index)=>{row.title.textContent='第 '+(index+1)+' 处';row.input.id=idPrefix+'-'+index;row.input.disabled=isDisabled;row.up.disabled=isDisabled||index===0;row.down.disabled=isDisabled||index===rows.length-1;});count.disabled=isDisabled;
    }
    function emit(){const live=rows.map(row=>row.input.value);values=[...live,...values.slice(live.length)];onChange?.(value());}
    function addRow(raw=''){
      const card=element('section','details-location-row'),title=element('label'),input=element('input'),buttons=element('div','details-location-actions');
      input.type='text';input.maxLength=150;input.required=required;input.placeholder='地点名称、角色或拍摄场景';input.value=raw;title.append(input);
      const name=element('span');title.prepend(name);const up=element('button','','上移 ↑'),down=element('button','','下移 ↓');up.type=down.type='button';buttons.append(up,down);card.append(title,buttons);
      const row={card,title:name,input,up,down};
      for(const [button,offset] of [[up,-1],[down,1]])button.addEventListener('click',()=>{const index=rows.indexOf(row),next=index+offset;if(isDisabled||next<0||next>=rows.length)return;[rows[index],rows[next]]=[rows[next],rows[index]];rows.forEach(item=>list.append(item.card));update();emit();button.focus();});
      input.addEventListener('input',()=>{input.setCustomValidity(!input.disabled&&input.required&&!tidy(input.value)?'请填写此处地点或场景。':'');emit();});rows.push(row);list.append(card);
    }
    function resize(number){
      values=rows.length?[...rows.map(row=>row.input.value),...values.slice(rows.length)]:values;const size=Math.max(1,Math.min(10,Math.trunc(Number(number)||2)));
      while(rows.length<size)addRow(values[rows.length]||'');while(rows.length>size)rows.pop().card.remove();count.value=String(size);update();
    }
    function setValue(source){values=Array.isArray(source)?source.slice(0,10).map(value=>String(value||'').slice(0,150)):[];rows.splice(0).forEach(row=>row.card.remove());resize(values.length||2);}
    function value(){return rows.map(row=>tidy(row.input.value));}
    count.addEventListener('change',()=>{resize(count.value);emit();});setValue(items);
    return Object.freeze({value,setValue,setDisabled(state){isDisabled=Boolean(state);update();rows.forEach(row=>row.input.setCustomValidity(''));},destroy(){host.replaceChildren();}});
  }
  // Public website rule confirmed by 慕言: new multi-location / role requests add 150.
  // Normalize only the selectable catalog; never rewrite existing booking price snapshots.
  function normalizeCatalog(value){
    if(!value||!Array.isArray(value.portrait_addons))return value;
    return {...value,portrait_addons:value.portrait_addons.map(item=>item.id==='multi_location_role'
      ?{...item,label:'远的多地点 / 同地方多角色 +150',amount:150,pricing:'fixed_addition'}:item)};
  }
  window.MuyanBookingDetails=Object.freeze({timeRange,participants,locations,normalizeCatalog});
})();
