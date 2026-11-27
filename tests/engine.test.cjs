const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname,'..','dist');
function fixture() {
  const ctx = vm.createContext({window:{}, Math:Object.create(Math)});
  for (const file of ['words.js','engine.js']) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
  const Q = ctx.window.Quiz, words = ctx.window.WORDS, s = Q.fresh();
  Q.next(s);
  return {ctx,Q,words,s};
}
test('each of 800 words supports four unique same-POS choices and has a sourced bilingual example',()=>{
  const {ctx,Q,words,s} = fixture();
  ctx.Math.random=()=>.75; // Walk through all new words in order.
  assert.equal(words.length,800);
  assert.equal(new Set(words.map(w=>w.word)).size,800);
  for (const word of words) {
    assert.ok(word.ipa && word.en && word.zh && word.source && word.sourceUrl);
    assert.ok(words.filter(w=>w.pos===word.pos && w.group===word.group).length>=4);
    assert.equal(s.question.word,word.word);
    assert.equal(new Set(s.question.choices.map(k=>Q.byWord.get(k).meaning)).size,4);
    assert.ok(s.question.choices.every(k=>Q.byWord.get(k).pos===word.pos));
    Q.grade(s,word.word);assert.equal(s.records[word.word].pool,'mastered');Q.next(s);
  }
  assert.equal(Object.keys(s.records).length,800);
});
test('ordinary draws use exactly the 15/35/50 thresholds',()=>{
  const {ctx,Q,words,s} = fixture();
  s.records[words[0].word]={pool:'mastered',streak:0,due:null};
  s.records[words[1].word]={pool:'error',streak:1,due:null};
  for(const [r,k] of [[0,'mastered'],[.1499,'mastered'],[.15,'error'],[.4999,'error'],[.5,'new'],[.999,'new']]){
    ctx.Math.random=()=>r;Q.next(s);assert.equal(s.question.origin,k);
  }
});
test('misses reserve distinct slots 3–6 questions ahead across reloads, and cannot be graded twice',()=>{
  const {Q,s} = fixture();
  for(let i=0;i<3000;i++){
    const q=s.question;
    const due=Object.entries(s.records).find(([,r])=>r.due===q.sequence);
    if(due)assert.equal(q.word,due[0]);
    const ok=i%13>=6;
    const choice=ok?q.word:q.choices.find(k=>k!==q.word);
    Q.grade(s,choice);
    if(!ok){const r=s.records[q.word];assert.equal(r.pool,'error');assert.equal(r.streak,0);assert.ok(r.due-s.total>=3&&r.due-s.total<=6)}
    const total=s.total;Q.grade(s,choice);assert.equal(s.total,total);
    assert.ok(Q.valid(JSON.parse(JSON.stringify(s))));
    Q.next(s);assert.ok(Q.valid(s));
    if(s.records[s.question.word]?.due)assert.equal(s.records[s.question.word].due,s.question.sequence);
  }
});
test('three consecutive correct reviews promote, a miss resets and a mastered miss demotes',()=>{
  const {ctx,Q,s,words} = fixture();const word=words[0].word;
  Q.grade(s,word);ctx.Math.random=()=>0;Q.next(s);assert.equal(s.question.origin,'mastered');
  const miss=()=>Q.grade(s,s.question.choices.find(w=>w!==word));
  miss();assert.equal(s.records[word].pool,'error');
  const review=()=>{
    ctx.Math.random=()=>.20;Q.next(s);
    while(s.question.word!==word){Q.grade(s,s.question.word);Q.next(s)}
  };
  for(const streak of [1,2]){review();Q.grade(s,word);assert.equal(s.records[word].streak,streak)}
  review();miss();assert.equal(s.records[word].streak,0);
  for(const streak of [1,2]){review();Q.grade(s,word);assert.equal(s.records[word].streak,streak)}
  review();Q.grade(s,word);assert.equal(s.records[word].pool,'mastered');
});
test('malformed backup is rejected and all static dependencies are precached',()=>{
  const {Q,s}=fixture();assert.ok(Q.valid(s));
  const bad=JSON.parse(JSON.stringify(s));bad.question.choices[1]=bad.question.choices[0];assert.equal(Q.valid(bad),false);
  const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
  const files=fs.readdirSync(root,{recursive:true,withFileTypes:true}).filter(e=>e.isFile()&&e.name!=='service-worker.js');
  for(const e of files){const relative=path.relative(root,path.join(e.parentPath||e.path,e.name));assert.ok(sw.includes("'./"+relative+"'"),relative)}
});

