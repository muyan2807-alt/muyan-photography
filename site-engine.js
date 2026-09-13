
// ===== 导航 =====
const nav=document.getElementById('nav'),burger=document.getElementById('burger'),links=document.getElementById('navLinks');
let navScrollFrame=0;
window.addEventListener('scroll',()=>{
  if(navScrollFrame)return;
  navScrollFrame=requestAnimationFrame(()=>{navScrollFrame=0;nav.classList.toggle('scrolled',window.scrollY>10)});
},{passive:true});
function setMenuOpen(open){
  burger.classList.toggle('open',open);links.classList.toggle('open',open);
  burger.setAttribute('aria-expanded',String(open));burger.setAttribute('aria-label',open?'关闭菜单':'打开菜单');
}
burger.addEventListener('click',()=>setMenuOpen(!links.classList.contains('open')));
links.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setMenuOpen(false)));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&links.classList.contains('open')){setMenuOpen(false);burger.focus()}});

// 固定快捷导航：显示当前浏览区域，方便随时切换例图、价格、联系方式与页面顶部
const quickJumpLinks=[...document.querySelectorAll('.quick-action[data-jump]')];
let quickNavLockUntil=0;
function setActiveQuickJump(id){
  document.body.classList.toggle('price-in-view',id==='price');
  quickJumpLinks.forEach(link=>{
    const active=link.dataset.jump===id;
    link.classList.toggle('is-active',active);
    if(active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');
  });
}
quickJumpLinks.forEach(link=>link.addEventListener('click',()=>{
  quickNavLockUntil=Date.now()+1000;
  setActiveQuickJump(link.dataset.jump);
}));
if('IntersectionObserver' in window){
  const quickNavObserver=new IntersectionObserver(entries=>{
    if(Date.now()<quickNavLockUntil)return;
    const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if(visible)setActiveQuickJump(visible.target.id);
  },{rootMargin:'-22% 0px -58% 0px',threshold:[0,.1,.25,.5]});
  ['top','works','price','contact'].forEach(id=>quickNavObserver.observe(document.getElementById(id)));
}

// 左侧蕾姆在作品展示区域完全离开屏幕后才淡入；主页及作品区域内始终隐藏。
const worksSection=document.getElementById('works');
let worksCompanionFrame=0;
const syncWorksCompanion=()=>{
  cancelAnimationFrame(worksCompanionFrame);
  worksCompanionFrame=requestAnimationFrame(()=>{
    const navBottom=document.querySelector('.nav')?.getBoundingClientRect().bottom||0;
    const rect=worksSection.getBoundingClientRect();
    document.body.classList.toggle('works-passed',rect.bottom<=navBottom+8);
    document.body.classList.toggle('works-in-view',rect.top<innerHeight-90&&rect.bottom>navBottom+8);
  });
};
addEventListener('scroll',syncWorksCompanion,{passive:true});
addEventListener('resize',syncWorksCompanion,{passive:true});
addEventListener('pageshow',syncWorksCompanion);
if('ResizeObserver' in window)new ResizeObserver(syncWorksCompanion).observe(worksSection);
syncWorksCompanion();

// ===== 联系方式复制与网页分享 =====
const PUBLIC_SITE_URL='https://muyan2807-alt.github.io/muyan-photography/';
const shareStatus=document.getElementById('shareStatus');
const contactSection=document.getElementById('contact');
let shareStatusTimer=0;
function alignContactSection(){
  if(location.hash!=='#contact')return;
  const behavior=window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';
  contactSection.scrollIntoView({behavior,block:'start'});
  setTimeout(()=>{if(location.hash==='#contact')contactSection.scrollIntoView({behavior:'auto',block:'start'})},700);
}
document.querySelectorAll('a[href="#contact"]').forEach(link=>link.addEventListener('click',()=>setTimeout(alignContactSection,0)));
window.addEventListener('load',()=>{if(location.hash==='#contact')setTimeout(alignContactSection,0)},{once:true});
if('IntersectionObserver' in window){
  const contactObserver=new IntersectionObserver(entries=>{
    document.body.classList.toggle('contact-in-view',entries[0].isIntersecting);
  },{threshold:.08});
  contactObserver.observe(contactSection);
}
function showShareStatus(message){
  clearTimeout(shareStatusTimer);shareStatus.textContent=message;shareStatus.hidden=false;
  shareStatusTimer=setTimeout(()=>{shareStatus.hidden=true},2600);
}
async function copyPlainText(text){
  if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);return}
  const area=document.createElement('textarea');area.value=text;area.setAttribute('readonly','');area.style.position='fixed';area.style.opacity='0';
  document.body.appendChild(area);
  try{area.select();if(!document.execCommand('copy'))throw new Error('copy-failed')}
  finally{area.remove()}
}
async function shareWebsite(){
  try{
    if(navigator.share){
      await navigator.share({title:document.title,text:'慕言·次元映像作品与约拍信息',url:PUBLIC_SITE_URL});
      showShareStatus('已返回网页');
    }else{
      await copyPlainText(PUBLIC_SITE_URL);showShareStatus('网址已复制，可以发给朋友了');
    }
  }catch(error){if(error.name!=='AbortError')showShareStatus('暂时无法分享，请稍后再试')}
}
document.getElementById('shareSiteFooter').addEventListener('click',shareWebsite);
document.querySelectorAll('.copy-contact').forEach(button=>button.addEventListener('click',async()=>{
  const value=button.dataset.copyValue,label=button.dataset.copyLabel;
  try{await copyPlainText(value);showShareStatus(`${label} ${value} 已复制`)}
  catch{showShareStatus(`复制失败，请手动复制${label}`)}
}));

