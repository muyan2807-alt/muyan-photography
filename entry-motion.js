// Finite, optional motion. Never gate content, images, focus or navigation.
(()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  const boot=window.muyanEntryBoot;
  const quiet=()=>reduced.matches||boot?.lowMemory||document.body.classList.contains('qq-low-memory')||connection?.saveData;
  if(!Element.prototype.animate||quiet()){boot?.release(false);document.getElementById('entryWelcome')?.remove();return}
  const contentReady=callback=>{
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',callback,{once:true});else callback();
  };
  const ease='cubic-bezier(.2,.75,.25,1)';
  const running=new Set(),welcome=new Set(),detailsMotions=new WeakMap();
  let veil=null,photoAccent=null;
  function animate(element,frames,options,isWelcome=false){
    if(!element||quiet()||document.hidden)return null;
    // Multi-stage scenes use actual timeline offsets, not a global ease that
    // would rush through the hold and reveal phases before their intended times.
    const motion=element.animate(frames,{easing:frames.length>2?'linear':ease,...options});
    motion.id=isWelcome?'muyan-welcome':'muyan-detail';
    running.add(motion);if(isWelcome)welcome.add(motion);
    if(isWelcome&&boot?.startedAt)motion.currentTime=Math.max(0,performance.now()-boot.startedAt);
    const release=()=>{running.delete(motion);welcome.delete(motion)};
    motion.finished.then(release,release);
    return motion;
  }
  function stopWelcome(){
    welcome.forEach(motion=>motion.cancel());welcome.clear();
    veil?.remove();veil=null;
    photoAccent?.remove();photoAccent=null;
    boot?.release(false);
  }
  function stopAll(){stopWelcome();running.forEach(motion=>motion.cancel());running.clear()}
  // Expand content immediately; animate only its appearance, not container height.
  contentReady(()=>document.querySelectorAll('details').forEach(details=>{
    details.addEventListener('toggle',()=>{
      detailsMotions.get(details)?.forEach(motion=>motion.cancel());
      if(!details.open||quiet())return;
      const children=[...details.children].filter(child=>child.tagName!=='SUMMARY');
      const motions=children.slice(0,4).map(child=>animate(child,
        [{opacity:.75,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],
        {duration:190}
      )).filter(Boolean);
      detailsMotions.set(details,motions);
    });
  }));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAll()});
  window.addEventListener('pagehide',stopAll);
  if(reduced.addEventListener)reduced.addEventListener('change',()=>{if(quiet())stopAll()});
  if(connection?.addEventListener)connection.addEventListener('change',()=>{if(quiet())stopAll()});
  if(!boot?.active||document.hidden||scrollY>32){boot?.release(false);document.getElementById('entryWelcome')?.remove();return}
  if(!boot.startedAt)boot.startedAt=performance.now();
  boot.onStop=stopWelcome;
  // Blue-white light, a fine ribbon drawing and a diagonal stream of petals.
  // Generated shapes only: no photographs, fonts or other network dependencies.
  veil=document.getElementById('entryWelcome');
  if(!veil){stopWelcome();return}
  animate(veil,[{opacity:1,offset:0},{opacity:1,offset:.58},{opacity:0,offset:1}],{duration:2000},true);
  document.documentElement.classList.add('entry-playing');
  const flow=(x,y,rotation,scale)=>'translate(-50%,-50%) translate('+x+'px,'+y+'px) rotate('+rotation+'deg) scale('+scale+')';
  const streams=[
    {selector:'.entry-mist-blue',x:-innerWidth*.33,y:-innerHeight*.22,rotation:-22},
    {selector:'.entry-mist-lilac',x:innerWidth*.34,y:innerHeight*.21,rotation:24},
    {selector:'.entry-mist-white',x:innerWidth*.18,y:-innerHeight*.1,rotation:0}
  ];
  streams.forEach(stream=>animate(veil.querySelector(stream.selector),[
    {opacity:.75,transform:flow(stream.x,stream.y,stream.rotation,1.25),offset:0},
    {opacity:.9,transform:flow(stream.x*.55,stream.y*.5,stream.rotation+18,1.08),offset:.47},
    {opacity:.5,transform:flow(0,-innerHeight*.04,stream.rotation+35,.62),offset:.78},
    {opacity:0,transform:flow(0,-innerHeight*.04,stream.rotation+45,.22),offset:1}
  ],{duration:1950},true));
  animate(veil.querySelector('.entry-aura'),[
    {opacity:0,transform:'translate(-50%,-50%) scale(1.2)',offset:0},
    {opacity:.8,transform:'translate(-50%,-50%) scale(1)',offset:.4},
    {opacity:.75,transform:'translate(-50%,-50%) scale(.62)',offset:.72},
    {opacity:0,transform:'translate(-50%,-50%) scale(.3)',offset:1}
  ],{duration:2000},true);
  animate(veil.querySelector('.entry-identity'),[
    {opacity:0,transform:'translateY(12px)',offset:0},
    {opacity:1,transform:'translateY(0)',offset:.25},
    {opacity:1,transform:'translateY(0)',offset:.67},
    {opacity:0,transform:'translateY(-8px)',offset:1}
  ],{delay:100,duration:1550,fill:'both'},true);
  veil.querySelectorAll('.entry-bow path').forEach((path,index)=>{
    const length=path.getTotalLength();path.style.strokeDasharray=String(length);
    animate(path,[{strokeDashoffset:length},{strokeDashoffset:0}],{delay:150+index*70,duration:800,fill:'both'},true);
  });
  // Precompute a brief wind flight: inertia, aerodynamic drag, gravity and
  // spatial gusts. Playback uses finite compositor animations, not a JS loop.
  const petalCount=innerWidth<=720?56:72;
  const suspendedCount=Math.floor(petalCount*.72);
  const columns=Math.ceil(Math.sqrt(suspendedCount*innerWidth/innerHeight));
  const rows=Math.ceil(suspendedCount/columns);
  const variation=(index,salt)=>{
    const value=Math.sin((index+1)*127.1+salt*311.7)*43758.5453;
    return value-Math.floor(value);
  };
  for(let index=0;index<petalCount;index++){
    // Independent 2D positions, never x/y tied to one diagonal lane.
    const suspended=index<suspendedCount,rawDepth=variation(index,3);
    const depth=suspended?Math.pow(rawDepth,1.7):.45+rawDepth*.55;
    const size=Math.round(16+20*depth),opacity=.52+.38*depth;
    const speed=.22+depth*1.18;
    const delay=Math.round(suspended?variation(index,4)*110:60+variation(index,4)*280);
    const duration=Math.round(Math.min(1960-delay,1550+(1-depth)*360+variation(index,5)*80));
    const phase=index*2.399963,drag=7.5-size*.12;
    let x,y;
    if(suspended){
      x=innerWidth*((index%columns)+.1+.8*variation(index,1))/columns;
      y=innerHeight*(Math.floor(index/columns)+.1+.8*variation(index,2))/rows;
    }else if(index%2){
      x=innerWidth*(1.02+variation(index,1)*.16);
      y=innerHeight*(.06+variation(index,2)*.98);
    }else{
      x=innerWidth*(.06+variation(index,1)*.98);
      y=innerHeight*(1.02+variation(index,2)*.16);
    }
    const directionX=.68+variation(index,6)*.46,directionY=.67+variation(index,7)*.48;
    let vx=-innerWidth*.5*speed*directionX,vy=-innerHeight*.48*speed*directionY;
    let angle=(index*137.5)%360,spin=(index%2?1:-1)*(22+index%60);
    const petal=document.createElement('span');petal.className='entry-petal';petal.dataset.tone=['blue','lilac','white'][index%3];
    petal.style.width=size+'px';petal.style.height=Math.round(size*.46)+'px';
    veil.appendChild(petal);
    const seconds=duration/1000,steps=Math.ceil(seconds*36),dt=seconds/steps,frames=[];
    for(let step=0;step<=steps;step++){
      const time=step*dt,progress=step/steps;
      if(step){
        const gust=1+.18*Math.sin(time*3.7+.4)+.08*Math.sin(time*7.5+phase*.15);
        const eddy=Math.sin(x/innerWidth*3+y/innerHeight*2.2-time*4.4+phase*.25);
        const windX=innerWidth*speed*(-.72*directionX*gust+.17*eddy);
        const windY=innerHeight*speed*(-.74*directionY*gust-.12*eddy);
        vx+=(windX-vx)*drag*dt;
        vy+=((windY-vy)*drag+innerHeight*.07)*dt;
        x+=vx*dt;y+=vy*dt;
        spin+=(35*eddy+18*Math.sin(time*5+phase)-spin*.7)*dt;
        angle+=spin*dt;
      }
      const flip=Math.sin(time*(5.4+index%5*.4)+phase)*82+time*(index%2?75:-65);
      const pitch=Math.sin(time*4.4+phase)*18;
      const envelope=Math.max(0,Math.min(1,progress/.13,(1-progress)/.17));
      frames.push({
        opacity:opacity*envelope*(.85+.15*Math.abs(Math.cos(flip*Math.PI/180))),
        transform:'translate3d('+x.toFixed(2)+'px,'+y.toFixed(2)+'px,0) perspective(420px) rotateZ('+angle.toFixed(2)+'deg) rotateY('+flip.toFixed(2)+'deg) rotateX('+pitch.toFixed(2)+'deg)',
        offset:progress
      });
    }
    animate(petal,frames,{delay,duration,fill:'both',easing:'linear'},true);
  }
  contentReady(()=>{
  if(!boot.active)return;
  const stage=document.querySelector('.hero-stage');
  if(stage){
    photoAccent=document.createElement('div');photoAccent.className='entry-photo-accent';photoAccent.setAttribute('aria-hidden','true');
    photoAccent.innerHTML='<span class="entry-photo-sheen"></span><span class="entry-photo-frame"></span>';
    stage.appendChild(photoAccent);
    animate(photoAccent.querySelector('.entry-photo-sheen'),[
      {transform:'translateX(-120%)',opacity:0,offset:0},
      {transform:'translateX(-50%)',opacity:.75,offset:.3},
      {transform:'translateX(120%)',opacity:0,offset:1}
    ],{delay:1000,duration:1000,fill:'both'},true);
    animate(photoAccent.querySelector('.entry-photo-frame'),[
      {opacity:0,transform:'scale(.98)',offset:0},
      {opacity:.9,transform:'scale(1)',offset:.4},
      {opacity:0,transform:'scale(1)',offset:1}
    ],{delay:700,duration:1250,fill:'both'},true);
  }
  function enter(selector,delay,duration,movement=0,scale=1){
    animate(document.querySelector(selector),[
      {opacity:.5,transform:'translateY('+movement+'px) scale('+scale+')'},
      {opacity:1,transform:'translateY(0) scale(1)'}
    ],{delay,duration,fill:'backwards'},true);
  }
  enter('.nav-inner',800,800);
  enter('.hero h1',900,950,12);
  enter('.hero-slogan',1000,850,8);
  enter('.hero-cta',1100,750); // Buttons never move away from initial hit targets.
  enter('.hero-stage',800,1150,12,.98);
  enter('.hero-tail',1050,850);
  });
})();
