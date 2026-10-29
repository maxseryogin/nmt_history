const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const dir = path.resolve(__dirname, '..');
const context = { window: {}, console, Math, state: { portraits: {} }, root: { addEventListener() {} }, shuffle: x=>[...x], esc: x=>String(x) };
context.window = context;
vm.createContext(context);
for (const file of ['questions.js','extra_questions.js','more_questions.js','lessons.js','extra_lessons.js','portraits.js','portrait_practice.js'])
  vm.runInContext(fs.readFileSync(path.join(dir,file),'utf8'), context, { filename: file });
const questions=context.QUESTION_BANK, portraits=context.PORTRAITS;
assert.equal(portraits.length, 54);
assert.equal(new Set(portraits.map(p=>p.id)).size,portraits.length);
for(const p of portraits){assert(fs.existsSync(path.join(dir,p.image)),p.image);assert(p.topics.includes(p.topic));}
assert.equal(new Set(questions.map(q=>q.id)).size,questions.length);
for(let topic=1;topic<=32;topic++)assert(questions.filter(q=>q.topic===topic).length>=6,`too few questions in topic ${topic}`);
for(const q of questions){assert.equal(q.options.length,4,q.id);assert.equal(new Set(q.options).size,4,q.id);assert.equal(q.options.filter(a=>a===q.a).length,1,q.id);assert(q.source && q.why,q.id);}
const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
for (const name of ['topicQuestions','lessonQuestions']) {
  const line=app.split('\n').find(line=>line.startsWith(`function ${name}(`));
  assert(line,`missing ${name}`);vm.runInContext(line,context);
}
const pages=JSON.parse(fs.readFileSync(path.join(dir,'assets/library.json'),'utf8')).pages;
for(const q of questions)assert(pages.some(p=>p.short_name===q.source[0]&&p.page_number===q.source[1]),`missing question source ${q.id}`);
for(let topic=1;topic<=32;topic++){
  const lessons=context.lessonQuestions(topic);
  assert(lessons.length>0,`no lesson steps for topic ${topic}`);
  for(const q of lessons){
    const note=context.LESSON_NOTES[q.id];assert(note?.length===2 && note[0].length>3 && note[1].length>30,q.id);
    assert(pages.some(p=>p.short_name===q.source[0]&&p.page_number===q.source[1]),`missing source ${q.id}`);
  }
}
assert.equal(context.lessonQuestions(2).length,11,'preserve topic 2 lesson');
assert.equal(context.lessonQuestions(6).length,4,'include existing and new topic 6 steps');
for(let i=0;i<100;i++){
  const sample=context.weightedPortraits(portraits,25);
  assert.equal(sample.length,25);
  assert.equal(new Set(sample.map(p=>p.id)).size,25);
}
const p=portraits[0];
assert(context.portraitCandidates(p.topic).some(x=>x.id===p.id));
context.state.portraits[p.id]={stage:5};assert(context.portraitWeight(p)<context.portraitWeight(portraits[1]));
const special=portraits.find(person=>person.id==='p4-1'); context.special=special;
vm.runInContext('portraitSession={list:[special],index:0,choice:null,options:[]}',context);
const seen=new Set();
for(let i=0;i<500;i++){
  vm.runInContext('preparePortrait()',context);
  const current=vm.runInContext('portraitSession',context);
  if(!current.imageChoice)continue;
  if(current.prompt.sourceId)seen.add(current.prompt.sourceId);
  const html=vm.runInContext('portraitQuizPage()',context);
  assert(!html.includes(special.name), 'image choices must hide names before answering');
}
assert(seen.has(268) && seen.has(10),'agreement and quotation prompts must be selectable');
console.log(`OK: ${questions.length} questions across 32 topics, ${portraits.length} portraits, unique samples and adaptive weights`);