// ===== 图片画廊数据 =====
const GALLERIES = [{"key":"zhengpian","cats":["外景","棚子"],"fixed":{"外景":["images/works/hd-2e51bcc1dab564f3036bba26.jpg","images/works/hd-c1e6573cdfb8d7277ee5c81e.jpg","images/works/hd-f2c8659f3e27f16a21ee6659.jpg"],"棚子":["images/works/hd-24bf8345a1125d9b7c65d70b.jpg","images/works/hd-0da04ad7b0bde84c6b1939d6.jpg","images/works/hd-b5f40bbbfe9ab6dc03d9a48c.jpg"],"all":["images/works/hd-2e51bcc1dab564f3036bba26.jpg","images/works/hd-c1e6573cdfb8d7277ee5c81e.jpg","images/works/hd-f2c8659f3e27f16a21ee6659.jpg","images/works/hd-24bf8345a1125d9b7c65d70b.jpg","images/works/hd-0da04ad7b0bde84c6b1939d6.jpg","images/works/hd-b5f40bbbfe9ab6dc03d9a48c.jpg"]},"secondary":{"外景":["images/works/hd-0fad050a5af7f1b77193a80b.jpg"],"棚子":[],"all":["images/works/hd-0fad050a5af7f1b77193a80b.jpg"]},"images":[{"s":"images/works/hd-3b1a96df1f3810ca247f9137.jpg","w":5120,"h":2891,"cats":["外景"],"c":"01"},{"s":"images/works/hd-60565e476e45a53ef63276c3.jpg","w":3840,"h":2610,"cats":["外景"],"c":"02"},{"s":"images/works/hd-2c6e03ae8eb0b454a33a321e.jpg","w":3784,"h":2378,"cats":["外景"],"c":"03"},{"s":"images/works/hd-3edeca3a3c6007c8d89de926.jpg","w":5120,"h":2880,"cats":["外景"],"c":"04"},{"s":"images/works/hd-6b3a52d4d3aec6572bc44199.jpg","w":1500,"h":2000,"cats":["外景"],"c":"05"},{"s":"images/works/hd-0cd7561599409d4a4465254e.jpg","w":1600,"h":2400,"cats":["外景"],"c":"06"},{"s":"images/works/hd-7a7e9a49b4e088ff7aca29ca.jpg","w":3276,"h":5120,"cats":["外景"],"c":"07"},{"s":"images/works/hd-3b84a4b639daa7c6249985c5.jpg","w":4096,"h":2730,"cats":["外景"],"c":"08"},{"s":"images/works/hd-c813d124833e3014d6455430.jpg","w":5120,"h":3413,"cats":["外景"],"c":"11"},{"s":"images/works/hd-840b5de7cb0c83d6a6ea1fb1.jpg","w":4096,"h":2730,"cats":["外景"],"c":"12"},{"s":"images/works/hd-f27e75a21f0f91fe8503f4f7.jpg","w":5120,"h":3413,"cats":["外景"],"c":"13"},{"s":"images/works/hd-b494f817e44258b0c7d7b9e7.jpg","w":5120,"h":2880,"cats":["外景"],"c":"14"},{"s":"images/works/hd-2d59446f55ffe9a5a340aedd.jpg","w":5120,"h":2880,"cats":["外景"],"c":"15"},{"s":"images/works/hd-228ca14c3ec943564612f34b.jpg","w":5120,"h":2195,"cats":["外景"],"c":"16"},{"s":"images/works/hd-ed258d5d1b8aa6d7a9e2cb25.jpg","w":5120,"h":3413,"cats":["外景"],"c":"17"},{"s":"images/works/hd-356038c5ca010b96ea4105e3.jpg","w":4095,"h":2685,"cats":["外景"],"c":"18"},{"s":"images/works/hd-3552594ca0bce9d48ea8135f.jpg","w":2678,"h":1600,"cats":["外景"],"c":"19"},{"s":"images/works/hd-76404e1fcc3f72bdb9fc3d8a.jpg","w":5120,"h":3413,"cats":["外景"],"c":"20"},{"s":"images/works/hd-28ed4d5d1131f4ab338453b3.jpg","w":5120,"h":2880,"cats":["外景"],"c":"22"},{"s":"images/works/hd-8ee64d4a735329ec3505641b.jpg","w":5120,"h":2880,"cats":["外景"],"c":"24"},{"s":"images/works/hd-dd9cfbe824fec071552482fc.jpg","w":5120,"h":2880,"cats":["外景"],"c":"26"},{"s":"images/works/hd-2f0a03988d094f76b444c6ec.jpg","w":5120,"h":2880,"cats":["外景"],"c":"27"},{"s":"images/works/hd-e2d30017b93615a460688996.jpg","w":5120,"h":2880,"cats":["外景"],"c":"28"},{"s":"images/works/hd-8c0201c3759bb2b12be2c01a.jpg","w":5120,"h":2880,"cats":["外景"],"c":"CBA7A010130242A06E82BCEC10DA6D1A"},{"s":"images/works/hd-78820b76f49663783b4dac96.jpg","w":5120,"h":3413,"cats":["外景"],"c":"DSC01999"},{"s":"images/works/hd-f2f4bdce9d4a5df409914c9c.jpg","w":5120,"h":2880,"cats":["外景"],"c":"DSC02103"},{"s":"images/works/hd-d61c3ab2493e69dcd82e7a38.jpg","w":4096,"h":2304,"cats":["外景"],"c":"DSC02267"},{"s":"images/works/hd-0fad050a5af7f1b77193a80b.jpg","w":5120,"h":2879,"cats":["外景"],"c":"副图"},{"s":"images/works/hd-c1e6573cdfb8d7277ee5c81e.jpg","w":3414,"h":5120,"cats":["外景"],"c":"首图 (2)"},{"s":"images/works/hd-f2c8659f3e27f16a21ee6659.jpg","w":1079,"h":1620,"cats":["外景"],"c":"首图 (3)"},{"s":"images/works/hd-2e51bcc1dab564f3036bba26.jpg","w":5120,"h":2880,"cats":["外景"],"c":"首图"},{"s":"images/works/hd-4ccc7d3852de49b09e293893.png","w":2704,"h":1523,"cats":["棚子"],"c":"30"},{"s":"images/works/hd-806022848b99b0fbaaffc241.jpg","w":2865,"h":1612,"cats":["棚子"],"c":"31"},{"s":"images/works/hd-63c478bc26ade58a5b1ecb46.jpg","w":5120,"h":3413,"cats":["棚子"],"c":"32"},{"s":"images/works/hd-dc4de2fa3040eef61f88816e.jpg","w":2400,"h":1600,"cats":["棚子"],"c":"33"},{"s":"images/works/hd-c982acc7c73ee4fa1becfa8d.jpg","w":2731,"h":4255,"cats":["棚子"],"c":"34"},{"s":"images/works/hd-f9cea3b5461a6a3dffca1897.jpg","w":5016,"h":3344,"cats":["棚子"],"c":"35"},{"s":"images/works/hd-5f6ae9bdd2355251ac2030aa.jpg","w":5016,"h":3344,"cats":["棚子"],"c":"36"},{"s":"images/works/hd-663345c1b537d9eca34b9a7c.png","w":2400,"h":1600,"cats":["棚子"],"c":"37"},{"s":"images/works/hd-0adcf91bb9f80bbeaed91cbb.jpg","w":3413,"h":5120,"cats":["棚子"],"c":"38"},{"s":"images/works/hd-1b3764c135f483c6aea51bdc.jpg","w":3415,"h":5120,"cats":["棚子"],"c":"39"},{"s":"images/works/hd-68c35e309725da705df3313c.jpg","w":3344,"h":5016,"cats":["棚子"],"c":"40"},{"s":"images/works/hd-ddd840ec97a865e44851bdb5.jpg","w":5120,"h":3353,"cats":["棚子"],"c":"41"},{"s":"images/works/hd-e2b55609cb0b14e81ed10f77.jpg","w":3413,"h":5120,"cats":["棚子"],"c":"42"},{"s":"images/works/hd-9760debab6f3208f14b73607.jpg","w":3413,"h":5120,"cats":["棚子"],"c":"44"},{"s":"images/works/hd-e7fe7c274f18228a244ec329.jpg","w":3413,"h":5120,"cats":["棚子"],"c":"45"},{"s":"images/works/hd-9960671462a08d969498c759.jpg","w":5120,"h":3413,"cats":["棚子"],"c":"DSC01819"},{"s":"images/works/hd-0c2362472de6763a0533efdd.jpg","w":5120,"h":3413,"cats":["棚子"],"c":"DSC01840"},{"s":"images/works/hd-8d39e9b2d1dac0b19b3c36f5.jpg","w":3413,"h":5120,"cats":["棚子"],"c":"DSC01940"},{"s":"images/works/hd-c1da0f0703b8fa38f5918d5e.jpg","w":3414,"h":5120,"cats":["棚子"],"c":"DSC01962"},{"s":"images/works/hd-0da04ad7b0bde84c6b1939d6.jpg","w":3413,"h":5120,"cats":["棚子"],"c":"首图 (2)"},{"s":"images/works/hd-b5f40bbbfe9ab6dc03d9a48c.jpg","w":3413,"h":5120,"cats":["棚子"],"c":"首图 (3)"},{"s":"images/works/hd-24bf8345a1125d9b7c65d70b.jpg","w":5120,"h":2880,"cats":["棚子"],"c":"首图"}]},{"key":"changzhao","cats":["亮灰","暗调"],"fixed":{"亮灰":["images/works/hd-da4df4a263351d511a43be69.jpg","images/works/hd-6cf0ca23dfdf1f7c8f836d7d.jpg","images/works/hd-eab7c7e6a1e5ecca4aea085e.jpg"],"暗调":["images/works/hd-04da57d96758ccc7920e82b6.jpg","images/works/hd-ca378c313422a442f852f618.jpg","images/works/hd-8b0fbba3775fa7c6605a626d.jpg"],"all":["images/works/hd-da4df4a263351d511a43be69.jpg","images/works/hd-6cf0ca23dfdf1f7c8f836d7d.jpg","images/works/hd-eab7c7e6a1e5ecca4aea085e.jpg","images/works/hd-04da57d96758ccc7920e82b6.jpg","images/works/hd-ca378c313422a442f852f618.jpg","images/works/hd-8b0fbba3775fa7c6605a626d.jpg"]},"secondary":{"亮灰":["images/works/hd-a072c8e93dc0236ecd3d0ba0.jpg","images/works/hd-8ac12d60879f05eb5076c0c3.jpg","images/works/hd-fe8081e36b404e1722b2b774.jpg"],"暗调":["images/works/hd-7be6a88935086344aa69eeb9.jpg","images/works/hd-19961199ea78a111986c288b.jpg","images/works/hd-6699bfba5ba45bc60a186f84.jpg"],"all":["images/works/hd-a072c8e93dc0236ecd3d0ba0.jpg","images/works/hd-8ac12d60879f05eb5076c0c3.jpg","images/works/hd-fe8081e36b404e1722b2b774.jpg","images/works/hd-7be6a88935086344aa69eeb9.jpg","images/works/hd-19961199ea78a111986c288b.jpg","images/works/hd-6699bfba5ba45bc60a186f84.jpg"]},"images":[{"s":"images/works/hd-c62b84e387909ff04fbd37bc.jpg","w":4096,"h":2730,"cats":["亮灰"],"c":"03"},{"s":"images/works/hd-284d4da5ade436ccfaeb0a0f.jpg","w":5059,"h":3372,"cats":["亮灰"],"c":"04"},{"s":"images/works/hd-27410c06cb74f714f07b5d3e.jpg","w":2400,"h":1600,"cats":["亮灰"],"c":"06"},{"s":"images/works/hd-476d1682db9cd0d70dc5c7eb.jpg","w":4800,"h":3200,"cats":["亮灰"],"c":"08"},{"s":"images/works/hd-2e3aefbc3d5faa5eb487b37f.jpg","w":2400,"h":1800,"cats":["亮灰"],"c":"09"},{"s":"images/works/hd-302fc4982521895be645e271.jpg","w":5120,"h":2699,"cats":["亮灰"],"c":"11"},{"s":"images/works/hd-db2feb40eae38131204952d7.jpg","w":1600,"h":2400,"cats":["亮灰"],"c":"12"},{"s":"images/works/hd-7d18ee4a40ca3aa7a20c5a89.jpg","w":5120,"h":2880,"cats":["亮灰"],"c":"13"},{"s":"images/works/hd-d88c17c689ab64937b47196b.jpg","w":5120,"h":2880,"cats":["亮灰"],"c":"15"},{"s":"images/works/hd-20e36a5d963bbd0b06a4bea2.jpg","w":5120,"h":2880,"cats":["亮灰"],"c":"17"},{"s":"images/works/hd-7338ec058bb20eb05eb3a521.jpg","w":3413,"h":5120,"cats":["亮灰"],"c":"18"},{"s":"images/works/hd-ecdce560b922adf29af0f03e.jpg","w":3414,"h":5120,"cats":["亮灰"],"c":"23"},{"s":"images/works/hd-42eedd978a7c9d4b6c89dc92.jpg","w":5120,"h":2880,"cats":["亮灰"],"c":"24"},{"s":"images/works/hd-1778c982831d0b2aa20d7e57.jpg","w":5120,"h":2880,"cats":["亮灰"],"c":"26"},{"s":"images/works/hd-a4d6ddd452ebc7f6a53bfaa8.jpg","w":4856,"h":2732,"cats":["亮灰"],"c":"27"},{"s":"images/works/hd-efaa66fe574651c3be3c9d45.jpg","w":5120,"h":3413,"cats":["亮灰"],"c":"34"},{"s":"images/works/hd-d58b4cdf6476297d0a3ea088.jpg","w":3413,"h":5120,"cats":["亮灰"],"c":"38"},{"s":"images/works/hd-6fe41661e6ed6f8859a9a82c.jpg","w":5120,"h":3413,"cats":["亮灰"],"c":"39"},{"s":"images/works/hd-a0f556af46406db334cc28ad.jpg","w":5120,"h":2880,"cats":["亮灰"],"c":"48"},{"s":"images/works/hd-4157300b2328b5fea3f3d1b3.jpg","w":3413,"h":5120,"cats":["亮灰"],"c":"DSC00083"},{"s":"images/works/hd-44ac357f096cae3843d39f66.jpg","w":3413,"h":5120,"cats":["亮灰"],"c":"DSC00403"},{"s":"images/works/hd-2a835ce2139dc178bd9a4b6e.jpg","w":3413,"h":5120,"cats":["亮灰"],"c":"DSC00500"},{"s":"images/works/hd-2313a3d3d33521391e670854.jpg","w":5120,"h":3378,"cats":["亮灰"],"c":"Image_1786104236736_939_upscayl_4x_upscayl-standard-4x"},{"s":"images/works/hd-8ac12d60879f05eb5076c0c3.jpg","w":3694,"h":4954,"cats":["亮灰"],"c":"副图 (2)"},{"s":"images/works/hd-fe8081e36b404e1722b2b774.jpg","w":3413,"h":5120,"cats":["亮灰"],"c":"副图 (3)"},{"s":"images/works/hd-a072c8e93dc0236ecd3d0ba0.jpg","w":5120,"h":2880,"cats":["亮灰"],"c":"副图"},{"s":"images/works/hd-da4df4a263351d511a43be69.jpg","w":5120,"h":2880,"cats":["亮灰"],"c":"首图 (2)"},{"s":"images/works/hd-6cf0ca23dfdf1f7c8f836d7d.jpg","w":3414,"h":5120,"cats":["亮灰"],"c":"首图 (3)"},{"s":"images/works/hd-eab7c7e6a1e5ecca4aea085e.jpg","w":3413,"h":5120,"cats":["亮灰"],"c":"首图"},{"s":"images/works/hd-1c80f851cefaf597765f1120.jpg","w":5120,"h":2880,"cats":["暗调"],"c":"00"},{"s":"images/works/hd-d1422d3aeabb504639aa2394.jpg","w":4096,"h":2304,"cats":["暗调"],"c":"28"},{"s":"images/works/hd-1c8c1f06854a2cfac5aac2d3.jpg","w":2730,"h":4096,"cats":["暗调"],"c":"29"},{"s":"images/works/hd-4a9dd97bab31e6b435270fc3.jpg","w":5120,"h":2880,"cats":["暗调"],"c":"31"},{"s":"images/works/hd-d0b039b0cb1ddd8cc27785e2.jpg","w":3840,"h":2159,"cats":["暗调"],"c":"33"},{"s":"images/works/hd-2cdce8f5b6ad66e753be42fa.jpg","w":2458,"h":3682,"cats":["暗调"],"c":"35"},{"s":"images/works/hd-0a97f97f984994849c2530d9.jpg","w":5120,"h":2880,"cats":["暗调"],"c":"41"},{"s":"images/works/hd-9ca46e3d621762687de7453e.jpg","w":5120,"h":2880,"cats":["暗调"],"c":"42"},{"s":"images/works/hd-bd8f3457e5d2e259c1dd2db8.jpg","w":5120,"h":2880,"cats":["暗调"],"c":"43"},{"s":"images/works/hd-e55cce767a5128e288edcecb.jpg","w":5120,"h":3413,"cats":["暗调"],"c":"47"},{"s":"images/works/hd-cec2822993cf455a3798d599.jpg","w":5120,"h":2880,"cats":["暗调"],"c":"50"},{"s":"images/works/hd-d794308dc612b3e57f4adedd.jpg","w":3413,"h":5120,"cats":["暗调"],"c":"51"},{"s":"images/works/hd-dde893dab8eca14c1c94b5ca.jpg","w":5120,"h":2194,"cats":["暗调"],"c":"52"},{"s":"images/works/hd-5c60bd3bf584be00ce72ebaf.jpg","w":5120,"h":2880,"cats":["暗调"],"c":"54"},{"s":"images/works/hd-07e92ed1e8efd8f686ba41dd.jpg","w":5120,"h":3413,"cats":["暗调"],"c":"55"},{"s":"images/works/hd-00aa73910e4637cf188d3a99.jpg","w":4096,"h":2730,"cats":["暗调"],"c":"56"},{"s":"images/works/hd-76a1152b7df035f690fc8a4a.jpg","w":5120,"h":2880,"cats":["暗调"],"c":"_DSC6247"},{"s":"images/works/hd-0303cd1910d322e507877ba8.jpg","w":5120,"h":2880,"cats":["暗调"],"c":"DSC00396"},{"s":"images/works/hd-7be6a88935086344aa69eeb9.jpg","w":5120,"h":2880,"cats":["暗调"],"c":"副图 (2)"},{"s":"images/works/hd-19961199ea78a111986c288b.jpg","w":1365,"h":2048,"cats":["暗调"],"c":"副图 (3)"},{"s":"images/works/hd-6699bfba5ba45bc60a186f84.jpg","w":3416,"h":5120,"cats":["暗调"],"c":"副图"},{"s":"images/works/hd-ca378c313422a442f852f618.jpg","w":3379,"h":5069,"cats":["暗调"],"c":"首图 (2)"},{"s":"images/works/hd-8b0fbba3775fa7c6605a626d.jpg","w":3413,"h":5120,"cats":["暗调"],"c":"首图 (3)"},{"s":"images/works/hd-04da57d96758ccc7920e82b6.jpg","w":5120,"h":2880,"cats":["暗调"],"c":"首图"}]},{"key":"texiao","cats":[],"fixed":{"all":["images/works/hd-0303cd1910d322e507877ba8.jpg","images/works/hd-2cdce8f5b6ad66e753be42fa.jpg","images/works/hd-0dce292fcbb4770dfe732ff5.jpg"]},"secondary":{"all":["images/works/hd-af9089cb5f1555cd07b4bf4e.jpg","images/works/hd-44ac357f096cae3843d39f66.jpg","images/works/hd-0c09eec7ea2f6aff3652af46.jpg"]},"images":[{"s":"images/works/hd-84589c42123fa57726102ed9.jpg","w":5120,"h":2880,"cats":[],"c":"02"},{"s":"images/works/hd-0f3b918e7145b1b2ec86f6d9.jpg","w":5120,"h":2194,"cats":[],"c":"04"},{"s":"images/works/hd-510b33f505e45f84f11ac30d.jpg","w":5120,"h":2194,"cats":[],"c":"05"},{"s":"images/works/hd-6631a0acd8e6668180343ce7.jpg","w":4096,"h":2305,"cats":[],"c":"09"},{"s":"images/works/hd-96b0a030128c34ef1f826f05.jpg","w":2880,"h":5120,"cats":[],"c":"10"},{"s":"images/works/hd-d74feb73e04c0d76f689a3dc.jpg","w":5120,"h":2880,"cats":[],"c":"11"},{"s":"images/works/hd-0d973bedc9745fa43f1948e6.jpg","w":5120,"h":2880,"cats":[],"c":"12"},{"s":"images/works/hd-a6c308679818c483aaa70dff.jpg","w":2880,"h":5120,"cats":[],"c":"13"},{"s":"images/works/hd-3e3742fd6bea074f6e39760d.jpg","w":5120,"h":2880,"cats":[],"c":"15"},{"s":"images/works/hd-8130e6362d4cd5d006d25ae9.jpg","w":3413,"h":5120,"cats":[],"c":"16"},{"s":"images/works/hd-bf5259e924c6ffe188a43994.jpg","w":2880,"h":5120,"cats":[],"c":"17"},{"s":"images/works/hd-aae55c71989645ba51c329f3.jpg","w":2880,"h":5120,"cats":[],"c":"18"},{"s":"images/works/hd-166509108fce5639307ab7d6.jpg","w":5120,"h":2880,"cats":[],"c":"19"},{"s":"images/works/hd-29f277c093d509151d06af72.jpg","w":5120,"h":2947,"cats":[],"c":"21"},{"s":"images/works/hd-1c80f851cefaf597765f1120.jpg","w":5120,"h":2880,"cats":[],"c":"23"},{"s":"images/works/hd-76a1152b7df035f690fc8a4a.jpg","w":5120,"h":2880,"cats":[],"c":"_DSC6247"},{"s":"images/works/hd-a072c8e93dc0236ecd3d0ba0.jpg","w":5120,"h":2880,"cats":[],"c":"DSC00380"},{"s":"images/works/hd-a7c46451e738a6e03f499dee.jpg","w":3029,"h":4490,"cats":[],"c":"初六（巴麻美1）"},{"s":"images/works/hd-44ac357f096cae3843d39f66.jpg","w":3413,"h":5120,"cats":[],"c":"副图 (2)"},{"s":"images/works/hd-0c09eec7ea2f6aff3652af46.jpg","w":2880,"h":5120,"cats":[],"c":"副图 (3)"},{"s":"images/works/hd-af9089cb5f1555cd07b4bf4e.jpg","w":5120,"h":2880,"cats":[],"c":"副图"},{"s":"images/works/hd-e4d8bd320484bd626b3f374b.jpg","w":5120,"h":2880,"cats":[],"c":"夏夏（猴子1）"},{"s":"images/works/hd-06d59bd6ad94bc83536064f7.jpg","w":5120,"h":2880,"cats":[],"c":"夏夏（韩信1.3)"},{"s":"images/works/hd-0303cd1910d322e507877ba8.jpg","w":5120,"h":2880,"cats":[],"c":"首图 (2)"},{"s":"images/works/hd-2cdce8f5b6ad66e753be42fa.jpg","w":2458,"h":3682,"cats":[],"c":"首图 (3)"},{"s":"images/works/hd-0dce292fcbb4770dfe732ff5.jpg","w":2659,"h":3989,"cats":[],"c":"首图"}]}];

