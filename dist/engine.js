/* Shared quiz rules. A reserved slot takes precedence over a random draw. */
(() => {
  const pick = list => list[Math.floor(Math.random() * list.length)];
  function shuffle(list) {
    const result = list.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  const banks = ['new', 'error', 'mastered'];
  const modes = ['mix', 'en', 'zh'];
  const words = window.WORDS;
  const byWord = new Map(words.map(w => [w.word, w]));
  function dateKey() {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  }
  function fresh() {
    return {version: 1, mode: 'mix', sound: true, effects: true, total: 0, correct: 0, run: 0,
      daily: {date: dateKey(), total: 0, correct: 0}, records: {}, question: null};
  }
  function pool(state, word) {
    return state.records[word]?.pool || 'new';
  }
  function direction(mode, first = false) {
    return mode === 'mix' ? (first || Math.random() < .5 ? 'en' : 'zh') : mode;
  }
  function options(target) {
    const alike = words.filter(w => w.pos === target.pos && w.word !== target.word);
    const candidates = [...shuffle(alike.filter(w => w.group === target.group)),
      ...shuffle(alike.filter(w => w.group !== target.group))];
    const meanings = new Set([target.meaning]);
    const chosen = [target.word];
    for (const w of candidates) {
      if (meanings.has(w.meaning)) continue;
      meanings.add(w.meaning);
      chosen.push(w.word);
      if (chosen.length === 4) break;
    }
    return shuffle(chosen);
  }
  function next(s, excludedWord = null) {
    const sequence = s.total + 1;
    const due = words.find(w => s.records[w.word]?.due === sequence);
    let target = due;
    if (!target) {
      const available = Object.fromEntries(banks.map(key => [key, []]));
      for (const w of words) {
        if (w.word !== excludedWord && !s.records[w.word]?.due) available[pool(s, w.word)].push(w);
      }
      const p = Math.random();
      let key = p < .15 ? 'mastered' : p < .50 ? 'error' : 'new';
      if (!available[key].length) {
        if (available.new.length) key = 'new';
        else if (available.error.length && available.mastered.length) key = Math.random() < .7 ? 'error' : 'mastered';
        else key = available.error.length ? 'error' : 'mastered';
      }
      const list = available[key];
      target = key === 'new' && !excludedWord ? list[0] : pick(list);
    }
    s.question = {word: target.word, direction: direction(s.mode, !s.question && s.total === 0),
      origin: pool(s, target.word), sequence, choices: options(target), answer: null};
  }
  function switchMode(s, mode) {
    if (s.mode === mode || !modes.includes(mode)) return false;
    const previous = s.question;
    const record = s.records[previous.word];
    // This reserved review has already appeared. Skipping it earns no streak.
    if (previous.answer === null && record?.due === previous.sequence) record.due = null;
    s.mode = mode;
    next(s, previous.word);
    return true;
  }
  function grade(s, answer) {
    const q = s.question;
    if (!q || q.answer !== null || !q.choices.includes(answer)) return;
    const ok = answer === q.word;
    q.answer = answer;
    s.total++;
    s.correct += Number(ok);
    s.run = ok ? s.run + 1 : 0;
    if (s.daily.date !== dateKey()) s.daily = {date: dateKey(), total: 0, correct: 0};
    s.daily.total++;
    s.daily.correct += Number(ok);
    const previous = s.records[q.word];
    if (!ok) {
      const reserved = new Set(Object.values(s.records).map(r => r.due));
      const free = [3, 4, 5, 6].map(offset => s.total + offset).filter(slot => !reserved.has(slot));
      s.records[q.word] = {pool: 'error', streak: 0, due: pick(free)};
    } else if (previous?.pool === 'error' && previous.streak < 2) {
      s.records[q.word] = {pool: 'error', streak: previous.streak + 1, due: null};
    } else {
      s.records[q.word] = {pool: 'mastered', streak: 0, due: null};
    }
  }
  function valid(s) {
    const count = n => Number.isSafeInteger(n) && n >= 0 && n <= Number.MAX_SAFE_INTEGER - 10;
    if (!s || s.version !== 1 || !modes.includes(s.mode) || typeof s.sound !== 'boolean'
      || (s.effects !== undefined && typeof s.effects !== 'boolean')
      || !count(s.total) || !count(s.correct) || s.correct > s.total || !count(s.run) || s.run > s.correct
      || !s.daily || !/^\d{4}-\d{2}-\d{2}$/.test(s.daily.date) || !count(s.daily.total)
      || s.daily.total > s.total || !count(s.daily.correct) || s.daily.correct > s.daily.total || s.daily.correct > s.correct
      || !s.records || typeof s.records !== 'object' || Array.isArray(s.records)) return false;
    const slots = new Set();
    for (const [word, r] of Object.entries(s.records)) {
      if (!byWord.has(word) || !r || !['error','mastered'].includes(r.pool) || ![0,1,2].includes(r.streak)
        || (r.pool === 'mastered' && (r.streak !== 0 || r.due !== null))) return false;
      if (r.due !== null) {
        if (r.streak || !count(r.due) || r.due <= s.total || r.due > s.total + 6 || slots.has(r.due)) return false;
        slots.add(r.due);
      }
    }
    const q = s.question;
    if (!q || !byWord.has(q.word) || !['en','zh'].includes(q.direction) || !banks.includes(q.origin)
      || !Array.isArray(q.choices) || q.choices.length !== 4 || new Set(q.choices).size !== 4
      || !q.choices.includes(q.word) || !q.choices.every(w => byWord.get(w)?.pos === byWord.get(q.word).pos)
      || !(q.answer === null || q.choices.includes(q.answer))
      || q.sequence !== s.total + Number(q.answer === null)) return false;
    if (q.answer === null && (pool(s, q.word) !== q.origin
      || (slots.has(q.sequence) && s.records[q.word]?.due !== q.sequence))) return false;
    return true;
  }
  function restore(s) {
    return valid(s) ? { ...s, effects: s.effects ?? true } : null;
  }
  window.Quiz = {banks, byWord, dateKey, direction, fresh, grade, next, pool, valid, restore, switchMode};
})();
