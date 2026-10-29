const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const dir = path.resolve(__dirname, '..');
const context = { window: {}, console, Math, state: { portraits: {} }, root: { addEventListener() {} } };
context.window = context;
vm.createContext(context);
for (const file of ['questions.js','extra_questions.js','portraits.js','portrait_practice.js'])
  vm.runInContext(fs.readFileSync(path.join(dir,file),'utf8'), context, { filename: file });
const questions=context.QUESTION_BANK, portraits=context.PORTRAITS;
assert.equal(portraits.length, 54);
assert.equal(new Set(portraits.map(p=>p.id)).size,portraits.length);
for(const p of portraits){assert(fs.existsSync(path.join(dir,p.image)),p.image);assert(p.topics.includes(p.topic));}
assert.equal(new Set(questions.map(q=>q.id)).size,questions.length);
for(let topic=1;topic<=32;topic++)assert(questions.some(q=>q.topic===topic),`missing topic ${topic}`);
for(const q of questions){assert.equal(q.options.length,4,q.id);assert.equal(new Set(q.options).size,4,q.id);assert.equal(q.options.filter(a=>a===q.a).length,1,q.id);assert(q.source && q.why,q.id);}
for(let i=0;i<100;i++){
  const sample=context.weightedPortraits(portraits,25);
  assert.equal(sample.length,25);
  assert.equal(new Set(sample.map(p=>p.id)).size,25);
}
const p=portraits[0];
assert(context.portraitCandidates(p.topic).some(x=>x.id===p.id));
context.state.portraits[p.id]={stage:5};assert(context.portraitWeight(p)<context.portraitWeight(portraits[1]));
console.log(`OK: ${questions.length} questions across 32 topics, ${portraits.length} portraits, unique samples and adaptive weights`);