// ===== 灯箱 =====
const QQ_UA=navigator.userAgent||'';
const QQ_LOW_MEMORY=/(?:M?QQBrowser|QQ\/|TBS\/|X5|V1_AND_SQ|TIM\/)/i.test(QQ_UA)||!!window.mqq||!!window.QQJSBridge;
const COARSE_POINTER=window.matchMedia('(pointer: coarse)').matches||navigator.maxTouchPoints>0;
const MOBILE_DEVICE=/(?:Android|iPhone|iPad|iPod|HarmonyOS|Mobile)/i.test(QQ_UA)||window.matchMedia('(max-width: 900px)').matches||(COARSE_POINTER&&window.matchMedia('(max-width: 1180px)').matches);
if(QQ_LOW_MEMORY)document.body.classList.add('qq-low-memory');
if(MOBILE_DEVICE)document.body.classList.add('mobile-device');
const lb=document.getElementById('lb'),lbImg=document.getElementById('lbImg'),lbStatus=document.getElementById('lbStatus'),lbCount=document.getElementById('lbCount'),lbCloseBtn=document.getElementById('lbClose'),lbRetry=document.getElementById('lbRetry');
let cur=[],curPreviewSources=[],idx=0,lbReleaseTimer=0,lbObjectUrl='',lbAbort=null,lbLoadToken=0,lbLastFocus=null;
function releaseLightboxImage(){
  if(lbAbort){lbAbort.abort();lbAbort=null}
  lbImg.onload=null;lbImg.onerror=null;
  lbImg.removeAttribute('src');
  if(lbObjectUrl){URL.revokeObjectURL(lbObjectUrl);lbObjectUrl=''}
  lb.classList.remove('is-loading','has-error');lbRetry.hidden=true;
}
function loadMobileLightboxImage(src){
  const token=++lbLoadToken;
  releaseLightboxImage();
  const current=cur[idx];
  if(current){lbImg.width=current.w;lbImg.height=current.h}
  lbStatus.textContent='高清展示图加载中…';lb.classList.add('is-loading');
  lbImg.onload=()=>{
    if(token!==lbLoadToken||!lb.classList.contains('show'))return;
    lb.classList.remove('is-loading','has-error');lbRetry.hidden=true;
  };
  lbImg.onerror=()=>{
    if(token!==lbLoadToken||!lb.classList.contains('show'))return;
    lb.classList.remove('is-loading');lb.classList.add('has-error');lbStatus.textContent='高清展示图加载失败';lbRetry.hidden=false;
  };
  lbImg.fetchPriority='high';lbImg.src=src;
}
async function loadDesktopLightboxImage(src,previewSrc){
  releaseLightboxImage();
  const token=++lbLoadToken;
  lbStatus.textContent='高清展示图加载中…';lb.classList.add('is-loading');
  const preview=previewSrc||thumbOf(src,false),current=cur[idx];
  if(current){lbImg.width=current.w;lbImg.height=current.h}
  lbImg.src=preview;
  // Show the thumbnail while the selected full image starts downloading immediately.
  const controller=new AbortController();lbAbort=controller;
  try{
    const response=await fetch(src,{cache:'force-cache',signal:controller.signal,priority:'high'});
    if(!response.ok)throw new Error('image');
    const blob=await response.blob();
    if(token!==lbLoadToken||!lb.classList.contains('show'))return;
    const objectUrl=URL.createObjectURL(blob);lbObjectUrl=objectUrl;
    await new Promise((resolve,reject)=>{
      const decoded=new Image();
      decoded.onload=resolve;decoded.onerror=()=>reject(new Error('image-decode'));
      decoded.src=objectUrl;
    });
    if(token!==lbLoadToken||!lb.classList.contains('show'))return;
    lbImg.src=objectUrl;
    lb.classList.remove('is-loading','has-error');lbRetry.hidden=true;
  }catch(error){
    if(error.name!=='AbortError'&&token===lbLoadToken&&lb.classList.contains('show')){
      lbImg.onload=null;lbImg.onerror=null;lbImg.src=preview;
      lb.classList.remove('is-loading');lb.classList.add('has-error');
      lbStatus.textContent='高清展示图加载失败，当前显示预览图';lbRetry.hidden=false;
    }
  }finally{
    if(lbAbort===controller)lbAbort=null;
  }
}
function loadLightboxImage(src,previewSrc){
  releaseOriginalWarm();
  if(MOBILE_DEVICE||QQ_LOW_MEMORY)loadMobileLightboxImage(src);
  else loadDesktopLightboxImage(src,previewSrc);
}
function show(i){
  clearTimeout(lbReleaseTimer);
  const opening=!lb.classList.contains('show');
  if(opening){cancelGalleryTransition();lbLastFocus=document.activeElement;}
  idx=(i+cur.length)%cur.length;
  lb.classList.add('show');lb.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
  lbImg.alt='慕言·次元映像 COS摄影作品大图，第 '+(idx+1)+' 张';
  lbCount.textContent=(idx+1)+' / '+cur.length;loadLightboxImage(cur[idx].s,curPreviewSources[idx]);
  if(opening)requestAnimationFrame(()=>lbCloseBtn.focus());
}
function closeLb(){
  lb.classList.remove('show');lb.setAttribute('aria-hidden','true');document.body.style.overflow='';
  clearTimeout(lbReleaseTimer);
  lbReleaseTimer=setTimeout(()=>{
    if(!lb.classList.contains('show')){lbLoadToken++;releaseLightboxImage();cur=[];curPreviewSources=[];resumeCurrentOriginalWarm()}
  },240);
  if(lbLastFocus&&document.contains(lbLastFocus))lbLastFocus.focus();
}
lbCloseBtn.addEventListener('click',closeLb);
lbRetry.addEventListener('click',e=>{
  e.stopPropagation();
  if(!lb.classList.contains('show')||!cur[idx])return;
  lbCloseBtn.focus({preventScroll:true});
  loadLightboxImage(cur[idx].s,curPreviewSources[idx]);
});
document.getElementById('lbPrev').addEventListener('click',e=>{e.stopPropagation();show(idx-1)});
document.getElementById('lbNext').addEventListener('click',e=>{e.stopPropagation();show(idx+1)});
lb.addEventListener('click',e=>{if(e.target===lb)closeLb()});
document.addEventListener('keydown',e=>{
  if(!lb.classList.contains('show'))return;
  if(e.key==='Escape')closeLb();
  if(e.key==='ArrowLeft')show(idx-1);
  if(e.key==='ArrowRight')show(idx+1);
  if(e.key==='Tab'){
    const focusable=[...lb.querySelectorAll('button')].filter(button=>!button.hidden&&button.getClientRects().length);
    const first=focusable[0],last=focusable[focusable.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  }
});

// ===== 画廊：首批固定首图、第二批优先副图，之后独立随机无重复轮播 =====
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function poolOf(g){return g.cat==='all'?g.images:g.images.filter(x=>x.cats.includes(g.cat))}
function randomPoolOf(g){return poolOf(g).filter(image=>!image.c.startsWith('首图')&&!image.c.startsWith('副图'))}
function thumbOf(src,mobile=window.innerWidth<=900){
  return src.replace(/^images\//,mobile?'images/thumbs-mobile/':'images/thumbs/').replace(/\.[^.]+$/,'.webp')
}
function waitForImage(image,timeout=4000){
  return new Promise(resolve=>{
    if(image.complete){resolve();return}
    let settled=false,timer=0;
    const done=()=>{
      if(settled)return;settled=true;clearTimeout(timer);
      image.removeEventListener('load',done);image.removeEventListener('error',done);resolve();
    };
    if(timeout>0)timer=setTimeout(done,timeout);
    image.addEventListener('load',done,{once:true});image.addEventListener('error',done,{once:true});
  });
}
let qrAssetsPromise=null,originalWarmController=null,originalWarmTimer=0,originalWarmToken=0;
const warmedOriginals=new Set();
// Compressed file sizes allow a strict budget before starting any speculative download.
const ORIGINAL_FILE_BYTES={"images/works/hd-3b1a96df1f3810ca247f9137.jpg":3903405,"images/works/hd-60565e476e45a53ef63276c3.jpg":1580700,"images/works/hd-2c6e03ae8eb0b454a33a321e.jpg":962550,"images/works/hd-3edeca3a3c6007c8d89de926.jpg":2825612,"images/works/hd-6b3a52d4d3aec6572bc44199.jpg":1468148,"images/works/hd-0cd7561599409d4a4465254e.jpg":351472,"images/works/hd-7a7e9a49b4e088ff7aca29ca.jpg":2200903,"images/works/hd-3b84a4b639daa7c6249985c5.jpg":1785478,"images/works/hd-c813d124833e3014d6455430.jpg":4546736,"images/works/hd-840b5de7cb0c83d6a6ea1fb1.jpg":2422281,"images/works/hd-f27e75a21f0f91fe8503f4f7.jpg":2719873,"images/works/hd-b494f817e44258b0c7d7b9e7.jpg":2555268,"images/works/hd-2d59446f55ffe9a5a340aedd.jpg":2000470,"images/works/hd-228ca14c3ec943564612f34b.jpg":1792073,"images/works/hd-ed258d5d1b8aa6d7a9e2cb25.jpg":2046659,"images/works/hd-356038c5ca010b96ea4105e3.jpg":940861,"images/works/hd-3552594ca0bce9d48ea8135f.jpg":611938,"images/works/hd-76404e1fcc3f72bdb9fc3d8a.jpg":4541122,"images/works/hd-28ed4d5d1131f4ab338453b3.jpg":4205742,"images/works/hd-8ee64d4a735329ec3505641b.jpg":3480275,"images/works/hd-dd9cfbe824fec071552482fc.jpg":2607773,"images/works/hd-2f0a03988d094f76b444c6ec.jpg":3859795,"images/works/hd-e2d30017b93615a460688996.jpg":4658471,"images/works/hd-8c0201c3759bb2b12be2c01a.jpg":2481008,"images/works/hd-78820b76f49663783b4dac96.jpg":4748967,"images/works/hd-f2f4bdce9d4a5df409914c9c.jpg":3942655,"images/works/hd-d61c3ab2493e69dcd82e7a38.jpg":1553248,"images/works/hd-0fad050a5af7f1b77193a80b.jpg":3295798,"images/works/hd-c1e6573cdfb8d7277ee5c81e.jpg":2634120,"images/works/hd-f2c8659f3e27f16a21ee6659.jpg":251461,"images/works/hd-2e51bcc1dab564f3036bba26.jpg":4975797,"images/works/hd-4ccc7d3852de49b09e293893.png":1596178,"images/works/hd-806022848b99b0fbaaffc241.jpg":739516,"images/works/hd-63c478bc26ade58a5b1ecb46.jpg":3957344,"images/works/hd-dc4de2fa3040eef61f88816e.jpg":313376,"images/works/hd-c982acc7c73ee4fa1becfa8d.jpg":2368952,"images/works/hd-f9cea3b5461a6a3dffca1897.jpg":1785357,"images/works/hd-5f6ae9bdd2355251ac2030aa.jpg":2519874,"images/works/hd-663345c1b537d9eca34b9a7c.png":4716868,"images/works/hd-0adcf91bb9f80bbeaed91cbb.jpg":4395659,"images/works/hd-1b3764c135f483c6aea51bdc.jpg":2593310,"images/works/hd-68c35e309725da705df3313c.jpg":2783975,"images/works/hd-ddd840ec97a865e44851bdb5.jpg":3989472,"images/works/hd-e2b55609cb0b14e81ed10f77.jpg":2965755,"images/works/hd-9760debab6f3208f14b73607.jpg":3551695,"images/works/hd-e7fe7c274f18228a244ec329.jpg":3785646,"images/works/hd-9960671462a08d969498c759.jpg":4737962,"images/works/hd-0c2362472de6763a0533efdd.jpg":4831213,"images/works/hd-8d39e9b2d1dac0b19b3c36f5.jpg":3311753,"images/works/hd-c1da0f0703b8fa38f5918d5e.jpg":3403063,"images/works/hd-0da04ad7b0bde84c6b1939d6.jpg":2106926,"images/works/hd-b5f40bbbfe9ab6dc03d9a48c.jpg":4209158,"images/works/hd-24bf8345a1125d9b7c65d70b.jpg":3896961,"images/works/hd-c62b84e387909ff04fbd37bc.jpg":1748433,"images/works/hd-284d4da5ade436ccfaeb0a0f.jpg":2623034,"images/works/hd-27410c06cb74f714f07b5d3e.jpg":315380,"images/works/hd-476d1682db9cd0d70dc5c7eb.jpg":3968956,"images/works/hd-2e3aefbc3d5faa5eb487b37f.jpg":670331,"images/works/hd-302fc4982521895be645e271.jpg":3712700,"images/works/hd-db2feb40eae38131204952d7.jpg":389037,"images/works/hd-7d18ee4a40ca3aa7a20c5a89.jpg":3733480,"images/works/hd-d88c17c689ab64937b47196b.jpg":4017106,"images/works/hd-20e36a5d963bbd0b06a4bea2.jpg":2851061,"images/works/hd-7338ec058bb20eb05eb3a521.jpg":3511747,"images/works/hd-ecdce560b922adf29af0f03e.jpg":3291549,"images/works/hd-42eedd978a7c9d4b6c89dc92.jpg":2343053,"images/works/hd-1778c982831d0b2aa20d7e57.jpg":2643008,"images/works/hd-a4d6ddd452ebc7f6a53bfaa8.jpg":1955498,"images/works/hd-efaa66fe574651c3be3c9d45.jpg":2280130,"images/works/hd-d58b4cdf6476297d0a3ea088.jpg":4296714,"images/works/hd-6fe41661e6ed6f8859a9a82c.jpg":3908348,"images/works/hd-a0f556af46406db334cc28ad.jpg":3858609,"images/works/hd-4157300b2328b5fea3f3d1b3.jpg":2969430,"images/works/hd-44ac357f096cae3843d39f66.jpg":4688736,"images/works/hd-2a835ce2139dc178bd9a4b6e.jpg":3884441,"images/works/hd-2313a3d3d33521391e670854.jpg":2183451,"images/works/hd-8ac12d60879f05eb5076c0c3.jpg":3030142,"images/works/hd-fe8081e36b404e1722b2b774.jpg":4070894,"images/works/hd-a072c8e93dc0236ecd3d0ba0.jpg":4687355,"images/works/hd-da4df4a263351d511a43be69.jpg":3447338,"images/works/hd-6cf0ca23dfdf1f7c8f836d7d.jpg":3392325,"images/works/hd-eab7c7e6a1e5ecca4aea085e.jpg":3599476,"images/works/hd-1c80f851cefaf597765f1120.jpg":4220635,"images/works/hd-d1422d3aeabb504639aa2394.jpg":928756,"images/works/hd-1c8c1f06854a2cfac5aac2d3.jpg":2040440,"images/works/hd-4a9dd97bab31e6b435270fc3.jpg":2506318,"images/works/hd-d0b039b0cb1ddd8cc27785e2.jpg":1633274,"images/works/hd-2cdce8f5b6ad66e753be42fa.jpg":2294705,"images/works/hd-0a97f97f984994849c2530d9.jpg":3002099,"images/works/hd-9ca46e3d621762687de7453e.jpg":2474119,"images/works/hd-bd8f3457e5d2e259c1dd2db8.jpg":2656417,"images/works/hd-e55cce767a5128e288edcecb.jpg":2413243,"images/works/hd-cec2822993cf455a3798d599.jpg":2424412,"images/works/hd-d794308dc612b3e57f4adedd.jpg":3834874,"images/works/hd-dde893dab8eca14c1c94b5ca.jpg":2945219,"images/works/hd-5c60bd3bf584be00ce72ebaf.jpg":2690967,"images/works/hd-07e92ed1e8efd8f686ba41dd.jpg":3728367,"images/works/hd-00aa73910e4637cf188d3a99.jpg":2240916,"images/works/hd-76a1152b7df035f690fc8a4a.jpg":3583577,"images/works/hd-0303cd1910d322e507877ba8.jpg":3519105,"images/works/hd-7be6a88935086344aa69eeb9.jpg":1691533,"images/works/hd-19961199ea78a111986c288b.jpg":649131,"images/works/hd-6699bfba5ba45bc60a186f84.jpg":1954613,"images/works/hd-ca378c313422a442f852f618.jpg":4077047,"images/works/hd-8b0fbba3775fa7c6605a626d.jpg":3034543,"images/works/hd-04da57d96758ccc7920e82b6.jpg":3733476,"images/works/hd-84589c42123fa57726102ed9.jpg":3310007,"images/works/hd-0f3b918e7145b1b2ec86f6d9.jpg":2065475,"images/works/hd-510b33f505e45f84f11ac30d.jpg":4020105,"images/works/hd-6631a0acd8e6668180343ce7.jpg":1028585,"images/works/hd-96b0a030128c34ef1f826f05.jpg":4356414,"images/works/hd-d74feb73e04c0d76f689a3dc.jpg":4529198,"images/works/hd-0d973bedc9745fa43f1948e6.jpg":2657588,"images/works/hd-a6c308679818c483aaa70dff.jpg":3270617,"images/works/hd-3e3742fd6bea074f6e39760d.jpg":2538752,"images/works/hd-8130e6362d4cd5d006d25ae9.jpg":1662251,"images/works/hd-bf5259e924c6ffe188a43994.jpg":3023085,"images/works/hd-aae55c71989645ba51c329f3.jpg":4333283,"images/works/hd-166509108fce5639307ab7d6.jpg":2069412,"images/works/hd-29f277c093d509151d06af72.jpg":3299698,"images/works/hd-a7c46451e738a6e03f499dee.jpg":4232358,"images/works/hd-0c09eec7ea2f6aff3652af46.jpg":3576766,"images/works/hd-af9089cb5f1555cd07b4bf4e.jpg":4068163,"images/works/hd-e4d8bd320484bd626b3f374b.jpg":4404053,"images/works/hd-06d59bd6ad94bc83536064f7.jpg":4716091,"images/works/hd-0dce292fcbb4770dfe732ff5.jpg":2602671};
const AUTO_BATCH_BUDGET=8*1024*1024,AUTO_PAGE_BUDGET=12*1024*1024,AUTO_BATCH_COUNT=2;
let autoWarmReservedBytes=0;
function loadQrAssets(){
  if(qrAssetsPromise)return qrAssetsPromise;
  const images=[...document.querySelectorAll('.nav img,.hero img,img.qr,img.social-code-image')];
  const load=image=>{if(image.matches('img.qr,img.social-code-image'))image.fetchPriority='low';image.loading='eager';return waitForImage(image)};
  const started=QQ_LOW_MEMORY
    ?images.reduce((chain,image)=>chain.then(()=>load(image)),Promise.resolve())
    :Promise.all(images.map(load));
  // A timeout may start the next QR, but HD waits for all actual image requests to settle.
  qrAssetsPromise=started.then(()=>Promise.all(images.map(image=>waitForImage(image,0))));
  return qrAssetsPromise;
}
function releaseOriginalWarm(){
  originalWarmToken++;
  clearTimeout(originalWarmTimer);originalWarmTimer=0;
  if(originalWarmController){originalWarmController.abort();originalWarmController=null}
}
function canWarmOriginals(){
  if(document.hidden||lb.classList.contains('show')||document.body.classList.contains('booking-is-open')||!window.fetch||!window.AbortController)return false;
  const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  if(!connection||connection.saveData||connection.effectiveType!=='4g'||!(connection.downlink>=8)||connection.rtt>200)return false;
  if(navigator.deviceMemory&&navigator.deviceMemory<4)return false;
  return autoWarmReservedBytes<AUTO_PAGE_BUDGET;
}
function foregroundImagesReady(){
  const cards=[...document.querySelectorAll('.work-panel.active .card img')];
  const supporting=[...document.querySelectorAll('.nav img,.hero img,img.qr,img.social-code-image')];
  return cards.length>0&&cards.every(image=>image.complete&&image.naturalWidth>0)&&supporting.every(image=>image.complete);
}
function scheduleOriginalWarm(batch){
  releaseOriginalWarm();
  if(!canWarmOriginals()||!foregroundImagesReady())return;
  const token=originalWarmToken;
  const run=async()=>{
    let batchBytes=0,batchCount=0;
    // Download compressed bytes into the browser HTTP cache; never decode hidden full images.
    for(const image of batch){
      if(token!==originalWarmToken||!canWarmOriginals())break;
      if(warmedOriginals.has(image.s))continue;
      const bytes=ORIGINAL_FILE_BYTES[image.s];
      if(!bytes||batchCount>=AUTO_BATCH_COUNT||batchBytes+bytes>AUTO_BATCH_BUDGET||autoWarmReservedBytes+bytes>AUTO_PAGE_BUDGET)break;
      batchBytes+=bytes;batchCount++;autoWarmReservedBytes+=bytes;
      const controller=new AbortController();originalWarmController=controller;
      const timeout=setTimeout(()=>controller.abort(),8000);
      try{
        const response=await fetch(image.s,{cache:'force-cache',signal:controller.signal,priority:'low'});
        if(!response.ok)throw new Error('preload-http');
        if(response.body&&response.body.getReader){
          const reader=response.body.getReader();
          try{while(!(await reader.read()).done){}}
          finally{reader.releaseLock()}
        }else await response.blob();
        if(token===originalWarmToken&&!controller.signal.aborted)warmedOriginals.add(image.s);
      }catch(error){
        // A slow/failed background download must never stop the page or retry in a loop.
        if(token!==originalWarmToken)break;
      }finally{
        clearTimeout(timeout);
        if(originalWarmController===controller)originalWarmController=null;
      }
    }
  };
  originalWarmTimer=setTimeout(()=>{
    originalWarmTimer=0;
    if(token===originalWarmToken&&canWarmOriginals())run();
  },3000);
}
function resumeCurrentOriginalWarm(){
  const g=GALLERIES.find(item=>item.key===activeWorks);
  if(g&&g.shown.length&&foregroundImagesReady())scheduleOriginalWarm(g.shown);
}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)releaseOriginalWarm();else resumeCurrentOriginalWarm();
});
window.addEventListener('pageshow',()=>setTimeout(resumeCurrentOriginalWarm,0));
const warmConnection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
if(warmConnection&&warmConnection.addEventListener)warmConnection.addEventListener('change',()=>{
  releaseOriginalWarm();resumeCurrentOriginalWarm();
});
function makeQueue(pool,avoid){
  const blocked=new Set(avoid||[]);
  return shuffle(pool.filter(x=>!blocked.has(x.s))).concat(shuffle(pool.filter(x=>blocked.has(x.s))));
}
function galleryRows(batch){
  const landscapes=batch.filter(image=>image.w>=image.h),portraits=batch.filter(image=>image.w<image.h);
  if(batch.length===3&&landscapes.length===1&&portraits.length===2)return[[landscapes[0]],[portraits[0],portraits[1]]];
  if(batch.length===3&&landscapes.length===3)return landscapes.map(image=>[image]);
  if(batch.length===4&&portraits.length===4)return[portraits.slice(0,2),portraits.slice(2,4)];
  if(batch.length===6&&landscapes.length===2&&portraits.length===4)return[[landscapes[0]],[portraits[0],portraits[1]],[landscapes[1]],[portraits[2],portraits[3]]];
  if(batch.length===6&&landscapes.length===6)return[landscapes.slice(0,2),landscapes.slice(2,4),landscapes.slice(4,6)];
  const rows=[];
  for(let i=0;i<landscapes.length;i+=2)rows.push(landscapes.slice(i,i+2));
  for(let i=0;i+1<portraits.length;i+=2)rows.push(portraits.slice(i,i+2));
  return rows;
}
function arrangeBatch(batch){return galleryRows(batch).flat()}
const PORTRAIT_RATIO_TOLERANCE=.035;
function structuredShape(pool,preferred){
  const available=[...new Map([...(preferred||[]),...pool].map(image=>[image.s,image])).values()];
  const landscapes=available.filter(image=>image.w>=image.h).length,portraits=available.length-landscapes;
  const shapes=[[1,2],[3,0],[0,4]];
  return shapes.find(([wide,tall])=>landscapes>=wide&&portraits>=tall)||null;
}
function pickStructured(queue,pool,preferred,previous){
  const queueAfter=queue.slice(),chosen=[],used=new Set(),blocked=previous||new Set(),shape=structuredShape(queueAfter,preferred);
  if(!shape)return{batch:[],queueAfter,newlySeen:0};
  let newlySeen=0;
  const add=image=>{if(!image||used.has(image.s))return false;chosen.push(image);used.add(image.s);return true};
  const addPreferred=image=>{
    if(!add(image))return false;
    const queueIndex=queueAfter.findIndex(candidate=>candidate.s===image.s);
    if(queueIndex>=0){queueAfter.splice(queueIndex,1);newlySeen++}
    return true;
  };
  const takeSimilarPortraits=wanted=>{
    const preferredPaths=new Set((preferred||[]).map(image=>image.s));
    const uniquePortraits=allowPrevious=>[...new Map([...(preferred||[]),...queueAfter,...pool].map(image=>[image.s,image])).values()]
      .filter(image=>image.w<image.h&&!used.has(image.s)&&(allowPrevious||!blocked.has(image.s)));
    let candidates=uniquePortraits(false);
    if(candidates.length<wanted)candidates=uniquePortraits(true);
    const sorted=candidates.slice().sort((a,b)=>(a.w/a.h)-(b.w/b.h)),groups=[];
    const addGroup=group=>{const ratios=group.map(image=>image.w/image.h);groups.push({group,spread:Math.max(...ratios)-Math.min(...ratios),preferred:group.filter(image=>preferredPaths.has(image.s)).length,tie:Math.random()})};
    if(wanted===2){for(let first=0;first<sorted.length;first++)for(let second=first+1;second<sorted.length;second++)addGroup([sorted[first],sorted[second]])}
    else for(let index=0;index+wanted<=sorted.length;index++)addGroup(sorted.slice(index,index+wanted));
    const close=groups.filter(group=>group.spread<=PORTRAIT_RATIO_TOLERANCE),ranked=close.length?close:groups;
    ranked.sort((a,b)=>close.length?(b.preferred-a.preferred||a.spread-b.spread||a.tie-b.tie):(a.spread-b.spread||b.preferred-a.preferred||a.tie-b.tie));
    const selected=ranked[0]?ranked[0].group:[];
    selected.forEach(image=>{
      const queueIndex=queueAfter.findIndex(candidate=>candidate.s===image.s);
      if(queueIndex>=0){queueAfter.splice(queueIndex,1);newlySeen++}
      add(image);
    });
    return selected.length;
  };
  const take=(portrait,wanted)=>{
    if(portrait&&wanted>1){takeSimilarPortraits(wanted);return}
    for(const image of preferred||[]){if(wanted<=0)break;if((image.w<image.h)===portrait&&addPreferred(image))wanted--}
    const fromQueue=avoidPrevious=>{
      while(wanted>0){
        const index=queueAfter.findIndex(image=>(image.w<image.h)===portrait&&!used.has(image.s)&&(!avoidPrevious||!blocked.has(image.s)));
        if(index<0)break;
        if(add(queueAfter.splice(index,1)[0])){wanted--;newlySeen++}
      }
    };
    fromQueue(true);fromQueue(false);
    while(wanted>0){
      const candidates=pool.filter(image=>(image.w<image.h)===portrait&&!used.has(image.s)&&!blocked.has(image.s));
      const fallback=candidates.length?candidates:pool.filter(image=>(image.w<image.h)===portrait&&!used.has(image.s));
      const image=shuffle(fallback)[0]||null;
      if(!add(image))break;
      wanted--;
    }
  };
  take(false,shape[0]);take(true,shape[1]);
  return{batch:arrangeBatch(chosen),queueAfter,newlySeen};
}
function fixedBatchSize(g){return g.cat==='all'&&g.cats.length?g.cats.length*3:3}
function fixedBatchOf(g){
  const paths=(g.fixed&&(g.fixed[g.cat]||g.fixed.all))||[],pool=poolOf(g);
  const allowed=new Set(pool.map(x=>x.s));
  const fixed=paths.map(path=>g.images.find(image=>image.s===path)).filter(image=>image&&allowed.has(image.s)).slice(0,fixedBatchSize(g));
  return arrangeBatch(fixed);
}
function secondaryBatchOf(g,queue){
  const paths=(g.secondary&&(g.secondary[g.cat]||g.secondary.all))||[],fullPool=poolOf(g),pool=randomPoolOf(g);
  if(!paths.length)return null;
  const allowed=new Set(fullPool.map(x=>x.s));
  const preferred=shuffle(paths.map(path=>g.images.find(image=>image.s===path)).filter(image=>image&&allowed.has(image.s)));
  if(!preferred.length)return null;
  const picked=pickStructured(queue,pool,preferred,new Set());
  return picked.batch.length?{...picked,newlySeen:picked.batch.length,crossed:false,secondary:true}:null;
}
function stateOf(g){
  if(!g.states[g.cat]){
    const pool=randomPoolOf(g),fixed=fixedBatchOf(g);
    const fixedReady=fixed.length===fixedBatchSize(g);
    const state={queue:makeQueue(pool),shown:fixedReady?fixed:[],prepared:null,seen:fixedReady?fixed.length:0,cycle:1};
    if(fixedReady)state.prepared=secondaryBatchOf(g,state.queue);
    g.states[g.cat]=state;
  }
  return g.states[g.cat];
}
function planBatch(g,state){
  const pool=randomPoolOf(g),previous=new Set(state.shown.map(x=>x.s));
  let queue=state.queue.slice(),crossed=false;
  if(!queue.length){queue=makeQueue(pool,previous);crossed=true}
  let picked=pickStructured(queue,queue,[],previous);
  if(!picked.batch.length){
    const carry=queue.slice(),carryPaths=new Set(carry.map(image=>image.s));
    queue=carry.concat(makeQueue(pool.filter(image=>!carryPaths.has(image.s)),previous));
    picked=pickStructured(queue,queue,carry,previous);crossed=true;
  }
  return{...picked,crossed};
}
function commitPlan(state,plan){
  state.queue=plan.queueAfter;
  state.shown=plan.batch;
  if(plan.crossed){state.cycle++;state.seen=0}
  state.seen+=plan.newlySeen;
}
function invalidateGalleryRender(g){g.renderToken++}
function sizeGalleryBlock(block){
  if(!block)return;
  block.querySelectorAll('.photo-row').forEach(row=>{
    const cards=[...row.querySelectorAll('.card')],style=getComputedStyle(row),gap=parseFloat(style.columnGap||style.gap)||0;
    if(!row.clientWidth)return;
    const rowWidth=Math.min(row.clientWidth,960);
    const cardWidth=Math.max(1,(rowWidth-gap*Math.max(0,cards.length-1))/Math.max(1,cards.length));
    cards.forEach(card=>{
      const ratio=parseFloat(card.dataset.ratio)||1;
      card.style.width=cardWidth+'px';card.style.height=Math.max(1,cardWidth/ratio)+'px';
    });
  });
}
function renderGallery(key,forceNew){
  releaseOriginalWarm();
  const g=GALLERIES.find(x=>x.key===key),state=stateOf(g);
  const grid=document.getElementById('grid-'+key);
  if(forceNew||!state.shown.length){
    const plan=state.prepared||planBatch(g,state);
    state.prepared=null;commitPlan(state,plan);
  }
  const next=state.shown;g.shown=next;
  if(!next.length)return;
  const rows=galleryRows(next);
  grid.innerHTML='<div class="photo-block'+(next.length===6?' is-six':'')+'">'+rows.map(row=>'<div class="photo-row">'+row.map(()=>'<figure class="card" role="button" tabindex="0"><img alt="" loading="eager" decoding="async"></figure>').join('')+'</div>').join('')+'</div>';
  const block=grid.querySelector('.photo-block'),cards=[...block.querySelectorAll('.card')];
  cards.forEach((card,i)=>{
    const openCard=()=>{
      cur=g.shown.slice();
      curPreviewSources=cards.map(item=>{const preview=item.querySelector('img');return preview?(preview.currentSrc||preview.src):''});
      show(i);
    };
    card.addEventListener('click',openCard);
    card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openCard()}});
  });
  const renderToken=++g.renderToken,thumbs=next.map(img=>thumbOf(img.s));
  grid.style.pointerEvents='none';
  cards.forEach((card,i)=>{
    const im=card.querySelector('img'),img=next[i];
    const portrait=img.w<img.h;
    card.className='card '+(portrait?'is-portrait':'is-landscape');
    card.dataset.ratio=String(img.w/img.h);
    card.style.setProperty('--media-ratio',img.w+' / '+img.h);
    const typeLabel=key==='zhengpian'?'正片':key==='changzhao'?'场照':'特效';
    im.dataset.original=img.s;im.width=img.w;im.height=img.h;
    im.alt='慕言·次元映像 COS摄影'+typeLabel+'作品，第 '+(i+1)+' 张';
    card.setAttribute('aria-label',im.alt+'，点击查看大图');
    im.src=thumbs[i];
  });
  requestAnimationFrame(()=>sizeGalleryBlock(block));
  grid.style.pointerEvents='';
  Promise.all(cards.map(card=>waitForImage(card.querySelector('img'),0))).then(()=>{
    if(renderToken!==g.renderToken||g.shown!==next)return;
    loadQrAssets().finally(()=>{
      if(renderToken!==g.renderToken||g.shown!==next)return;
      // Current HD has priority over speculative thumbnails for a future batch.
      waitForImage(document.querySelector('.hero-photo'),0).then(()=>{
        if(renderToken===g.renderToken&&g.shown===next&&activeWorks===key){
          scheduleOriginalWarm(next);
        }
      });
    });
  });
  const total=poolOf(g).length,hint=document.getElementById('hint-'+key);
  hint.textContent='共 '+total+'张 ·已展示 '+Math.min(state.seen,total)+'张';
}
const worksSideRefreshButton=document.getElementById('worksSideRefresh');
const worksDockRefreshButton=document.getElementById('worksDockRefresh');
const galleryRefreshButtons=[...document.querySelectorAll('[data-gallery-refresh]')];
const reduceGalleryMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let galleryTransition=null;
function cancelGalleryTransition(){
  const task=galleryTransition;if(!task)return;
  galleryTransition=null;
  task.timers.forEach(clearTimeout);task.frames.forEach(cancelAnimationFrame);
  task.grid.classList.remove('gallery-switching','gallery-entering');
  task.grid.style.transition='';task.grid.style.minHeight='';delete task.grid.dataset.switching;
  task.triggers.forEach(button=>{button.disabled=false;button.removeAttribute('aria-busy')});
  document.documentElement.style.overflowAnchor=task.htmlAnchor;
  document.body.style.overflowAnchor=task.bodyAnchor;
}
function scrollToGalleryTop(key){
  const grid=document.getElementById('grid-'+key);
  if(!grid)return;
  const anchor=document.querySelector('.works-tabs')||grid;
  const top=Math.max(0,window.scrollY+anchor.getBoundingClientRect().top-nav.offsetHeight-10);
  try{window.scrollTo({top,behavior:reduceGalleryMotion?'auto':'smooth'})}catch(error){window.scrollTo(0,top)}
}
window.refreshGallery=function(key){
  const grid=document.getElementById('grid-'+key);
  if(!grid||key!==activeWorks||galleryTransition?.key===key)return;
  cancelGalleryTransition();releaseOriginalWarm();
  const task={key,grid,triggers:[worksSideRefreshButton,worksDockRefreshButton,...galleryRefreshButtons.filter(button=>button.dataset.galleryRefresh===key)],timers:[],frames:[],htmlAnchor:document.documentElement.style.overflowAnchor,bodyAnchor:document.body.style.overflowAnchor};
  galleryTransition=task;
  const later=(fn,ms)=>task.timers.push(setTimeout(()=>{if(galleryTransition===task)fn()},ms));
  const frame=fn=>task.frames.push(requestAnimationFrame(()=>{if(galleryTransition===task)fn()}));
  const oldHeight=Math.ceil(grid.getBoundingClientRect().height);
  document.documentElement.style.overflowAnchor='none';document.body.style.overflowAnchor='none';
  grid.dataset.switching='true';
  grid.style.minHeight=Math.max(1,oldHeight)+'px';
  grid.classList.add('gallery-switching');
  task.triggers.forEach(button=>{button.disabled=true;button.setAttribute('aria-busy','true')});
  later(()=>{
    try{
      renderGallery(key,true);
      grid.classList.remove('gallery-switching');grid.classList.add('gallery-entering');
      frame(()=>{
        const block=grid.querySelector('.photo-block');if(block)sizeGalleryBlock(block);
        const newHeight=Math.max(1,Math.ceil(block?block.getBoundingClientRect().height:grid.scrollHeight));
        grid.style.transition=reduceGalleryMotion?'none':'min-height .46s cubic-bezier(.2,.72,.25,1)';
        frame(()=>{grid.style.minHeight=newHeight+'px';scrollToGalleryTop(key)});
      });
      window.dispatchEvent(new CustomEvent('gallerybatchchange',{detail:{key}}));
    }catch(error){cancelGalleryTransition();console.error('作品换批失败',error)}
  },reduceGalleryMotion?0:180);
  if(!reduceGalleryMotion)later(()=>scrollToGalleryTop(key),1100);
  later(cancelGalleryTransition,reduceGalleryMotion?100:1700);
};
function playRefreshTap(button){
  button.classList.remove('refresh-tapped');
  void button.offsetWidth;
  button.classList.add('refresh-tapped');
  setTimeout(()=>button.classList.remove('refresh-tapped'),420);
}
worksSideRefreshButton.addEventListener('click',()=>{playRefreshTap(worksSideRefreshButton);window.refreshGallery(activeWorks)});
worksDockRefreshButton.addEventListener('click',()=>{playRefreshTap(worksDockRefreshButton);window.refreshGallery(activeWorks)});
galleryRefreshButtons.forEach(button=>button.addEventListener('click',()=>{playRefreshTap(button);window.refreshGallery(button.dataset.galleryRefresh)}));
// 用户主动导航、滚动或打开大图时取消尚未完成的自动定位。
document.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',cancelGalleryTransition));
document.addEventListener('wheel',cancelGalleryTransition,{passive:true});
document.addEventListener('touchmove',cancelGalleryTransition,{passive:true});
document.addEventListener('keydown',event=>{if(['PageDown','PageUp','Home','End','ArrowDown','ArrowUp','Escape'].includes(event.key))cancelGalleryTransition()});
window.addEventListener('pagehide',cancelGalleryTransition);
let galleryResizeFrame=0;
window.addEventListener('resize',()=>{
  cancelAnimationFrame(galleryResizeFrame);
  galleryResizeFrame=requestAnimationFrame(()=>document.querySelectorAll('.photo-block').forEach(sizeGalleryBlock));
});
// 选项卡与筛选器无障碍状态
const worksTablist=document.querySelector('.works-tabs');
worksTablist.setAttribute('role','tablist');worksTablist.setAttribute('aria-label','作品类型');
document.querySelectorAll('.work-tab').forEach(button=>{
  const key=button.dataset.w,panel=document.querySelector('.work-panel[data-w="'+key+'"]');
  button.id='work-tab-'+key;button.setAttribute('role','tab');button.setAttribute('aria-controls','work-panel-'+key);
  button.setAttribute('aria-selected',String(button.classList.contains('active')));
  panel.id='work-panel-'+key;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);
});
const priceTablist=document.querySelector('.price-tabs');
priceTablist.setAttribute('role','tablist');priceTablist.setAttribute('aria-label','价格类型');
document.querySelectorAll('.price-tab').forEach(button=>{
  button.id='price-tab-'+button.dataset.p;button.setAttribute('role','tab');button.setAttribute('aria-controls','price-'+button.dataset.p);
  button.setAttribute('aria-selected',String(button.classList.contains('active')));
  const panel=document.getElementById('price-'+button.dataset.p);panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);
});
const noteTablist=document.querySelector('.note-tabs');
noteTablist.setAttribute('role','tablist');noteTablist.setAttribute('aria-label','拍摄须知类型');
document.querySelectorAll('.note-tab').forEach(button=>{
  button.id='note-tab-'+button.dataset.note;button.setAttribute('role','tab');button.setAttribute('aria-controls','note-'+button.dataset.note);
  button.setAttribute('aria-selected',String(button.classList.contains('active')));
  const panel=document.getElementById('note-'+button.dataset.note);panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);
});
function syncSelected(selector,activeKey,dataName){
  document.querySelectorAll(selector).forEach(button=>button.setAttribute('aria-selected',String(button.dataset[dataName]===activeKey)));
}
// 选项卡绑定
GALLERIES.forEach(g=>{
  g.cat='all';g.shown=[];g.states={};g.renderToken=0;
  const tabs=document.getElementById('tabs-'+g.key);
  if(tabs){
    tabs.setAttribute('role','group');tabs.setAttribute('aria-label','作品分类筛选');
    tabs.querySelectorAll('.cat-tab').forEach(btn=>{
      btn.setAttribute('aria-pressed',String(btn.classList.contains('active')));
      btn.addEventListener('click',()=>{
        cancelGalleryTransition();
        tabs.querySelectorAll('.cat-tab').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false')});
        btn.classList.add('active');btn.setAttribute('aria-pressed','true');invalidateGalleryRender(g);
        g.cat=btn.dataset.cat;g.shown=[];renderGallery(g.key);
      });
    });
  }
  if(g.key==='zhengpian')renderGallery(g.key);
});
function releaseAllImageMemory(){
  GALLERIES.forEach(g=>invalidateGalleryRender(g));
  releaseOriginalWarm();
  lbLoadToken++;releaseLightboxImage();
}
window.addEventListener('pagehide',releaseAllImageMemory);
document.addEventListener('freeze',releaseAllImageMemory);
// 正片/场照须知选项卡
document.querySelectorAll('.note-tab').forEach(btn=>{
  btn.addEventListener('click',function(){
    document.querySelectorAll('.note-tab').forEach(b=>b.classList.remove('active'));
    this.classList.add('active');
    document.querySelectorAll('.note-panel').forEach(p=>p.classList.remove('active'));
    document.getElementById('note-'+this.dataset.note).classList.add('active');
    syncSelected('.note-tab',this.dataset.note,'note');
  });
});
// 价格选项卡
document.querySelectorAll('.price-tab').forEach(btn=>{
  btn.addEventListener('click',function(){
    document.body.classList.add('price-in-view');
    document.querySelectorAll('.price-tab').forEach(b=>b.classList.remove('active'));
    this.classList.add('active');
    document.querySelectorAll('.price-panel').forEach(p=>p.classList.remove('active'));
    document.getElementById('price-'+this.dataset.p).classList.add('active');
    syncSelected('.price-tab',this.dataset.p,'p');
  });
});
// 作品选项卡切换
let activeWorks='zhengpian';
const WORK_AUTHORSHIP={
  zhengpian:'正片分类：所有图片均由本人拍摄并完成后期。',
  changzhao:'场照分类：所有图片均由本人拍摄并完成后期。',
  texiao:'特效分类：部分作品为承接的后期单。'
};
function switchWorks(w){
  cancelGalleryTransition();
  if(activeWorks!==w){
    const previous=GALLERIES.find(g=>g.key===activeWorks);
    if(previous)invalidateGalleryRender(previous);
    releaseOriginalWarm();
    activeWorks=w;
  }
  document.querySelectorAll('.work-tab').forEach(b=>b.classList.toggle('active',b.dataset.w===w));
  document.querySelectorAll('.work-panel').forEach(p=>p.classList.toggle('active',p.dataset.w===w));
  document.getElementById('worksAuthorship').textContent=WORK_AUTHORSHIP[w]||'';
  worksSideRefreshButton.setAttribute('aria-label','更换当前'+(w==='zhengpian'?'正片':w==='changzhao'?'场照':'特效')+'作品批次');
  worksDockRefreshButton.setAttribute('aria-label',worksSideRefreshButton.getAttribute('aria-label'));
  syncSelected('.work-tab',w,'w');
  renderGallery(w);
}
document.querySelectorAll('.work-tab').forEach(b=>b.addEventListener('click',()=>switchWorks(b.dataset.w)));
document.querySelectorAll('.nav-w').forEach(a=>a.addEventListener('click',function(e){e.preventDefault();switchWorks(this.dataset.w);document.getElementById('works').scrollIntoView({behavior:'smooth'});}));

// ===== 滚动淡入 =====
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.1});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

// 静态角色陪伴；不创建持续绘制的装饰画布或粒子。
(()=>{
 const companion=document.createElement('div');companion.className='rem-side-companion';companion.setAttribute('aria-hidden','true');document.body.appendChild(companion);
 document.addEventListener('visibilitychange',()=>{
  if(!QQ_LOW_MEMORY)return;
  if(document.hidden)releaseAllImageMemory();
  else{renderGallery(activeWorks);if(lb.classList.contains('show')&&cur.length)loadLightboxImage(cur[idx].s);}
 });
})();
