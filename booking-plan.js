/* Render the submitted plan locally. No customer details leave the browser. */
(() => {
  'use strict';
  const font='"Microsoft YaHei", "PingFang SC", -apple-system, sans-serif';
  function lines(ctx,value,width){
    const result=[];
    for(const paragraph of String(value||'—').split('\n')){
      let line='';
      for(const character of Array.from(paragraph)){
        if(line&&ctx.measureText(line+character).width>width){result.push(line);line='';}
        line+=character;
      }
      result.push(line);
    }
    return result;
  }
  function rounded(ctx,x,y,w,h,r){
    ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
  }
  function render(plan){
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
    if(!ctx)throw Error('当前浏览器暂不支持生成图片');
    const compact=matchMedia('(max-width:700px)').matches,width=compact?360:600,padding=compact?24:42,gap=compact?18:26,cell=(width-padding*2-gap)/2,rows=[];
    ctx.font='17px '+font;
    for(let i=0;i<plan.fields.length;i+=2){
      const pair=plan.fields.slice(i,i+2);const fields=pair.map(field=>({...field,lines:lines(ctx,field.value,pair.length===1?width-padding*2:cell)}));
      rows.push({fields,height:25+Math.max(...fields.map(field=>field.lines.length))*27+26});
    }
    ctx.font='11px '+font;const numberLines=lines(ctx,'意向编号 '+(plan.intent_number||String(plan.id||'').slice(0,12).toUpperCase()),width-padding*2);
    ctx.font='12px '+font;const footLines=lines(ctx,plan.foot||'档期与具体安排，以双方沟通确认为准。',width-padding*2);
    const footerHeight=30+footLines.length*20+numberLines.length*18+35+(plan.preview?26:0);
    const height=192+rows.reduce((sum,row)=>sum+row.height,0)+footerHeight,scale=1200/width;
    canvas.width=1200;canvas.height=Math.ceil(height*scale);ctx.scale(scale,scale);
    const background=ctx.createLinearGradient(0,0,width,height);background.addColorStop(0,'#f7fcff');background.addColorStop(1,'#e7f3fd');
    ctx.fillStyle=background;ctx.fillRect(0,0,width,height);
    const glow=ctx.createRadialGradient(width-80,60,0,width-80,60,400);glow.addColorStop(0,'#ffffffd9');glow.addColorStop(1,'#ffffff00');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
    rounded(ctx,12,12,width-24,height-24,27);ctx.fillStyle='#ffffff50';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#4c748d';ctx.font='12px '+font;ctx.fillText('慕言 · 次元映像',padding,47);
    ctx.save();ctx.translate(padding+15,87);ctx.beginPath();ctx.moveTo(0,-17);ctx.quadraticCurveTo(2,-2,17,0);ctx.quadraticCurveTo(2,2,0,17);ctx.quadraticCurveTo(-2,2,-17,0);ctx.quadraticCurveTo(-2,-2,0,-17);ctx.strokeStyle='#86aec7';ctx.lineWidth=1.7;ctx.stroke();ctx.restore();
    ctx.fillStyle='#2e526b';ctx.font='600 '+(compact?23:28)+'px '+font;ctx.fillText('这次的小计划',padding+48,96);
    ctx.fillStyle='#6d899e';ctx.font=(compact?'11px ':'13px ')+font;ctx.fillText('截图保存，发给慕言确认这次安排。',padding+48,122);
    ctx.beginPath();ctx.moveTo(padding,148);ctx.lineTo(width-padding,148);ctx.strokeStyle='#d2e4f0';ctx.lineWidth=1;ctx.stroke();
    let y=181;
    for(const row of rows){
      row.fields.forEach((field,index)=>{
        const x=padding+index*(cell+gap);ctx.fillStyle='#7793a6';ctx.font='13px '+font;ctx.fillText(field.label,x,y);
        ctx.fillStyle='#3d6985';ctx.font='17px '+font;field.lines.forEach((line,i)=>ctx.fillText(line,x,y+29+i*27));
      });
      y+=row.height;
    }
    ctx.beginPath();ctx.moveTo(padding,y+3);ctx.lineTo(width-padding,y+3);ctx.strokeStyle='#d2e4f0';ctx.stroke();
    ctx.fillStyle='#658397';ctx.font='12px '+font;footLines.forEach((line,i)=>ctx.fillText(line,padding,y+30+i*20));
    const numberY=y+30+footLines.length*20+8;
    if(plan.id||plan.intent_number){ctx.font='11px '+font;ctx.fillStyle='#809bac';numberLines.forEach((line,i)=>ctx.fillText(line,padding,numberY+i*18));}
    if(plan.preview){ctx.font='11px '+font;ctx.fillText('本地预览 · 未提交真实预约',padding,numberY+numberLines.length*18+18);}
    return canvas;
  }
  window.MuyanPlanImage=Object.freeze({render});
})();
