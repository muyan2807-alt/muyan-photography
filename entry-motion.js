// One short welcome sequence. Content is always available; there is no loading gate.
(()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  const navigation=performance.getEntriesByType?.('navigation')[0];
  if(reduced.matches||document.body.classList.contains('qq-low-memory')||connection?.saveData||
     document.hidden||scrollY>32||(location.hash&&location.hash!=='#top')||
     navigation?.type==='back_forward'||!Element.prototype.animate)return;
  const motions=[];
  const ease='cubic-bezier(.2,.7,.2,1)';
  function enter(selector,delay,duration,movement){
    const element=document.querySelector(selector);if(!element)return;
    const frames=movement
      ?[{opacity:.55,transform:'translateY('+movement+'px)'},{opacity:1,transform:'translateY(0)'}]
      :[{opacity:.65},{opacity:1}];
    const motion=element.animate(frames,{delay,duration,easing:ease,fill:'backwards'});
    motion.id='muyan-entry-'+selector;
    motion.finished.catch(()=>{});motions.push(motion);
  }
  enter('.hero h1',0,540,8);
  enter('.hero-slogan',65,540,6);
  // Interactive buttons keep their physical position throughout entry.
  enter('.hero-cta',100,430,0);
  enter('.hero-stage',120,650,10);
  enter('.hero-tail',180,500,0);
  let cleanupTimer=0;
  const events=['wheel','touchstart','pointerdown','keydown','pagehide'];
  function stop(){
    clearTimeout(cleanupTimer);motions.forEach(motion=>motion.cancel());
    events.forEach(name=>window.removeEventListener(name,stop));
    document.removeEventListener('visibilitychange',visibility);
    if(reduced.removeEventListener)reduced.removeEventListener('change',reduce);
  }
  function visibility(){if(document.hidden)stop()}
  function reduce(){if(reduced.matches)stop()}
  events.forEach(name=>window.addEventListener(name,stop,{passive:true}));
  document.addEventListener('visibilitychange',visibility);
  if(reduced.addEventListener)reduced.addEventListener('change',reduce);
  cleanupTimer=setTimeout(stop,1000);
})();
