'use strict';
(() => {
  const paths = {
    brand:'<path d="M3 5.3C6 4.8 9 5.8 11 7.4v13c-2-1.8-5-2.7-8-2.5zM21 3.5c-3.4.1-6.2 1.2-8.1 3.2v13.4c2-1.9 4.8-3.1 8.1-3.2z" fill="currentColor" stroke="none"/><path d="M16 8.6l2.4-1" stroke="#6b5cdb" stroke-width="1.5"/>',
    settings:'<path d="m9.5 3 .65-1h3.7l.65 2 2 .95 1.9-.4 1.85 3.2-1.2 1.62.2 2.32 1.4 1.45-1.9 3.34-2.12-.25-1.87 1.28-.55 2.04h-3.8l-.68-1.99-2-1.05-2.07.4-1.85-3.27 1.28-1.57-.02-2.3-1.28-1.62 1.9-3.2 2.05.36L9.1 4.17Z" transform="translate(.3 .8)"/><circle cx="12" cy="12" r="3"/>',
    'book-open':'<path d="M3 5.5c3.5-.7 6.2.1 9 2.3 2.8-2.2 5.5-3 9-2.3v13c-3.5-.7-6.2.1-9 2.3-2.8-2.2-5.5-3-9-2.3zM12 8v12"/>',
    book:'<path d="M6 3h13v18H7a3 3 0 0 1-3-3V6a3 3 0 0 1 2-3Zm-2 15a3 3 0 0 1 3-3h12M8 7h6"/>',
    shuffle:'<path d="M3 6h3c4.7 0 7.3 12 12 12h3m-3-3 3 3-3 3M3 18h3c1.5 0 3-1.7 4.5-4M14 9c1.2-1.7 2.5-3 4-3h3m-3-3 3 3-3 3"/>',
    languages:'<path d="M3 6h11M8 3v3m3 0c-.6 5.1-3.9 9-8 11m2-8c1.4 2.7 3.2 4.7 6 6m2 5 4-11 4 11m-6.5-4h5"/>',
    volume:'<path d="m4 9 4 .1 5-4v14L8 15H4zM16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    options:'<rect x="3" y="4" width="4" height="4" rx="1"/><rect x="3" y="14" width="4" height="4" rx="1"/><path d="M11 6h10m-10 10h10"/>',
    layers:'<path d="m3 8 9-5 9 5-9 5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
    repeat:'<path d="M4 10a8 8 0 1 1 .5 6M4 4v6h6"/><path d="M12 8v5l3 2"/>',
    mastered:'<path d="m12 2 8 3v6c0 5-4.3 8.7-8 11-3.7-2.3-8-6-8-11V5z"/><path d="m8.3 11.7 2.5 2.5 5.2-5.1"/>',
    activity:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M7.5 16v-4m4.5 4V7.5m4.5 8.5v-6"/>',
    keyboard:'<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9h.1M10 9h.1M14 9h.1M18 9h.1M6 12h.1M10 12h.1M14 12h.1M18 12h.1M8 15h8"/>',
    shield:'<path d="m12 3 8 3v6c0 4-4.1 7.2-8 9-3.9-1.8-8-5-8-9V6z"/><path d="m8.5 11.5 2.4 2.5 4.5-4.6"/>',
    check:'<path d="m5 12 4.2 4.2L19 6.5"/>',x:'<path d="m6 6 12 12M6 18 18 6"/>',chev:'<path d="m9 5 7 7-7 7"/>',
    download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/>',upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4"/>'
  };
  const icon = name => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+paths[name]+'</svg>';
  const $ = selector => document.querySelector(selector);
  document.querySelectorAll('[data-icon]').forEach(el => {el.innerHTML = icon(el.dataset.icon)});
  const meta = {
    new: ['未学词库','New Pool','book','未学','新词'],
    error: ['高频错题','Error Pool','repeat','高频错题','错题复习'],
    mastered: ['已掌握','Mastered Pool','mastered','已掌握','掌握抽查']
  };
  const words = window.WORDS, Q = window.Quiz, key = 'ciyu.cet4.v1';
  document.querySelectorAll('[data-word-count]').forEach(el => {el.textContent = words.length});
  let lastStored, state, advanceTimer, toastTimer, modalView = '', importState;
  let storageWritable = true;
  function read() {
    try {
      lastStored = localStorage.getItem(key);
      if (lastStored) {
        const s = Q.restore(JSON.parse(lastStored));
        if (s) return s;
        throw new Error('Invalid progress');
      }
    } catch { message('本机记录读取失败，已打开新的练习。'); }
    const s = Q.fresh(); Q.next(s); return s;
  }
  function save() {
    try {
      const data = JSON.stringify(state);
      localStorage.setItem(key, data); lastStored = data; storageWritable = true;
    } catch { storageWritable = false; message('本机存储不可用，可在设置中导出进度。'); }
    $('#saveStatus').textContent = storageWritable ? '学习进度保存在本机' : '进度仅保留在当前页面';
  }
  function message(text) {
    const el = $('#toast'); el.textContent = text; el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => {el.hidden = true}, 2700);
  }
  function reconcile() {
    try {
      if (localStorage.getItem(key) !== lastStored) {state = read(); return true}
    } catch { /* The current page can still be used without storage. */ }
    return false;
  }
  const synth = window.speechSynthesis;
  let voiceList = [], unlocked = false, audioContext, bufferTask, bufferPart, playing, voiceToken = 0, voiceTimer, utterance;
  function updateVoices() { try {voiceList = synth?.getVoices() || []} catch {voiceList = []} }
  updateVoices(); synth?.addEventListener?.('voiceschanged', updateVoices);
  function stopVoice() {
    voiceToken++; clearTimeout(voiceTimer);
    if (playing) {try {playing.stop()} catch {} playing = null}
    if (synth) synth.cancel();
    utterance = null;
  }
  function audioBuffer(part) {
    if (!audioContext) return Promise.reject(new Error('Audio unavailable'));
    if (bufferTask && part === bufferPart) return bufferTask;
    bufferPart = part;
    const suffix = part ? '-' + String(part).padStart(2, '0') : '';
    const task = fetch('assets/pronunciation' + suffix + '.mp3').then(r => {
      if (!r.ok) throw new Error('Audio not cached');
      return r.arrayBuffer();
    }).then(b => audioContext.decodeAudioData(b)).catch(e => {
      if (bufferTask === task) bufferTask = null;
      throw e;
    });
    bufferTask = task;
    return task;
  }
  async function offlineVoice(word, token) {
    try {
      const [start, duration, part = 0] = window.AUDIO_INDEX[word];
      const buffer = await audioBuffer(part);
      if (voiceToken !== token) return;
      await audioContext.resume();
      if (voiceToken !== token) return;
      playing = audioContext.createBufferSource();
      playing.buffer = buffer; playing.connect(audioContext.destination); playing.start(0,start,duration);
    } catch { if (voiceToken === token) message('发音暂不可用，请再次点按发音按钮。') }
  }
  function say(word) {
    if (!unlocked) return;
    stopVoice();
    const token = voiceToken;
    const voice = voiceList.find(v => v.localService && /^en[-_]US/i.test(v.lang))
      || voiceList.find(v => /^en[-_]US/i.test(v.lang) && navigator.onLine);
    if (!synth || !window.SpeechSynthesisUtterance || (!voice && audioContext)) {offlineVoice(word,token); return}
    let fallbackUsed = false;
    const fallback = () => {
      if (token !== voiceToken || fallbackUsed) return;
      fallbackUsed = true; clearTimeout(voiceTimer); synth.cancel(); offlineVoice(word,token);
    };
    try {
      synth.resume(); utterance = new SpeechSynthesisUtterance(word); utterance.lang = 'en-US'; utterance.rate = .91;
      if (voice) utterance.voice = voice;
      utterance.onstart = utterance.onend = () => {if (token === voiceToken) clearTimeout(voiceTimer)};
      utterance.onerror = fallback; voiceTimer = setTimeout(fallback,1250); synth.speak(utterance);
    } catch {fallback()}
  }
  function unlock(event) {
    if (!event.isTrusted) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!audioContext && Audio) {
        audioContext = new Audio();
        const silent = audioContext.createBufferSource();
        silent.buffer = audioContext.createBuffer(1, 1, audioContext.sampleRate);
        silent.connect(audioContext.destination);
        silent.onended = () => silent.disconnect();
        silent.start();
      }
      if (audioContext && audioContext.state !== 'running') audioContext.resume().catch(() => {});
    } catch { /* Retry on a later user gesture if Web Audio was interrupted. */ }
    if (unlocked) return;
    unlocked = true;
    try {
      if (synth && window.SpeechSynthesisUtterance) {
        synth.resume(); const warmup = new SpeechSynthesisUtterance(' ');
        warmup.lang = 'en-US'; warmup.volume = 0; synth.speak(warmup); updateVoices();
      }
    } catch { /* An unavailable voice API does not interrupt the quiz. */ }
    if (state.sound && state.question.direction === 'en' && state.question.answer === null
      && !event.target.closest?.('#speak,[data-mode]')) say(state.question.word);
  }
  document.addEventListener('click', unlock, true);
  document.addEventListener('keydown', e => {if (['enter',' ','a','b','c','d','1','2','3','4'].includes(e.key.toLowerCase())) unlock(e)}, true);
  function playFeedback(correct) {
    if (!state.effects || !audioContext) return;
    const now = audioContext.currentTime;
    function tone(frequency, delay, duration, level, type) {
      const start = now + delay;
      const oscillator = audioContext.createOscillator();
      const envelope = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(level, start + .012);
      envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
      oscillator.connect(envelope);
      envelope.connect(audioContext.destination);
      oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect() };
      oscillator.start(start);
      oscillator.stop(start + duration);
    }
    if (correct) {
      tone(659.25, 0, .12, .10, 'sine');
      tone(987.77, .095, .19, .085, 'sine');
    } else {
      tone(146.83, 0, .19, .075, 'triangle');
    }
  }
  function speakPrompt() {
    if (state.sound && state.question.direction === 'en' && state.question.answer === null) say(state.question.word);
  }
  const counts = () => {
    const result = {new:words.length,error:0,mastered:0};
    for (const record of Object.values(state.records)) {result.new--;result[record.pool]++}
    return result;
  };
  function stats() {
    const n = counts();
    $('#pools').innerHTML = Q.banks.map(k => '<button class="pool-row '+k+'" data-pool="'+k+'"><span class="pool-icon">'+icon(meta[k][2])+'</span><span class="pool-label"><b>'+meta[k][0]+'</b><small>'+meta[k][1]+'</small></span><strong class="pool-count">'+n[k]+'</strong><i class="chev">'+icon('chev')+'</i></button>').join('');
    $('.mobile-pools').innerHTML = Q.banks.map(k => '<button class="mini-pool '+k+'" data-pool="'+k+'">'+meta[k][3]+'<b>'+n[k]+'</b></button>').join('');
    const percent = Math.round(100*n.mastered/words.length);
    $('#percent').textContent = percent+'%';$('#masteredNum').textContent = n.mastered;
    $('.progress-rail i').style.width = percent+'%';$('.progress-rail').setAttribute('aria-valuenow', percent);
    const d = state.daily.date === Q.dateKey() ? state.daily : {total:0,correct:0};
    $('#dailyTotal').textContent = d.total; $('#accuracy').textContent = d.total ? Math.round(d.correct*100/d.total)+'%' : '—';
    $('#date').textContent = new Intl.DateTimeFormat('zh-CN',{month:'numeric',day:'numeric'}).format(new Date());
  }
  function modes() {document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === state.mode))}
  function draw(animate = false) {
    clearTimeout(advanceTimer);
    const q = state.question, w = Q.byWord.get(q.word), en = q.direction === 'en', answered = q.answer !== null;
    $('#direction').textContent = en ? '英译汉' : '汉译英';
    $('#origin').textContent = meta[q.origin][4];
    $('#cardNo').textContent = 'NO. '+String(q.sequence).padStart(3,'0');
    $('#prompt').textContent = en ? w.word : w.meaning; $('#prompt').lang = en ? 'en' : 'zh-CN';
    $('.prompt').className = 'prompt' + (!en ? ' chinese' : w.word.length > 11 ? ' long' : '');
    $('#pos').textContent = w.pos; $('#ipa').textContent = en ? '/'+w.ipa+'/' : ({'n.':'名词','v.':'动词','adj.':'形容词','adv.':'副词'}[w.pos] || w.pos);
    $('#speak').hidden = !en; $('#instruction').textContent = en ? '选择正确的中文释义' : '选择对应的英文单词';
    $('#choices').replaceChildren(...q.choices.map((name, i) => {
      const btn = document.createElement('button'); btn.className = 'choice'; btn.dataset.choice = name;
      const good = answered && name === q.word, bad = answered && !good && name === q.answer;
      if (good) btn.classList.add('correct'); if (bad) btn.classList.add('wrong'); btn.disabled = answered;
      btn.innerHTML = '<span class="letter">'+String.fromCharCode(65+i)+'</span><span></span><span class="ring">'+(good?icon('check'):bad?icon('x'):'')+'</span>';
      btn.children[1].textContent = en ? Q.byWord.get(name).meaning : name;
      if (good || bad) btn.setAttribute('aria-label',(good?'正确答案，':'选择错误，')+btn.children[1].textContent);
      return btn;
    }));
    const feedback = $('#feedback');
    feedback.hidden = !(answered && q.answer !== q.word);
    if (!feedback.hidden) {
      feedback.innerHTML = '<header>'+icon('book-open')+'真题例句</header><p lang="en"></p><p></p><small></small><button id="next" class="primary">下一题</button>';
      feedback.children[1].textContent = w.en; feedback.children[2].textContent = w.zh; feedback.querySelector('small').textContent = w.source;
      $('#next').onclick = next;
    } else feedback.replaceChildren();
    if (animate) {const p=$('.prompt');p.classList.remove('enter-card');void p.offsetWidth;p.classList.add('enter-card')}
    modes(); stats();
    if (answered && q.answer === q.word && !$('#modal').open) advanceTimer = setTimeout(next,600);
  }
  function next() {
    if (reconcile()) {draw();return}
    if (state.question.answer === null) return;
    Q.next(state); save(); draw(true); speakPrompt();
    if (window.scrollY > $('#card').offsetTop) $('#card').scrollIntoView({block:'start',behavior:'instant'});
  }
  function answer(name) {
    if (reconcile()) {draw();return}
    if (state.question.answer !== null) return;
    Q.grade(state,name); save(); draw();
    playFeedback(name === state.question.word);
    if (name === state.question.word && state.question.direction === 'zh' && state.sound) say(name);
    if (name !== state.question.word && matchMedia('(max-width: 700px)').matches) {
      requestAnimationFrame(() => $('#feedback').scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
    }
  }
  $('#choices').onclick = e => {const b=e.target.closest('[data-choice]');if (b) answer(b.dataset.choice)};
  $('.mode-switch').onclick = e => {
    const b=e.target.closest('[data-mode]'); if (!b) return;
    const changedElsewhere = reconcile();
    if (Q.switchMode(state, b.dataset.mode)) {
      stopVoice(); save(); draw(true); speakPrompt();
    } else if (changedElsewhere) draw();
  };
  $('#speak').onclick = () => say(state.question.word);
  const dialog = $('#modal'), body = $('#modalBody');
  function openModal(title,view) {
    modalView=view;clearTimeout(advanceTimer);$('#modalTitle').textContent=title;
    if (!dialog.open) dialog.showModal(); body.replaceChildren();
  }
  function openPool(k) {
    const list = words.filter(w => Q.pool(state,w.word) === k);
    openModal(meta[k][0]+' · '+list.length,'pool-'+k);
    if (!list.length) {body.innerHTML = '<p class="empty">'+(k==='error'?'当前没有错题':k==='mastered'?'答对新词后，将在这里显示':'已完成全部新词学习')+'</p>';return}
    const input = document.createElement('input'); input.className='search';input.placeholder='搜索单词或释义';input.setAttribute('aria-label','搜索单词或释义');
    const rows = document.createElement('div');rows.className='word-list'; body.append(input,rows);
    function filter() {
      const query=input.value.trim().toLowerCase();
      const items=list.filter(w=>(w.word+' '+w.meaning).toLowerCase().includes(query));
      rows.replaceChildren(...items.map(w=>{
        const row=document.createElement('div');row.className='list-word'; row.innerHTML='<span><b></b><small></small></span><span></span>';
        row.querySelector('b').textContent=w.word;row.querySelector('small').textContent=k==='error'?'连续答对 '+state.records[w.word].streak+' / 3':'/'+w.ipa+'/';
        row.lastChild.textContent=w.pos+' '+w.meaning;return row;
      }));
      if (!items.length) {const p=document.createElement('p');p.className='empty';p.textContent='没有匹配的词条';rows.append(p)}
    }
    input.oninput=filter;filter();
  }
  document.addEventListener('click',e=>{const b=e.target.closest('[data-pool]');if (b) openPool(b.dataset.pool)});
  const row = (id,ico,label,end='',extra='')=>'<button id="'+id+'" class="setting-row '+extra+'"><i>'+icon(ico)+'</i>'+label+'<span>'+end+'</span></button>';
  function settings() {
    openModal('练习设置','settings');
    const toggle = enabled => '<i class="toggle '+(enabled?'on':'')+'" style="display:block"></i>';
    body.innerHTML = row('audioToggle','volume','自动美音朗读',toggle(state.sound))
      +row('effectsToggle','activity','答题音效',toggle(state.effects))
      +row('export','download','导出学习进度')+row('import','upload','导入 JSON 备份')+row('reset','repeat','重置学习进度','','destructive');
    $('#audioToggle').setAttribute('role','switch');$('#audioToggle').setAttribute('aria-checked',state.sound);
    $('#audioToggle').onclick=()=>{state.sound=!state.sound;save();if (!state.sound) stopVoice();else speakPrompt();settings();$('#audioToggle').focus()};
    $('#effectsToggle').setAttribute('role','switch');$('#effectsToggle').setAttribute('aria-checked',state.effects);
    $('#effectsToggle').onclick=()=>{state.effects=!state.effects;save();settings();$('#effectsToggle').focus()};
    $('#export').onclick=()=>{
      const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob), a=document.createElement('a');a.href=url;a.download='词屿-CET4-'+Q.dateKey()+'.json';
      document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    };
    $('#import').onclick=()=>$('#importFile').click();
    $('#reset').onclick=()=>confirmAction(false);
  }
  function confirmAction(isImport) {
    openModal(isImport?'恢复学习备份？':'重置学习进度？',isImport?'import':'reset');
    const text = isImport?'将恢复备份中的 '+importState.total+' 次答题记录，并替换本机当前进度。':words.length+' 个词将回到未学词库，答题记录和错题连胜将清零。';
    body.innerHTML='<p class="dialog-help"></p><div class="confirm-actions"><button id="cancelAction" class="secondary">取消</button><button id="confirmAction" class="'+(isImport?'primary':'danger')+'">'+(isImport?'恢复备份':'确认重置')+'</button></div>';
    body.querySelector('p').textContent=text;$('#cancelAction').onclick=settings;
    $('#confirmAction').onclick=()=>{
      stopVoice();
      if (isImport) state=importState; else {state=Q.fresh();Q.next(state)}
      importState=null;save();dialog.close();draw(true);speakPrompt();message(isImport?'已恢复学习进度':'学习进度已重置');
    };
  }
  $('#importFile').onchange=async e=>{
    const file=e.target.files[0];e.target.value='';if (!file) return;
    try {
      if (file.size>1000000) throw new Error();
      const data=Q.restore(JSON.parse(await file.text()));if (!data) throw new Error();
      importState=data;confirmAction(true);
    } catch {
      openModal('备份文件无效','invalid');
      body.innerHTML='<p class="dialog-help">请选择由词屿导出的完整 JSON 学习备份。当前进度已保留。</p><button class="secondary" id="returnSettings">返回设置</button>';
      $('#returnSettings').onclick=settings;
    }
  };
  $('#settings').onclick=settings; $('#close').onclick=()=>dialog.close();
  dialog.addEventListener('click',e=>{
    if(e.target!==dialog)return;
    const r=dialog.getBoundingClientRect();
    if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();
  });
  dialog.addEventListener('close',()=>{modalView='';importState=null;draw()});
  document.addEventListener('keydown',e=>{
    if (dialog.open||e.repeat||e.altKey||e.ctrlKey||e.metaKey) return;
    const k=e.key.toLowerCase();
    if (state.question.answer===null && /^[a-d1-4]$/.test(k)) {
      e.preventDefault();answer(state.question.choices[k>='a'?k.charCodeAt(0)-97:Number(k)-1]);
    } else if(k==='enter'&&state.question.answer!==null&&state.question.answer!==state.question.word) {e.preventDefault();next()}
  });
  window.addEventListener('storage',e=>{
    if (e.key!==key && e.key!==null) return;
    if (reconcile()) {draw();if (modalView.startsWith('pool-')) openPool(modalView.slice(5));else if(dialog.open) settings()}
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden) {if(reconcile())draw();else stats()}});
  state=read(); save();draw();
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('./service-worker.js').then(()=>navigator.serviceWorker.ready).then(()=>{
      $('#offline').textContent='离线就绪';
    }).catch(()=>{$('#offline').textContent='本地模式'});
  }
})();