test('switching mode replaces the word and choices without grading the abandoned question',()=>{
  const {Q,s}=fixture();
  for(const mode of ['zh','en','mix','zh','mix']){
    const previous=s.question;
    assert.ok(Q.switchMode(s,mode));
    assert.notEqual(s.question.word,previous.word);
    assert.notEqual(s.question.choices,previous.choices);
    assert.equal(s.question.answer,null);
    if(mode!=='mix') assert.equal(s.question.direction,mode);
    assert.equal(s.total,0);
    assert.equal(Object.keys(s.records).length,0);
    assert.ok(Q.valid(s));
  }
  const last=s.question;
  assert.equal(Q.switchMode(s,s.mode),false);
  assert.equal(s.question,last);
});

test('mode switches after grading preserve the grade and consume only an already displayed reservation',()=>{
  const {ctx,Q,s}=fixture();
  ctx.Math.random=()=>0; // Reserve the third subsequent question.
  const original=s.question.word;
  Q.grade(s,s.question.choices.find(w=>w!==original));
  Q.switchMode(s,'zh');
  assert.equal(s.total,1);
  assert.equal(s.records[original].due,4);
  Q.grade(s,s.question.word);
  Q.switchMode(s,'en');
  assert.equal(s.total,2);
  Q.grade(s,s.question.word);
  Q.next(s);
  assert.equal(s.question.word,original);
  assert.equal(s.question.sequence,4);
  const run=s.run;
  Q.switchMode(s,'mix');
  assert.notEqual(s.question.word,original);
  assert.equal(s.records[original].pool,'error');
  assert.equal(s.records[original].streak,0);
  assert.equal(s.records[original].due,null);
  assert.equal(s.run,run);
  assert.equal(s.total,3);
  assert.ok(Q.valid(s));
});

test('redraws still work with an exhausted new pool and with only one word in the selected pool',()=>{
  const {ctx,Q,words,s}=fixture();
  for(const word of words) s.records[word.word]={pool:'mastered',streak:0,due:null};
  ctx.Math.random=()=>.2;
  Q.next(s);
  const previous=s.question.word;
  s.records[previous]={pool:'error',streak:1,due:null};
  Q.switchMode(s,'zh');
  assert.notEqual(s.question.word,previous);
  assert.equal(s.question.origin,'mastered');
  assert.equal(s.records[previous].streak,1);
});

test('v1 backups retain their current question, settings, streaks and reservations',()=>{
  const {Q,s}=fixture();
  Q.grade(s,s.question.choices.find(w=>w!==s.question.word));
  const saved=JSON.parse(JSON.stringify(s));
  delete saved.effects;
  saved.sound=false;
  const migrated=Q.restore(saved);
  assert.ok(migrated.effects);
  assert.deepEqual(JSON.parse(JSON.stringify(migrated)),{...saved,effects:true});
  assert.equal(Q.restore({...saved,effects:false}).effects,false);
  assert.equal(Q.restore({...saved,effects:'true'}),null);
});

test('each word has an indexed offline pronunciation in a shipped, contiguous audio pack',()=>{
  const {ctx,words}=fixture();
  vm.runInContext(fs.readFileSync(path.join(root,'audio-index.js'),'utf8'),ctx);
  const index=ctx.window.AUDIO_INDEX;
  assert.equal(Object.keys(index).length,words.length);
  const ends=new Map();
  for(const {word} of words){
    const [offset,duration,part=0]=index[word];
    assert.ok(Number.isInteger(part) && part>=0 && part<=11);
    assert.ok(Math.abs((ends.get(part)||0)-offset)<.0001);
    assert.ok(Number.isFinite(duration) && duration>0);
    ends.set(part,offset+duration);
  }
  assert.equal(ends.size,12);
  for(const part of ends.keys()){
    const suffix=part?'-'+String(part).padStart(2,'0'):'';
    assert.ok(fs.statSync(path.join(root,'assets','pronunciation'+suffix+'.mp3')).size>0);
  }
});
