// Portrait questions are generated from the labelled pages of the user's collection.
let portraitSession = null, portraitTopic = null;
state.portraits = state.portraits || {};
function portraitCandidates(topic = null) {
  return PORTRAITS.filter(p => !topic || p.topics.includes(topic));
}
function portraitWeight(person) {
  const progress = state.portraits[person.id] || { stage: 0 };
  return Math.max(1, 6 - Math.min(5, progress.stage || 0));
}
function weightedPortraits(people, count) {
  const pool = [...people], chosen = [];
  while (chosen.length < count && pool.length) {
    let draw = Math.random() * pool.reduce((n, p) => n + portraitWeight(p), 0);
    let index = pool.findIndex(p => (draw -= portraitWeight(p)) < 0);
    chosen.push(pool.splice(index < 0 ? pool.length - 1 : index, 1)[0]);
  }
  return chosen;
}
function portraitPage() {
  const count = PORTRAITS.length;
  const topics = [...new Set(PORTRAITS.flatMap(p => p.topics))].sort((a,b) => a-b);
  return `<div class="eyebrow">Навчайся впізнавати історичних діячів</div><h1 class="heading">Портрети</h1>
    <p class="subheading">Портрети з наданої добірки: ${count} діячів. Відкрий тему або почни загальну практику. Складніші портрети частіше траплятимуться в наступних тестах.</p>
    <section class="card"><h3>Практика за всіма темами</h3><p>Обери кількість запитань. Та сама людина не буде правильною відповіддю двічі за тест.</p>
    <div class="action-row">${[10,15,25].map(n=>`<button class="btn btn-primary" data-portrait-start="${n}" ${count<n?'disabled':''}>${n} запитань</button>`).join('')}</div></section>
    <div class="section-heading"><h2>Портрети за темами</h2></div><div class="topic-list">${topics.map(t=>`<button class="topic-item" data-portrait-topic="${t}"><span class="topic-number">${String(t).padStart(2,'0')}</span><span class="topic-copy"><strong>${esc(tTitle(t))}</strong><small>${portraitCandidates(t).length} портретів</small></span><span class="chev">›</span></button>`).join('')}</div>
    <p class="subheading">Зображення й підписи наведено за наданою добіркою портретів. Перевірка їхньої атрибуції триває.</p>`;
}
function portraitTopicPage() {
  const people=portraitCandidates(portraitTopic);
  return `<button class="back" data-go="portraits">← Усі портрети</button><div class="eyebrow">Тема ${portraitTopic}</div><h1 class="detail-title">${esc(tTitle(portraitTopic))}</h1><p class="subheading">Спочатку переглянь портрети та імена, потім перевір себе.</p>
   <div class="action-row"><button class="btn btn-primary" data-portrait-start="${people.length}">Тренувати цю тему · ${people.length}</button></div>
   <div class="portrait-grid">${people.map(p=>`<article class="card portrait-card"><img src="${esc(p.image)}" alt="Портрет: ${esc(p.name)}"><strong>${esc(p.name)}</strong><button class="link-btn" data-page="${p.page+276}" data-page-topic="${p.topic}">Джерело ↗</button></article>`).join('')}</div>`;
}
function portraitOptions(person) {
  // Nearby topic numbers give alternatives from a similar period where possible.
  const peers=PORTRAITS.filter(p=>p.id!==person.id).sort((a,b)=>Math.abs(a.topic-person.topic)-Math.abs(b.topic-person.topic) || Math.random()-.5);
  const nearby=peers.filter(p=>Math.abs(p.topic-person.topic)<=2);
  const candidates=nearby.length>=3 ? nearby : peers.slice(0,8);
  return shuffle([person,...shuffle(candidates).slice(0,3)]);
}
function startPortraits(count, topic=null) {
  const people=portraitCandidates(topic);
  if (count > people.length || !count) { toast('Недостатньо портретів для цього тесту'); return; }
  portraitSession={list:weightedPortraits(people,count),index:0,correct:0,choice:null,options:[],topic};
  preparePortrait(); route='portraitQuiz'; render();
}
function preparePortrait() {
  const s=portraitSession,p=s.list[s.index];
  if(!p)return;
  s.options=portraitOptions(p); s.choice=null;
  const prompts=[];
  if(p.fact)prompts.push({text:`Хто ${p.fact}?`,description:p.fact});
  if(p.id==='p4-1'){
    prompts.push({text:'Який гетьман уклав Зборівський договір 1649 року?',description:'уклав Зборівський договір разом із польським королем Яном II Казимиром',sourceId:268,sourceName:'угоди, стор. 2'});
    prompts.push({text:'Кому в навчальній добірці приписано слова «Я з польським королем перед тим бився, щоб вернути свободу собі й козакам»?',description:'ці слова приписано Богдану Хмельницькому в навчальній добірці',sourceId:10,sourceName:'цитати, стор. 10'});
  }
  s.imageChoice=prompts.length>0 && Math.random()<0.5;
  s.prompt=s.imageChoice?prompts[Math.floor(Math.random()*prompts.length)]:null;
}
function portraitQuizPage() {
  const s=portraitSession;
  if(!s || s.index>=s.list.length) return `<button class="back" data-go="portraits">← До портретів</button><div class="empty"><h1 class="detail-title">Тренування завершено</h1><p>Правильних відповідей: ${s?.correct||0} з ${s?.list.length||0}.</p><button class="btn btn-primary" data-go="portraits">До портретів</button></div>`;
  const p=s.list[s.index], answered=s.choice!==null, selected=s.options[s.choice], good=answered&&selected.id===p.id;
  const options=s.options.map((o,i)=>{
    const klass=answered?(o.id===p.id?'correct':i===s.choice?'wrong':''):'';
    return `<button class="option ${klass} ${s.imageChoice?'portrait-option':''}" data-portrait-answer="${i}" ${answered?'disabled':''}>${s.imageChoice?`<img src="${esc(o.image)}" alt="Варіант ${i+1}">${answered?`<span>${esc(o.name)}</span>`:''}`:esc(o.name)}</button>`;
  }).join('');
  return `<div class="quiz"><div class="quiz-top"><button class="back" data-go="${s.topic?'portraitTopic':'portraits'}">← Вийти</button><span class="pill">${s.index+1} / ${s.list.length}</span></div><div class="progress"><span style="width:${s.index/s.list.length*100}%"></span></div>
  <div class="eyebrow" style="margin-top:25px">Портрети · Тема ${p.topic}</div><h1>${s.imageChoice?esc(s.prompt.text):'Кого зображено на портреті?'}</h1>${s.imageChoice?'':`<img class="quiz-image" src="${esc(p.image)}" alt="Портрет історичного діяча">`}
  <div class="${s.imageChoice?'portrait-options':'options'}">${options}</div>${answered?`<div class="feedback ${good?'':'wrong'}"><strong>${good?'Правильно':'Варто повторити'}: ${esc(p.name)}</strong>Підпис у наданій добірці портретів.${s.prompt?.description?` ${esc(s.prompt.description)}.`:''}<div><button class="link-btn" data-page="${p.page+276}" data-page-topic="${p.topic}">Джерело: портрети, стор. ${p.page} ↗</button>${s.prompt?.sourceId?` · <button class="link-btn" data-page="${s.prompt.sourceId}" data-page-topic="${p.topic}">${esc(s.prompt.sourceName)} ↗</button>`:''}</div><button class="btn btn-primary" data-portrait-next>Далі →</button></div>`:''}</div>`;
}
root.addEventListener('click', e=>{
  const b=e.target.closest('button'); if(!b)return;
  if(b.dataset.portraitTopic){portraitTopic=Number(b.dataset.portraitTopic);route='portraitTopic';render();}
  if(b.dataset.portraitStart){startPortraits(Number(b.dataset.portraitStart),route==='portraitTopic'?portraitTopic:null);}
  if(b.dataset.portraitAnswer!==undefined && portraitSession && portraitSession.choice===null){
    const s=portraitSession,p=s.list[s.index]; s.choice=Number(b.dataset.portraitAnswer);
    const good=s.options[s.choice].id===p.id, old=state.portraits[p.id]||{stage:0};
    if(good)s.correct++; state.portraits[p.id]={stage:good?Math.min(5,(old.stage||0)+1):0}; save(); render();
  }
  if(b.hasAttribute('data-portrait-next')){portraitSession.index++;preparePortrait();render();}
});
root.addEventListener('error', e=>{
  if(route!=='portraitQuiz' || e.target.tagName!=='IMG' || !e.target.closest('.quiz'))return;
  for(const button of root.querySelectorAll('[data-portrait-answer]'))button.disabled=true;
  const options=root.querySelector('.portrait-options, .options');
  if(options && !root.querySelector('.portrait-load-error'))options.insertAdjacentHTML('beforebegin','<div class="notice portrait-load-error">Не вдалося завантажити портрет. Перевір з’єднання та почни тренування ще раз. Відповідь не буде записана.</div>');
},true);
