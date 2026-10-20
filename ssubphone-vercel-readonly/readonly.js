/* Read-only reconstruction driven by the user's exported profile JSON.
   No changes are made to storage or the source data. */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const jsonValue = (obj, key, defaultValue) => {try{return JSON.parse(obj?.[key] || '')}catch{return defaultValue}};
const fmt = ts => { const d = new Date(Number(ts));return Number.isFinite(d.getTime()) ? d.toLocaleDateString('ko-KR',{month:'short',day:'numeric'}) : ''; };
const stamp = ts => {const d = new Date(Number(ts)); return Number.isFinite(d.getTime()) ? d.toLocaleString('ko-KR',{year:'numeric',month:'long',day:'numeric',hour:'numeric',minute:'2-digit'}) : '';};
const icon = {
 home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-8h6v8"/></svg>',
 search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10.8" cy="10.8" r="7.3"/><path d="m16.2 16.2 5 5"/></svg>',
 notify:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8a6 6 0 0 0-12 0c0 8-3 8-3 10h18c0-2-3-2-3-10M10 22h4"/></svg>',
 dm:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m3 6 9 8 9-8"/></svg>',
 reply:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20 11.5a8.5 8.5 0 0 1-12.5 7.5L3 20l1.5-4A8.5 8.5 0 1 1 20 11.5Z"/></svg>',
 repeat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4M21 13v3a2 2 0 0 1-2 2H3"/></svg>',
 heart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z"/></svg>',
 eye:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>'
};
const APP_IDS = {twitter:'twitterApp',instagram:'instagramApp',messages:'messagesApp',kakao:'kakaoApp',phone:'phoneApp'};
const state = {app:null,view:'feed',id:null,tab:'for-you',phoneTab:'messages',igTab:'home',kakaoTab:'friends'};
const navStack=[];
let P={}, tw={}, ig={}, contacts=[], sms={}, kakao={}, homeLayout={};
const el = (name) => document.getElementById(name);
const person = pid => tw.people?.find(x => String(x.id)===String(pid)) || (pid==='me'?tw.me:null);
const me = ()=> tw.me||{name:'나',handle:'my_account'};
const who = t => t?.mine ? me() : person(t?.pid)||{name:t?.name||'',handle:t?.handle||'',avatar:''};
const avatar=(p,kind='tw',xl=false)=>{
 const safeName=p?.name||'사용자', safeImage=p?.avatar||'';
 const isImage=/^(data:image\/(jpeg|png|webp|gif);base64,|https:\/\/)/i.test(safeImage);
 const klass=kind==='tw'?'tw-av':kind==='ig'?'ig-av':'ro-avatar';
 return `<span class="${klass}${xl?' xl':''}">${isImage?`<img src="${esc(safeImage)}" alt="${esc(safeName)}">`:esc(safeName.slice(0,1))}</span>`;
};
function clearScreens(){document.querySelectorAll('.app-screen').forEach(e=>e.classList.remove('is-open'));}
function setClock(){
 const n=new Date();const t=n.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false});
 document.querySelectorAll('.phone-status-bar__time').forEach(a=>a.textContent=t);
 const day=n.toLocaleDateString('ko-KR',{weekday:'short'});
 if(el('calendarIconDay'))el('calendarIconDay').textContent=n.getDate();
 if(el('calendarIconWeekday'))el('calendarIconWeekday').textContent=day;
}
function updateHomeLayout(){
 const grid=$('.app-grid');
 if(!grid) return;
 const icons=[...grid.querySelectorAll('button.app-icon')];
 const map=new Map(icons.map(node=>[node.dataset.app,node]));
 const hidden=new Set(homeLayout?.removedApps||[]);
 const orders=(homeLayout?.order||[]).filter(item=>item?.type==='app').map(item=>item.key);
 for(const key of orders){const node=map.get(key);if(node)grid.appendChild(node)}
 for(const node of icons){node.hidden=hidden.has(node.dataset.app)}
 // Exported data has no persisted app visibility for dock, retain its original four buttons.
}
function openApp(app,view=null,id=null,remember=true){
 if(remember && state.app)navStack.push({app:state.app,view:state.view,id:state.id});
 state.app=app;state.view=view || ({twitter:'feed',instagram:'home',messages:'list',kakao:'list',phone:'contacts'}[app] || 'generic');state.id=id;
 clearScreens();el(APP_IDS[app]||'genericApp').classList.add('is-open');
 render();
}
function goBack(){
 if(navStack.length){const p=navStack.pop();openApp(p.app,p.view,p.id,false);return;}
 if(state.app && !['feed','home','list','contacts','generic'].includes(state.view)){
  const app=state.app;
  openApp(app,({twitter:'feed',instagram:'home',messages:'list',kakao:'list',phone:'contacts'}[app]||'generic'),null,false);return;
 }
 goHome();
}
function goHome(){state.app=null;state.view='feed';state.id=null;navStack.length=0;clearScreens();}
function navigate(view,id=null){if(state.app)navStack.push({app:state.app,view:state.view,id:state.id});state.view=view;state.id=id;render();}
const empty=(name='저장된 항목이 없습니다.')=>`<div class="ro-empty"><span class="ro-empty-icon">○</span><span>${esc(name)}</span></div>`;
function homeButton(dark=false){return `<button class="ro-bottom-home${dark?' dark':''}" data-act="home" title="홈으로" aria-label="홈으로"></button>`;}
function twNavigation(active='home'){
 const tabs=[['home','홈'],['search','검색'],['notify','알림'],['dm','쪽지']];
 return `<nav class="tw-nav" aria-label="X 메뉴">${tabs.map(([n,label])=>`<button type="button" class="${n===active?'on':''}" data-act="tw-tab" data-id="${n}" aria-label="${label}">${icon[n==='home'?'home':n==='search'?'search':n==='notify'?'notify':'dm']}</button>`).join('')}</nav>`;
}
function twHeader(title='홈',back=false){return `<div class="tw-top">${back?'<button class="tw-topbutton" data-act="back" aria-label="뒤로">‹</button>':`<button class="tw-ic" data-act="tw-me" title="내 프로필">${avatar(me())}</button>`}<b>${esc(title)}</b><span></span></div>`;}
function tweetCard(t,full=false){
 const p=who(t),pid=t.mine?'me':t.pid;const date=fmt(t.ts);const images=Array.isArray(t.imgs) ? t.imgs:(t.img?[t.img]:[]);
 const medias=images.filter(u=>typeof u==='string' && /^(data:image\/(jpeg|png|webp|gif);base64,|https:\/\/)/i.test(u));
 return `<article class="tw-t${full?' full':''}" ${full?'':'data-act="tw-post" data-id="'+esc(t.id)+'"'}>
  <button class="tw-ic" data-act="tw-profile" data-id="${esc(pid||'me')}" title="작성자 보기">${avatar(p)}</button>
  <div class="tw-main"><div class="tw-h"><button data-act="tw-profile" data-id="${esc(pid||'me')}"><b>${esc(p.name||t.name||'')}</b></button><span>@${esc(p.handle||t.handle||'')} · ${esc(date)}</span></div>
  ${t.re&&tw.tweets.find(x=>x.id===t.re)?`<div style="color:#71767b;font-size:13px;padding:4px 0 2px">답글</div>`:''}
  <div class="tw-x tw-click" data-act="tw-post" data-id="${esc(t.id)}">${esc(t.text).replace(/\n/g,'<br>')}</div>
  ${medias.map((url,i)=>`<img class="tw-img" alt="게시물 사진 ${i+1}" loading="lazy" src="${esc(url)}" data-act="image-open" data-id="${esc(t.id)}" data-index="${i}">`).join('')}
  <div class="tw-a" aria-label="기록된 반응 수 (읽기 전용)"><button title="답글 수">${icon.reply}<i>${esc(t.rp||'0')}</i></button><button title="리포스트 수">${icon.repeat}<i>${esc(t.rt||'0')}</i></button><button title="좋아요 수">${icon.heart}<i>${esc(t.likes||'0')}</i></button><button title="조회 수">${icon.eye}<i>${esc(t.views||'0')}</i></button></div>
 </div></article>`;
}
function twFeed(){
 const isFollowing=state.tab==='following';
 const selected=isFollowing?(tw.tweets||[]).filter(t=>t.mine||(tw.follow||[]).includes(t.pid)):(tw.tweets||[]);
 return `${twHeader()}<div class="tw-tabs"><button data-act="tw-feed-tab" data-id="for-you" class="${isFollowing?'':'on'}"><span>추천</span></button><button data-act="tw-feed-tab" data-id="following" class="${isFollowing?'on':''}"><span>팔로잉</span></button></div><div class="tw-body">${selected.length?selected.map(t=>tweetCard(t)).join(''):empty('저장된 게시물이 없습니다.')}</div>${twNavigation()}`;
}
function twDetail(id){
 const t=tw.tweets?.find(t=>String(t.id)===String(id));if(!t)return twFeed();
 const parent=tw.tweets?.find(v=>v.id===t.re);
 const replies=tw.tweets?.filter(v=>v.re===t.id)||[];
 return `${twHeader('게시물',true)}<div class="tw-body">${parent?`<div class="tw-bubble-label">이 게시물의 이전 대화</div>${tweetCard(parent)}`:''}${tweetCard(t,true)}<div class="tw-time">${esc(stamp(t.ts))}</div>${replies.length?`<div class="tw-bubble-label">답글</div>${replies.map(r=>tweetCard(r)).join('')}`:''}</div>${twNavigation()}`;
}
function twProfile(pid){
 const p=pid==='me'?me():person(pid);
 if(!p)return `${twHeader('프로필',true)}${empty('저장된 프로필이 없습니다.')}${twNavigation()}`;
 const tweets=(tw.tweets||[]).filter(t=>pid==='me'?t.mine:t.pid===pid);
 const followers=(tw.followers||[]).filter(id=>id===pid).length;
 return `${twHeader(p.name||'프로필',true)}<div class="tw-body"><div class="tw-profile-cover"></div><div class="tw-profile-meta">${avatar(p,'tw',true)}<h2>${esc(p.name)}</h2><div class="tw-ph">@${esc(p.handle)}</div>${p.bio?`<p>${esc(p.bio)}</p>`:''}${p.loc?`<p style="color:#71767b">⌖ ${esc(p.loc)}</p>`:''}<small>게시물 ${tweets.length}개</small></div><div class="tw-bubble-label">게시물</div>${tweets.length?tweets.map(t=>tweetCard(t)).join(''):empty('게시물이 없습니다.')}</div>${twNavigation()}`;
}
function twExplore(){
 return `${twHeader('검색',true)}<div class="tw-body"><div style="padding:12px 16px"><input id="twSearch" class="tw-searchfield" type="search" autocomplete="off" placeholder="저장된 계정·게시물 검색" aria-label="저장된 콘텐츠 검색"></div><div id="twSearchResults">${twSearchHTML('')}</div></div>${twNavigation('search')}`;
}
function twSearchHTML(q){
 const f=String(q||'').trim().toLowerCase();const people=(tw.people||[]).filter(x=>[x.name,x.handle,x.bio].some(s=>String(s||'').toLowerCase().includes(f)));
 const posts=(tw.tweets||[]).filter(x=>String(x.text||'').toLowerCase().includes(f));
 return `<div class="tw-bubble-label">계정</div>${people.length?people.map(p=>`<button class="tw-row" style="border:0;background:#000;color:#fff;width:100%;text-align:left" data-act="tw-profile" data-id="${esc(p.id)}">${avatar(p)}<span class="tw-rn"><b>${esc(p.name)}</b><span>@${esc(p.handle)}</span></span><span>›</span></button>`).join(''):empty('일치하는 계정이 없습니다.')}<div class="tw-bubble-label">게시물</div>${posts.length?posts.map(t=>tweetCard(t)).join(''):empty('일치하는 게시물이 없습니다.')}`;
}
function twEmptyScreen(kind){
 const isDM=kind==='dm';
 return `${twHeader(isDM?'쪽지':'알림',true)}<div class="tw-body">${empty(isDM?'저장된 쪽지가 없습니다.':'저장된 알림이 없습니다.')}</div>${twNavigation(kind)}`;
}
function renderTwitter(){
 const content=state.view==='feed'?twFeed():state.view==='post'?twDetail(state.id):state.view==='profile'?twProfile(state.id):state.view==='search'?twExplore():twEmptyScreen(state.view);
 el('twRoot').innerHTML=content+homeButton(true);
}
function igNav(){return `<nav class="ig-nav" aria-label="인스타그램 메뉴"><button data-act="ig-tab" data-id="home" title="홈">⌂</button><button data-act="ig-tab" data-id="search" title="검색">⌕</button><button data-act="ig-tab" data-id="profile" title="프로필">◎</button></nav>`;}
function renderInstagram(){
 const profile=ig.me||{},isProfile=state.view==='profile';
 let body;
 if(isProfile){body=`<div class="ig-profile">${avatar(profile,'ig',true)}<div class="ig-profile-meta"><strong>${esc(profile.username||'my_account')}</strong><small>게시물 ${(ig.posts||[]).length} · 팔로워 ${(ig.followers||[]).length}</small></div></div><div class="ig-bio">${esc(profile.name||'')}${profile.bio?'<br>'+esc(profile.bio):''}</div>${empty('저장된 게시물이 없습니다.')}`;}
 else if(state.view==='search')body=empty('검색할 저장된 항목이 없습니다.');
 else body=empty('저장된 인스타그램 게시물과 스토리가 없습니다.');
 const header=isProfile?`${esc(profile.username||'Instagram')}`:state.view==='search'?'검색':'Instagram';
 el('igRoot').innerHTML=`<div class="ig-top"><button class="ig-ic" data-act="back" aria-label="뒤로">‹</button><b class="${!isProfile&&state.view==='home'?'ig-logo':''}">${header}</b><span></span></div><div class="ig-body">${body}</div>${igNav()}${homeButton(true)}`;
}
function roHeader(title,back=false){return `<header class="ro-header">${back?`<button class="ro-back" data-act="back" aria-label="뒤로">‹</button>`:''}<b>${esc(title)}</b><button class="ro-close" data-act="home">홈</button></header>`;}
function messageRow(key,thread){
 const m=thread.messages||[];const last=m[m.length-1]||{};return `<button class="ro-cell" data-act="sms-thread" data-id="${esc(key)}"><span class="ro-avatar" style="background:${esc(thread.avatarBg||'#9ea1b2')}">${esc(thread.avatarText||thread.name?.[0]||'?')}</span><span class="ro-main"><strong>${esc(thread.name||'메시지')}</strong><small>${esc(last.text||'').replace(/\s+/g,' ').slice(0,94)}</small></span><span class="ro-chevron">›</span></button>`;
}
function renderMessages(){
 const root=el('messagesRoot');
 if(state.view==='thread'){
 const thread=sms[state.id];
 if(!thread){state.view='list';return renderMessages()}
 let previousDate='';let content='';
 for(const msg of thread.messages||[]){
   if(msg.date && previousDate!==msg.date){content+=`<div class="ro-day">${esc(msg.date)}</div>`;previousDate=msg.date;}
   content+=`<div class="ro-bubble-row ${msg.from==='in'?'in':'out'}"><div class="ro-bubble">${esc(msg.text)}</div><time>${esc(msg.time||'')}</time></div>`;
 }
 root.innerHTML=`${roHeader(thread.name||'메시지',true)}<div class="ro-thread"><div class="ro-scroll">${content||empty('저장된 메시지가 없습니다.')}</div><div class="ro-composer-disabled">읽기 전용 · 답장 기능 없음</div></div>`+homeButton();return;
 }
 const items=Object.entries(sms).map(([k,v])=>messageRow(k,v)).join('');
 root.innerHTML=roHeader('메시지')+`<div class="ro-scroll">${items||empty('저장된 문자 대화가 없습니다.')}</div>`+homeButton();
}
function renderKakao(){
 const count=Object.keys(kakao).length;
 const isChats=state.kakaoTab==='chats';
 const data=isChats?Object.entries(kakao).map(([k,v])=>messageRow(k,v)).join(''):'';
 el('kakaoRoot').innerHTML=roHeader(isChats?'채팅':'친구')+`<div class="ro-tabs"><button class="${!isChats?'sel':''}" data-act="kk-tab" data-id="friends">친구</button><button class="${isChats?'sel':''}" data-act="kk-tab" data-id="chats">채팅</button></div><div class="ro-scroll">${data||empty(isChats?'저장된 카카오톡 대화가 없습니다.':'저장된 카카오톡 친구 정보가 없습니다.')}</div>`+homeButton();
}
function renderPhone(){
 const root=el('phoneRoot');
 if(state.view==='contact'){
  const item=contacts.find(p=>p.id===state.id);if(!item){state.view='contacts';return renderPhone();}
  root.innerHTML=roHeader('연락처',true)+`<div class="ro-scroll"><div class="ro-contact-detail"><span class="ro-avatar" style="height:82px;width:82px;font-size:33px;background:${esc(item.avatarBg||'#8d9aaf')}">${esc(item.avatarText||item.name?.[0]||'')}</span><h2>${esc(item.name)}</h2></div><div class="ro-pill"><span>전화번호</span><b>${esc(item.phone||'-')}</b></div></div>`+homeButton();return;
 }
 root.innerHTML=roHeader('연락처')+`<div class="ro-scroll">${contacts.length?contacts.map(item=>`<button class="ro-cell" data-act="contact" data-id="${esc(item.id)}"><span class="ro-avatar" style="background:${esc(item.avatarBg||'#9ba5ba')}">${esc(item.avatarText||item.name?.[0]||'')}</span><span class="ro-main"><strong>${esc(item.name)}</strong><small>${esc(item.sub||'')}</small></span><span class="ro-chevron">›</span></button>`).join(''):empty('저장된 연락처가 없습니다.')}</div>`+homeButton();
}
const appNames={camera:'카메라',mail:'메일',calendar:'캘린더',photos:'사진',settings:'설정',browser:'브라우저',clock:'시계',couple:'커플다이어리',memo:'메모',alerts:'알림',files:'파일',music:'음악',youtube:'YouTube',bank:'은행',delivery:'배달',shop:'쇼핑',google:'Google',appstore:'App Store'};
function renderGeneric(){
 const key=state.app;
 el('genericRoot').innerHTML=roHeader(appNames[key]||key||'앱')+`<div class="ro-scroll">${empty('이 앱에 저장된 콘텐츠가 없습니다.')}</div>`+homeButton();
}
function render(){
 const active=state.app;
 if(active==='twitter')renderTwitter();
 else if(active==='instagram')renderInstagram();
 else if(active==='messages')renderMessages();
 else if(active==='kakao')renderKakao();
 else if(active==='phone')renderPhone();
 else renderGeneric();
}
function photoOpen(postId,index){
 const t=(tw.tweets||[]).find(x=>String(x.id)===String(postId));const images=Array.isArray(t?.imgs)?t.imgs:(t?.img?[t.img]:[]);
 const safe=images[Number(index)||0];if(typeof safe!=='string'||!/^(data:image\/(jpeg|png|webp|gif);base64,|https:\/\/)/i.test(safe))return;
 el('viewerImage').src=safe;el('viewerOverlay').hidden=false;
}
function photoClose(){el('viewerOverlay').hidden=true;el('viewerImage').removeAttribute('src')}
document.addEventListener('click',e=>{
 const homeApp=e.target.closest('#homeScreen button[data-app]');
 if(homeApp){openApp(homeApp.dataset.app);return;}
 const a=e.target.closest('[data-act]');if(!a)return;
 e.preventDefault();e.stopPropagation();
 const act=a.dataset.act, id=a.dataset.id;
 switch(act){
  case 'home':goHome();break;
  case 'back':goBack();break;
  case 'tw-me':navigate('profile','me');break;
  case 'tw-tab':if(id==='home'){state.tab='for-you';navigate('feed')}else navigate(id);break;
  case 'tw-feed-tab':state.tab=id;render();break;
  case 'tw-post':navigate('post',id);break;
  case 'tw-profile':navigate('profile',id);break;
  case 'sms-thread':navigate('thread',id);break;
  case 'kk-tab':state.kakaoTab=id;render();break;
  case 'contact':navigate('contact',id);break;
  case 'ig-tab':navigate(id);break;
  case 'image-open':photoOpen(id,a.dataset.index);break;
  case 'image-close':photoClose();break;
 }
});
document.addEventListener('input',e=>{
 if(e.target?.id==='twSearch'){
 const result=el('twSearchResults');if(result)result.innerHTML=twSearchHTML(e.target.value);
 }
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'||(e.key==='Backspace'&&!/input|textarea/i.test(document.activeElement?.tagName||''))){
  e.preventDefault();if(!el('viewerOverlay').hidden)photoClose();else goBack();
 }
});
// Swipe down/up gesture: the bottom bar acts as Home and swipe right acts as Back.
let touchStart=null;
document.addEventListener('touchstart',e=>{if(e.touches.length!==1)return;touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});
document.addEventListener('touchend',e=>{
 if(!touchStart||!state.app)return;
 const dx=e.changedTouches[0].clientX-touchStart.x,dy=e.changedTouches[0].clientY-touchStart.y;
 if(touchStart.x<30 && dx>100 && Math.abs(dy)<75)goBack();
 else if(touchStart.y>innerHeight-35 && dy< -90)goHome();
 touchStart=null;
},{passive:true});
async function boot(){
 setClock();setInterval(setClock,20000);
 try{
  let exported=window.__SSUB_PHONE_DATA__;
  if(!exported){const r=await fetch('./profile-data.json',{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);exported=await r.json();}
  P=exported.profiles?.[0]?.data||{};
  document.querySelector('.phone')?.classList.toggle('dark-mode',P.darkModeOn==='1');
  tw=jsonValue(P,'lockDemoTwitter',{people:[],tweets:[]});
  ig=jsonValue(P,'lockDemoInstagram',{posts:[],stories:[]});
  sms=jsonValue(P,'lockDemoChatThreads',{});
  contacts=jsonValue(P,'lockDemoContacts',[]);
  kakao=jsonValue(P,'lockDemoKakaoThreads',{});
  homeLayout=jsonValue(P,'lockDemoHomeLayout',{});
  updateHomeLayout();
 }catch(err){
  console.error('프로필 로드 실패:',err);
  const e=document.createElement('div');
  e.className='ro-loading-error';
  e.style.cssText='position:absolute;top:30%;left:12%;width:76%;background:#fff;color:#222;border-radius:18px;padding:24px;z-index:100;text-align:center;line-height:1.5;box-shadow:0 8px 40px #0006';
  e.textContent='프로필 데이터를 불러오지 못했어요. Vercel에서 배포했는지, profile-data.json 파일이 같은 폴더에 있는지 확인해주세요.';
  $('.screen')?.appendChild(e);
 }
}
boot();
})();
