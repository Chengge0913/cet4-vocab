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
test('each of 250 words supports four unique same-POS choices and has a sourced bilingual example',()=>{
  const {Q,words,s} = fixture();
  assert.equal(words.length,250);
  assert.equal(new Set(words.map(w=>w.word)).size,250);
  for (const word of words) {
    assert.ok(word.ipa && word.en && word.zh && word.source && word.sourceUrl);
    assert.ok(words.filter(w=>w.pos===word.pos && w.group===word.group).length>=4);
    if (s.question.word!==word.word) { // Select from the remaining new words in sequence.
      while (s.question.word!==word.word) {Q.grade(s,s.question.word);Q.next(s)}
    }
    assert.equal(new Set(s.question.choices.map(k=>Q.byWord.get(k).meaning)).size,4);
    assert.ok(s.question.choices.every(k=>Q.byWord.get(k).pos===word.pos));
    Q.grade(s,word.word);assert.equal(s.records[word.word].pool,'mastered');Q.next(s);
  }
  assert.equal(Object.keys(s.records).length,250);
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
