
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
document.getElementById('shareSite').addEventListener('click',shareWebsite);
document.getElementById('shareSiteFooter').addEventListener('click',shareWebsite);
document.querySelectorAll('.copy-contact').forEach(button=>button.addEventListener('click',async()=>{
  const value=button.dataset.copyValue,label=button.dataset.copyLabel;
  try{await copyPlainText(value);showShareStatus(`${label} ${value} 已复制`)}
  catch{showShareStatus(`复制失败，请手动复制${label}`)}
}));

// ===== 图片画廊数据 =====
const GALLERIES = [{"key":"zhengpian","cats":["外景","棚子"],"fixed":{"外景":["images/正片/外景/首图.jpg","images/正片/外景/首图 (2).jpg","images/正片/外景/首图 (3).jpg"],"棚子":["images/正片/棚子/首图.jpg","images/正片/棚子/首图 (2).jpg","images/正片/棚子/首图 (3).jpg"],"all":["images/正片/外景/首图.jpg","images/正片/外景/首图 (2).jpg","images/正片/外景/首图 (3).jpg","images/正片/棚子/首图.jpg","images/正片/棚子/首图 (2).jpg","images/正片/棚子/首图 (3).jpg"]},"secondary":{"外景":["images/正片/外景/副图.jpg"],"棚子":[],"all":["images/正片/外景/副图.jpg"]},"images":[{"s":"images/正片/外景/01.jpg","w":5461,"h":3084,"cats":["外景"],"c":"01"},{"s":"images/正片/外景/02.jpg","w":3840,"h":2610,"cats":["外景"],"c":"02"},{"s":"images/正片/外景/03.jpg","w":3784,"h":2378,"cats":["外景"],"c":"03"},{"s":"images/正片/外景/04.jpg","w":6000,"h":3375,"cats":["外景"],"c":"04"},{"s":"images/正片/外景/05.jpg","w":1500,"h":2000,"cats":["外景"],"c":"05"},{"s":"images/正片/外景/06.jpg","w":1600,"h":2400,"cats":["外景"],"c":"06"},{"s":"images/正片/外景/07.jpg","w":3458,"h":5405,"cats":["外景"],"c":"07"},{"s":"images/正片/外景/08.jpg","w":4096,"h":2730,"cats":["外景"],"c":"08"},{"s":"images/正片/外景/11.jpg","w":6000,"h":4000,"cats":["外景"],"c":"11"},{"s":"images/正片/外景/12.jpg","w":4096,"h":2730,"cats":["外景"],"c":"12"},{"s":"images/正片/外景/13.jpg","w":6000,"h":4000,"cats":["外景"],"c":"13"},{"s":"images/正片/外景/14.jpg","w":6000,"h":3375,"cats":["外景"],"c":"14"},{"s":"images/正片/外景/15.jpg","w":5381,"h":3027,"cats":["外景"],"c":"15"},{"s":"images/正片/外景/16.jpg","w":6854,"h":2938,"cats":["外景"],"c":"16"},{"s":"images/正片/外景/17.jpg","w":6000,"h":4000,"cats":["外景"],"c":"17"},{"s":"images/正片/外景/18.jpg","w":4095,"h":2685,"cats":["外景"],"c":"18"},{"s":"images/正片/外景/19.jpg","w":2678,"h":1600,"cats":["外景"],"c":"19"},{"s":"images/正片/外景/20.jpg","w":7008,"h":4672,"cats":["外景"],"c":"20"},{"s":"images/正片/外景/22.jpg","w":7112,"h":4000,"cats":["外景"],"c":"22"},{"s":"images/正片/外景/24.jpg","w":6672,"h":3753,"cats":["外景"],"c":"24"},{"s":"images/正片/外景/26.jpg","w":7074,"h":3979,"cats":["外景"],"c":"26"},{"s":"images/正片/外景/27.jpg","w":6542,"h":3680,"cats":["外景"],"c":"27"},{"s":"images/正片/外景/28.jpg","w":6000,"h":3375,"cats":["外景"],"c":"28"},{"s":"images/正片/外景/CBA7A010130242A06E82BCEC10DA6D1A.jpg","w":6654,"h":3743,"cats":["外景"],"c":"CBA7A010130242A06E82BCEC10DA6D1A"},{"s":"images/正片/外景/DSC01999.jpg","w":6000,"h":4000,"cats":["外景"],"c":"DSC01999"},{"s":"images/正片/外景/DSC02103.jpg","w":5971,"h":3359,"cats":["外景"],"c":"DSC02103"},{"s":"images/正片/外景/DSC02267.jpg","w":4096,"h":2304,"cats":["外景"],"c":"DSC02267"},{"s":"images/正片/外景/副图.jpg","w":5502,"h":3094,"cats":["外景"],"c":"副图"},{"s":"images/正片/外景/首图 (2).jpg","w":3612,"h":5417,"cats":["外景"],"c":"首图 (2)"},{"s":"images/正片/外景/首图 (3).jpg","w":1079,"h":1620,"cats":["外景"],"c":"首图 (3)"},{"s":"images/正片/外景/首图.jpg","w":5628,"h":3166,"cats":["外景"],"c":"首图"},{"s":"images/正片/棚子/30.png","w":2704,"h":1523,"cats":["棚子"],"c":"30"},{"s":"images/正片/棚子/31.jpg","w":2865,"h":1612,"cats":["棚子"],"c":"31"},{"s":"images/正片/棚子/32.jpg","w":5489,"h":3659,"cats":["棚子"],"c":"32"},{"s":"images/正片/棚子/33.jpg","w":2400,"h":1600,"cats":["棚子"],"c":"33"},{"s":"images/正片/棚子/34.jpg","w":2731,"h":4255,"cats":["棚子"],"c":"34"},{"s":"images/正片/棚子/35.jpg","w":5016,"h":3344,"cats":["棚子"],"c":"35"},{"s":"images/正片/棚子/36.jpg","w":5016,"h":3344,"cats":["棚子"],"c":"36"},{"s":"images/正片/棚子/37.png","w":2400,"h":1600,"cats":["棚子"],"c":"37"},{"s":"images/正片/棚子/38.jpg","w":4000,"h":6000,"cats":["棚子"],"c":"38"},{"s":"images/正片/棚子/39.jpg","w":3486,"h":5227,"cats":["棚子"],"c":"39"},{"s":"images/正片/棚子/40.jpg","w":3344,"h":5016,"cats":["棚子"],"c":"40"},{"s":"images/正片/棚子/41.jpg","w":6597,"h":4320,"cats":["棚子"],"c":"41"},{"s":"images/正片/棚子/42.jpg","w":3532,"h":5298,"cats":["棚子"],"c":"42"},{"s":"images/正片/棚子/44.jpg","w":4000,"h":6000,"cats":["棚子"],"c":"44"},{"s":"images/正片/棚子/45.jpg","w":4000,"h":6000,"cats":["棚子"],"c":"45"},{"s":"images/正片/棚子/DSC01819.jpg","w":6000,"h":4000,"cats":["棚子"],"c":"DSC01819"},{"s":"images/正片/棚子/DSC01840.jpg","w":5883,"h":3922,"cats":["棚子"],"c":"DSC01840"},{"s":"images/正片/棚子/DSC01940.jpg","w":4000,"h":6000,"cats":["棚子"],"c":"DSC01940"},{"s":"images/正片/棚子/DSC01962.jpg","w":3742,"h":5612,"cats":["棚子"],"c":"DSC01962"},{"s":"images/正片/棚子/首图 (2).jpg","w":4000,"h":6000,"cats":["棚子"],"c":"首图 (2)"},{"s":"images/正片/棚子/首图 (3).jpg","w":4000,"h":6000,"cats":["棚子"],"c":"首图 (3)"},{"s":"images/正片/棚子/首图.jpg","w":6275,"h":3530,"cats":["棚子"],"c":"首图"}]},{"key":"changzhao","cats":["亮灰","暗调"],"fixed":{"亮灰":["images/场照/亮灰/首图 (2).jpg","images/场照/亮灰/首图 (3).jpg","images/场照/亮灰/首图.jpg"],"暗调":["images/场照/暗调/首图.jpg","images/场照/暗调/首图 (2).jpg","images/场照/暗调/首图 (3).jpg"],"all":["images/场照/亮灰/首图 (2).jpg","images/场照/亮灰/首图 (3).jpg","images/场照/亮灰/首图.jpg","images/场照/暗调/首图.jpg","images/场照/暗调/首图 (2).jpg","images/场照/暗调/首图 (3).jpg"]},"secondary":{"亮灰":["images/场照/亮灰/副图.jpg","images/场照/亮灰/副图 (2).jpg","images/场照/亮灰/副图 (3).jpg"],"暗调":["images/场照/暗调/副图 (2).jpg","images/场照/暗调/副图 (3).jpg","images/场照/暗调/副图.jpg"],"all":["images/场照/亮灰/副图.jpg","images/场照/亮灰/副图 (2).jpg","images/场照/亮灰/副图 (3).jpg","images/场照/暗调/副图 (2).jpg","images/场照/暗调/副图 (3).jpg","images/场照/暗调/副图.jpg"]},"images":[{"s":"images/场照/亮灰/03.jpg","w":4096,"h":2730,"cats":["亮灰"],"c":"03"},{"s":"images/场照/亮灰/04.jpg","w":5059,"h":3372,"cats":["亮灰"],"c":"04"},{"s":"images/场照/亮灰/06.jpg","w":2400,"h":1600,"cats":["亮灰"],"c":"06"},{"s":"images/场照/亮灰/08.jpg","w":4800,"h":3200,"cats":["亮灰"],"c":"08"},{"s":"images/场照/亮灰/09.jpg","w":2400,"h":1800,"cats":["亮灰"],"c":"09"},{"s":"images/场照/亮灰/11.jpg","w":8304,"h":4378,"cats":["亮灰"],"c":"11"},{"s":"images/场照/亮灰/12.jpg","w":1600,"h":2400,"cats":["亮灰"],"c":"12"},{"s":"images/场照/亮灰/13.jpg","w":6751,"h":3797,"cats":["亮灰"],"c":"13"},{"s":"images/场照/亮灰/15.jpg","w":7112,"h":4000,"cats":["亮灰"],"c":"15"},{"s":"images/场照/亮灰/17.jpg","w":6926,"h":3896,"cats":["亮灰"],"c":"17"},{"s":"images/场照/亮灰/18.jpg","w":4359,"h":6540,"cats":["亮灰"],"c":"18"},{"s":"images/场照/亮灰/23.jpg","w":3483,"h":5224,"cats":["亮灰"],"c":"23"},{"s":"images/场照/亮灰/24.jpg","w":7112,"h":4000,"cats":["亮灰"],"c":"24"},{"s":"images/场照/亮灰/26.jpg","w":7349,"h":4134,"cats":["亮灰"],"c":"26"},{"s":"images/场照/亮灰/27.jpg","w":4856,"h":2732,"cats":["亮灰"],"c":"27"},{"s":"images/场照/亮灰/34.jpg","w":6000,"h":4000,"cats":["亮灰"],"c":"34"},{"s":"images/场照/亮灰/38.jpg","w":4000,"h":6000,"cats":["亮灰"],"c":"38"},{"s":"images/场照/亮灰/39.jpg","w":6000,"h":4000,"cats":["亮灰"],"c":"39"},{"s":"images/场照/亮灰/48.jpg","w":6000,"h":3375,"cats":["亮灰"],"c":"48"},{"s":"images/场照/亮灰/DSC00083.jpg","w":4000,"h":6000,"cats":["亮灰"],"c":"DSC00083"},{"s":"images/场照/亮灰/DSC00403.jpg","w":3665,"h":5498,"cats":["亮灰"],"c":"DSC00403"},{"s":"images/场照/亮灰/DSC00500.jpg","w":4000,"h":6000,"cats":["亮灰"],"c":"DSC00500"},{"s":"images/场照/亮灰/Image_1786104236736_939_upscayl_4x_upscayl-standard-4x.jpg","w":9700,"h":6400,"cats":["亮灰"],"c":"Image_1786104236736_939_upscayl_4x_upscayl-standard-4x"},{"s":"images/场照/亮灰/副图 (2).jpg","w":3694,"h":4954,"cats":["亮灰"],"c":"副图 (2)"},{"s":"images/场照/亮灰/副图 (3).jpg","w":4000,"h":6000,"cats":["亮灰"],"c":"副图 (3)"},{"s":"images/场照/亮灰/副图.jpg","w":5763,"h":3242,"cats":["亮灰"],"c":"副图"},{"s":"images/场照/亮灰/首图 (2).jpg","w":7112,"h":4001,"cats":["亮灰"],"c":"首图 (2)"},{"s":"images/场照/亮灰/首图 (3).jpg","w":4001,"h":6001,"cats":["亮灰"],"c":"首图 (3)"},{"s":"images/场照/亮灰/首图.jpg","w":3729,"h":5594,"cats":["亮灰"],"c":"首图"},{"s":"images/场照/暗调/00.jpg","w":7054,"h":3968,"cats":["暗调"],"c":"00"},{"s":"images/场照/暗调/28.jpg","w":4096,"h":2304,"cats":["暗调"],"c":"28"},{"s":"images/场照/暗调/29.jpg","w":2730,"h":4096,"cats":["暗调"],"c":"29"},{"s":"images/场照/暗调/31.jpg","w":6000,"h":3375,"cats":["暗调"],"c":"31"},{"s":"images/场照/暗调/33.jpg","w":3840,"h":2159,"cats":["暗调"],"c":"33"},{"s":"images/场照/暗调/35.jpg","w":2458,"h":3682,"cats":["暗调"],"c":"35"},{"s":"images/场照/暗调/41.jpg","w":6000,"h":3375,"cats":["暗调"],"c":"41"},{"s":"images/场照/暗调/42.jpg","w":6000,"h":3375,"cats":["暗调"],"c":"42"},{"s":"images/场照/暗调/43.jpg","w":6730,"h":3786,"cats":["暗调"],"c":"43"},{"s":"images/场照/暗调/47.jpg","w":6000,"h":4000,"cats":["暗调"],"c":"47"},{"s":"images/场照/暗调/50.jpg","w":6014,"h":3383,"cats":["暗调"],"c":"50"},{"s":"images/场照/暗调/51.jpg","w":3548,"h":5322,"cats":["暗调"],"c":"51"},{"s":"images/场照/暗调/52.jpg","w":7667,"h":3286,"cats":["暗调"],"c":"52"},{"s":"images/场照/暗调/54.jpg","w":6310,"h":3549,"cats":["暗调"],"c":"54"},{"s":"images/场照/暗调/55.jpg","w":6000,"h":4000,"cats":["暗调"],"c":"55"},{"s":"images/场照/暗调/56.jpg","w":4096,"h":2730,"cats":["暗调"],"c":"56"},{"s":"images/场照/暗调/_DSC6247.jpg","w":7046,"h":3964,"cats":["暗调"],"c":"_DSC6247"},{"s":"images/场照/暗调/DSC00396.jpg","w":13492,"h":7589,"cats":["暗调"],"c":"DSC00396"},{"s":"images/场照/暗调/副图 (2).jpg","w":6000,"h":3375,"cats":["暗调"],"c":"副图 (2)"},{"s":"images/场照/暗调/副图 (3).jpg","w":1365,"h":2048,"cats":["暗调"],"c":"副图 (3)"},{"s":"images/场照/暗调/副图.jpg","w":3473,"h":5206,"cats":["暗调"],"c":"副图"},{"s":"images/场照/暗调/首图 (2).jpg","w":3379,"h":5069,"cats":["暗调"],"c":"首图 (2)"},{"s":"images/场照/暗调/首图 (3).jpg","w":4194,"h":6291,"cats":["暗调"],"c":"首图 (3)"},{"s":"images/场照/暗调/首图.jpg","w":6000,"h":3375,"cats":["暗调"],"c":"首图"}]},{"key":"texiao","cats":[],"fixed":{"all":["images/特效/首图 (2).jpg","images/特效/首图 (3).jpg","images/特效/首图.jpg"]},"secondary":{"all":["images/特效/副图.jpg","images/特效/副图 (2).jpg","images/特效/副图 (3).jpg"]},"images":[{"s":"images/特效/02.jpg","w":7399,"h":4162,"cats":[],"c":"02"},{"s":"images/特效/04.jpg","w":9688,"h":4152,"cats":[],"c":"04"},{"s":"images/特效/05.jpg","w":11946,"h":5120,"cats":[],"c":"05"},{"s":"images/特效/09.jpg","w":4096,"h":2305,"cats":[],"c":"09"},{"s":"images/特效/10.jpg","w":3358,"h":5970,"cats":[],"c":"10"},{"s":"images/特效/11.jpg","w":8248,"h":4640,"cats":[],"c":"11"},{"s":"images/特效/12.jpg","w":7341,"h":4129,"cats":[],"c":"12"},{"s":"images/特效/13.jpg","w":3358,"h":5970,"cats":[],"c":"13"},{"s":"images/特效/15.jpg","w":9548,"h":5371,"cats":[],"c":"15"},{"s":"images/特效/16.jpg","w":3665,"h":5498,"cats":[],"c":"16"},{"s":"images/特效/17.jpg","w":5128,"h":9118,"cats":[],"c":"17"},{"s":"images/特效/18.jpg","w":3358,"h":5970,"cats":[],"c":"18"},{"s":"images/特效/19.jpg","w":12002,"h":6751,"cats":[],"c":"19"},{"s":"images/特效/21.jpg","w":13900,"h":8000,"cats":[],"c":"21"},{"s":"images/特效/23.jpg","w":7054,"h":3968,"cats":[],"c":"23"},{"s":"images/特效/_DSC6247.jpg","w":7046,"h":3964,"cats":[],"c":"_DSC6247"},{"s":"images/特效/DSC00380.jpg","w":5763,"h":3242,"cats":[],"c":"DSC00380"},{"s":"images/特效/初六（巴麻美1）.jpg","w":3029,"h":4490,"cats":[],"c":"初六（巴麻美1）"},{"s":"images/特效/副图 (2).jpg","w":3665,"h":5498,"cats":[],"c":"副图 (2)"},{"s":"images/特效/副图 (3).jpg","w":3358,"h":5970,"cats":[],"c":"副图 (3)"},{"s":"images/特效/副图.jpg","w":7091,"h":3989,"cats":[],"c":"副图"},{"s":"images/特效/夏夏（猴子1）.jpg","w":6556,"h":3688,"cats":[],"c":"夏夏（猴子1）"},{"s":"images/特效/夏夏（韩信1.3).jpg","w":8235,"h":4632,"cats":[],"c":"夏夏（韩信1.3)"},{"s":"images/特效/首图 (2).jpg","w":13492,"h":7589,"cats":[],"c":"首图 (2)"},{"s":"images/特效/首图 (3).jpg","w":2458,"h":3682,"cats":[],"c":"首图 (3)"},{"s":"images/特效/首图.jpg","w":2659,"h":3989,"cats":[],"c":"首图"}]}];

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
  lbStatus.textContent='高清原图加载中…';lb.classList.add('is-loading');
  lbImg.onload=()=>{
    if(token!==lbLoadToken||!lb.classList.contains('show'))return;
    lb.classList.remove('is-loading','has-error');lbRetry.hidden=true;
  };
  lbImg.onerror=()=>{
    if(token!==lbLoadToken||!lb.classList.contains('show'))return;
    lb.classList.remove('is-loading');lb.classList.add('has-error');lbStatus.textContent='高清原图加载失败';lbRetry.hidden=false;
  };
  lbImg.fetchPriority='high';lbImg.src=src;
}
async function loadDesktopLightboxImage(src,previewSrc){
  releaseLightboxImage();
  const token=++lbLoadToken;
  lbStatus.textContent='高清原图加载中…';lb.classList.add('is-loading');
  const preview=previewSrc||thumbOf(src,false),current=cur[idx];
  if(current){lbImg.width=current.w;lbImg.height=current.h}
  lbImg.src=preview;
  const previewReady=typeof lbImg.decode==='function'
    ?lbImg.decode().catch(()=>{})
    :new Promise(resolve=>{
      if(lbImg.complete){resolve();return}
      lbImg.addEventListener('load',resolve,{once:true});
      lbImg.addEventListener('error',resolve,{once:true});
    });
  await Promise.race([previewReady,new Promise(resolve=>setTimeout(resolve,350))]);
  if(token!==lbLoadToken||!lb.classList.contains('show'))return;
  await new Promise(resolve=>requestAnimationFrame(()=>resolve()));
  const controller=new AbortController();lbAbort=controller;
  try{
    const response=await fetch(src,{cache:'force-cache',signal:controller.signal});
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
      lbStatus.textContent='高清原图加载失败，当前显示预览图';lbRetry.hidden=false;
    }
  }finally{
    if(lbAbort===controller)lbAbort=null;
  }
}
function loadLightboxImage(src,previewSrc){
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
    if(!lb.classList.contains('show')){lbLoadToken++;releaseLightboxImage();cur=[];curPreviewSources=[]}
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
    let settled=false;
    const done=()=>{if(settled)return;settled=true;clearTimeout(timer);resolve()};
    const timer=setTimeout(done,timeout);
    image.addEventListener('load',done,{once:true});image.addEventListener('error',done,{once:true});
  });
}
let qrAssetsPromise=null,originalWarmController=null,originalWarmTimer=0,originalWarmToken=0;
function loadQrAssets(){
  if(qrAssetsPromise)return qrAssetsPromise;
  const images=[...document.querySelectorAll('img.qr,img.social-code-image')];
  const load=image=>{image.fetchPriority='low';image.loading='eager';return waitForImage(image)};
  qrAssetsPromise=QQ_LOW_MEMORY
    ?images.reduce((chain,image)=>chain.then(()=>load(image)),Promise.resolve())
    :Promise.all(images.map(load));
  return qrAssetsPromise;
}
function releaseOriginalWarm(){
  originalWarmToken++;
  clearTimeout(originalWarmTimer);originalWarmTimer=0;
  if(originalWarmController){originalWarmController.abort();originalWarmController=null}
}
function canWarmOriginals(){
  if(MOBILE_DEVICE||QQ_LOW_MEMORY||COARSE_POINTER||window.innerWidth<1100||document.hidden)return false;
  const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  if(connection&&(connection.saveData||/2g/i.test(connection.effectiveType||'')))return false;
  return !navigator.deviceMemory||navigator.deviceMemory>=4;
}
function scheduleOriginalWarm(batch){
  if(!canWarmOriginals())return;
  releaseOriginalWarm();
  const token=originalWarmToken,controller=new AbortController();originalWarmController=controller;
  const run=async()=>{
    for(const image of batch){
      if(token!==originalWarmToken||document.hidden)break;
      try{
        const response=await fetch(image.s,{cache:'force-cache',signal:controller.signal,priority:'low'});
        if(response.ok)await response.arrayBuffer();
      }catch(error){if(error.name==='AbortError')break}
    }
    if(originalWarmController===controller)originalWarmController=null;
  };
  originalWarmTimer=setTimeout(()=>{
    originalWarmTimer=0;
    if(token!==originalWarmToken)return;
    if('requestIdleCallback'in window)requestIdleCallback(()=>run(),{timeout:2500});
    else run();
  },1500);
}
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
function makeFullPack(batch){
  const controller=new AbortController();
  const pack={controller,released:false,key:batch.map(x=>x.s).join('|')};
  let sequence=Promise.resolve();const tasks=[];
  batch.forEach(img=>{
    const src=thumbOf(img.s),load=()=>{
      if(pack.released)return'';
      return fetch(src,{cache:'force-cache',signal:controller.signal})
        .then(r=>{if(!r.ok)throw new Error('image');return r.arrayBuffer()})
        .then(()=>pack.released?'':src).catch(()=> '');
    };
    const task=QQ_LOW_MEMORY?sequence.then(load):load();
    tasks.push(task);
    if(QQ_LOW_MEMORY)sequence=task.then(()=>undefined,()=>undefined);
  });
  pack.ready=QQ_LOW_MEMORY?sequence:Promise.all(tasks).then(()=>undefined);
  return pack;
}
function releaseFullPack(pack){
  if(!pack||pack.released)return;
  pack.released=true;pack.controller.abort();
}
function releaseGalleryFull(g){
  releaseFullPack(g.nextPack);g.nextPack=null;g.renderToken++;
}
function prepareNextFull(g,state){
  if(!state.prepared)state.prepared=planBatch(g,state);
  const key=state.prepared.batch.map(x=>x.s).join('|');
  if(g.nextPack&&g.nextPack.key!==key){releaseFullPack(g.nextPack);g.nextPack=null}
  if(!g.nextPack)g.nextPack=makeFullPack(state.prepared.batch);
  return g.nextPack.ready;
}
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
  const batchKey=next.map(x=>x.s).join('|');
  if(g.nextPack&&g.nextPack.key===batchKey){releaseFullPack(g.nextPack);g.nextPack=null}
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
  Promise.all(cards.map(card=>waitForImage(card.querySelector('img')))).then(()=>{
    if(renderToken!==g.renderToken||g.shown!==next)return;
    loadQrAssets().finally(()=>{
      if(renderToken!==g.renderToken||g.shown!==next)return;
      Promise.resolve(prepareNextFull(g,state)).finally(()=>{
        if(renderToken===g.renderToken&&g.shown===next&&activeWorks===key)scheduleOriginalWarm(next);
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
  cancelGalleryTransition();
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
  g.cat='all';g.shown=[];g.states={};g.nextPack=null;g.renderToken=0;
  const tabs=document.getElementById('tabs-'+g.key);
  if(tabs){
    tabs.setAttribute('role','group');tabs.setAttribute('aria-label','作品分类筛选');
    tabs.querySelectorAll('.cat-tab').forEach(btn=>{
      btn.setAttribute('aria-pressed',String(btn.classList.contains('active')));
      btn.addEventListener('click',()=>{
        cancelGalleryTransition();
        tabs.querySelectorAll('.cat-tab').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false')});
        btn.classList.add('active');btn.setAttribute('aria-pressed','true');releaseGalleryFull(g);
        g.cat=btn.dataset.cat;g.shown=[];renderGallery(g.key);
      });
    });
  }
  if(g.key==='zhengpian')renderGallery(g.key);
});
function releaseAllImageMemory(){
  GALLERIES.forEach(g=>releaseGalleryFull(g));
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
    if(previous)releaseGalleryFull(previous);
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
