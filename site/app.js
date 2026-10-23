(() => {
'use strict';

/* ================= constants ================= */
const DEFAULT_CATS = [
  { id: 'food', name: '식비', emoji: '🍚', kind: 'out' },
  { id: 'cafe', name: '카페·간식', emoji: '☕', kind: 'out' },
  { id: 'living', name: '생활', emoji: '🧺', kind: 'out' },
  { id: 'shop', name: '쇼핑', emoji: '🛍️', kind: 'out' },
  { id: 'transit', name: '교통', emoji: '🚌', kind: 'out' },
  { id: 'home', name: '주거·통신', emoji: '🏠', kind: 'out' },
  { id: 'subs', name: '구독', emoji: '📺', kind: 'out' },
  { id: 'fun', name: '문화·여가', emoji: '🎨', kind: 'out' },
  { id: 'health', name: '의료·건강', emoji: '💊', kind: 'out' },
  { id: 'edu', name: '교육', emoji: '📚', kind: 'out' },
  { id: 'gift', name: '경조사·선물', emoji: '🎁', kind: 'out' },
  { id: 'etc', name: '기타', emoji: '🧾', kind: 'out' },
  { id: 'salary', name: '급여', emoji: '💼', kind: 'in' },
  { id: 'side', name: '부수입', emoji: '💰', kind: 'in' },
  { id: 'allow', name: '용돈', emoji: '🧧', kind: 'in' },
  { id: 'fin', name: '금융수입', emoji: '🏦', kind: 'in' },
  { id: 'etc_in', name: '기타수입', emoji: '➕', kind: 'in' },
];
const LOAN_CAT = { id: 'loan', name: '대출 상환', emoji: '💸', kind: 'out' };
const DEFAULT_METHODS = [
  { id: 'check', name: '체크카드' },
  { id: 'credit', name: '신용카드' },
  { id: 'transfer', name: '계좌이체' },
  { id: 'cash', name: '현금' },
];
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const UNKNOWN_CAT = { id: '', name: '미분류', emoji: '🏷️', kind: 'out' };
const BACKFILL_DAYS = 92; // auto-record never reaches further back than this
const VIEW_NAMES = ['home', 'list', 'subs', 'accounts', 'goals', 'loans', 'credit', 'stats', 'budget', 'settings'];

/* ================= utils ================= */
const $ = (s, r = document) => r.querySelector(s);
const pad = n => String(n).padStart(2, '0');
const toYmd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => toYmd(new Date());
const parseD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const ymOf = s => s.slice(0, 7);
const daysIn = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const addMonths = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return toYmd(d); };
const diffDays = (a, b) => Math.round((parseD(b) - parseD(a)) / 864e5);
const isYmd = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const fmt = n => Math.round(n).toLocaleString('ko-KR');
const won = n => fmt(n) + '원';
const signed = (n, kind) => (kind === 'in' ? '+' : '−') + won(n);
// 받침에 맞는 조사: josa('구독','을/를') → '구독을'
const josa = (w, pair) => {
  const t = String(w == null ? '' : w).trim(); const [a, b] = pair.split('/');
  const ch = t.replace(/[^가-힣A-Za-z0-9]+$/, '').slice(-1); let jong = false, rieul = false;
  if (/[가-힣]/.test(ch)) { const k = (ch.charCodeAt(0) - 0xAC00) % 28; jong = k > 0; rieul = k === 8; }
  else if (/[0-9]/.test(ch)) { jong = '013678'.includes(ch); rieul = '178'.includes(ch); }
  else if (/[A-Za-z]/.test(ch)) { jong = /[lmnr]/i.test(ch); rieul = /[lr]/i.test(ch); }
  if (a === '으로') return t + (jong && !rieul ? '으로' : '로');
  return t + (jong ? a : b);
};
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const sum = arr => arr.reduce((a, b) => a + b, 0);
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const icon = (id, cls = '') => `<svg class="i ${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const clone = o => JSON.parse(JSON.stringify(o));

function compact(n) {
  const a = Math.abs(n);
  const r = v => String(v >= 100 ? Math.round(v) : Math.round(v * 10) / 10);
  const s = a >= 1e8 ? r(a / 1e8) + '억' : a >= 1e4 ? r(a / 1e4) + '만' : a >= 1e3 ? r(a / 1e3) + '천' : String(Math.round(a));
  return (n < 0 ? '−' : '') + s;
}
const cellAmt = n => n >= 1e5 ? compact(n) : fmt(n);
function koreanWon(n) {
  const eok = Math.floor(n / 1e8), man = Math.floor((n % 1e8) / 1e4), rest = n % 1e4;
  const p = [];
  if (eok) p.push(fmt(eok) + '억');
  if (man) p.push(fmt(man) + '만');
  if (rest) p.push(fmt(rest));
  return p.join(' ') + '원';
}
const mLabel = ym => `${+ym.slice(5)}월`;
const mdLabel = s => `${+s.slice(5, 7)}월 ${+s.slice(8)}일`;
const mdw = s => `${mdLabel(s)} (${DOW[parseD(s).getDay()]})`;
const dayHead = s => `${+s.slice(8)}일 ${DOW[parseD(s).getDay()]}요일`;
function firstGrapheme(v) {
  const s = (v || '').trim();
  if (!s) return '';
  try { if (typeof Intl.Segmenter === 'function') { for (const g of new Intl.Segmenter('ko', { granularity: 'grapheme' }).segment(s)) return g.segment; } } catch (e) { /* fall through */ }
  return Array.from(s)[0];
}

/* per-viewer conveniences only (last view, last category); the ledger itself lives in the db */
const prefs = (() => { try { return JSON.parse(localStorage.getItem('ttb-prefs') || '{}') || {}; } catch (e) { return {}; } })();
function savePrefs() { try { localStorage.setItem('ttb-prefs', JSON.stringify(prefs)); } catch (e) { /* storage unavailable */ } }

/* ================= state ================= */
const S = {
  mode: 'loading',            // loading | live | local | denied
  db: null,
  months: {},                 // 'YYYY-MM' -> { txId: tx | null(deleted) }
  monthDocs: new Set(),       // month docs known to exist in the store
  settings: null,             // meta/settings (null = defaults)
  subs: {},                   // subId -> sub | null(deleted)
  subsDoc: false,
  loans: {},                  // loanId -> loan | null(deleted)
  loansDoc: false, user: null, restore: null,
  goals: {},                  // goalId -> savings goal | null(deleted)
  goalsDoc: false,
  nospend: {},                // 'YYYY-MM' -> { 'YYYY-MM-DD': true } (무지출로 체크한 날)
  credit: {}, creditDoc: false,
  memos: {}, memosDoc: false,
  accts: {}, acctsDoc: false,
  deco: {},                     // 꾸미기 사진: { wall: dataURL, mascot: dataURL }   // 통장: acctId -> account | null   // 쓸 돈 메모: memoId -> memo | null
  loaded: { months: false, meta: false },
  definitive: { months: false, meta: false },
  pending: 0, syncError: false, storeError: false,
  view: VIEW_NAMES.includes(prefs.view) ? prefs.view : 'home',
  ym: ymOf(todayStr()),
  listMode: ['cal', 'plan', 'often'].includes(prefs.listMode) ? prefs.listMode : 'list',
  filter: { kind: 'all', cat: '', method: '', q: '' },
  selDay: null, showTable: false, setKind: 'out', confirmClear: false, leave: null, focusAfter: null,
};
let F = null; // open sheet's form state

/* ================= settings / lookups ================= */
function normSettings(st) {
  const s = st && typeof st === 'object' ? st : {};
  const cats = Array.isArray(s.cats) && s.cats.length ? s.cats.filter(c => c && c.id && (c.kind === 'in' || c.kind === 'out')).map(c => ({ id: c.id, name: c.name || '이름 없음', emoji: c.emoji || '🏷️', kind: c.kind, ...(/^#[0-9a-fA-F]{6}$/.test(c.color || '') ? { color: c.color } : {}) })) : DEFAULT_CATS;
  const methods = Array.isArray(s.methods) ? s.methods.filter(m => m && m.id).map(m => ({ id: m.id, name: m.name || '이름 없음' })) : DEFAULT_METHODS;
  const b = s.budget && typeof s.budget === 'object' ? s.budget : {};
  const theme = ['forest', 'ocean', 'sunset', 'lavender', 'blossom', 'graphite', 'hanji', 'citrus', 'sky', 'mintchoco', 'night', 'cocoa', 'wine', 'neon', 'custom'].includes(s.theme) ? s.theme : 'forest';
  const out = { cats, methods, budget: { total: +b.total > 0 ? +b.total : 0, cats: { ...(b.cats || {}) } }, budgetEx: !!s.budgetEx, autoSubs: s.autoSubs !== false, theme };
  if (s.look && typeof s.look === 'object') out.look = { ...s.look };
  return out;
}
const cfg = () => S.settings || normSettings(null);
const catsOf = kind => cfg().cats.filter(c => c.kind === kind);
const catOf = id => cfg().cats.find(c => c.id === id) || (id === 'loan' ? LOAN_CAT : UNKNOWN_CAT);
const methodOf = id => cfg().methods.find(m => m.id === id) || null;
function methodIcon(name) {
  const n = name || '';
  if (/현금/.test(n)) return 'cash';
  if (/이체|계좌|통장|뱅크|은행/.test(n)) return 'bank';
  if (/페이|pay/i.test(n)) return 'phone';
  return 'card';
}
function budgetTotal() {
  const b = cfg().budget;
  return b.total > 0 ? b.total : sum(catsOf('out').map(c => +b.cats[c.id] || 0));
}
function lastCat(kind) {
  const want = prefs.lastCat && prefs.lastCat[kind];
  const list = catsOf(kind);
  return (list.find(c => c.id === want) || list[0] || UNKNOWN_CAT).id;
}
function lastMethod() {
  const ms = cfg().methods;
  return (ms.find(m => m.id === prefs.lastMethod) || ms[0] || { id: '' }).id;
}

/* ================= transactions ================= */
const byRecent = (a, b) => a.date !== b.date ? (a.date < b.date ? 1 : -1) : (b.at || 0) - (a.at || 0);
function txsOf(ym) {
  const items = S.months[ym];
  if (!items) return [];
  const out = [];
  for (const id in items) {
    const t = items[id];
    if (t && isYmd(t.date) && t.amount > 0) out.push({ ...t, id });
  }
  return out.sort(byRecent);
}
const allTxs = () => Object.keys(S.months).flatMap(txsOf).sort(byRecent);
function totals(list) {
  let i = 0, o = 0;
  for (const t of list) { if (t.kind === 'in') i += t.amount; else if (t.kind !== 'move') o += t.amount; }
  return { in: i, out: o };
}
function allKeys() {
  const s = new Set();
  for (const ym in S.months) for (const k in S.months[ym]) s.add(k);
  return s;
}
function findTx(id) {
  for (const ym in S.months) { const t = S.months[ym][id]; if (t) return { ym, t }; }
  return null;
}
function makeTx(t) {
  const kind = t.kind === 'in' ? 'in' : t.kind === 'move' ? 'move' : 'out';
  const o = {
    date: t.date, kind, amount: Math.round(t.amount), cat: kind === 'move' ? '' : t.cat || '',
    memo: String(t.memo || '').trim().slice(0, 40), method: kind === 'out' ? (t.method || '') : '',
    sub: t.sub || '', loan: t.loan || '', ex: !!t.ex, at: t.at || Date.now(),
  };
  if (kind === 'move') { o.from = t.from || ''; o.to = t.to || ''; } else if (t.acct) o.acct = t.acct;
  return o;
}

/* ================= subscriptions ================= */
function subsArr() {
  const a = [];
  for (const id in S.subs) { const s = S.subs[id]; if (s && s.name != null) a.push({ ...s, id }); }
  return a;
}
function occOn(sub, y, m) {
  const dim = new Date(y, m, 0).getDate();
  return `${y}-${pad(m)}-${pad(Math.min(Math.max(1, sub.day | 0), dim))}`;
}
function nextOcc(sub, from) {
  const y = +from.slice(0, 4), m = +from.slice(5, 7);
  if (sub.cycle === 'year') {
    const mm = Math.min(12, Math.max(1, sub.month | 0));
    const c = occOn(sub, y, mm);
    return c < from ? occOn(sub, y + 1, mm) : c;
  }
  const c = occOn(sub, y, m);
  if (c >= from) return c;
  return m === 12 ? occOn(sub, y + 1, 1) : occOn(sub, y, m + 1);
}
function occsBetween(sub, from, to) {
  const r = [];
  let d = nextOcc(sub, from), guard = 0;
  while (d <= to && guard++ < 40) { r.push(d); d = nextOcc(sub, addDays(d, 1)); }
  return r;
}
function curPeriodOcc(sub) {
  const t = todayStr();
  return sub.cycle === 'year' ? occOn(sub, +t.slice(0, 4), Math.min(12, Math.max(1, sub.month | 0))) : occOn(sub, +t.slice(0, 4), +t.slice(5, 7));
}
const monthlyOf = s => s.cycle === 'year' ? Math.round(s.amount / 12) : s.amount;
// one id per billing period, so a payment is never recorded twice for the same month (or year)
const subTxId = (sub, date) => `s_${sub.id}_${sub.cycle === 'year' ? date.slice(0, 4) : date.slice(0, 7).replace('-', '')}`;
const cycleText = s => s.cycle === 'year' ? `매년 ${s.month}월 ${s.day}일` : `매월 ${s.day}일`;
function nextDue(s, keys) {
  const t = todayStr();
  let d = nextOcc(s, t), g = 0;
  while (g++ < 40 && (keys.has(subTxId(s, d)) || isSkipped(s, subTxId(s, d)))) d = nextOcc(s, addDays(d, 1));
  return d;
}
function ddayText(d) { const n = diffDays(todayStr(), d); return n === 0 ? '오늘' : n === 1 ? '내일' : `D-${n}`; }
const subName = id => (S.subs[id] && S.subs[id].name) || '삭제된 구독';

/* ================= persistence ================= */
const queues = new Map();
function enqueue(path, job) { // one write at a time per document
  const run = (queues.get(path) || Promise.resolve()).then(job);
  queues.set(path, run.catch(() => {}));
  return run;
}
async function retry(fn) {
  try { return await fn(); }
  catch (e) {
    if (e && e.code === 'unavailable') { await new Promise(r => setTimeout(r, 400 + Math.random() * 800)); return fn(); }
    throw e;
  }
}
function track(p) {
  S.pending++; renderSync();
  return p.then(() => { S.syncError = false; }, e => { S.syncError = true; writeFailed(e); })
    .then(() => { S.pending--; renderSync(); });
}
function writeFailed(e) {
  const code = e && e.code;
  if (code === 'quota_exceeded') toast('저장 공간이 가득 찼어요. 오래된 기록을 지운 뒤 다시 시도해 주세요.');
  else if (code === 'revoked' || code === 'not_granted') { S.mode = 'denied'; render(); }
  else toast('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
}
function writeMonth(ym, patch) {
  S.months[ym] = { ...(S.months[ym] || {}), ...patch };
  scheduleRender();
  if (!S.db) return Promise.resolve();
  const ref = S.db.doc('months/' + ym);
  return track(enqueue('months/' + ym, async () => {
    try { await retry(() => ref.update({ items: patch })); }
    catch (e) {
      // update needs an existing doc; create it only when we have never seen it
      if (e && e.code === 'invalid_argument' && !S.monthDocs.has(ym)) await retry(() => ref.set({ items: patch }));
      else throw e;
    }
    S.monthDocs.add(ym);
  }));
}
function writeSubs(patch) {
  S.subs = { ...S.subs, ...patch };
  scheduleRender();
  if (!S.db) return Promise.resolve();
  const ref = S.db.doc('meta/subs');
  return track(enqueue('meta/subs', async () => {
    try { await retry(() => ref.update({ items: patch })); }
    catch (e) {
      if (e && e.code === 'invalid_argument' && !S.subsDoc) await retry(() => ref.set({ items: patch }));
      else throw e;
    }
    S.subsDoc = true;
  }));
}
function saveSettings(next) {
  S.settings = normSettings(next);
  scheduleRender();
  if (!S.db) return Promise.resolve();
  const body = clone(S.settings);
  return track(enqueue('meta/settings', () => retry(() => S.db.doc('meta/settings').set(body))));
}

/* auto-record subscription payments that are due and not yet in the ledger */
const attempted = new Set();
function autoRecord() {
  if (S.mode === 'denied' || !cfg().autoSubs) return;
  if (S.mode === 'live' && !(S.definitive.months && S.definitive.meta)) return;
  const t = todayStr(), floor = addDays(t, -BACKFILL_DAYS);
  const keys = allKeys();
  const patches = {};
  for (const sub of subsArr()) {
    if (!sub.active || !(sub.amount > 0)) continue;
    const since = isYmd(sub.since) ? sub.since : t;
    for (const d of occsBetween(sub, since > floor ? since : floor, t)) {
      const id = subTxId(sub, d);
      if (keys.has(id) || attempted.has(id) || isSkipped(sub, id)) continue; // recorded, deleted or skipped on purpose
      attempted.add(id);
      (patches[ymOf(d)] ||= {})[id] = makeTx({ date: d, kind: 'out', amount: sub.amount, cat: sub.cat, memo: sub.name, method: sub.method, sub: sub.id, ex: !!sub.ex, at: parseD(d).getTime() + 9 * 36e5 });
    }
  }
  autoRecordGoals(t, floor);
  for (const l of loansArr()) {
    if (!l.auto || !(l.principal > 0)) continue;
    const since = isYmd(l.since) ? l.since : t, from = since > floor ? since : floor;
    for (const r of loanSchedule(l)) {
      if (r.date < from || r.date > t || !(r.pay > 0)) continue;
      const id = `l_${l.id}_${r.date.slice(0, 7).replace('-', '')}`;
      if (keys.has(id) || attempted.has(id) || isSkipped(l, id)) continue;
      attempted.add(id);
      (patches[ymOf(r.date)] ||= {})[id] = makeTx({ date: r.date, kind: 'out', amount: r.pay, cat: 'loan', memo: loanMemo(l, r), method: l.method, loan: l.id, ex: !!l.ex, at: parseD(r.date).getTime() + 9 * 36e5 });
    }
  }
  for (const ym in patches) writeMonth(ym, patches[ym]);
}

function hasExamples() {
  if (cfg().budgetEx) return true;
  for (const id in S.subs) if (S.subs[id] && S.subs[id].ex) return true;
  for (const id in S.loans) if (S.loans[id] && S.loans[id].ex) return true;
  for (const id in S.goals) if (S.goals[id] && S.goals[id].ex) return true;
  for (const id in S.credit) if (S.credit[id] && S.credit[id].ex) return true;
  for (const id in S.memos) if (S.memos[id] && S.memos[id].ex) return true;
  for (const id in S.accts) if (S.accts[id] && S.accts[id].ex) return true;
  for (const ym in S.months) for (const id in S.months[ym]) { const t = S.months[ym][id]; if (t && t.ex) return true; }
  return false;
}
function exampleCounts() {
  let tx = 0, subs = 0;
  for (const ym in S.months) for (const id in S.months[ym]) { const t = S.months[ym][id]; if (t && t.ex) tx++; }
  for (const id in S.subs) if (S.subs[id] && S.subs[id].ex) subs++;
  let loans = 0;
  for (const id in S.loans) if (S.loans[id] && S.loans[id].ex) loans++;
  let goals = 0;
  for (const id in S.goals) if (S.goals[id] && S.goals[id].ex) goals++;
  return { tx, subs, loans, goals, budget: cfg().budgetEx };
}
function clearExamples() {
  for (const ym in S.months) {
    const patch = {};
    for (const id in S.months[ym]) { const t = S.months[ym][id]; if (t && t.ex) patch[id] = null; }
    if (Object.keys(patch).length) writeMonth(ym, patch);
  }
  const sp = {};
  for (const id in S.subs) if (S.subs[id] && S.subs[id].ex) sp[id] = null;
  if (Object.keys(sp).length) writeSubs(sp);
  const lp = {};
  for (const id in S.loans) if (S.loans[id] && S.loans[id].ex) lp[id] = null;
  if (Object.keys(lp).length) writeLoans(lp);
  const gp = {};
  for (const id in S.goals) if (S.goals[id] && S.goals[id].ex) gp[id] = null;
  if (Object.keys(gp).length) writeGoals(gp);
  const cp = {};
  for (const id in S.credit) if (S.credit[id] && S.credit[id].ex) cp[id] = null;
  if (Object.keys(cp).length) writeCredit(cp);
  const mp = {};
  for (const id in S.memos) if (S.memos[id] && S.memos[id].ex) mp[id] = null;
  if (Object.keys(mp).length) writeMemos(mp);
  const ap = {};
  for (const id in S.accts) if (S.accts[id] && S.accts[id].ex) ap[id] = null;
  if (Object.keys(ap).length) writeAccts(ap);
  if (cfg().budgetEx) saveSettings({ ...cfg(), budget: { total: 0, cats: {} }, budgetEx: false });
}

/* ================= store connection ================= */
let autoDone = false;
function onData() {
  scheduleRender();
  if (!autoDone && S.definitive.months && S.definitive.meta) { autoDone = true; autoRecord(); }
}
function onStoreError(e) {
  if (e && e.code === 'revoked') S.mode = 'denied';
  else S.storeError = true;
  render();
}
function startLive(db) {
  S.db = db; S.mode = 'live';
  db.collection('months').onSnapshot(snap => {
    const months = {}, docs = new Set(), nospend = {};
    for (const d of snap.docs) { const data = d.data() || {}; docs.add(d.id); months[d.id] = { ...(data.items || {}) }; if (data.nospend) nospend[d.id] = { ...data.nospend }; }
    S.months = months; S.monthDocs = docs; S.nospend = nospend; S.loaded.months = true;
    if (!snap.metadata || !snap.metadata.fromCache) S.definitive.months = true;
    onData();
  }, onStoreError);
  db.collection('meta').onSnapshot(snap => {
    let st = null, subs = {}, subsDoc = false, loans = {}, loansDoc = false, sawGoals = false, sawCredit = false, sawMemos = false, sawAccts = false;
    for (const d of snap.docs) {
      const data = d.data() || {};
      if (d.id === 'settings') st = data;
      else if (d.id === 'subs') { subs = { ...(data.items || {}) }; subsDoc = true; }
      else if (d.id === 'loans') { loans = { ...(data.items || {}) }; loansDoc = true; }
      else if (d.id === 'goals') { S.goals = { ...(data.items || {}) }; S.goalsDoc = true; sawGoals = true; }
      else if (d.id === 'credit') { S.credit = { ...(data.items || {}) }; S.creditDoc = true; sawCredit = true; }
      else if (d.id === 'accounts') { S.accts = { ...(data.items || {}) }; S.acctsDoc = true; sawAccts = true; }
      else if (d.id === 'memos') { S.memos = { ...(data.items || {}) }; S.memosDoc = true; sawMemos = true; }
    }
    if (!sawCredit) { S.credit = {}; S.creditDoc = false; }
    if (!sawMemos) { S.memos = {}; S.memosDoc = false; }
    if (!sawAccts) { S.accts = {}; S.acctsDoc = false; }
    if (!sawGoals) { S.goals = {}; S.goalsDoc = false; }
    S.settings = st ? normSettings(st) : null; S.subs = subs; S.subsDoc = subsDoc; S.loans = loans; S.loansDoc = loansDoc; S.loaded.meta = true;
    if (st) applyTheme(S.settings.theme);
    if (!snap.metadata || !snap.metadata.fromCache) S.definitive.meta = true;
    onData();
  }, onStoreError);
  db.collection('deco').onSnapshot(snap => {
    const d = {};
    for (const doc of snap.docs) { const x = doc.data() || {}; if (x.img) d[doc.id] = x.img; }
    const changed = JSON.stringify(Object.keys(d).map(k => [k, d[k].length])) !== JSON.stringify(Object.keys(S.deco).filter(k => S.deco[k]).map(k => [k, S.deco[k].length]));
    S.deco = d;
    if (changed) { applyLook(curLook()); scheduleRender(); }
  }, () => {});
}
async function boot() {
  applyTheme(prefs.theme);
  render();
  const c = window.claude;
  const goLocal = () => { S.mode = 'local'; S.loaded = { months: true, meta: true }; render(); };
  if (!c || typeof c.use !== 'function') return goLocal();
  let db = null;
  try { db = await c.use('db'); } catch (e) { db = null; }
  if (!db) { goLocal(); initAi(); return; }
  try {
    const user = await c.use('user');
    if (user && typeof user.isOwner === 'function' && !(await user.isOwner())) { S.mode = 'denied'; S.loaded = { months: true, meta: true }; render(); return; }
  } catch (e) { /* unknown: let the store decide */ }
  startLive(db);
  render();
  initAi();
  loadAccount();
}

/* ================= rendering ================= */
const $view = document.getElementById('view');
let raf = 0, deferred = false, lastNotice = null;
function scheduleRender() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); }); }
function render() { renderChrome(); renderNotice(); renderView(); }
const isLoading = () => S.mode === 'loading' || (S.mode === 'live' && !(S.loaded.months && S.loaded.meta));

function renderChrome() {
  for (const b of document.querySelectorAll('.nav [data-view], .tabbar [data-view]')) {
    if ((b.dataset.views || b.dataset.view).split(' ').includes(S.view)) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  }
  $('#monthNav').hidden = !['home', 'list', 'stats', 'budget'].includes(S.view);
  const [y, m] = S.ym.split('-').map(Number);
  $('#monthLabel').innerHTML = `<span class="y${y === new Date().getFullYear() ? ' cur' : ''}">${y}년 </span>${m}월`;
  for (const b of document.querySelectorAll('[data-act="add"]')) b.disabled = S.mode === 'denied';
  for (const b of document.querySelectorAll('.ai-open')) b.hidden = !aiOn();
  renderSync();
}
function renderSync() {
  const el = $('#sync');
  let s, t;
  if (isLoading()) { s = 'loading'; t = '불러오는 중'; }
  else if (S.mode === 'local') { s = 'local'; t = '저장 안 됨'; }
  else if (S.mode === 'denied') { s = 'error'; t = '볼 수 없음'; }
  else if (S.pending > 0) { s = 'busy'; t = '저장 중'; }
  else if (S.syncError || S.storeError) { s = 'error'; t = '저장 실패'; }
  else { s = 'ok'; t = '저장됨'; }
  el.dataset.s = s; el.title = t;
  el.querySelector('.t').textContent = t;
}
function renderNotice() {
  let h = '';
  if (S.mode === 'local') h = `<div class="notice warn"><p>저장소에 연결되지 않아 지금 적는 내용은 새로고침하면 사라져요. claude.ai에 로그인한 상태에서 이 가계부를 열어 주세요.</p></div>`;
  else if (S.mode === 'denied') h = `<div class="notice warn"><p>이 가계부는 만든 사람만 보고 쓸 수 있어요.</p></div>`;
  else if (S.storeError) h = `<div class="notice warn"><p>저장소와 연결이 끊겼어요. 페이지를 새로고침해 주세요.</p></div>`;
  else if (S.mode === 'live' && !isLoading() && hasExamples()) {
    const n = exampleCounts();
    const what = [n.tx ? `예시 내역 ${n.tx}건` : '', n.subs ? `예시 구독 ${n.subs}개` : '', n.loans ? `예시 대출 ${n.loans}건` : '', n.goals ? `예시 모으기 ${n.goals}개` : '', n.budget ? '예시 예산' : ''].filter(Boolean).join(', ');
    h = S.confirmClear
      ? `<div class="notice"><p>${what}을 지울까요? 직접 적은 기록은 그대로 남아요.</p><div class="acts"><button class="btn btn-sm btn-primary" type="button" id="exYes" data-act="ex-clear">지우기</button><button class="btn btn-sm btn-soft" type="button" data-act="ex-cancel">취소</button></div></div>`
      : `<div class="notice"><p>지금 보이는 내역·구독·모으기·대출·신용점수·예산은 <b>예시</b>예요. 둘러본 뒤 지우고 내 기록을 시작하세요.</p><div class="acts"><button class="btn btn-sm btn-soft" type="button" id="exAsk" data-act="ex-ask">예시 지우기</button></div></div>`;
  }
  if (h !== lastNotice) {
    const a = document.activeElement, fid = a && $('#notice').contains(a) ? a.id : null;
    $('#notice').innerHTML = h; lastNotice = h;
    if (fid === 'exAsk' && $('#exYes')) $('#exYes').focus(); else if (fid && document.getElementById(fid)) document.getElementById(fid).focus();
  }
}
function typingInView() {
  const a = document.activeElement;
  return !!a && $view.contains(a) && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && !/^(button|checkbox|radio|range|submit)$/.test(a.type)));
}
const VIEWS = { home: vHome, list: vList, subs: vSubs, accounts: vAccounts, goals: vGoals, loans: vLoans, credit: vCredit, stats: vStats, budget: vBudget, settings: vSettings };
function renderView() {
  if (typingInView()) { deferred = true; return; } // never yank a field out from under the cursor
  deferred = false;
  const a = document.activeElement, fid = a && $view.contains(a) && a.id ? a.id : null;
  $view.innerHTML = VIEWS[S.view]();
  afterView();
  if (S.focusAfter) {
    const el = document.getElementById(S.focusAfter); S.focusAfter = null;
    if (el) { el.focus(); if (el.select) el.select(); }
  } else if (fid) {
    const el = document.getElementById(fid);
    if (el) el.focus({ preventScroll: true });
  }
}
document.addEventListener('focusout', () => setTimeout(() => { if (deferred && !typingInView()) renderView(); }, 0));

/* ---------- shared pieces ---------- */
function txRow(t) {
  if (t.kind === 'move') {
    const a = acctOf(t.from), b = acctOf(t.to);
    return `<button class="tx" type="button" data-act="edit-tx" data-id="${esc(t.id)}"><span class="emo" aria-hidden="true">⇄</span><span class="tx-main"><span class="tx-title">${esc(t.memo || '통장 이체')}<span class="tag plan">이체</span>${t.ex ? '<span class="tag">예시</span>' : ''}</span><span class="tx-sub">${esc(`${a ? a.name : '알 수 없는 통장'} → ${b ? b.name : '알 수 없는 통장'}`)}</span></span><span class="tx-amt move">${won(t.amount)}</span></button>`;
  }
  const c = catOf(t.cat), m = t.kind === 'out' ? methodOf(t.method) : null;
  const sub = [c.name]; if (m) sub.push(m.name);
  return `<button class="tx" type="button" data-act="edit-tx" data-id="${esc(t.id)}">
    <span class="emo" aria-hidden="true"${ccStyle(c)}>${esc(c.emoji)}</span>
    <span class="tx-main"><span class="tx-title">${esc(t.memo || c.name)}${t.sub ? '<span class="tag sub">정기</span>' : ''}${t.loan ? '<span class="tag sub">대출</span>' : ''}${t.ex ? '<span class="tag">예시</span>' : ''}</span><span class="tx-sub">${esc(sub.join(' · '))}</span></span>
    <span class="tx-amt${t.kind === 'in' ? ' in' : ''}">${signed(t.amount, t.kind)}</span>
  </button>`;
}
function meter(pct, state, thin) {
  const w = pct <= 0 ? 0 : Math.min(100, Math.max(2, pct * 100));
  return `<div class="meter${state ? ' ' + state : ''}${thin ? ' thin' : ''}" role="img" aria-label="${Math.round(pct * 100)}% 사용"><span style="width:${w.toFixed(1)}%"></span></div>`;
}
function stateChip(state, left) {
  if (state === 'over') return `<span class="state over">${icon('alert')}${won(-left)} 초과</span>`;
  if (state === 'warn') return `<span class="state warn">${icon('alert')}80% 넘음</span>`;
  return '';
}
const stateOf = pct => pct > 1 ? 'over' : pct >= 0.8 ? 'warn' : '';
function budgetSummary(ym, spent) {
  const B = budgetTotal();
  if (!(B > 0)) return null;
  const t = todayStr(), curYm = ymOf(t), pct = spent / B, left = B - spent;
  let foot;
  if (ym === curYm) {
    const daysLeft = daysIn(ym) - +t.slice(8) + 1;
    foot = left > 0
      ? `남은 예산 <b>${won(left)}</b> · 하루 <b>${won(Math.floor(left / daysLeft))}</b>씩 쓸 수 있어요 <span class="muted nowrap">(${daysLeft}일 남음)</span>`
      : `예산보다 <b>${won(-left)}</b> 더 썼어요. 남은 ${daysLeft}일은 꼭 필요한 곳에만 써 보세요.`;
  } else if (ym < curYm) {
    foot = left >= 0 ? `예산에서 <b>${won(left)}</b> 남기고 마무리했어요` : `예산보다 <b>${won(-left)}</b> 더 쓰고 마무리했어요`;
  } else foot = '아직 시작하지 않은 달이에요';
  return { B, pct, left, state: stateOf(pct), foot };
}
function upcoming(days, limit) {
  const t = todayStr(), end = addDays(t, days), keys = allKeys();
  return subsArr().filter(s => s.active && s.amount > 0)
    .map(s => ({ s, d: nextDue(s, keys) }))
    .filter(x => x.d <= end)
    .sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0))
    .slice(0, limit);
}
function emptyBox(title, body, btn) { return `<div class="empty"><b>${title}</b>${body ? `<span>${body}</span>` : ''}${btn || ''}</div>`; }

/* ---------- home ---------- */
function vHome() {
  const t = todayStr(), curYm = ymOf(t), ym = S.ym;
  const isCur = ym === curYm, isFuture = ym > curYm;
  const nothingYet = !Object.keys(S.months).some(k => txsOf(k).length) && !subsArr().length;
  if (isLoading() || (nothingYet && S.mode !== 'denied')) {
    return `<section class="card welcome">
      <h1 class="view-title">${isLoading() ? '가계부를 불러오는 중이에요' : '첫 기록을 남겨 볼까요?'}</h1>
      <p class="welcome-p">쓴 돈과 들어온 돈을 적으면 여기에 차곡차곡 정리돼요.</p>
      <ul class="welcome-list">
        <li>${icon('home')}<span><b>한눈에</b>이번 달 지출, 남은 예산, 어디에 많이 썼는지</span></li>
        <li>${icon('list')}<span><b>내역·달력</b>날짜별로 모아 보고 카테고리·결제수단으로 찾기</span></li>
        <li>${icon('repeat')}<span><b>구독</b>결제일이 되면 내역에 자동으로 기록</span></li>
      </ul>
      <div class="welcome-acts"><button class="btn btn-primary" type="button" data-act="add" ${isLoading() ? 'disabled' : ''}>${icon('plus')}첫 기록 남기기</button><button class="btn btn-soft" type="button" data-act="setup" ${isLoading() ? 'disabled' : ''}>첫 설정 도우미로 예산 정하기</button><button class="btn btn-ghost" type="button" data-act="add-sub" ${isLoading() ? 'disabled' : ''}>구독 등록하기</button></div>
    </section>${isLoading() ? '' : `<section class="card">
      <div class="card-h"><h2 class="card-t">${mLabel(ym)} 달력</h2></div>
      ${calGrid(ym, [], { idp: 'hcal', act: 'day-open', sel: null, compact: true })}
    </section>`}`;
  }
  const list = txsOf(ym), tot = totals(list);
  const prevYm = addMonths(ym, -1), prev = txsOf(prevYm);

  let delta = '';
  if (!isFuture && prev.some(x => x.kind === 'out')) {
    let base;
    if (isCur) { const day = Math.min(+t.slice(8), daysIn(prevYm)); base = sum(prev.filter(x => x.kind === 'out' && +x.date.slice(8) <= day).map(x => x.amount)); }
    else base = totals(prev).out;
    const d = tot.out - base, label = isCur ? '지난달 이맘때보다' : '지난달보다';
    if (d < 0) delta = `<p class="delta good">${icon('down')}${label} ${won(-d)} 덜 썼어요</p>`;
    else if (d > 0) delta = `<p class="delta bad">${icon('up')}${label} ${won(d)} 더 썼어요</p>`;
    else delta = `<p class="delta">${isCur ? '지난달 이맘때와' : '지난달과'} 똑같이 썼어요</p>`;
  }
  const net = tot.in - tot.out;
  const hero = `<section class="card" data-o="1">
    <div class="hero-top"><h1 class="hero-label">${mLabel(ym)} 지출${isCur ? ' · 오늘까지' : ''}</h1><button class="card-link" type="button" data-view="list">내역 보기${icon('right')}</button></div>
    <p class="hero-num">${fmt(tot.out)}<span class="u">원</span></p>
    ${delta}
    <div class="hero-stats">
      <div><span class="stat-l">수입</span><span class="stat-v${tot.in ? ' in-c' : ''}">${tot.in ? '+' + won(tot.in) : '0원'}</span></div>
      <div><span class="stat-l">수입 − 지출</span><span class="stat-v">${net < 0 ? '−' : ''}${won(Math.abs(net))}</span></div>
    </div>
  </section>`;

  const bs = budgetSummary(ym, tot.out);
  const mt = isCur ? memoTotalThisMonth() : 0;
  const memoLine = bs && mt ? `<p class="bud-foot memo-foot">📝 메모한 쓸 돈 <b>${won(mt)}</b>${bs.left - mt >= 0 ? `까지 쓰면 <b>${won(bs.left - mt)}</b> 남아요` : `을 다 쓰면 예산을 <b>${won(mt - bs.left)}</b> 넘어요`} <button class="card-link" type="button" data-act="go-memos">메모 보기</button></p>` : '';
  const budget = `<section class="card" data-o="2">
    <div class="card-h"><h2 class="card-t">${mLabel(ym)} 예산</h2><button class="card-link" type="button" data-view="budget">자세히${icon('right')}</button></div>
    ${bs ? `<div class="bud-head"><p class="bud-pct">${Math.round(bs.pct * 100)}%<small>사용</small></p>${stateChip(bs.state, bs.left)}<span class="bud-of">${won(bs.B)} 중 ${won(tot.out)}</span></div>${meter(bs.pct, bs.state)}<p class="bud-foot">${bs.foot}</p>${memoLine}`
         : emptyBox('예산을 정해 볼까요?', '한 달 예산을 정하면 남은 돈과 하루에 쓸 수 있는 금액을 알려 드려요.', `<button class="btn btn-soft btn-sm" type="button" data-act="edit-budget">예산 정하기</button>`)}
  </section>`;

  // where the money went (one hue for every bar: it is one series)
  const outs = list.filter(x => x.kind === 'out');
  const by = {};
  for (const x of outs) by[x.cat || ''] = (by[x.cat || ''] || 0) + x.amount;
  const ranked = Object.entries(by).sort((a, b) => b[1] - a[1]);
  const shown = ranked.length > 6 ? ranked.slice(0, 5) : ranked;
  const rest = ranked.length > 6 ? ranked.slice(5) : [];
  const maxC = ranked.length ? ranked[0][1] : 1;
  const pct = v => { const p = v / tot.out * 100; return p < 1 ? '<1%' : Math.round(p) + '%'; };
  const catRows = shown.map(([id, v]) => {
    const c = catOf(id);
    return `<button class="rank-row" type="button" data-act="filter-cat" data-cat="${esc(id)}" aria-label="${esc(c.name)} ${won(v)}, 내역 보기">
      <span class="emo" aria-hidden="true"${ccStyle(c)}>${esc(c.emoji)}</span>
      <span class="rank-main"><span class="rank-line"><span class="rank-name">${esc(c.name)}</span><span class="rank-amt">${won(v)}</span></span><span class="bar"><span style="width:${(v / maxC * 100).toFixed(1)}%"></span></span></span>
      <span class="rank-pct">${pct(v)}</span></button>`;
  }).join('') + (rest.length ? (() => {
    const v = sum(rest.map(r => r[1]));
    return `<div class="rank-row"><span class="emo" aria-hidden="true">⋯</span><span class="rank-main"><span class="rank-line"><span class="rank-name">그 외 ${rest.length}개</span><span class="rank-amt">${won(v)}</span></span><span class="bar"><span style="width:${(v / maxC * 100).toFixed(1)}%"></span></span></span><span class="rank-pct">${pct(v)}</span></div>`;
  })() : '');
  const cats = `<section class="card" data-o="7">
    <div class="card-h"><h2 class="card-t">어디에 썼을까</h2>${outs.length ? `<span class="muted" style="font-size:13px">${outs.length}건</span>` : ''}</div>
    ${outs.length ? `<div class="rank">${catRows}</div>` : emptyBox(`${mLabel(ym)} 지출이 아직 없어요`, '지출을 기록하면 카테고리별로 모아서 보여 드려요.')}
  </section>`;

  const ups = plannedIn(t, addDays(t, 30)).slice(0, 4);
  const monthEnd = `${curYm}-${pad(daysIn(curYm))}`;
  const restThisMonth = sum(plannedIn(addDays(t, 1), monthEnd).map(p => p.amount));
  const upc = `<section class="card" data-o="8">
    <div class="card-h"><h2 class="card-t">다가오는 정기 납부</h2><button class="card-link" type="button" data-view="subs">전체${icon('right')}</button></div>
    ${ups.length ? `<div class="rank">${ups.map(p => `<button class="sub-row" type="button" data-act="day-open" data-date="${p.date}" aria-label="${esc(`${mdLabel(p.date)} ${p.name} ${won(p.amount)}, 기록하거나 건너뛰기`)}">
        <span class="emo" aria-hidden="true">${esc(p.emoji)}</span>
        <span class="tx-main"><span class="sub-name">${esc(p.name)}<span class="tag plan">${planKind(p)}</span></span><span class="sub-meta">${mdw(p.date)}${methodOf(p.method) ? ' · ' + esc(methodOf(p.method).name) : ''}</span></span>
        <span class="sub-end"><span class="sub-amt">${won(p.amount)}</span><span class="dday${diffDays(t, p.date) <= 3 ? ' soon' : ''}">${ddayText(p.date)}</span></span></button>`).join('')}</div>
      ${restThisMonth ? `<p class="bud-foot">이번 달 남은 정기 납부 <b>${won(restThisMonth)}</b> · 누르면 바로 기록하거나 건너뛸 수 있어요</p>` : ''}`
      : emptyBox('30일 안에 예정된 납부가 없어요', '', `<button class="btn btn-soft btn-sm" type="button" data-act="add-sub">정기결제 등록하기</button>`)}
  </section>`;

  const byM = {};
  for (const x of outs) byM[x.method || ''] = (byM[x.method || ''] || 0) + x.amount;
  const mRanked = Object.entries(byM).sort((a, b) => b[1] - a[1]);
  const maxM = mRanked.length ? mRanked[0][1] : 1;
  const meth = `<section class="card" data-o="10">
    <div class="card-h"><h2 class="card-t">결제수단별 지출</h2></div>
    ${mRanked.length ? `<div class="rank">${mRanked.map(([id, v]) => {
      const m = methodOf(id), name = m ? m.name : '결제수단 없음';
      const inner = `<span class="emo" aria-hidden="true">${icon(methodIcon(name))}</span><span class="rank-main"><span class="rank-line"><span class="rank-name">${esc(name)}</span><span class="rank-amt">${won(v)}</span></span><span class="bar"><span style="width:${(v / maxM * 100).toFixed(1)}%"></span></span></span><span class="rank-pct">${pct(v)}</span>`;
      return m ? `<button class="rank-row" type="button" data-act="filter-method" data-id="${esc(id)}" aria-label="${esc(name)} ${won(v)}, 내역 보기">${inner}</button>` : `<div class="rank-row">${inner}</div>`;
    }).join('')}</div>` : emptyBox('아직 지출이 없어요', '')}
  </section>`;

  const recentList = list.slice(0, 6);
  const recent = `<section class="card" data-o="11">
    <div class="card-h"><h2 class="card-t">최근 기록</h2><button class="card-link" type="button" data-view="list">전체 보기${icon('right')}</button></div>
    ${recentList.length ? `<div class="rank">${recentList.map(txRow).join('')}</div>` : emptyBox(`${mLabel(ym)} 기록이 없어요`, '', `<button class="btn btn-soft btn-sm" type="button" data-act="add">${icon('plus')}기록하기</button>`)}
  </section>`;

  const P = paceData(ym);
  const anyPace = P.thisC.some(v => v > 0) || P.hasPrev;
  const pace = `<section class="card" data-o="9">
    <div class="card-h"><h2 class="card-t">누적 지출</h2><div class="legend"><span><i class="key"></i>${mLabel(ym)}</span>${P.hasPrev ? `<span><i class="key prev"></i>${mLabel(P.prevYm)}</span>` : ''}${P.B > 0 ? '<span><i class="key bud"></i>예산</span>' : ''}</div></div>
    ${anyPace ? (S.showTable ? paceTable(P) : `<div class="chart" id="pace" tabindex="0" role="img" aria-label="${esc(paceSummary(P))}"></div>`) + `<div class="chart-foot"><button class="card-link" type="button" id="paceToggle" data-act="pace-table">${S.showTable ? '그래프로 보기' : '표로 보기'}</button></div>`
      : emptyBox('아직 그릴 지출이 없어요', '기록이 쌓이면 날마다 얼마나 썼는지 지난달과 비교해 그려 드려요.')}
  </section>`;

  const calCard = `<section class="card" data-o="3">
    <div class="card-h"><h2 class="card-t">${mLabel(ym)} 달력</h2><button class="card-link" type="button" data-act="open-cal">크게 보기${icon('right')}</button></div>
    ${calGrid(ym, list, { idp: 'hcal', act: 'day-open', sel: null, compact: true })}
  </section>`;

  return `<div class="cols">
    <div class="col">${hero}${calCard}${homeReportCard()}${pace}${recent}</div>
    <div class="col">${budget}${homeAcctCard()}${homeHabitCard()}${homeGoalsCard()}${cats}${upc}${meth}</div>
  </div>`;
}

/* ---------- pace chart ---------- */
function dailyOut(ym) {
  const a = new Array(daysIn(ym)).fill(0);
  for (const t of txsOf(ym)) if (t.kind === 'out') a[+t.date.slice(8) - 1] += t.amount;
  return a;
}
const cumul = a => { let s = 0; return a.map(v => (s += v)); };
function paceData(ym) {
  const t = todayStr(), curYm = ymOf(t), prevYm = addMonths(ym, -1);
  const n = daysIn(ym), pn = daysIn(prevYm);
  const last = ym === curYm ? +t.slice(8) : ym < curYm ? n : 0;
  const prevC = cumul(dailyOut(prevYm));
  const hasPrev = prevC[pn - 1] > 0;
  return { ym, prevYm, n, pn, thisC: cumul(dailyOut(ym)).slice(0, last), prevC: hasPrev ? prevC : [], hasPrev, B: budgetTotal() };
}
function paceSummary(P) {
  const L = P.thisC.length;
  let s = `${mLabel(P.ym)} 누적 지출 그래프.`;
  if (L) s += ` ${L}일까지 ${won(P.thisC[L - 1])}.`;
  if (P.hasPrev && L) s += ` ${mLabel(P.prevYm)} 같은 날까지 ${won(P.prevC[Math.min(L, P.pn) - 1])}.`;
  if (P.B > 0) s += ` 예산 ${won(P.B)}.`;
  return s + ' 화살표 키로 날짜별 금액을 볼 수 있어요.';
}
function paceTable(P) {
  const D = Math.max(P.n, P.hasPrev ? P.pn : 0);
  let rows = '';
  for (let d = 1; d <= D; d++) {
    const tv = d <= P.thisC.length && d <= P.n ? won(P.thisC[d - 1]) : '–';
    const pv = P.hasPrev && d <= P.pn ? won(P.prevC[d - 1]) : '–';
    rows += `<tr><td>${d}일</td><td>${tv}</td>${P.hasPrev ? `<td>${pv}</td>` : ''}</tr>`;
  }
  return `<div class="tbl-wrap"><table class="tbl"><caption class="sr-only">날짜별 누적 지출</caption><thead><tr><th scope="col">날짜</th><th scope="col">${mLabel(P.ym)}</th>${P.hasPrev ? `<th scope="col">${mLabel(P.prevYm)}</th>` : ''}</tr></thead><tbody>${rows}</tbody></table></div>`;
}
function niceScale(max) {
  const raw = max / 4, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  return { step, top: Math.ceil(max / step - 1e-9) * step };
}
let paceHover = null;
function drawPace() {
  const host = document.getElementById('pace');
  if (!host) return;
  const P = paceData(S.ym);
  const W = Math.max(260, Math.round(host.clientWidth || 600)), H = W < 480 ? 196 : 224;
  const m = { l: 42, r: 12, t: 22, b: 26 }, pw = W - m.l - m.r, ph = H - m.t - m.b;
  const D = Math.max(P.n, P.hasPrev ? P.pn : 0);
  const sc = niceScale(Math.max(10000, ...P.thisC, ...P.prevC, P.B > 0 ? P.B : 0) * 1.06);
  const x = d => m.l + (D <= 1 ? 0 : ((d - 1) / (D - 1)) * pw);
  const y = v => m.t + ph - (v / sc.top) * ph;
  const f1 = v => v.toFixed(1);
  let g = '';
  for (let v = 0; v <= sc.top + 1e-6; v += sc.step) {
    g += `<line class="${v === 0 ? 'base' : 'gl'}" x1="${m.l}" x2="${W - m.r}" y1="${f1(y(v))}" y2="${f1(y(v))}"/><text class="tl" x="${m.l - 8}" y="${f1(y(v))}" dy="0.32em" text-anchor="end">${v === 0 ? '0' : compact(v)}</text>`;
  }
  for (const d of [1, 8, 15, 22, 29]) if (d <= D) g += `<text class="tl" x="${f1(x(d))}" y="${H - 6}" text-anchor="middle">${d}일</text>`;
  const line = arr => arr.map((v, i) => `${i ? 'L' : 'M'}${f1(x(i + 1))},${f1(y(v))}`).join('');
  let s = '';
  if (P.B > 0) s += `<line class="budl" x1="${m.l}" x2="${W - m.r}" y1="${f1(y(P.B))}" y2="${f1(y(P.B))}"/><text class="budt" x="${m.l + 6}" y="${f1(y(P.B))}" dy="-0.55em">예산 ${compact(P.B)}</text>`;
  if (P.hasPrev) s += `<path class="l-prev" d="${line(P.prevC)}"/>`;
  const L = P.thisC.length;
  if (L) {
    s += `<path class="a-this" d="${line(P.thisC)}L${f1(x(L))},${f1(y(0))}L${f1(x(1))},${f1(y(0))}Z"/><path class="l-this" d="${line(P.thisC)}"/>`;
    const ex = x(L), ey = y(P.thisC[L - 1]), end = ex > W - 80;
    s += `<circle class="dot dot-this" cx="${f1(ex)}" cy="${f1(ey)}" r="4.5"/><text class="lab" x="${f1(end ? ex - 9 : ex + 9)}" y="${f1(ey - 9)}" text-anchor="${end ? 'end' : 'start'}">${compact(P.thisC[L - 1])}</text>`;
  }
  host.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${g}${s}<g class="hov"></g><rect class="hit" x="${m.l}" y="0" width="${pw}" height="${H}"/></svg><div class="tip" hidden></div>`;
  host._g = { P, x, y, D, W, m, pw };
  const dayAt = e => { const r = host.getBoundingClientRect(); return Math.round(((e.clientX - r.left - m.l) / pw) * (D - 1)) + 1; };
  host.onpointermove = e => showTip(dayAt(e));
  host.onpointerdown = e => showTip(dayAt(e));
  host.onpointerleave = () => { if (document.activeElement !== host) hideTip(); };
  host.onfocus = () => showTip(paceHover || L || 1);
  host.onblur = hideTip;
  host.onkeydown = e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); showTip((paceHover || L || 1) + (e.key === 'ArrowLeft' ? -1 : 1)); }
    else if (e.key === 'Home') { e.preventDefault(); showTip(1); }
    else if (e.key === 'End') { e.preventDefault(); showTip(D); }
    else if (e.key === 'Escape') hideTip();
  };
  if (paceHover) showTip(paceHover);
}
function showTip(d) {
  const host = document.getElementById('pace');
  if (!host || !host._g) return;
  const { P, x, y, D, W, m } = host._g;
  d = Math.max(1, Math.min(D, d));
  paceHover = d;
  const tv = d <= P.thisC.length ? P.thisC[d - 1] : null;
  const pv = P.hasPrev && d <= P.pn ? P.prevC[d - 1] : null;
  const xx = x(d).toFixed(1);
  host.querySelector('.hov').innerHTML = `<line class="xh" x1="${xx}" x2="${xx}" y1="${m.t - 6}" y2="${y(0).toFixed(1)}"/>`
    + (pv != null ? `<circle class="dot dot-prev" cx="${xx}" cy="${y(pv).toFixed(1)}" r="4"/>` : '')
    + (tv != null ? `<circle class="dot dot-this" cx="${xx}" cy="${y(tv).toFixed(1)}" r="4.5"/>` : '');
  const tip = host.querySelector('.tip');
  tip.innerHTML = `<p class="tip-d">${+P.ym.slice(5)}월 ${d}일까지</p>`
    + (tv != null ? `<div class="tip-r"><i class="k"></i><span class="n">${mLabel(P.ym)}</span><span class="v">${won(tv)}</span></div>` : '')
    + (pv != null ? `<div class="tip-r"><i class="k prev"></i><span class="n">${mLabel(P.prevYm)}</span><span class="v">${won(pv)}</span></div>` : '')
    + (tv == null && pv == null ? '<div class="tip-r"><span class="n">아직 기록이 없는 날이에요</span></div>' : '');
  tip.hidden = false;
  const tw = tip.offsetWidth, px = x(d);
  let left = px + 14;
  if (left + tw > W) left = px - 14 - tw;
  tip.style.left = Math.max(0, left) + 'px';
}
function hideTip() {
  paceHover = null;
  const host = document.getElementById('pace');
  if (!host) return;
  const h = host.querySelector('.hov'); if (h) h.innerHTML = '';
  const tip = host.querySelector('.tip'); if (tip) tip.hidden = true;
}
const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(entries => {
  for (const en of entries) { const w = Math.round(en.contentRect.width); if (en.target._w !== w) { en.target._w = w; drawPace(); } }
}) : null;
if (!ro) window.addEventListener('resize', () => drawPace());
function afterView() {
  const host = document.getElementById('pace');
  if (ro) { ro.disconnect(); if (host) ro.observe(host); }
  if (host) { drawPace(); host._w = Math.round(host.clientWidth); }
}

/* ---------- list + calendar ---------- */
function applyFilter(list) {
  const f = S.filter, q = f.q.trim().toLowerCase();
  return list.filter(t => (f.kind === 'all' || t.kind === f.kind)
    && (!f.cat || t.cat === f.cat)
    && (!f.method || t.method === f.method)
    && (!f.acct || (t.kind === 'move' ? t.from === f.acct || t.to === f.acct : txAcct(t) === f.acct))
    && (!q || (t.memo || '').toLowerCase().includes(q) || catOf(t.cat).name.toLowerCase().includes(q)));
}
function sumBar(list) {
  const tt = totals(list), net = tt.in - tt.out;
  return `<div><span class="stat-l">수입</span><span class="stat-v${tt.in ? ' in-c' : ''}">${tt.in ? '+' + won(tt.in) : '0원'}</span></div>
    <div><span class="stat-l">지출</span><span class="stat-v">${tt.out ? '−' + won(tt.out) : '0원'}</span></div>
    <div><span class="stat-l">합계</span><span class="stat-v">${net < 0 ? '−' : ''}${won(Math.abs(net))}</span></div>`;
}
function vList() {
  const ym = S.ym, all = txsOf(ym), list = applyFilter(all), f = S.filter;
  const opt = (v, label, cur) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(label)}</option>`;
  const catOpts = opt('', '카테고리 전체', f.cat)
    + `<optgroup label="지출">${catsOf('out').map(c => opt(c.id, `${c.emoji} ${c.name}`, f.cat)).join('')}</optgroup>`
    + `<optgroup label="수입">${catsOf('in').map(c => opt(c.id, `${c.emoji} ${c.name}`, f.cat)).join('')}</optgroup>`;
  const mOpts = opt('', '결제수단 전체', f.method) + cfg().methods.map(m => opt(m.id, m.name, f.method)).join('');
  return `<div class="view-h"><h1 class="view-title">${mLabel(ym)} 내역</h1>
      <div class="seg list-seg" role="group" aria-label="보기 방식">${[['list', '목록'], ['cal', '달력'], ['plan', '쓸 돈 메모'], ['often', '자주 쓴 것']].map(([k, l]) => `<button type="button" id="lm-${k}" data-act="list-mode" data-mode="${k}" aria-pressed="${S.listMode === k}">${l}</button>`).join('')}</div></div>
    ${S.listMode === 'plan' ? `<section class="card" id="listRes">${planMode(ym)}</section>` : S.listMode === 'often' ? `<section class="card" id="listRes">${oftenMode(ym)}</section>` : `<div class="filters">
      <div class="seg" role="group" aria-label="수입·지출 구분">${[['all', '전체'], ['out', '지출'], ['in', '수입']].map(([k, l]) => `<button type="button" id="fk-${k}" data-act="kind-filter" data-kind="${k}" aria-pressed="${f.kind === k}">${l}</button>`).join('')}</div>
      <select class="input" id="flt-cat" aria-label="카테고리로 거르기">${catOpts}</select>
      <select class="input" id="flt-method" aria-label="결제수단으로 거르기">${mOpts}</select>
      ${acctsArr().length ? `<select class="input" id="flt-acct" aria-label="통장으로 거르기">${opt('', '통장 전체', f.acct || '')}${acctsArr().map(a => opt(a.id, a.name, f.acct || '')).join('')}</select>` : ''}
      <label class="search">${icon('search')}<span class="sr-only">내용 검색</span><input class="input" id="flt-q" type="search" placeholder="내용 검색" value="${esc(f.q)}" autocomplete="off"></label>
    </div>
    <section class="card sumbar" id="listSum" aria-label="거른 내역 합계">${sumBar(list)}</section>
    <section class="card" id="listRes">${S.listMode === 'cal' ? calView(ym, list) : listView(all, list)}</section>`}`;
}
function updateListResults() {
  if (S.view !== 'list' || S.listMode === 'plan' || S.listMode === 'often') return;
  const all = txsOf(S.ym), list = applyFilter(all);
  const sumEl = $('#listSum'), res = $('#listRes');
  if (!sumEl || !res) return;
  sumEl.innerHTML = sumBar(list);
  res.innerHTML = S.listMode === 'cal' ? calView(S.ym, list) : listView(all, list);
}
const filtersOn = () => S.filter.kind !== 'all' || S.filter.cat || S.filter.method || S.filter.acct || S.filter.q.trim();
function listView(all, list) {
  if (isLoading()) return emptyBox('불러오는 중이에요', '');
  if (!all.length) return emptyBox(`${mLabel(S.ym)} 기록이 아직 없어요`, '오늘 쓴 돈부터 적어 볼까요?', `<button class="btn btn-primary btn-sm" type="button" data-act="add">${icon('plus')}기록하기</button>`);
  if (!list.length) return emptyBox('조건에 맞는 내역이 없어요', '', `<button class="btn btn-soft btn-sm" type="button" data-act="reset-filter">필터 지우기</button>`);
  const groups = [];
  let cur = null;
  for (const t of list) { if (!cur || cur.date !== t.date) { cur = { date: t.date, items: [] }; groups.push(cur); } cur.items.push(t); }
  return groups.map(g => {
    const tt = totals(g.items);
    return `<div class="day"><div class="day-h"><b>${dayHead(g.date)}</b><span class="s">${tt.in ? `<span class="in-c">+${fmt(tt.in)}</span>` : ''}${tt.out ? `<span>−${fmt(tt.out)}</span>` : ''}</span></div>${g.items.map(txRow).join('')}</div>`;
  }).join('');
}
// month grid shared by the home card and the 내역 calendar: totals, heat and the day's top categories
function calGrid(ym, list, o) {
  const first = parseD(ym + '-01').getDay(), n = daysIn(ym), t = todayStr();
  const by = {};
  for (const x of list) {
    if (x.kind === 'move') continue;
    const d = +x.date.slice(8), e = by[d] || (by[d] = { in: 0, out: 0, cats: {} });
    e[x.kind] += x.amount;
    if (x.kind === 'out') e.cats[x.cat || ''] = (e.cats[x.cat || ''] || 0) + x.amount;
  }
  const maxOut = Math.max(0, ...Object.values(by).map(e => e.out));
  const marks = S.nospend[ym] || {};
  const mm = {};
  for (const m of openMemos()) if (m.date && ymOf(m.date) === ym) mm[+m.date.slice(8)] = (mm[+m.date.slice(8)] || 0) + 1;
  const pl = {};
  if (o.plan !== false) { const f0 = `${ym}-01`; for (const p of plannedIn(t > f0 ? t : f0, `${ym}-${pad(n)}`)) { const dd = +p.date.slice(8); pl[dd] = (pl[dd] || 0) + p.amount; } }
  let cells = DOW.map((d, i) => `<div class="cal-dow${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}" aria-hidden="true">${d}</div>`).join('');
  for (let i = 0; i < first; i++) cells += '<div class="cal-cell blank" aria-hidden="true"></div>';
  for (let d = 1; d <= n; d++) {
    const ds = `${ym}-${pad(d)}`, e = by[d];
    const r = e && maxOut ? e.out / maxOut : 0;
    const heat = r === 0 ? '' : r <= 1 / 3 ? ' h1' : r <= 2 / 3 ? ' h2' : ' h3';
    const top = e ? Object.entries(e.cats).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => catOf(c)) : [];
    const label = `${+ym.slice(5)}월 ${d}일${ds === t ? ' 오늘' : ''}${e ? `${e.in ? `, 수입 ${won(e.in)}` : ''}${e.out ? `, 지출 ${won(e.out)}` : ''}${top.length ? ` (${top.map(c => c.name).join(', ')})` : ''}` : ', 기록 없음'}`;
    cells += `<button type="button" class="cal-cell${heat}${ds === t ? ' today' : ''}" id="${o.idp}-${d}" data-act="${o.act}" data-date="${ds}" aria-pressed="${ds === o.sel}" aria-label="${esc(label + (pl[d] ? `, 정기 납부 예정 ${won(pl[d])}` : '') + (mm[d] ? `, 쓸 돈 메모 ${mm[d]}건` : ''))}"><span class="d">${d}${mm[d] ? '<i class="cm" aria-hidden="true">📝</i>' : ''}</span>${!(e && e.out) && marks[ds] ? '<span class="cn">무지출</span>' : ''}${top.length ? `<span class="ce" aria-hidden="true">${top.map(c => esc(c.emoji)).join('')}</span>` : ''}${e && e.in ? `<span class="ci">${amtPair('+', e.in)}</span>` : ''}${e && e.out ? `<span class="co">${amtPair('−', e.out)}</span>` : ''}${pl[d] ? `<span class="cp">${amtPair('', pl[d])}</span>` : ''}</button>`;
  }
  return `<div class="cal${o.compact ? ' compact' : ''}" role="group" aria-label="${+ym.slice(0, 4)}년 ${+ym.slice(5)}월 달력">${cells}</div>
    <div class="cal-legend"><span>지출 적음</span><i class="h1"></i><i class="h2"></i><i class="h3"></i><span>많음</span>${Object.keys(pl).length ? '<span class="cp-key">예정</span><span>정기 납부</span>' : ''}${Object.keys(mm).length ? '<span class="cm-key">📝 쓸 돈 메모</span>' : ''}${o.compact ? '<span class="cal-hint">· 날짜를 누르면 그날 내역이 보여요</span>' : ''}</div>`;
}
// full and short forms; CSS shows the short one where cells are narrow
const amtPair = (sign, n) => `<span class="a-full">${sign}${cellAmt(n)}</span><span class="a-short">${sign}${n >= 1e4 ? compact(n) : fmt(n)}</span>`;
function calView(ym, list) {
  const t = todayStr();
  const sel = S.selDay && ymOf(S.selDay) === ym ? S.selDay : (ymOf(t) === ym ? t : null);
  const dayList = sel ? list.filter(x => x.date === sel) : [];
  return calGrid(ym, list, { idp: 'cal', act: 'cal-day', sel })
    + (sel ? `<div class="day cal-day"><div class="day-h"><b>${dayHead(sel)}</b><button class="card-link" type="button" data-act="add" data-date="${sel}">${icon('plus', 'sm')}이 날 기록</button></div>${dayList.length ? dayList.map(txRow).join('') : '<p class="muted cal-none">이 날은 기록이 없어요.</p>'}${plannedBlock(sel)}${memoBlock(sel)}<div class="plan-links"><button class="card-link plan-add" type="button" data-act="add-bill" data-date="${sel}" ${S.mode === 'denied' ? 'disabled' : ''}>${icon('repeat', 'sm')}이 날 정기 납부 추가</button>${sel >= todayStr() ? `<button class="card-link plan-add" type="button" data-act="memo-add" data-date="${sel}" ${S.mode === 'denied' ? 'disabled' : ''}>📝 이 날 쓸 돈 메모</button>` : ''}</div></div>` : '');
}
function openDaySheet(date) {
  if (!isYmd(date)) return;
  F = { mode: 'day', date };
  showSheet(daySheetHtml(date));
}
function daySheetHtml(date) {
  const list = txsOf(ymOf(date)).filter(x => x.date === date), tt = totals(list);
  return `<div class="day-sheet">
    <div class="sheet-h"><h2 id="sheetTitle">${mdLabel(date)} ${DOW[parseD(date).getDay()]}요일</h2><button class="icon-btn" type="button" data-act="close" aria-label="닫기">${icon('x')}</button></div>
    <div class="day-sum"><div><span class="stat-l">수입</span><span class="stat-v${tt.in ? ' in-c' : ''}">${tt.in ? '+' + won(tt.in) : '0원'}</span></div><div><span class="stat-l">지출</span><span class="stat-v">${tt.out ? '−' + won(tt.out) : '0원'}</span></div><div><span class="stat-l">기록</span><span class="stat-v">${list.length}건</span></div></div>
    ${list.length ? `<div class="rank">${list.map(txRow).join('')}</div>` : '<p class="muted cal-none">이 날은 기록이 없어요.</p>'}
    ${!tt.out && date <= todayStr() && S.mode !== 'denied' ? `<button class="btn btn-soft btn-block" type="button" data-act="nospend" data-date="${date}" data-on="${isNoSpend(date) ? 0 : 1}">${isNoSpend(date) ? '무지출 체크 취소' : '이 날은 돈을 안 썼어요 (무지출 체크)'}</button>` : ''}
    ${plannedBlock(date)}
    ${memoBlock(date)}
    <div class="day-acts"><button class="btn btn-primary" type="button" data-act="add" data-date="${date}" ${S.mode === 'denied' ? 'disabled' : ''}>${icon('plus')}이 날 기록하기</button><button class="btn btn-soft" type="button" data-act="add-bill" data-date="${date}" ${S.mode === 'denied' ? 'disabled' : ''}>${icon('repeat')}정기 납부 추가</button>${date >= todayStr() ? `<button class="btn btn-soft" type="button" data-act="memo-add" data-date="${date}" ${S.mode === 'denied' ? 'disabled' : ''}>📝 쓸 돈 메모</button>` : ''}</div>
  </div>`;
}

/* ---------- subscriptions ---------- */
function subRow(s, d) {
  const m = methodOf(s.method), meta = [cycleText(s)];
  if (m) meta.push(m.name);
  const t = todayStr();
  const chip = s.active ? `<span class="dday${diffDays(t, d) <= 3 ? ' soon' : ''}">${ddayText(d)}</span>` : '<span class="dday">일시정지</span>';
  return `<button class="sub-row${s.active ? '' : ' paused'}" type="button" data-act="edit-sub" data-id="${esc(s.id)}">
    <span class="emo" aria-hidden="true">${esc(s.emoji || catOf(s.cat).emoji)}</span>
    <span class="tx-main"><span class="sub-name">${esc(s.name)}${s.type === 'bill' ? '<span class="tag plan">고정 납부</span>' : ''}${s.ex ? '<span class="tag">예시</span>' : ''}</span><span class="sub-meta">${esc(meta.join(' · '))}${s.active ? ` · 다음 ${mdLabel(d)}` : ''}</span></span>
    <span class="sub-end"><span class="sub-amt">${s.cycle === 'year' ? '연 ' : ''}${won(s.amount)}</span>${chip}</span>
  </button>`;
}
function receipt(active, monthly, loans = []) {
  const t = todayStr();
  const items = [...active].sort((a, b) => (a.cycle === b.cycle ? 0 : a.cycle === 'month' ? -1 : 1) || (a.cycle === 'year' ? a.month - b.month : 0) || a.day - b.day);
  const lines = items.map(s => `<div class="rc-line"><span class="n">${esc(s.name)}</span><span class="dots"></span><span class="v">${fmt(monthlyOf(s))}</span></div><p class="rc-note">${s.type === 'bill' ? '고정 납부 · ' : ''}${cycleText(s)}${s.cycle === 'year' ? ` · 연 ${fmt(s.amount)}원 ÷ 12` : ''}</p>`).join('')
    + loans.map(l => `<div class="rc-line"><span class="n">${esc(l.name)}</span><span class="dots"></span><span class="v">${fmt(loanMonthly(l))}</span></div><p class="rc-note">대출 상환 · 매월 ${l.day}일</p>`).join('');
  const count = items.length + loans.length;
  return `<div class="receipt-wrap" data-o="2"><div class="receipt" role="group" aria-label="정기결제 영수증">
    <p class="rc-title">정기결제 영수증</p>
    <p class="rc-sub">${t.replace(/-/g, '.')} 기준 · ${count}건 · 월 환산</p>
    <hr class="rc-rule">
    ${lines || '<p class="rc-note" style="text-align:center;margin:0">아직 등록된 정기결제가 없어요</p>'}
    <hr class="rc-rule">
    <div class="rc-line rc-total"><span class="n">월 합계</span><span class="dots"></span><span class="v">${fmt(monthly)}원</span></div>
    <div class="rc-line"><span class="n">1년이면</span><span class="dots"></span><span class="v">${fmt(monthly * 12)}원</span></div>
    <div class="rc-bar" aria-hidden="true"></div>
    <p class="rc-foot">꼬박꼬박 가계부</p>
  </div></div>`;
}
function vSubs() {
  const subs = subsArr(), keys = allKeys(), t = todayStr();
  const loans = loansArr().filter(l => l.principal > 0 && loanStats(l).rest.length);
  const f = S.subFilter || 'all', isBill = s => s.type === 'bill';
  const pick = s => f === 'all' || (f === 'sub' && !isBill(s)) || (f === 'bill' && isBill(s));
  const active = subs.filter(s => s.active), paused = subs.filter(s => !s.active);
  const mSub = sum(active.filter(s => !isBill(s)).map(monthlyOf)), mBill = sum(active.filter(isBill).map(monthlyOf)), mLoan = sum(loans.map(loanMonthly));
  const monthly = mSub + mBill + mLoan;
  const rows = [
    ...active.filter(pick).map(s => ({ s, d: nextDue(s, keys) })).sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0)),
    ...paused.filter(pick).map(s => ({ s, d: null })),
  ];
  const lrows = f === 'all' || f === 'loan' ? loans : [];
  const empty = {
    all: emptyBox('등록된 정기결제가 없어요', '넷플릭스 같은 구독이나 월세·보험료처럼 매달 나가는 돈을 등록하면 달력에 미리 보여 주고 결제일에 자동으로 기록해요.', `<div class="welcome-acts" style="justify-content:center"><button class="btn btn-primary btn-sm" type="button" data-act="add-sub">${icon('plus')}구독</button><button class="btn btn-soft btn-sm" type="button" data-act="add-bill">${icon('plus')}고정 납부</button></div>`),
    sub: emptyBox('등록된 구독이 없어요', '넷플릭스·유튜브처럼 매달 내는 구독을 등록해 보세요.', `<button class="btn btn-primary btn-sm" type="button" data-act="add-sub">${icon('plus')}구독 추가</button>`),
    bill: emptyBox('등록된 고정 납부가 없어요', '월세·관리비·보험료·통신비처럼 매달 정해진 날 내는 돈을 등록해 보세요.', `<button class="btn btn-primary btn-sm" type="button" data-act="add-bill">${icon('plus')}고정 납부 추가</button>`),
    loan: emptyBox('상환 중인 대출이 없어요', '대출을 등록하면 매달 갚을 금액이 여기와 달력에 보여요.', `<button class="btn btn-primary btn-sm" type="button" data-view="loans">대출 화면으로</button>`),
  }[f];
  const listHtml = isLoading() ? emptyBox('불러오는 중이에요', '')
    : rows.length || lrows.length ? `<div class="rank">${rows.map(({ s, d }) => subRow(s, d)).join('')}${lrows.map(loanRow).join('')}</div>`
    : empty;
  const parts = [[mSub, '구독'], [mBill, '고정 납부'], [mLoan, '대출']].filter(x => x[0] > 0).map(([v, n]) => `${n} ${won(v)}`);
  const seg = `<div class="seg sub-filter" role="group" aria-label="정기결제 종류">${[['all', '전체'], ['sub', '구독'], ['bill', '고정 납부'], ['loan', '대출']].map(([v, n]) => `<button type="button" id="sf-${v}" data-act="sub-filter" data-v="${v}" aria-pressed="${f === v}">${n}</button>`).join('')}</div>`;
  const auto = cfg().autoSubs;
  return `<div class="view-h"><h1 class="view-title">구독·정기결제</h1><div class="view-acts"><button class="btn btn-soft btn-sm" type="button" data-act="add-bill" ${S.mode === 'denied' ? 'disabled' : ''}>${icon('plus')}고정 납부</button><button class="btn btn-primary btn-sm" type="button" data-act="add-sub" ${S.mode === 'denied' ? 'disabled' : ''}>${icon('plus')}구독</button></div></div>
    <div class="cols">
      <div class="col">
        <section class="card" data-o="1">
          <div class="subs-hero"><span class="hero-label">매달 고정으로 나가는 돈</span><p class="hero-num">${fmt(monthly)}<span class="u">원</span></p><span class="muted" style="font-size:13.5px">${parts.length ? parts.join(' · ') : '아직 없어요'}${paused.length ? ` · ${paused.length}개 일시정지` : ''}</span></div>
          ${seg}
          ${listHtml}
          <p class="set-note" style="margin-top:12px">달력에서 날짜를 누르면 예정된 납부를 바로 기록하거나 이번만 건너뛸 수 있어요.</p>
        </section>
        <section class="card" data-o="3">
          <div class="switch-row"><div><h2 class="card-t">결제일에 자동 기록</h2><p>${auto ? '결제일이 되면 내역에 지출로 자동 추가해요. 이미 기록했거나 건너뛴 달은 넘어가요.' : '꺼져 있어요. 정기결제도 직접 기록해야 해요.'}</p></div><button class="switch" type="button" role="switch" id="autoSw" aria-checked="${auto}" data-act="toggle-auto" aria-label="결제일에 자동 기록"></button></div>
        </section>
      </div>
      <div class="col">${receipt(active, monthly, loans)}</div>
    </div>`;
}

/* ---------- budget ---------- */
function vBudget() {
  const ym = S.ym, outs = txsOf(ym).filter(t => t.kind === 'out'), spent = sum(outs.map(t => t.amount));
  const by = {};
  for (const t of outs) by[t.cat || ''] = (by[t.cat || ''] || 0) + t.amount;
  const b = cfg().budget, bs = budgetSummary(ym, spent);
  const withB = catsOf('out').filter(c => +b.cats[c.id] > 0);
  const noB = Object.entries(by).filter(([id]) => !withB.some(c => c.id === id)).sort((p, q) => q[1] - p[1]);
  const head = `<div class="view-switch">${statsSwitch('budget')}</div><div class="view-h"><h1 class="view-title">${mLabel(ym)} 예산</h1><div class="view-acts"><button class="btn btn-ghost btn-sm" type="button" data-act="setup" ${S.mode === 'denied' ? 'disabled' : ''}>추천 받기</button><button class="btn btn-soft btn-sm" type="button" data-act="edit-budget" ${S.mode === 'denied' ? 'disabled' : ''}>예산 편집</button></div></div>`;
  if (!bs) {
    return head + `<section class="card">${emptyBox('아직 예산이 없어요', '한 달 전체 예산이나 카테고리별 예산을 정하면 얼마나 남았는지 바로 보여 드려요. 수입만 알려 주면 추천해 드릴 수도 있어요.', `<div class="welcome-acts" style="justify-content:center"><button class="btn btn-primary btn-sm" type="button" data-act="setup">첫 설정 도우미</button><button class="btn btn-soft btn-sm" type="button" data-act="edit-budget">직접 정하기</button></div>`)}</section>`;
  }
  const total = `<section class="card">
      <h2 class="card-t" style="margin-bottom:10px">전체 예산</h2>
      <div class="bud-head"><p class="bud-pct">${Math.round(bs.pct * 100)}%<small>사용</small></p>${stateChip(bs.state, bs.left)}<span class="bud-of">${won(bs.B)} 중 ${won(spent)}</span></div>
      ${meter(bs.pct, bs.state)}
      <p class="bud-foot">${bs.foot}</p></section>`;
  const rows = withB.map(c => {
    const B = +b.cats[c.id], s = by[c.id] || 0, pct = s / B, st = stateOf(pct), left = B - s;
    return `<div class="bud-row"><span class="emo" aria-hidden="true"${ccStyle(c)}>${esc(c.emoji)}</span><div>
      <div class="bud-top"><span class="bud-name">${esc(c.name)}${stateChip(st, left)}</span><span class="bud-nums"><b>${won(s)}</b> / ${won(B)}</span></div>
      ${meter(pct, st, true)}
      <p class="bud-left">${left >= 0 ? `${won(left)} 남음` : `${won(-left)} 초과`} · ${Math.round(pct * 100)}%</p></div></div>`;
  }).join('');
  const cats = withB.length ? `<section class="card"><h2 class="card-t" style="margin-bottom:4px">카테고리별 예산</h2>${rows}</section>`
    : `<section class="card">${emptyBox('카테고리별 예산은 아직 없어요', '식비, 카페처럼 자주 넘치는 곳만 정해 둬도 좋아요.', `<button class="btn btn-soft btn-sm" type="button" data-act="edit-budget">카테고리 예산 정하기</button>`)}</section>`;
  const others = noB.length ? `<section class="card"><div class="card-h"><h2 class="card-t">예산 밖 지출</h2><span class="muted" style="font-size:13px">${won(sum(noB.map(x => x[1])))}</span></div><div class="rank">${noB.map(([id, v]) => {
    const c = catOf(id);
    return `<button class="rank-row" type="button" data-act="filter-cat" data-cat="${esc(id)}"><span class="emo" aria-hidden="true"${ccStyle(c)}>${esc(c.emoji)}</span><span class="rank-main"><span class="rank-line"><span class="rank-name">${esc(c.name)}</span><span class="rank-amt">${won(v)}</span></span></span><span class="rank-pct">${icon('right', 'sm')}</span></button>`;
  }).join('')}</div></section>` : '';
  return head + `<div class="cols"><div class="col">${total}${cats}</div><div class="col">${others}</div></div>`;
}

/* ---------- settings ---------- */
function vSettings() {
  const kind = S.setKind, cats = catsOf(kind), methods = cfg().methods;
  const used = {};
  for (const t of allTxs()) used[t.cat] = (used[t.cat] || 0) + 1;
  const ro = S.mode === 'denied' ? 'disabled' : '';
  return `<div class="view-h"><h1 class="view-title">설정</h1></div>
    <div class="cols"><div class="col">
      ${lookCard()}
      <section class="card">
        <div class="card-h"><h2 class="card-t">카테고리</h2><div class="seg" role="group" aria-label="카테고리 구분"><button type="button" id="sk-out" data-act="set-kind" data-kind="out" aria-pressed="${kind === 'out'}">지출</button><button type="button" id="sk-in" data-act="set-kind" data-kind="in" aria-pressed="${kind === 'in'}">수입</button></div></div>
        <div class="set-list" data-list="cat">${cats.map(c => `<div class="set-row" data-id="${esc(c.id)}"><button class="drag-h" type="button" id="dh-cat-${esc(c.id)}" data-drag="cat" aria-label="‘${esc(c.name)}’ 순서 옮기기 (끌거나 위·아래 화살표 키)" title="끌어서 순서 바꾸기" ${ro}>${icon('grip')}</button>
          <button class="input emoji emoji-btn" type="button" id="ce-${esc(c.id)}" data-act="cat-icon" data-id="${esc(c.id)}" aria-label="${esc(c.name)} 아이콘 바꾸기"${ccStyle(c)} ${ro}>${esc(c.emoji)}</button>
          <input class="input" id="cn-${esc(c.id)}" data-cat="${esc(c.id)}" data-field="name" value="${esc(c.name)}" aria-label="카테고리 이름" maxlength="20" autocomplete="off" ${ro}>
          <button class="icon-btn" type="button" data-act="del-cat" data-id="${esc(c.id)}" aria-label="${esc(c.name)} 삭제" title="${used[c.id] ? `기록 ${used[c.id]}건에 쓰였어요` : '삭제'}" ${ro}>${icon('trash')}</button></div>`).join('')}</div>
        <button class="btn btn-soft btn-sm set-add" type="button" data-act="add-cat" ${ro}>${icon('plus')}카테고리 추가</button>
        <p class="set-note" style="margin-top:12px">아이콘을 누르면 아이콘과 색을 고를 수 있어요. 왼쪽 손잡이를 끌면 순서가 바뀌어요. 지운 카테고리의 기록은 ‘미분류’로 보여요.</p>
      </section>
    </div><div class="col">
      <section class="card">
        <div class="card-h"><h2 class="card-t">결제수단</h2></div>
        <div class="set-list" data-list="method">${methods.map(m => `<div class="set-row m" data-id="${esc(m.id)}"><button class="drag-h" type="button" id="dh-method-${esc(m.id)}" data-drag="method" aria-label="‘${esc(m.name)}’ 순서 옮기기 (끌거나 위·아래 화살표 키)" title="끌어서 순서 바꾸기" ${ro}>${icon('grip')}</button><input class="input" id="mn-${esc(m.id)}" data-method="${esc(m.id)}" value="${esc(m.name)}" aria-label="결제수단 이름" maxlength="20" autocomplete="off" ${ro}><button class="icon-btn" type="button" data-act="del-method" data-id="${esc(m.id)}" aria-label="${esc(m.name)} 삭제" ${ro}>${icon('trash')}</button></div>`).join('') || '<p class="set-note">결제수단이 없어요.</p>'}</div>
        <button class="btn btn-soft btn-sm set-add" type="button" data-act="add-method" ${ro}>${icon('plus')}결제수단 추가</button>
        <p class="set-note" style="margin-top:12px">‘신한 체크’, ‘카카오페이’처럼 실제로 쓰는 이름으로 바꿔 두면 결제수단별 지출을 보기 좋아요. 왼쪽 손잡이를 끌면 순서가 바뀌고 기록 화면에도 그 순서로 보여요.</p>
      </section>
      ${accountCard()}
    </div></div>`;
}
function updateCat(id, field, raw) {
  const st = cfg();
  const c = st.cats.find(x => x.id === id);
  if (!c) return;
  const v = field === 'emoji' ? firstGrapheme(raw) : String(raw || '').trim().slice(0, 20);
  if (!v || v === c[field]) { renderView(); return; }
  saveSettings({ ...st, cats: st.cats.map(x => (x.id === id ? { ...x, [field]: v } : x)) });
}
function updateMethod(id, raw) {
  const st = cfg(), v = String(raw || '').trim().slice(0, 20);
  const m = st.methods.find(x => x.id === id);
  if (!m) return;
  if (!v || v === m.name) { renderView(); return; }
  saveSettings({ ...st, methods: st.methods.map(x => (x.id === id ? { ...x, name: v } : x)) });
}

/* ================= sheets ================= */
let lastFocus = null;
function showSheet(html, focusSel) {
  if ($('#sheetWrap').hidden) lastFocus = document.activeElement;
  $('#sheet').innerHTML = html;
  $('#sheetWrap').hidden = false;
  document.documentElement.style.overflow = 'hidden';
  const el = (focusSel && $(focusSel, $('#sheet'))) || $('#sheet .icon-btn');
  if (el) el.focus({ preventScroll: true });
}
function rerenderSheet(html) {
  const a = document.activeElement, fid = a && $('#sheet').contains(a) ? a.id : null;
  const top = $('#sheet').scrollTop;
  $('#sheet').innerHTML = html;
  $('#sheet').scrollTop = top;
  const el = fid && document.getElementById(fid);
  if (el) el.focus({ preventScroll: true });
}
function closeSheet() {
  if ($('#sheetWrap').hidden) return;
  $('#sheetWrap').hidden = true;
  $('#sheet').innerHTML = '';
  F = null;
  document.documentElement.style.overflow = '';
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  lastFocus = null;
}
const pressed = (on) => `aria-pressed="${!!on}"`;

/* ---------- transaction sheet ---------- */
function defaultDate() {
  const t = todayStr();
  if (S.ym === ymOf(t)) return t;
  return S.ym < ymOf(t) ? `${S.ym}-${pad(daysIn(S.ym))}` : `${S.ym}-01`;
}
function memoSuggestions(kind) {
  const seen = new Set(), out = [];
  for (const t of allTxs()) {
    if (t.kind !== kind || !t.memo || seen.has(t.memo)) continue;
    seen.add(t.memo); out.push(t.memo);
    if (out.length >= 40) break;
  }
  return out;
}
function openTxSheet({ id, date } = {}) {
  if (S.mode === 'denied') return;
  const hit = id ? findTx(id) : null;
  if (id && !hit) return;
  if (hit) {
    const t = hit.t;
    F = { mode: 'tx', id, origYm: hit.ym, kind: t.kind === 'in' ? 'in' : t.kind === 'move' ? 'move' : 'out', from: t.from || '', to: t.to || '', acct: t.acct || '', amount: t.amount, cat: t.cat, memo: t.memo || '', date: t.date, method: t.method || '', sub: t.sub || '', loan: t.loan || '', ex: !!t.ex, at: t.at || 0, catTouched: true };
  } else {
    F = { mode: 'tx', id: null, origYm: null, kind: 'out', amount: 0, cat: lastCat('out'), memo: '', date: isYmd(date) ? date : defaultDate(), method: lastMethod(), sub: '', ex: false, at: 0, catTouched: false };
  }
  showSheet(txSheet(), hit ? null : '#f-amount');
}
function txSheet() {
  const f = F, isEdit = !!f.id, t = todayStr();
  return `<form id="txForm" autocomplete="off" novalidate>
    <div class="sheet-h"><h2 id="sheetTitle">${isEdit ? '기록 고치기' : '새 기록'}</h2><button class="icon-btn" type="button" data-act="close" aria-label="닫기">${icon('x')}</button></div>
    <div class="seg" role="group" aria-label="지출·수입·이체" style="width:100%"><button type="button" id="fk2-out" data-act="f-kind" data-kind="out" ${pressed(f.kind === 'out')}>지출</button><button type="button" id="fk2-in" data-act="f-kind" data-kind="in" ${pressed(f.kind === 'in')}>수입</button>${acctsArr().length >= 2 || f.kind === 'move' ? `<button type="button" id="fk2-move" data-act="f-kind" data-kind="move" ${pressed(f.kind === 'move')}>이체</button>` : ''}</div>
    ${!f.id && !f.newId && !f.memoId && f.kind === 'out' ? (() => { const ch = oftenChips(); return ch.length ? `<div class="often-chips"><span class="lab">자주 쓰는 내역</span><div class="chips">${ch.map((x, i) => `<button class="chip" type="button" data-act="f-often" data-k="${esc(x.k)}">${esc(catOf(x.cat).emoji)} ${esc(x.name)} <small>${compact(x.last.amount)}</small></button>`).join('')}</div></div>` : ''; })() : ''}
    ${!f.id && !f.newId && !f.memoId && f.kind !== 'move' ? (f.smsOpen ? `<div class="field sms-box"><label class="lab" for="f-sms">카드 결제 문자를 붙여 넣으세요</label><textarea class="input" id="f-sms" rows="4" placeholder="[Web발신] ○○카드 승인 12,000원 10/20 12:34 스타벅스"></textarea><p class="amt-hint" id="smsHint">문자 내용은 저장하지 않고 금액·가게·날짜만 읽어요.</p><div class="habit-acts"><button class="btn btn-primary btn-sm" type="button" data-act="sms-apply">읽어서 채우기</button><button class="btn btn-ghost btn-sm" type="button" data-act="sms-close">닫기</button></div></div>` : `<button class="card-link sms-open" type="button" data-act="sms-open">${icon('phone', 'sm')}결제 문자로 채우기</button>`) : ''}
    <div class="field">
      <label class="lab" for="f-amount">금액</label>
      <div class="amt"><input id="f-amount" inputmode="numeric" enterkeyhint="done" placeholder="0" value="${f.amount ? fmt(f.amount) : ''}" aria-describedby="amtHint"><span>원</span></div>
      <p class="amt-hint" id="amtHint">${f.amount >= 1e4 ? koreanWon(f.amount) : ''}</p>
      <div class="quick">${[[1000, '+1천'], [5000, '+5천'], [10000, '+1만'], [50000, '+5만'], [100000, '+10만']].map(([v, l]) => `<button class="chip" type="button" data-act="f-plus" data-v="${v}">${l}</button>`).join('')}<button class="chip chip-x" type="button" data-act="f-clear" aria-label="금액 지우기">${icon('x')}</button></div>
    </div>
    ${f.kind === 'move' ? moveFields(f) : ''}
    <div class="field"${f.kind === 'move' ? ' style="display:none"' : ''}><span class="lab" id="catLab">카테고리</span>
      <div class="cat-grid" role="group" aria-labelledby="catLab">${catsOf(f.kind).map(c => `<button class="cat-opt" type="button" id="fc-${esc(c.id)}" data-act="f-cat" data-id="${esc(c.id)}" ${pressed(f.cat === c.id)}><span class="e" aria-hidden="true"${ccStyle(c)}>${esc(c.emoji)}</span>${esc(c.name)}</button>`).join('')}${f.nc ? '' : `<button class="cat-opt cat-new" type="button" id="fc-new" data-act="nc-open" ${S.mode === 'denied' ? 'disabled' : ''}><span class="e" aria-hidden="true">＋</span>새 카테고리</button>`}</div>
      ${ncBlock(f)}
      <p class="learn" id="learnHint" aria-live="polite"></p>
    </div>
    <div class="field"><label class="lab" for="f-memo">내용</label><input class="input" id="f-memo" list="memoList" maxlength="40" placeholder="${f.kind === 'move' ? '예: 비상금 옮기기, 지역화폐 충전' : f.kind === 'in' ? '예: 10월 급여' : '예: 점심, 마트 장보기'}" value="${esc(f.memo)}"><datalist id="memoList">${memoSuggestions(f.kind).map(m => `<option value="${esc(m)}"></option>`).join('')}</datalist></div>
    <div class="field"><label class="lab" for="f-date">날짜</label><div class="field-row"><input class="input" type="date" id="f-date" value="${f.date}" required><div class="chips"><button class="chip" type="button" id="fd-0" data-act="f-day" data-d="0" ${pressed(f.date === t)}>오늘</button><button class="chip" type="button" id="fd-1" data-act="f-day" data-d="-1" ${pressed(f.date === addDays(t, -1))}>어제</button></div></div></div>
    ${f.kind === 'out' ? `<div class="field"><span class="lab" id="mLab">결제수단</span><div class="chips" role="group" aria-labelledby="mLab">${cfg().methods.map(m => `<button class="chip" type="button" id="fm-${esc(m.id)}" data-act="f-method" data-id="${esc(m.id)}" ${pressed(f.method === m.id)}>${esc(m.name)}</button>`).join('') || '<span class="muted" style="font-size:13px">설정에서 결제수단을 추가할 수 있어요</span>'}</div></div>` : ''}
    ${acctField(f)}
    ${f.memoId ? `<p class="sheet-note">📝 ‘${esc((S.memos[f.memoId] || {}).name || '')}’ 메모를 기록으로 옮겨요. 실제로 쓴 금액으로 고쳐서 저장하세요.</p>` : ''}
    ${f.newId ? `<p class="sheet-note">${mdLabel(f.planDate)} ${f.loan ? '대출 상환' : '정기 납부'}분으로 기록해요. 실제로 낸 금액이 다르면 고쳐서 저장하세요.</p>` : ''}
    ${f.loan && f.id ? `<p class="sheet-note">‘${esc((S.loans[f.loan] || {}).name || '삭제된 대출')}’ 상환 일정에서 자동으로 기록된 내역이에요. 지워도 다시 생기지 않아요.</p>` : ''}
    ${f.sub && f.id ? `<p class="sheet-note">‘${esc(subName(f.sub))}’ 정기결제에서 자동으로 기록된 내역이에요. 지워도 다시 생기지 않아요.</p>` : ''}
    <p class="dup-hint" id="dupHint" role="alert"></p>
    <div class="sheet-actions">${isEdit ? `<button class="btn btn-danger" type="button" data-act="f-delete">${icon('trash')}삭제</button>` : ''}<button class="btn btn-primary btn-block" type="submit" id="f-save" ${f.amount > 0 ? '' : 'disabled'}>${isEdit ? '고친 내용 저장' : '저장하기'}</button></div>
  </form>`;
}
function syncTxSheet() {
  for (const b of document.querySelectorAll('#sheet [data-act="f-cat"]')) b.setAttribute('aria-pressed', String(b.dataset.id === F.cat));
  for (const b of document.querySelectorAll('#sheet [data-act="f-method"]')) b.setAttribute('aria-pressed', String(b.dataset.id === F.method));
  const t = todayStr();
  const d0 = $('#fd-0'), d1 = $('#fd-1');
  if (d0) d0.setAttribute('aria-pressed', String(F.date === t));
  if (d1) d1.setAttribute('aria-pressed', String(F.date === addDays(t, -1)));
  const amt = $('#f-amount');
  if (amt && document.activeElement !== amt) amt.value = F.amount ? fmt(F.amount) : '';
  const hint = $('#amtHint'); if (hint) hint.textContent = F.amount >= 1e4 ? koreanWon(F.amount) : '';
  const save = $('#f-save'); if (save) save.disabled = !(F.amount > 0);
  if (F.dupOk) { F.dupOk = false; const h = $('#dupHint'); if (h) h.textContent = ''; if (save) save.textContent = F.id ? '고친 내용 저장' : '저장하기'; }
}
function learnFromMemo() {
  if (!F || F.mode !== 'tx' || F.catTouched) return;
  const m = F.memo.trim();
  if (!m) return;
  const hit = allTxs().find(t => t.kind === F.kind && t.memo === m && !t.sub);
  if (!hit || !catOf(hit.cat).id) return;
  F.cat = hit.cat;
  const meth = F.kind === 'out' && hit.method && methodOf(hit.method);
  if (meth) F.method = hit.method;
  syncTxSheet();
  $('#learnHint').textContent = `지난번처럼 ‘${catOf(F.cat).name}’${meth ? `, ${meth.name}` : ''}(으)로 골라 뒀어요`;
}
function saveTx() {
  const f = F;
  if (!(f.amount > 0)) { $('#f-amount').focus(); return; }
  if (!isYmd(f.date)) { toast('날짜를 확인해 주세요'); return; }
  if (!f.id && !f.dupOk) { // same day, same amount, same memo: probably written twice
    const k = normMemo(f.memo), amt = Math.round(f.amount);
    const dup = txsOf(ymOf(f.date)).find(t => t.id !== f.newId && t.date === f.date && t.kind === f.kind && t.amount === amt && (k ? normMemo(t.memo) === k : !t.memo && t.cat === f.cat));
    if (dup) {
      F.dupOk = true;
      const h = $('#dupHint'); if (h) h.textContent = `같은 날 같은 금액의 ‘${dup.memo || catOf(dup.cat).name}’ 기록이 이미 있어요. 두 번 적은 게 아니라면 한 번 더 눌러 저장하세요.`;
      const b = $('#f-save'); if (b) b.textContent = '그래도 저장하기';
      return;
    }
  }
  const id = f.id || f.newId || uid('t');
  if (f.kind === 'move' && (!f.from || !f.to || f.from === f.to)) { toast('보내는 통장과 받는 통장을 서로 다르게 골라 주세요'); return; }
  const acct = f.kind === 'move' ? '' : f.acct === '-' ? '-' : f.acct || (f.kind === 'out' ? methodAcct(f.method) : mainAcct());
  const tx = makeTx({ ...f, acct, at: f.at || Date.now() });
  const ym = ymOf(tx.date);
  if (f.id && f.origYm && f.origYm !== ym) writeMonth(f.origYm, { [id]: null });
  writeMonth(ym, { [id]: tx });
  if (tx.kind !== 'move') prefs.lastCat = { ...(prefs.lastCat || {}), [tx.kind]: tx.cat };
  if (tx.method) prefs.lastMethod = tx.method;
  savePrefs();
  const wasEdit = !!f.id;
  closeSheet();
  if (!wasEdit) mascotCheer();
  if (f.memoId) { markMemoDone(f.memoId, id, tx.amount, tx.date); toast('기록했어요 · 메모는 ‘썼어요’로 정리했어요'); return; }
  const mm = !wasEdit && tx.kind === 'out' && !f.newId ? matchMemo(tx) : null;
  if (mm) { toast(`메모해 둔 ‘${mm.name}’${josa(mm.name, '을/를').slice(-1)} 산 건가요?`, { undo: () => { markMemoDone(mm.id, id, tx.amount, tx.date); toast('메모를 ‘썼어요’로 정리했어요'); }, label: '맞아요', ms: 9000 }); return; }
  toast(wasEdit ? '고쳤어요' : ym === S.ym ? '기록했어요' : `${+ym.slice(5)}월 내역에 기록했어요`);
}
function deleteTx() {
  const f = F, prev = S.months[f.origYm] && S.months[f.origYm][f.id];
  closeSheet();
  if (!prev) return;
  writeMonth(f.origYm, { [f.id]: null });
  toast('삭제했어요', { undo: () => writeMonth(f.origYm, { [f.id]: prev }) });
}

/* ---------- subscription sheet ---------- */
function openSubSheet(id) {
  if (S.mode === 'denied') return;
  const s = id && S.subs[id];
  const t = todayStr();
  if (s) {
    F = { mode: 'sub', id, name: s.name || '', emoji: s.emoji || '', amount: s.amount || 0, cycle: s.cycle === 'year' ? 'year' : 'month', day: s.day || 1, month: s.month || 1, cat: s.cat || '', method: s.method || '', active: s.active !== false, ex: !!s.ex, since: s.since || t, recordNow: false, type: s.type === 'bill' ? 'bill' : 'sub' };
  } else {
    const outs = catsOf('out');
    F = { mode: 'sub', id: null, name: '', emoji: '', amount: 0, cycle: 'month', day: +t.slice(8), month: +t.slice(5, 7), cat: (outs.find(c => c.id === 'subs') || outs[0] || UNKNOWN_CAT).id, method: lastMethod(), active: true, ex: false, since: t, recordNow: true, type: 'sub' };
  }
  showSheet(subSheet(), s ? null : '#s-name');
}
const canSaveSub = () => !!(F && F.name.trim() && F.amount > 0);
function subSheet() {
  const f = F, isEdit = !!f.id, t = todayStr();
  const occ = curPeriodOcc(f);
  const showRecord = !isEdit && cfg().autoSubs && occ <= t && diffDays(occ, t) <= BACKFILL_DAYS;
  return `<form id="subForm" autocomplete="off" novalidate>
    <div class="sheet-h"><h2 id="sheetTitle">${f.type === 'bill' ? '고정 납부' : '구독'} ${isEdit ? '고치기' : '추가'}</h2><button class="icon-btn" type="button" data-act="close" aria-label="닫기">${icon('x')}</button></div>
    <div class="seg" role="group" aria-label="종류" style="width:100%"><button type="button" id="st-sub" data-act="s-type" data-v="sub" ${pressed(f.type !== 'bill')}>구독</button><button type="button" id="st-bill" data-act="s-type" data-v="bill" ${pressed(f.type === 'bill')}>고정 납부</button>${isEdit ? '' : '<button type="button" id="st-loan" data-act="s-type" data-v="loan" aria-pressed="false">대출</button>'}</div>
    ${f.type === 'bill' && !isEdit ? `<div class="chips preset" role="group" aria-label="자주 쓰는 항목">${BILL_PRESETS.map((b, i) => `<button class="chip" type="button" data-act="s-preset" data-i="${i}">${b.emoji} ${b.name}</button>`).join('')}</div>` : ''}
    <div class="field"><label class="lab" for="s-name">이름</label><div class="set-row m" style="grid-template-columns:56px minmax(0,1fr)"><input class="input emoji" id="s-emoji" value="${esc(f.emoji)}" placeholder="${esc(catOf(f.cat).emoji)}" aria-label="아이콘 이모지" maxlength="8"><input class="input" id="s-name" value="${esc(f.name)}" placeholder="${f.type === 'bill' ? '예: 월세, 관리비, 보험료' : '예: 넷플릭스, 유튜브 프리미엄'}" maxlength="30"></div></div>
    <div class="field"><label class="lab" for="s-amount">한 번에 내는 금액</label><div class="amt"><input id="s-amount" inputmode="numeric" placeholder="0" value="${f.amount ? fmt(f.amount) : ''}"><span>원</span></div></div>
    <div class="field"><span class="lab" id="cyLab">결제 주기</span><div class="seg" role="group" aria-labelledby="cyLab" style="width:100%"><button type="button" id="sc-month" data-act="s-cycle" data-v="month" ${pressed(f.cycle === 'month')}>매월</button><button type="button" id="sc-year" data-act="s-cycle" data-v="year" ${pressed(f.cycle === 'year')}>매년</button></div></div>
    <div class="field"><span class="lab">결제일</span><div class="field-row">${f.cycle === 'year' ? `<select class="input" id="s-month" aria-label="결제 월">${range(1, 12).map(m => `<option value="${m}"${m === f.month ? ' selected' : ''}>${m}월</option>`).join('')}</select>` : ''}<select class="input" id="s-day" aria-label="결제일">${range(1, 31).map(d => `<option value="${d}"${d === f.day ? ' selected' : ''}>${d}일</option>`).join('')}</select></div>
      <p class="amt-hint">다음 결제일은 ${mdw(nextOcc(f, t))}이에요.${f.day > 28 ? ' 그 달에 없는 날짜면 말일로 계산해요.' : ''}</p></div>
    <div class="field"><label class="lab" for="s-cat">카테고리</label><select class="input" id="s-cat">${catsOf('out').map(c => `<option value="${esc(c.id)}"${c.id === f.cat ? ' selected' : ''}>${esc(c.emoji)} ${esc(c.name)}</option>`).join('')}</select></div>
    <div class="field"><span class="lab" id="smLab">결제수단</span><div class="chips" role="group" aria-labelledby="smLab">${cfg().methods.map(m => `<button class="chip" type="button" id="sm-${esc(m.id)}" data-act="s-method" data-id="${esc(m.id)}" ${pressed(f.method === m.id)}>${esc(m.name)}</button>`).join('')}</div></div>
    ${showRecord ? `<label class="check"><input type="checkbox" id="s-record"${f.recordNow ? ' checked' : ''}><span>${diffDays(occ, t) === 0 ? '오늘' : mdLabel(occ)} 결제분도 지금 내역에 기록하기</span></label>` : ''}
    ${isEdit ? `<div class="switch-row"><div><span class="card-t">사용 중</span><p>끄면 결제일이 와도 기록하지 않아요.</p></div><button class="switch" type="button" role="switch" id="s-active" aria-checked="${f.active}" data-act="s-active" aria-label="사용 중"></button></div>` : ''}
    <div class="sheet-actions">${isEdit ? `<button class="btn btn-danger" type="button" data-act="s-delete">${icon('trash')}삭제</button>` : ''}<button class="btn btn-primary btn-block" type="submit" id="s-save" ${canSaveSub() ? '' : 'disabled'}>${isEdit ? '고친 내용 저장' : '추가하기'}</button></div>
  </form>`;
}
function saveSub() {
  const f = F;
  if (!canSaveSub()) return;
  const t = todayStr(), id = f.id || uid('s'), prev = f.id ? S.subs[f.id] : null;
  let since = isYmd(f.since) ? f.since : t;
  if (!f.id) {
    const occ = curPeriodOcc(f);
    since = occ > t ? t : (f.recordNow && cfg().autoSubs ? occ : addDays(t, 1));
  } else if (prev && prev.active === false && f.active && since < t) since = t; // resumed: no backfill for the paused stretch
  const sub = { name: f.name.trim().slice(0, 30), emoji: firstGrapheme(f.emoji), amount: f.amount, cycle: f.cycle, day: f.day, month: f.month, cat: f.cat, method: f.method, since, active: f.active, ex: !!f.ex, type: f.type === 'bill' ? 'bill' : 'sub', skips: (prev && prev.skips) || {} };
  writeSubs({ [id]: sub });
  closeSheet();
  toast(f.id ? '고쳤어요' : `‘${sub.name}’${josa(sub.name,'을/를').slice(-1)} 추가했어요`);
  autoRecord();
}
function deleteSub() {
  const f = F, prev = S.subs[f.id];
  closeSheet();
  if (!prev) return;
  writeSubs({ [f.id]: null });
  toast('구독을 지웠어요. 지난 기록은 내역에 남아요', { undo: () => writeSubs({ [f.id]: prev }) });
}

/* ---------- budget sheet ---------- */
function openBudgetSheet() {
  if (S.mode === 'denied') return;
  const b = cfg().budget;
  const cats = {};
  for (const c of catsOf('out')) if (+b.cats[c.id] > 0) cats[c.id] = +b.cats[c.id];
  F = { mode: 'budget', total: b.total || 0, cats };
  showSheet(budgetSheet(), '#b-total');
}
const budCatSum = () => sum(catsOf('out').map(c => +F.cats[c.id] || 0));
function budHint() {
  const cs = budCatSum();
  if (!F.total && cs) return `비워 두면 카테고리 예산 합계 ${won(cs)}을 전체 예산으로 써요`;
  if (F.total && cs > F.total) return `카테고리 예산 합계(${won(cs)})가 전체 예산보다 커요`;
  if (F.total) return koreanWon(F.total);
  return '전체 예산만 정해도 괜찮아요';
}
function budgetSheet() {
  const f = F, cs = budCatSum();
  return `<form id="budForm" autocomplete="off" novalidate>
    <div class="sheet-h"><h2 id="sheetTitle">예산 편집</h2><button class="icon-btn" type="button" data-act="close" aria-label="닫기">${icon('x')}</button></div>
    <div class="field"><label class="lab" for="b-total">한 달 전체 예산</label><div class="amt"><input id="b-total" inputmode="numeric" placeholder="${cs ? fmt(cs) : '0'}" value="${f.total ? fmt(f.total) : ''}" aria-describedby="bHint"><span>원</span></div><p class="amt-hint" id="bHint">${budHint()}</p></div>
    <div class="field"><span class="lab">카테고리별 예산 <span class="muted" style="font-weight:400">· 필요한 곳만</span></span>
      <div class="b-grid">${catsOf('out').map(c => `<label class="b-item" for="b-${esc(c.id)}"><span class="emo" aria-hidden="true"${ccStyle(c)}>${esc(c.emoji)}</span><span>${esc(c.name)}</span><input class="input" id="b-${esc(c.id)}" data-bcat="${esc(c.id)}" inputmode="numeric" placeholder="없음" value="${f.cats[c.id] ? fmt(f.cats[c.id]) : ''}"></label>`).join('')}</div></div>
    <div class="sheet-actions"><button class="btn btn-primary btn-block" type="submit">저장하기</button></div>
  </form>`;
}
function saveBudget() {
  const cats = {};
  for (const [k, v] of Object.entries(F.cats)) if (+v > 0) cats[k] = +v;
  saveSettings({ ...cfg(), budget: { total: F.total > 0 ? F.total : 0, cats }, budgetEx: false });
  closeSheet();
  toast('예산을 저장했어요');
}

/* ================= AI assistant (asks Claude through the page's `sample` capability) ================= */
let sampleFn = null, aiCtl = null;
S.aiLog = []; S.aiBusy = false; S.aiDraft = '';
const aiOn = () => !!sampleFn && S.mode !== 'denied';
async function initAi() {
  try { sampleFn = await window.claude.use('sample'); } catch (e) { sampleFn = null; }
  renderChrome();
}
const AI_RULES = `너는 가계부 앱 '꼬박꼬박 가계부' 안에 있는 도우미야. 사용자의 요청을 읽고 가계부 기록을 추가·수정·삭제하거나 질문에 답해.
반드시 JSON 객체 하나로만 답해: {"reply": "사용자에게 보여 줄 짧은 한국어 답(존댓말, 1~3문장)", "actions": [ ... ]}
actions에 넣을 수 있는 것:
- {"type":"add_tx","date":"YYYY-MM-DD","kind":"out 또는 in","amount":정수,"cat":"카테고리 id","memo":"내용","method":"결제수단 id"}
- {"type":"update_tx","id":"기록 id", 바꿀 필드만 (date, kind, amount, cat, memo, method)}
- {"type":"delete_tx","id":"기록 id"}
- {"type":"add_sub","name":"이름","amount":정수,"cycle":"month 또는 year","day":1~31,"month":1~12(매년일 때),"cat":"카테고리 id","method":"결제수단 id"}
- {"type":"update_sub","id":"구독 id", 바꿀 필드만 (name, amount, cycle, day, month, cat, method, active)}
- {"type":"delete_sub","id":"구독 id"}
- {"type":"add_deposit","goal":"모으기 목표 id","amount":정수(뺄 때는 음수),"date":"YYYY-MM-DD","memo":"메모"}
- {"type":"set_budget","total":정수(0이면 전체 예산 없음, 바꾸지 않으면 생략),"cats":{"카테고리 id":정수(0이면 그 예산 삭제)}}
규칙:
- 금액은 원 단위 정수야. '9천'은 9000, '1.5만'은 15000, '3만 5천'은 35000.
- '오늘', '어제', '지난 금요일' 같은 날짜는 아래 오늘 날짜를 기준으로 바꿔. 날짜 말이 없으면 오늘이야.
- 카테고리와 결제수단은 아래 목록의 id만 써. 결제수단을 말하지 않았으면 method는 빼. 수입에는 method를 넣지 마.
- 기록이나 구독을 고치거나 지울 때는 아래 목록에 있는 id를 그대로 써. 해당하는 것을 못 찾거나 여러 개라 헷갈리면 actions는 비우고 reply로 되물어.
- 질문만 했으면 actions는 []로 두고 아래 합계 숫자를 그대로 써서 답해. 직접 더하기보다 제공된 합계를 우선 써.
- 사용자가 요청하지 않은 변경은 하지 마.`;
function aiContext() {
  const t = todayStr(), curYm = ymOf(t), c = cfg(), L = [];
  L.push(`오늘: ${t} (${DOW[parseD(t).getDay()]}요일). 사용자가 보고 있는 달: ${S.ym}`);
  L.push('카테고리 (id: 이름/구분): ' + c.cats.map(x => `${x.id}: ${x.name}/${x.kind === 'in' ? '수입' : '지출'}`).join(', '));
  L.push('결제수단 (id: 이름): ' + (c.methods.map(m => `${m.id}: ${m.name}`).join(', ') || '없음'));
  const bc = Object.entries(c.budget.cats).filter(([, v]) => +v > 0).map(([k, v]) => `${catOf(k).name}(${k}) ${v}`);
  L.push(`예산: 전체 ${c.budget.total || '따로 없음'}${bc.length ? ', 카테고리별 ' + bc.join(', ') : ''}`);
  const subs = subsArr();
  L.push('구독 (id | 이름 | 금액 | 주기 | 카테고리 | 결제수단 | 상태):');
  L.push(subs.length ? subs.map(s => `${s.id} | ${s.name} | ${s.amount} | ${cycleText(s)} | ${s.cat} | ${s.method || '-'} | ${s.active ? '사용 중' : '일시정지'}`).join('\n') : '(없음)');
  const loans = loansArr();
  L.push('대출 (이름 | 원금 | 연이율% | 상환방식 | 남은 원금 | 이번 달 납입액 | 그중 이자 | 지금까지 낸 이자 | 앞으로 낼 이자 | 만기):');
  L.push(loans.length ? loans.map(l => { const s = loanStats(l); return `${l.name} | ${s.B0} | ${l.rate} | ${LOAN_TYPES[l.type]} | ${s.remaining} | ${s.thisMonth ? s.thisMonth.pay : 0} | ${s.thisMonth ? s.thisMonth.int : 0} | ${s.paidInt} | ${s.restInt} | ${s.end}`; }).join('\n') + '\n(대출 자체를 고치는 action은 없어. 대출 수정은 대출 화면의 고치기를 쓰라고 안내해.)' : '(없음)');
  const gl = goalsArr();
  L.push('모으기 목표 (id | 이름 | 종류 | 모은 돈 | 목표 금액 | 오늘까지 계획 | 목표일·만기 | 적금 세후 이자):');
  L.push(gl.length ? gl.map(g => { const s = goalStats(g); return `${g.id} | ${g.name} | ${g.kind === 'saving' ? `정기적금 매월 ${g.monthly}` : '자유 모으기'} | ${s.saved} | ${s.target} | ${s.plan} | ${s.end} | ${s.net || 0}`; }).join('\n') : '(없음)');
  const months = Object.keys(S.months).filter(ym => txsOf(ym).length).sort();
  L.push('월별 합계 (원):');
  for (const ym of months) {
    const list = txsOf(ym), tt = totals(list), by = {};
    for (const x of list) if (x.kind === 'out') by[x.cat] = (by[x.cat] || 0) + x.amount;
    L.push(`${ym}: 수입 ${tt.in}, 지출 ${tt.out}, 카테고리별 지출 ${Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${catOf(k).name} ${v}`).join(', ') || '없음'}`);
  }
  const from = [addMonths(curYm, -2), S.ym].sort()[0];
  const recent = months.filter(ym => ym >= from).flatMap(txsOf).sort(byRecent).slice(0, 400);
  L.push('기록 (최신순; id | 날짜 | 구분 | 금액 | 카테고리 | 내용 | 결제수단):');
  L.push(recent.length ? recent.map(x => `${x.id} | ${x.date} | ${x.kind === 'in' ? '수입' : x.kind === 'move' ? '이체' : '지출'} | ${x.amount} | ${x.cat} | ${x.memo || '-'} | ${x.method || '-'}`).join('\n') : '(없음)');
  return L.join('\n');
}
const toInt = v => { const n = Math.round(Number(String(v == null ? '' : v).replace(/[^\d.-]/g, ''))); return Number.isFinite(n) ? n : NaN; };
const aiCat = (id, kind, fallback) => { const x = cfg().cats.find(c => c.id === String(id || '') && c.kind === kind); return x ? x.id : fallback; };
const aiMethod = (id, fallback) => (id != null && methodOf(String(id)) ? String(id) : fallback);
const txLabel = x => `${mdLabel(x.date)} ${x.memo || catOf(x.cat).name} ${signed(x.amount, x.kind)}`;
function applyAiActions(actions) {
  const changes = [], problems = [], undo = [];
  const putTx = (ym, id, val) => {
    const prev = S.months[ym] && id in S.months[ym] ? S.months[ym][id] : null;
    undo.push({ k: 'tx', ym, id, prev });
    writeMonth(ym, { [id]: val });
  };
  const putSub = (id, val) => { undo.push({ k: 'sub', id, prev: S.subs[id] || null }); writeSubs({ [id]: val }); };
  let subsAdded = false;
  for (const a of actions) {
    if (!a || typeof a !== 'object') continue;
    try {
      if (a.type === 'add_tx') {
        const kind = a.kind === 'in' ? 'in' : 'out', amount = toInt(a.amount), date = isYmd(a.date) ? a.date : todayStr();
        if (!(amount > 0)) throw new Error('금액을 알 수 없어 기록하지 않았어요');
        const tx = makeTx({ date, kind, amount, cat: aiCat(a.cat, kind, lastCat(kind)), memo: a.memo, method: kind === 'out' ? aiMethod(a.method, lastMethod()) : '' });
        putTx(ymOf(date), uid('t'), tx);
        changes.push('추가 · ' + txLabel(tx));
      } else if (a.type === 'update_tx' || a.type === 'delete_tx') {
        const hit = findTx(String(a.id || ''));
        if (!hit) throw new Error('고칠 기록을 찾지 못했어요');
        const id = String(a.id);
        if (a.type === 'delete_tx') { putTx(hit.ym, id, null); changes.push('삭제 · ' + txLabel(hit.t)); continue; }
        const kind = a.kind === 'in' || a.kind === 'out' ? a.kind : hit.t.kind;
        const amount = a.amount != null ? toInt(a.amount) : hit.t.amount;
        if (!(amount > 0)) throw new Error('금액을 알 수 없어 고치지 않았어요');
        const date = isYmd(a.date) ? a.date : hit.t.date;
        const tx = makeTx({ ...hit.t, kind, amount, date, cat: a.cat != null ? aiCat(a.cat, kind, hit.t.cat) : aiCat(hit.t.cat, kind, lastCat(kind)), memo: a.memo != null ? a.memo : hit.t.memo, method: kind === 'out' ? aiMethod(a.method, hit.t.method || lastMethod()) : '' });
        if (ymOf(date) !== hit.ym) putTx(hit.ym, id, null);
        putTx(ymOf(date), id, tx);
        changes.push('수정 · ' + txLabel(tx));
      } else if (a.type === 'add_sub') {
        const amount = toInt(a.amount), name = String(a.name || '').trim().slice(0, 30);
        if (!name || !(amount > 0)) throw new Error('구독 이름이나 금액을 알 수 없어 추가하지 않았어요');
        const sub = { name, emoji: '', amount, cycle: a.cycle === 'year' ? 'year' : 'month', day: Math.min(31, Math.max(1, toInt(a.day) || +todayStr().slice(8))), month: Math.min(12, Math.max(1, toInt(a.month) || +todayStr().slice(5, 7))), cat: aiCat(a.cat, 'out', (catsOf('out').find(c => c.id === 'subs') || catsOf('out')[0] || UNKNOWN_CAT).id), method: aiMethod(a.method, lastMethod()), active: true, ex: false };
        const t = todayStr(), occ = curPeriodOcc(sub);
        sub.since = occ > t ? t : addDays(t, 1); // from the next payment on; earlier ones can be added as records
        putSub(uid('s'), sub); subsAdded = true;
        changes.push(`구독 추가 · ${name} ${cycleText(sub)} ${won(amount)}`);
      } else if (a.type === 'update_sub' || a.type === 'delete_sub') {
        const id = String(a.id || ''), cur = S.subs[id];
        if (!cur) throw new Error('해당 구독을 찾지 못했어요');
        if (a.type === 'delete_sub') { putSub(id, null); changes.push(`구독 삭제 · ${cur.name}`); continue; }
        const next = { ...cur };
        if (a.name != null && String(a.name).trim()) next.name = String(a.name).trim().slice(0, 30);
        if (a.amount != null) { const n = toInt(a.amount); if (n > 0) next.amount = n; }
        if (a.cycle === 'month' || a.cycle === 'year') next.cycle = a.cycle;
        if (a.day != null && toInt(a.day) >= 1) next.day = Math.min(31, toInt(a.day));
        if (a.month != null && toInt(a.month) >= 1) next.month = Math.min(12, toInt(a.month));
        if (a.cat != null) next.cat = aiCat(a.cat, 'out', cur.cat);
        if (a.method != null) next.method = aiMethod(a.method, cur.method);
        if (typeof a.active === 'boolean') { if (a.active && !cur.active && next.since < todayStr()) next.since = todayStr(); next.active = a.active; }
        putSub(id, next); subsAdded = subsAdded || next.active;
        changes.push(`구독 수정 · ${next.name} ${cycleText(next)} ${won(next.amount)}${next.active ? '' : ' (일시정지)'}`);
      } else if (a.type === 'add_deposit') {
        const gid = String(a.goal || ''), g = S.goals[gid], amount = toInt(a.amount);
        if (!g) throw new Error('모으기 목표를 찾지 못했어요');
        if (!amount) throw new Error('금액을 알 수 없어 기록하지 않았어요');
        const did = uid('d'), date = isYmd(a.date) ? a.date : todayStr();
        undo.push({ k: 'dep', gid, id: did });
        writeGoals({ [gid]: { deposits: { [did]: { date, amount, memo: String(a.memo || '').slice(0, 30), auto: false, at: Date.now() } } } });
        changes.push(`모으기 · ${g.name} ${amount > 0 ? '+' : '−'}${won(Math.abs(amount))}`);
      } else if (a.type === 'set_budget') {
        const st = cfg(), bud = { total: st.budget.total, cats: { ...st.budget.cats } }, bits = [];
        if (a.total != null) { const n = toInt(a.total); if (n >= 0) { bud.total = n; bits.push(n ? `전체 ${won(n)}` : '전체 예산 없음'); } }
        if (a.cats && typeof a.cats === 'object') for (const [k, v] of Object.entries(a.cats)) {
          const id = aiCat(k, 'out', null), n = toInt(v);
          if (!id || !(n >= 0)) continue;
          if (n) bud.cats[id] = n; else delete bud.cats[id];
          bits.push(`${catOf(id).name} ${n ? won(n) : '없음'}`);
        }
        if (!bits.length) throw new Error('바꿀 예산을 알 수 없었어요');
        undo.push({ k: 'settings', prev: clone(st) });
        saveSettings({ ...st, budget: bud, budgetEx: false });
        changes.push('예산 · ' + bits.join(', '));
      }
    } catch (err) { problems.push(err.message); }
  }
  if (subsAdded) autoRecord();
  return { changes, problems, undo };
}
function undoAi(i) {
  const m = S.aiLog[i];
  if (!m || !m.undo) return;
  const months = {}, subs = {};
  let settings = null;
  for (const u of [...m.undo].reverse()) {
    if (u.k === 'tx') (months[u.ym] ||= {})[u.id] = u.prev;
    else if (u.k === 'sub') subs[u.id] = u.prev;
    else if (u.k === 'settings') settings = u.prev;
    else if (u.k === 'dep') writeGoals({ [u.gid]: { deposits: { [u.id]: null } } });
  }
  for (const ym in months) writeMonth(ym, months[ym]);
  if (Object.keys(subs).length) writeSubs(subs);
  if (settings) saveSettings(settings);
  m.undo = null; m.undone = true;
  renderAi();
}
const AI_EXAMPLES = ['어제 점심 9천원 체크카드로 적어 줘', '이번 달 카페에 얼마 썼어?', '식비 예산 30만 원으로 정해 줘', '넷플릭스가 17,000원으로 올랐어'];
function aiSheet() {
  const log = S.aiLog.map((m, i) => m.role === 'user'
    ? `<div class="ai-msg me"><p class="ai-t">${esc(m.text)}</p></div>`
    : `<div class="ai-msg bot${m.err ? ' err' : ''}"><p class="ai-t">${esc(m.text)}</p>${(m.changes && m.changes.length) || (m.problems && m.problems.length) ? `<ul class="ai-changes">${(m.changes || []).map(c => `<li>${esc(c)}</li>`).join('')}${(m.problems || []).map(c => `<li class="bad">${esc(c)}</li>`).join('')}</ul>` : ''}${m.undo ? `<div class="ai-foot"><button class="btn btn-soft btn-sm" type="button" id="aiu-${i}" data-act="ai-undo" data-i="${i}">되돌리기</button></div>` : m.undone ? '<p class="ai-note">되돌렸어요</p>' : ''}</div>`).join('');
  const intro = `<div class="ai-intro"><p>평소 말투로 부탁하면 가계부에 바로 반영해요. 바뀐 내용은 <b>되돌리기</b>로 취소할 수 있어요.</p><div class="chips">${AI_EXAMPLES.map(x => `<button class="chip ai-ex" type="button" data-act="ai-ex" data-q="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>`;
  return `<form id="aiForm" autocomplete="off" novalidate>
    <div class="sheet-h"><h2 id="sheetTitle">AI에게 부탁하기</h2><button class="icon-btn" type="button" data-act="close" aria-label="닫기">${icon('x')}</button></div>
    <div class="ai-log" id="aiLog" aria-live="polite">${log || intro}${S.aiBusy ? '<div class="ai-msg bot thinking"><p class="ai-t">가계부를 살펴보는 중이에요…</p></div>' : ''}</div>
    <div class="ai-input"><label class="sr-only" for="ai-q">부탁할 내용</label><input class="input" id="ai-q" maxlength="300" placeholder="예: 어제 점심 9천원 체크카드로 적어 줘" value="${esc(S.aiDraft)}">${S.aiBusy ? '<button class="btn btn-soft" type="button" id="ai-stop" data-act="ai-stop">멈추기</button>' : '<button class="btn btn-primary" type="submit" id="ai-send">보내기</button>'}</div>
    <p class="ai-note">부탁할 때마다 내 Claude 사용량이 조금 쓰여요.</p>
  </form>`;
}
function renderAi() {
  if (!F || F.mode !== 'ai') return;
  rerenderSheet(aiSheet());
  const log = $('#aiLog'); if (log) log.scrollTop = log.scrollHeight;
}
function openAiSheet() {
  if (!aiOn()) return;
  F = { mode: 'ai' };
  showSheet(aiSheet(), '#ai-q');
  const log = $('#aiLog'); if (log) log.scrollTop = log.scrollHeight;
}
async function askAi(q) {
  q = String(q || '').trim();
  if (!q || S.aiBusy || !sampleFn) return;
  const history = S.aiLog.filter(m => !m.err).slice(-8);
  S.aiLog.push({ role: 'user', text: q });
  S.aiBusy = true; S.aiDraft = '';
  renderAi();
  const turns = [{ role: 'user', content: AI_RULES }];
  for (const m of history) turns.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.role === 'user' ? m.text : JSON.stringify({ reply: m.text, done: m.changes || [] }) });
  turns.push({ role: 'user', content: `${aiContext()}\n\n요청: ${q}` });
  aiCtl = new AbortController();
  try {
    const res = await sampleFn.json(turns, { signal: aiCtl.signal, cache: false });
    const actions = Array.isArray(res && res.actions) ? res.actions.slice(0, 40) : [];
    const { changes, problems, undo } = applyAiActions(actions);
    const reply = res && typeof res.reply === 'string' && res.reply.trim() ? res.reply.trim() : changes.length ? '반영했어요.' : '무엇을 할지 잘 모르겠어요. 조금만 더 자세히 말해 주세요.';
    S.aiLog.push({ role: 'bot', text: reply, changes, problems, undo: undo.length ? undo : null });
  } catch (e) {
    const code = e && e.code;
    let msg;
    if (code === 'cancelled') msg = '멈췄어요.';
    else if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(code)) { msg = '이 가계부에서 Claude를 쓸 수 없는 상태예요. 다음에 열 때 Claude 사용을 허용하면 쓸 수 있어요.'; sampleFn = null; renderChrome(); }
    else if (code === 'rate_limited') msg = '지금은 요청이 많아요. 조금 뒤에 다시 보내 주세요.';
    else if (code === 'session_expired') msg = '로그인이 만료됐어요. 다시 로그인한 뒤 보내 주세요.';
    else if (code === 'invalid_json') msg = '답을 제대로 읽지 못했어요. 한 번 더 보내 주세요.';
    else if (code === 'refused') msg = '이 요청은 처리할 수 없어요. 다르게 말해 주세요.';
    else msg = '연결이 잠깐 끊겼어요. 다시 보내 주세요.';
    S.aiLog.push({ role: 'bot', text: msg, err: true });
  } finally {
    S.aiBusy = false; aiCtl = null;
    renderAi();
  }
}

/* ================= loans ================= */
const LOAN_TYPES = { equal: '원리금균등', principal: '원금균등', bullet: '만기일시' };
function loansArr() {
  const a = [];
  for (const id in S.loans) { const l = S.loans[id]; if (l && l.name != null) a.push({ ...l, id }); }
  return a.sort((x, y) => (x.start < y.start ? -1 : 1));
}
// monthly repayment schedule: installment k falls k months after the loan start, on the payment day
function loanSchedule(l) {
  const n = Math.max(1, Math.min(600, l.term | 0)), r = Math.max(0, +l.rate || 0) / 100 / 12, B0 = Math.max(0, Math.round(+l.principal || 0));
  const sy = +String(l.start).slice(0, 4), sm = +String(l.start).slice(5, 7);
  const pmt = l.type === 'equal' ? (+l.fixedPay > 0 ? Math.round(+l.fixedPay) : r ? (B0 * r) / (1 - Math.pow(1 + r, -n)) : B0 / n) : 0;
  const fixedInt = l.type === 'bullet' && +l.fixedInt > 0 ? Math.round(+l.fixedInt) : null;
  const out = [];
  let bal = B0;
  for (let k = 1; k <= n; k++) {
    const idx = sm - 1 + k, y = sy + Math.floor(idx / 12), m = (idx % 12) + 1;
    const int = fixedInt != null ? fixedInt : Math.round(bal * r);
    let prin = l.type === 'equal' ? Math.round(pmt) - int : l.type === 'principal' ? Math.round(B0 / n) : 0;
    if (k === n && !l.open) prin = bal;
    prin = Math.max(0, Math.min(prin, bal));
    bal -= prin;
    out.push({ k, date: occOn({ day: l.day }, y, m), int, prin, pay: int + prin, bal });
  }
  return out;
}
function loanStats(l) {
  const t = todayStr(), rows = loanSchedule(l), B0 = Math.round(+l.principal || 0);
  const paid = rows.filter(r => r.date <= t), rest = rows.filter(r => r.date > t);
  const curYm = ymOf(t);
  return {
    rows, paid, rest, B0,
    remaining: paid.length ? paid[paid.length - 1].bal : B0,
    next: rest[0] || null,
    thisMonth: rows.find(r => ymOf(r.date) === curYm) || null,
    paidInt: sum(paid.map(r => r.int)), restInt: sum((l.open ? rest.slice(0, 12) : rest).map(r => r.int)),
    end: rows[rows.length - 1].date,
  };
}
function writeLoans(patch) {
  S.loans = { ...S.loans, ...patch };
  scheduleRender();
  if (!S.db) return Promise.resolve();
  const ref = S.db.doc('meta/loans');
  return track(enqueue('meta/loans', async () => {
    try { await retry(() => ref.update({ items: patch })); }
    catch (e) {
      if (e && e.code === 'invalid_argument' && !S.loansDoc) await retry(() => ref.set({ items: patch }));
      else throw e;
    }
    S.loansDoc = true;
  }));
}
function ensureLoanCat() {
  const st = cfg();
  if (!st.cats.some(c => c.id === 'loan')) saveSettings({ ...st, cats: [...st.cats, LOAN_CAT] });
}
function vLoans() {
  const head = `<div class="view-h"><h1 class="view-title">대출</h1><div class="view-acts">${vAssetsSwitch('loans')}<button class="btn btn-primary btn-sm" type="button" data-act="add-loan" ${S.mode === 'denied' ? 'disabled' : ''}>${icon('plus')}대출 추가</button></div></div>`;
  if (isLoading()) return head + `<section class="card">${emptyBox('불러오는 중이에요', '')}</section>`;
  const loans = loansArr();
  if (!loans.length) return head + `<section class="card">${emptyBox('등록된 대출이 없어요', '지금 남은 원금과 매달 내는 이자만 넣으면 돼요. 정기결제 목록과 달력에 바로 올라가고 내는 날에 자동으로 기록해 드려요.', `<button class="btn btn-primary btn-sm" type="button" data-act="add-loan">${icon('plus')}대출 추가</button>`)}</section>`;
  const t = todayStr();
  const stats = loans.map(l => ({ l, s: loanStats(l) }));
  const active = stats.filter(x => x.s.remaining > 0);
  const rem = sum(active.map(x => x.s.remaining));
  const monthPay = sum(stats.map(x => (x.s.thisMonth ? x.s.thisMonth.pay : 0)));
  const monthInt = sum(stats.map(x => (x.s.thisMonth ? x.s.thisMonth.int : 0)));
  const summary = `<section class="card loan-sum">
    <span class="hero-label">남은 대출 원금</span>
    <p class="hero-num">${fmt(rem)}<span class="u">원</span></p>
    <span class="muted" style="font-size:13.5px">${active.length}건 상환 중${stats.length > active.length ? ` · ${stats.length - active.length}건 다 갚음` : ''}</span>
    <div class="stat-grid">
      <div><span class="stat-l">이번 달 갚을 돈</span><span class="stat-v">${won(monthPay)}</span></div>
      <div><span class="stat-l">그중 이자</span><span class="stat-v">${won(monthInt)}</span></div>
      <div><span class="stat-l">지금까지 낸 이자</span><span class="stat-v">${won(sum(stats.map(x => x.s.paidInt)))}</span></div>
      <div><span class="stat-l">앞으로 낼 이자</span><span class="stat-v">${won(sum(stats.map(x => x.s.restInt)))}</span></div>
    </div>
  </section>`;
  const cards = stats.map(({ l, s }) => {
    const pct = s.B0 ? (s.B0 - s.remaining) / s.B0 : 0;
    const nx = s.next;
    const meta = [l.lender, `연 ${(+l.rate).toLocaleString('ko-KR', { maximumFractionDigits: l.entry === 'quick' ? 2 : 3 })}%`, l.open ? '이자만 내는 중' : LOAN_TYPES[l.type] || '', `매월 ${l.day}일`].filter(Boolean).join(' · ');
    return `<section class="card loan-card">
      <div class="loan-top"><span class="emo" aria-hidden="true">${icon('bank')}</span><div style="min-width:0"><p class="loan-name">${esc(l.name)}${l.ex ? '<span class="tag">예시</span>' : ''}</p><p class="loan-meta">${esc(meta)}</p></div><button class="btn btn-ghost btn-sm" type="button" data-act="edit-loan" data-id="${esc(l.id)}">고치기</button></div>
      <div class="loan-prog">
        <div class="row"><span>원금 <b>${Math.round(pct * 100)}%</b> 갚음</span><span>남은 원금 <b>${won(s.remaining)}</b> / ${won(s.B0)}</span></div>
        ${meter(pct, '', true)}
        ${l.open ? '<p class="bud-left">매달 이자만 내고 있어요. 만기를 알게 되면 ‘고치기’에서 넣어 주세요.</p>' : ''}
        ${l.type === 'bullet' && !l.open && s.remaining > 0 ? `<p class="bud-left">만기일(${mdLabel(s.end)}, ${s.end.slice(0, 4)}년)에 원금을 한 번에 갚는 방식이에요.</p>` : ''}
      </div>
      <div class="loan-facts">
        <div><span class="stat-l">다음 납입 ${nx ? `· ${ddayText(nx.date)}` : ''}</span><span class="stat-v">${nx ? won(nx.pay) : '다 갚았어요'}</span>${nx ? `<span class="sub">${mdw(nx.date)} · 원금 ${fmt(nx.prin)} + 이자 ${fmt(nx.int)}</span>` : ''}</div>
        ${l.open ? `<div><span class="stat-l">1년이면 내는 이자</span><span class="stat-v">${won(s.restInt)}</span><span class="sub">매달 ${fmt(nx ? nx.int : 0)}원 × 12</span></div>
        <div><span class="stat-l">만기</span><span class="stat-v">정하지 않음</span><span class="sub">이자만 내는 중</span></div>` : `<div><span class="stat-l">이자 합계</span><span class="stat-v">${won(s.paidInt + s.restInt)}</span><span class="sub">낸 이자 ${fmt(s.paidInt)} · 남은 이자 ${fmt(s.restInt)}</span></div>
        <div><span class="stat-l">만기</span><span class="stat-v">${s.end.replace(/-/g, '.')}</span><span class="sub">남은 ${s.rest.length}회 / 전체 ${s.rows.length}회</span></div>`}
        <div><span class="stat-l">결제수단 · 자동 기록</span><span class="stat-v" style="font-size:14.5px">${esc((methodOf(l.method) || {}).name || '없음')}</span><span class="sub">${l.auto ? '납입일에 내역에 자동 기록' : '자동 기록 꺼짐'}</span></div>
      </div>
      <div class="loan-acts"><button class="btn btn-soft btn-sm" type="button" data-act="loan-sched" data-id="${esc(l.id)}">상환 일정 보기</button></div>
    </section>`;
  }).join('');
  return head + `${summary}${cards}<p class="set-note muted" style="font-size:12.5px">이자는 매달 남은 원금 × 연 이자율 ÷ 12로 계산해요. 금리가 바뀌거나 중도에 갚았다면 ‘고치기’에서 원금과 금리를 지금 기준으로 바꿔 주세요.</p>`;
}
function openLoanSheet(id, opt = {}) {
  if (S.mode === 'denied') return;
  const l = id && S.loans[id], t = todayStr();
  if ((!l && !opt.detail) || (l && l.entry === 'quick')) { F = quickF(l, id, opt.prefill); showSheet(quickLoanSheet(), l ? null : '#q-name'); return; }
  F = l
    ? { mode: 'loan', id, name: l.name || '', lender: l.lender || '', principal: l.principal || 0, rate: String(l.rate ?? ''), start: l.start || t, term: l.term || 12, type: l.type || 'equal', day: l.day || 1, method: l.method || '', auto: l.auto !== false, ex: !!l.ex, since: l.since || t, recordNow: false }
    : { mode: 'loan', id: null, name: '', lender: '', principal: 0, rate: '', start: t, term: 24, type: 'equal', day: +t.slice(8), method: (cfg().methods.find(m => /이체|계좌/.test(m.name)) || {}).id || lastMethod(), auto: true, ex: false, since: t, recordNow: false };
  showSheet(loanSheet(), l ? null : '#l-name');
}
const canSaveLoan = () => !!(F && F.name.trim() && F.principal > 0 && isYmd(F.start) && F.term >= 1 && F.rate !== '' && +F.rate >= 0 && +F.rate < 100);
function loanPreview() {
  if (!canSaveLoan()) return '원금, 이자율, 기간을 넣으면 매달 갚을 돈을 계산해 드려요.';
  const s = loanStats({ ...F, rate: +F.rate });
  const first = s.rows[0], total = sum(s.rows.map(r => r.int));
  const per = F.type === 'principal' ? `첫 달 ${won(first.pay)}부터 조금씩 줄어요` : F.type === 'bullet' ? `매달 이자 ${won(first.int)}, 만기에 원금 ${won(F.principal)}` : `매달 ${won(first.pay)}`;
  return `${per} · 총 이자 ${won(total)} · 만기 ${s.end.replace(/-/g, '.')}`;
}
function loanSheet() {
  const f = F, isEdit = !!f.id, t = todayStr();
  const cur = loanSchedule({ ...f, rate: +f.rate || 0 }).find(r => ymOf(r.date) === ymOf(t));
  const showRecord = !isEdit && f.auto && cur && cur.date <= t;
  return `<form id="loanForm" autocomplete="off" novalidate>
    <div class="sheet-h"><h2 id="sheetTitle">${isEdit ? '대출 고치기' : '대출 추가'}</h2><button class="icon-btn" type="button" data-act="close" aria-label="닫기">${icon('x')}</button></div>
    ${isEdit ? '' : '<div class="seg" role="group" aria-label="입력 방식" style="width:100%"><button type="button" id="lq-quick" data-act="l-qmode2" aria-pressed="false">간편 입력</button><button type="button" id="lq-detail" aria-pressed="true">자세히 입력</button></div>'}
    <div class="field-row"><div class="field"><label class="lab" for="l-name">이름</label><input class="input" id="l-name" maxlength="30" placeholder="예: 전세자금대출" value="${esc(f.name)}"></div><div class="field"><label class="lab" for="l-lender">금융기관 <span class="muted" style="font-weight:400">(선택)</span></label><input class="input" id="l-lender" maxlength="20" placeholder="예: ○○은행" value="${esc(f.lender)}"></div></div>
    <div class="field"><label class="lab" for="l-principal">대출 원금</label><div class="amt"><input id="l-principal" inputmode="numeric" placeholder="0" value="${f.principal ? fmt(f.principal) : ''}"><span>원</span></div><p class="amt-hint" id="lpHint">${f.principal >= 1e4 ? koreanWon(f.principal) : ''}</p></div>
    <div class="field-row"><div class="field"><label class="lab" for="l-rate">연 이자율 (%)</label><input class="input" id="l-rate" inputmode="decimal" placeholder="예: 4.2" value="${esc(f.rate)}"></div><div class="field"><label class="lab" for="l-term">기간 (개월)</label><input class="input" id="l-term" inputmode="numeric" placeholder="예: 24" value="${f.term || ''}"></div></div>
    <div class="field"><span class="lab" id="ltLab">상환 방식</span><div class="seg" role="group" aria-labelledby="ltLab" style="width:100%">${Object.entries(LOAN_TYPES).map(([k, v]) => `<button type="button" id="lt-${k}" data-act="l-type" data-v="${k}" ${pressed(f.type === k)}>${v}</button>`).join('')}</div>
      <p class="amt-hint">${f.type === 'equal' ? '매달 같은 금액(원금+이자)을 갚아요. 주택담보·신용대출에 흔해요.' : f.type === 'principal' ? '원금을 매달 똑같이 나눠 갚아요. 이자가 점점 줄어요.' : '매달 이자만 내고 만기에 원금을 한 번에 갚아요. 전세자금대출에 흔해요.'}</p></div>
    <div class="field-row"><div class="field"><label class="lab" for="l-start">대출 받은 날</label><input class="input" type="date" id="l-start" value="${f.start}"></div><div class="field"><label class="lab" for="l-day">매달 납입일</label><select class="input" id="l-day">${range(1, 31).map(d => `<option value="${d}"${d === f.day ? ' selected' : ''}>${d}일</option>`).join('')}</select></div></div>
    <p class="sheet-note" id="lPrev">${esc(loanPreview())}</p>
    <div class="field"><span class="lab" id="lmLab">결제수단</span><div class="chips" role="group" aria-labelledby="lmLab">${cfg().methods.map(m => `<button class="chip" type="button" id="lm-${esc(m.id)}" data-act="l-method" data-id="${esc(m.id)}" ${pressed(f.method === m.id)}>${esc(m.name)}</button>`).join('')}</div></div>
    <label class="check"><input type="checkbox" id="l-auto"${f.auto ? ' checked' : ''}><span>납입일이 되면 내역에 ‘대출 상환’ 지출로 자동 기록하기</span></label>
    ${showRecord ? `<label class="check"><input type="checkbox" id="l-record"${f.recordNow ? ' checked' : ''}><span>이번 달 ${mdLabel(cur.date)} 납입분(${won(cur.pay)})도 지금 기록하기</span></label>` : ''}
    <div class="sheet-actions">${isEdit ? `<button class="btn btn-danger" type="button" data-act="l-delete">${icon('trash')}삭제</button>` : ''}<button class="btn btn-primary btn-block" type="submit" id="l-save" ${canSaveLoan() ? '' : 'disabled'}>${isEdit ? '고친 내용 저장' : '추가하기'}</button></div>
  </form>`;
}
function refreshLoanSheet() {
  const p = $('#lPrev'); if (p) p.textContent = loanPreview();
  const s = $('#l-save'); if (s) s.disabled = !canSaveLoan();
}
function saveLoan() {
  if (F && F.quick) { saveQuickLoan(); return; }
  const f = F;
  if (!canSaveLoan()) return;
  const t = todayStr(), id = f.id || uid('l');
  let since = f.since;
  if (!f.id) {
    const cur = loanSchedule({ ...f, rate: +f.rate }).find(r => ymOf(r.date) === ymOf(t));
    since = cur && cur.date <= t && f.recordNow ? cur.date : addDays(t, cur && cur.date <= t ? 1 : 0);
  } else if (f.auto && S.loans[f.id] && !S.loans[f.id].auto && since < t) since = t;
  const loan = { name: f.name.trim().slice(0, 30), lender: f.lender.trim().slice(0, 20), principal: f.principal, rate: Math.round(+f.rate * 1000) / 1000, start: f.start, term: Math.min(600, Math.max(1, f.term | 0)), type: f.type, day: f.day, method: f.method, auto: f.auto, since, ex: !!f.ex, skips: (f.id && S.loans[f.id] && S.loans[f.id].skips) || {} };
  if (loan.auto) ensureLoanCat();
  writeLoans({ [id]: loan });
  closeSheet();
  toast(f.id ? '고쳤어요' : `‘${loan.name}’${josa(loan.name,'을/를').slice(-1)} 추가했어요`);
  autoRecord();
}
function deleteLoan() {
  const f = F, prev = S.loans[f.id];
  closeSheet();
  if (!prev) return;
  writeLoans({ [f.id]: null });
  toast('대출을 지웠어요. 지난 상환 기록은 내역에 남아요', { undo: () => writeLoans({ [f.id]: prev }) });
}
function openSchedule(id) {
  const l = S.loans[id];
  if (!l) return;
  const s = loanStats({ ...l, id }), t = todayStr();
  const rows = (l.open ? s.rows.filter(r => r.date <= addDays(t, 731)) : s.rows).map(r => `<tr class="${r.date <= t ? 'paid' : ''}${s.next && r.k === s.next.k ? ' now' : ''}"><td>${r.k}회</td><td>${r.date.slice(2).replace(/-/g, '.')}</td><td>${fmt(r.pay)}</td><td>${fmt(r.prin)}</td><td>${fmt(r.int)}</td><td>${fmt(r.bal)}</td></tr>`).join('');
  F = { mode: 'view' };
  showSheet(`<div style="display:grid;gap:14px">
    <div class="sheet-h"><h2 id="sheetTitle">${esc(l.name)} 상환 일정</h2><button class="icon-btn" type="button" data-act="close" aria-label="닫기">${icon('x')}</button></div>
    <p class="set-note">${l.open ? '만기를 정하지 않아서 앞으로 2년치만 보여 드려요' : `총 ${s.rows.length}회 · 총 이자 ${won(s.paidInt + s.restInt)}`} · 흐린 줄은 지난 회차, 색칠된 줄은 다음 회차예요.</p>
    <div class="tbl-wrap tall"><table class="tbl"><caption class="sr-only">${esc(l.name)} 회차별 상환 일정</caption><thead><tr><th scope="col">회차</th><th scope="col">날짜</th><th scope="col">납입액</th><th scope="col">원금</th><th scope="col">이자</th><th scope="col">남은 원금</th></tr></thead><tbody>${rows}</tbody></table></div>
  </div>`);
  const now = $('#sheet tr.now'); if (now) now.scrollIntoView({ block: 'center' });
}

/* ================= colour themes ================= */
const THEMES = [
  { id: 'forest', name: '숲', mode: 'auto', bg: '#F2F5F3', surface: '#FFFFFF', accent: '#0C7F57', ink: '#17201C', dk: ['#0E1311', '#161C19', '#34B382'] },
  { id: 'ocean', name: '바다', mode: 'auto', bg: '#F0F5F7', surface: '#FFFFFF', accent: '#0B6E8A', ink: '#17201C', dk: ['#0C1316', '#141C20', '#3CB4D3'] },
  { id: 'sunset', name: '노을', mode: 'auto', bg: '#F7F3F0', surface: '#FFFFFF', accent: '#B9461A', ink: '#17201C', dk: ['#15110F', '#1D1815', '#F58A55'] },
  { id: 'lavender', name: '라벤더', mode: 'auto', bg: '#F4F3F9', surface: '#FFFFFF', accent: '#6544C4', ink: '#17201C', dk: ['#111018', '#18171F', '#A68CF6'] },
  { id: 'blossom', name: '벚꽃', mode: 'auto', bg: '#F9F2F5', surface: '#FFFFFF', accent: '#B4245F', ink: '#17201C', dk: ['#161013', '#1E171A', '#F17AAE'] },
  { id: 'graphite', name: '먹', mode: 'auto', bg: '#F3F4F5', surface: '#FFFFFF', accent: '#374151', ink: '#17201C', dk: ['#0F1113', '#17191C', '#B8C2CF'] },
  { id: 'hanji', name: '한지', mode: 'light', bg: '#F1ECE2', surface: '#FBF8F2', accent: '#2E4A7D', ink: '#29241D' },
  { id: 'citrus', name: '감귤', mode: 'light', bg: '#FFF4E6', surface: '#FFFFFF', accent: '#B0500E', ink: '#2A1C10' },
  { id: 'sky', name: '하늘', mode: 'light', bg: '#EBF1FB', surface: '#FFFFFF', accent: '#2B4FCF', ink: '#131A2C' },
  { id: 'mintchoco', name: '민트초코', mode: 'light', bg: '#E1F3EE', surface: '#FBFEFD', accent: '#6A3E2A', ink: '#2B1D17' },
  { id: 'night', name: '밤하늘', mode: 'dark', bg: '#0A0F1F', surface: '#121A2E', accent: '#F2C35A', ink: '#E9EDF8' },
  { id: 'cocoa', name: '코코아', mode: 'dark', bg: '#15100D', surface: '#1F1814', accent: '#E7A867', ink: '#F4EBE3' },
  { id: 'wine', name: '와인', mode: 'dark', bg: '#170B12', surface: '#22111B', accent: '#FF8DB3', ink: '#F7E8EF' },
  { id: 'neon', name: '네온', mode: 'dark', bg: '#0C0A18', surface: '#151226', accent: '#34E0F0', ink: '#EEEAFF' },
];
function applyTheme(id) {
  const ok = id === 'custom' || THEMES.some(x => x.id === id) ? id : 'forest';
  if (ok === 'forest') document.documentElement.removeAttribute('data-pal');
  else document.documentElement.setAttribute('data-pal', ok);
  const th = THEMES.find(x => x.id === ok);
  if (th) document.querySelectorAll('meta[name="theme-color"]').forEach(m => { if (m.dataset.orig == null) m.dataset.orig = m.content; m.content = th.mode === 'auto' ? m.dataset.orig : th.bg; });
  if (prefs.theme !== ok) { prefs.theme = ok; savePrefs(); }
  applyLook(curLook());
}
function themeOpt(x, cur) {
  return `<button class="theme-opt" type="button" role="radio" id="th-${x.id}" data-act="theme" data-id="${x.id}" aria-checked="${cur === x.id}"><span class="theme-prev" aria-hidden="true" style="background:${x.bg}"><i style="background:${x.surface}"><b style="background:${x.accent}"></b><s style="background:${x.ink}"></s></i>${x.dk ? `<span class="theme-dk" style="background:${x.dk[0]}"><i style="background:${x.dk[1]}"><b style="background:${x.dk[2]}"></b><s style="background:#ECF1EE"></s></i></span>` : ''}</span><span class="theme-n">${x.name}</span></button>`;
}
function themeCard() {
  const cur = cfg().theme, grp = m => THEMES.filter(x => m.includes(x.mode)).map(x => themeOpt(x, cur)).join('');
  return `<section class="card">
    <div class="card-h"><h2 class="card-t">색상 테마</h2></div>
    <div role="radiogroup" aria-label="색상 테마">
      <p class="theme-gt">기기 설정 따라가기 <span>밝은 화면·어두운 화면이 기기 설정에 맞춰 바뀌어요</span></p>
      <div class="themes">${grp(['auto'])}</div>
      <p class="theme-gt">늘 같은 색 <span>기기 설정과 상관없이 이 색 그대로 보여요</span></p>
      <div class="themes">${grp(['light', 'dark'])}</div>
    </div>
    <p class="set-note" style="margin-top:12px">고른 테마는 계정에 저장돼서 다른 기기에서도 똑같이 보여요.</p>
  </section>`;
}

/* ================= account + backup ================= */
async function loadAccount() {
  try {
    const user = await window.claude.use('user');
    if (!user) return;
    const me = await user.me();
    S.user = { name: me.name || '', avatar: me.avatarUrl || '', email: me.email || '' };
    const f = $('#railFoot'); if (f) f.textContent = `${josa(S.user.name || S.user.email || '내 계정', '으로/로')} 로그인됨`;
    if (S.view === 'settings') renderView();
  } catch (e) { /* account details are optional */ }
}
function backupData() {
  const settings = clone(cfg());
  return { app: 'ttb-ledger', version: 1, exportedAt: new Date().toISOString(), settings, subs: clone(S.subs), loans: clone(S.loans), goals: clone(S.goals), credit: clone(S.credit), memos: clone(S.memos), accounts: clone(S.accts), deco: clone(S.deco), nospend: clone(S.nospend), months: clone(S.months) };
}
function csvData() {
  const q = v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const rows = [['날짜', '구분', '금액', '카테고리', '내용', '결제수단']];
  for (const t of [...allTxs()].reverse()) rows.push([t.date, t.kind === 'in' ? '수입' : t.kind === 'move' ? '이체' : '지출', t.kind === 'in' ? t.amount : t.kind === 'move' ? t.amount : -t.amount, t.kind === 'move' ? `${(acctOf(t.from) || {}).name || ''} → ${(acctOf(t.to) || {}).name || ''}` : catOf(t.cat).name, t.memo, (methodOf(t.method) || {}).name || '']);
  return '﻿' + rows.map(r => r.map(q).join(',')).join('\r\n');
}
async function saveFile(filename, data) {
  let dl = null;
  try { dl = await window.claude.use('downloads'); } catch (e) { dl = null; }
  if (!dl) { toast('이 화면에서는 파일을 저장할 수 없어요. claude.ai에서 열어 주세요.'); return; }
  try { await dl.save({ filename, data }); toast('파일을 저장했어요'); }
  catch (e) { if (e && e.code !== 'declined') toast('파일을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.'); }
}
function accountCard() {
  const u = S.user, r = S.restore, web = !!window.ttbPlatform;
  const n = allTxs().length;
  return `<section class="card">
    <h2 class="card-t" style="margin-bottom:12px">계정과 기록 보관</h2>
    <div class="account">${u && u.avatar ? `<img src="${esc(u.avatar)}" alt="">` : `<span class="emo" aria-hidden="true">${icon('home')}</span>`}<div style="min-width:0"><b>${esc((u && (u.name || u.email)) || (web ? '내 계정' : '내 Claude 계정'))}</b>${web && u && u.name && u.email ? `<span class="muted" style="font-size:13px;display:block">${esc(u.email)}</span>` : ''}<span class="muted" style="font-size:13px">${S.mode === 'live' ? '로그인되어 있어요 · 기록 ' + fmt(n) + '건 보관 중' : '저장소에 연결되지 않았어요'}</span></div></div>
    <p class="set-note">${web ? '기록은 내 계정에 저장돼서 폰이나 PC에서 같은 계정으로 로그인하면 그대로 보여요. 다른 사람은 내 기록을 볼 수 없어요.' : '기록은 Claude 계정에 저장돼서 폰이나 PC에서 같은 계정으로 로그인하면 그대로 보여요. 링크를 공유해도 다른 사람에게는 내 기록이 보이지 않아요.'}</p>
    <p class="set-note">혹시를 대비해 파일로도 보관해 두세요. 백업 파일로 언제든 되살릴 수 있고, 엑셀 파일로는 내역을 따로 볼 수 있어요.</p>
    <div class="backup-acts">
      <button class="btn btn-soft btn-sm" type="button" data-act="backup-json">백업 파일 저장</button>
      <button class="btn btn-soft btn-sm" type="button" data-act="backup-csv">엑셀(CSV)로 내보내기</button>
      <button class="btn btn-ghost btn-sm" type="button" data-act="restore-pick" ${S.mode === 'denied' ? 'disabled' : ''}>백업에서 되살리기</button>
      <input type="file" id="restoreFile" accept=".json,application/json" hidden>
      ${web ? '<button class="btn btn-ghost btn-sm" type="button" data-act="logout">로그아웃</button>' : ''}
    </div>
    ${web ? `<div class="legal-row"><a href="privacy.html" target="_blank" rel="noopener">개인정보 처리방침</a><a href="terms.html" target="_blank" rel="noopener">이용약관</a><button type="button" class="leave-link" data-act="leave-ask">회원 탈퇴</button></div>` : ''}
    ${web && S.leave ? leaveNotice() : ''}
    ${web ? `<p class="app-ver">꼬박꼬박 가계부 웹 · 버전 ${esc(window.ttbPlatform.version || '')}</p>` : ''}
    ${web ? '<p class="set-note" style="margin-top:12px"><b>폰에서 앱처럼 쓰기</b> · 안드로이드 크롬은 메뉴(⋮) → ‘홈 화면에 추가’, 아이폰 사파리는 공유 버튼 → ‘홈 화면에 추가’를 누르세요.</p>' : ''}
    ${r ? `<div class="notice warn" style="margin-top:12px"><p>${esc(r.when)}에 저장한 백업(기록 ${fmt(r.count)}건)으로 지금 기록을 모두 바꿀까요? 지금 기록은 사라져요.</p><div class="acts"><button class="btn btn-sm btn-primary" type="button" id="rsYes" data-act="restore-yes">바꾸기</button><button class="btn btn-sm btn-soft" type="button" data-act="restore-no">취소</button></div></div>` : ''}
  </section>`;
}
function leaveNotice() {
  const L = S.leave;
  return `<div class="notice warn leave-box" style="margin-top:12px"><p><b>정말 탈퇴할까요?</b> 계정과 모든 기록(내역·구독·대출·모으기·신용점수)이 바로 지워지고 되돌릴 수 없어요. 필요하면 먼저 ‘백업 파일 저장’을 눌러 두세요.</p>
    <label class="field" style="margin-top:10px"><span class="lab">확인을 위해 <b>탈퇴</b>라고 입력해 주세요</span><input class="input" id="leaveWord" autocomplete="off" ${L.busy ? 'disabled' : ''}></label>
    ${L.err ? `<p class="leave-err" role="alert">${esc(L.err)}</p>` : ''}
    <div class="acts"><button class="btn btn-sm btn-leave" type="button" data-act="leave-yes" ${L.busy ? 'disabled' : ''}>${L.busy ? '지우는 중…' : '탈퇴하고 모두 지우기'}</button><button class="btn btn-sm btn-soft" type="button" data-act="leave-no" ${L.busy ? 'disabled' : ''}>취소</button></div></div>`;
}
async function leaveAccount() {
  const w = ($('#leaveWord') || {}).value || '';
  if (w.trim() !== '탈퇴') { S.leave = { err: '‘탈퇴’라고 정확히 입력해 주세요.' }; renderView(); const i = $('#leaveWord'); if (i) i.focus(); return; }
  S.leave = { busy: true }; renderView();
  try { await window.ttbPlatform.deleteAccount(); }
  catch (e) { S.leave = { err: '탈퇴하지 못했어요. 잠시 뒤 다시 시도해 주세요.' }; renderView(); }
}
function readRestore(file) {
  if (!file) return;
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const b = JSON.parse(String(fr.result));
      if (!b || b.app !== 'ttb-ledger' || typeof b.months !== 'object') throw new Error('bad');
      let count = 0;
      for (const ym in b.months) for (const id in b.months[ym]) if (b.months[ym][id]) count++;
      S.restore = { data: b, count, when: String(b.exportedAt || '').slice(0, 10).replace(/-/g, '.') || '알 수 없는 날' };
      renderView();
      const y = $('#rsYes'); if (y) y.focus();
    } catch (e) { toast('꼬박꼬박 가계부 백업 파일이 아니에요'); }
  };
  fr.readAsText(file);
}
function applyRestore() {
  const b = S.restore && S.restore.data;
  S.restore = null;
  if (!b) return;
  const okYm = k => /^\d{4}-\d{2}$/.test(k);
  for (const ym of Object.keys(S.months)) if (!b.months[ym]) writeMonth(ym, Object.fromEntries(Object.keys(S.months[ym]).map(k => [k, null])));
  for (const ym of Object.keys(b.months).filter(okYm)) {
    const items = b.months[ym] || {}, cur = S.months[ym] || {}, patch = { ...items };
    for (const k in cur) if (!(k in items)) patch[k] = null;
    writeMonth(ym, patch);
  }
  const subP = { ...(b.subs || {}) }; for (const k in S.subs) if (!(k in subP)) subP[k] = null;
  if (Object.keys(subP).length) writeSubs(subP);
  const loanP = { ...(b.loans || {}) }; for (const k in S.loans) if (!(k in loanP)) loanP[k] = null;
  if (Object.keys(loanP).length) writeLoans(loanP);
  const goalP = { ...(b.goals || {}) }; for (const k in S.goals) if (!(k in goalP)) goalP[k] = null;
  if (Object.keys(goalP).length) { S.goals = {}; writeGoals(goalP); }
  const credP = { ...(b.credit || {}) }; for (const k in S.credit) if (!(k in credP)) credP[k] = null;
  if (Object.keys(credP).length) writeCredit(credP);
  const memoP = { ...(b.memos || {}) }; for (const k in S.memos) if (!(k in memoP)) memoP[k] = null;
  if (Object.keys(memoP).length) writeMemos(memoP);
  const acctP = { ...(b.accounts || {}) }; for (const k in S.accts) if (!(k in acctP)) acctP[k] = null;
  if (Object.keys(acctP).length) writeAccts(acctP);
  for (const k of ['wall', 'mascot']) if (b.deco && typeof b.deco[k] === 'string' && b.deco[k].startsWith('data:image/') && b.deco[k] !== S.deco[k]) writeDeco(k, b.deco[k]);
  for (const ym in (b.nospend || {})) for (const d in b.nospend[ym]) if (b.nospend[ym][d]) writeNoSpend(d, true);
  if (b.settings) saveSettings(b.settings);
  toast('백업으로 되살렸어요');
}

/* ================= savings goals (모으기) ================= */
const TAX = 0.154; // 이자소득세 15.4% (일반과세)
const deepMerge = (a, b) => {
  if (!a || typeof a !== 'object' || !b || typeof b !== 'object') return b;
  const r = { ...a };
  for (const k in b) r[k] = b[k] && typeof b[k] === 'object' && r[k] && typeof r[k] === 'object' ? deepMerge(r[k], b[k]) : b[k];
  return r;
};
function goalsArr() {
  const a = [];
  for (const id in S.goals) { const g = S.goals[id]; if (g && g.name != null) a.push({ ...g, id }); }
  return a.sort((x, y) => (x.start < y.start ? -1 : 1));
}
function writeGoals(patch) {
  S.goals = deepMerge(S.goals, patch);
  scheduleRender();
  if (!S.db) return Promise.resolve();
  const ref = S.db.doc('meta/goals');
  return track(enqueue('meta/goals', async () => {
    try { await retry(() => ref.update({ items: patch })); }
    catch (e) {
      if (e && e.code === 'invalid_argument' && !S.goalsDoc) await retry(() => ref.set({ items: patch }));
      else throw e;
    }
    S.goalsDoc = true;
  }));
}
const addMonthsYmd = (s, n) => { const y = +s.slice(0, 4), m = +s.slice(5, 7) - 1 + n; return occOn({ day: +s.slice(8) }, y + Math.floor(m / 12), (m % 12 + 12) % 12 + 1); };
const monthsBetween = (a, b) => Math.max(0, (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5, 7) - +a.slice(5, 7)) - (+b.slice(8) < +a.slice(8) ? 1 : 0));
// 정기적금 납입 일정: 시작한 달부터 term번, 매달 납입일에
function savingSchedule(g) {
  const out = [], n = Math.max(1, Math.min(600, g.term | 0));
  const sy = +g.start.slice(0, 4), sm = +g.start.slice(5, 7) - 1;
  for (let k = 0; k < n; k++) { const m = sm + k; out.push({ k: k + 1, date: occOn({ day: g.day }, sy + Math.floor(m / 12), (m % 12) + 1) }); }
  return out;
}
function goalStats(g) {
  const t = todayStr();
  const deps = Object.entries(g.deposits || {}).filter(([, d]) => d && d.amount && isYmd(d.date)).map(([id, d]) => ({ ...d, id })).sort((a, b) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : (b.at || 0) - (a.at || 0)));
  const saved = sum(deps.map(d => d.amount));
  if (g.kind === 'saving') {
    const sched = savingSchedule(g), n = sched.length, M = g.monthly || 0, r = (+g.rate || 0) / 100;
    const end = addMonthsYmd(g.start, n); // 만기일
    const interest = Math.round((M * r * n * (n + 1)) / 2 / 12);
    const net = g.taxFree ? interest : Math.round(interest * (1 - TAX));
    const contrib = Math.round((M * n * (+g.contrib || 0)) / 100);
    const planCount = sched.filter(s => s.date <= t).length;
    const next = sched.find(s => s.date > t) || null;
    return { deps, saved, target: M * n, plan: M * planCount, end, interest, net, contrib, maturity: M * n + net + contrib, next, count: n, planCount, left: Math.max(0, M * n - saved), perMonth: M };
  }
  const end = isYmd(g.end) ? g.end : addMonthsYmd(g.start, 12), total = Math.max(1, diffDays(g.start, end));
  const el = Math.min(total, Math.max(0, diffDays(g.start, t)));
  const target = g.target || 0, left = Math.max(0, target - saved);
  const mLeft = Math.max(1, monthsBetween(t, end) + (t < end ? 1 : 0));
  return { deps, saved, target, plan: Math.round((target * el) / total), end, left, perMonth: t >= end ? left : Math.ceil(left / mLeft / 100) * 100 };
}
function vAssetsSwitch(cur) {
  return `<div class="seg" role="group" aria-label="자산 화면">${[['accounts', '통장'], ['goals', '모으기'], ['loans', '대출'], ['credit', '신용']].map(([v, n]) => `<button type="button" id="as-${v}" data-view="${v}" aria-pressed="${cur === v}">${n}</button>`).join('')}</div>`;
}
function goalCard(g) {
  const s = goalStats(g), t = todayStr();
  const pct = s.target ? Math.min(1, s.saved / s.target) : 0, planPct = s.target ? Math.min(1, s.plan / s.target) : 0;
  const diff = s.saved - s.plan, done = s.saved >= s.target && s.target > 0;
  const dd = diffDays(t, s.end);
  const status = done ? '<span class="state good">목표 달성</span>'
    : diff === 0 ? '<span class="state good">계획대로 모으고 있어요</span>'
    : diff > 0 ? `<span class="state good">계획보다 ${won(diff)} 앞서요</span>`
    : `<span class="state warn">${icon('alert')}계획보다 ${won(-diff)} 덜 모았어요</span>`;
  const meta = g.kind === 'saving'
    ? `정기적금 · 매월 ${g.day}일 ${won(g.monthly)} · ${g.term}개월${+g.rate ? ` · 연 ${(+g.rate).toLocaleString('ko-KR', { maximumFractionDigits: 3 })}%` : ''}${+g.contrib ? ` · 기여금 ${g.contrib}%` : ''}${g.taxFree ? ' · 비과세' : ''}`
    : `자유 모으기 · ${s.end.replace(/-/g, '.')}까지`;
  const facts = g.kind === 'saving'
    ? `<div><span class="stat-l">만기 예상 ${g.taxFree ? '(비과세)' : '(세후)'}</span><span class="stat-v">${won(s.maturity)}</span><span class="sub">원금 ${fmt(s.target)} + 이자 ${fmt(s.net)}${s.contrib ? ` + 기여금 ${fmt(s.contrib)}` : ''}</span></div>
       <div><span class="stat-l">다음 납입 ${s.next ? '· ' + ddayText(s.next.date) : ''}</span><span class="stat-v">${s.next ? won(g.monthly) : '납입 끝'}</span><span class="sub">${s.next ? `${mdw(s.next.date)} · ${s.next.k}/${s.count}회` : `만기 ${s.end.replace(/-/g, '.')}`}</span></div>`
    : `<div><span class="stat-l">남은 금액</span><span class="stat-v">${won(s.left)}</span><span class="sub">${done ? '다 모았어요' : `목표 ${won(s.target)}`}</span></div>
       <div><span class="stat-l">${dd > 0 ? '매달 이만큼 모으면 돼요' : '기간이 지났어요'}</span><span class="stat-v">${done ? '–' : won(s.perMonth)}</span><span class="sub">${dd > 0 ? `목표일까지 D-${dd}` : '목표일을 늘려 보세요'}</span></div>`;
  return `<section class="card goal-card">
    <div class="loan-top"><span class="emo" aria-hidden="true">${esc(g.emoji || (g.kind === 'saving' ? '🏦' : '🐷'))}</span><div style="min-width:0"><p class="loan-name">${esc(g.name)}${g.ex ? '<span class="tag">예시</span>' : ''}</p><p class="loan-meta">${esc(meta)}</p></div><button class="btn btn-ghost btn-sm" type="button" data-act="edit-goal" data-id="${esc(g.id)}">고치기</button></div>
    <div class="loan-prog">
      <div class="row"><span><b>${won(s.saved)}</b> 모음 · ${Math.round(pct * 100)}%</span>${status}</div>
      <div class="goal-meter" role="img" aria-label="목표의 ${Math.round(pct * 100)}% 모음, 오늘 계획은 ${Math.round(planPct * 100)}%">${meter(pct, '', false)}<i class="plan-mark" style="left:${(planPct * 100).toFixed(1)}%" title="오늘까지 계획"></i></div>
      <p class="bud-left">세로 선은 오늘까지 계획한 금액(${won(s.plan)})이에요.</p>
    </div>
    <div class="loan-facts">${facts}</div>
    <div class="loan-acts"><button class="btn btn-primary btn-sm" type="button" data-act="goal-dep" data-id="${esc(g.id)}" ${S.mode === 'denied' ? 'disabled' : ''}>${icon('plus')}넣기·빼기</button><button class="btn btn-soft btn-sm" type="button" data-act="goal-hist" data-id="${esc(g.id)}">모은 기록 ${s.deps.length}건</button></div>
  </section>`;
}
function vGoals() {
  const head = `<div class="view-h"><h1 class="view-title">모으기</h1><div class="view-acts">${vAssetsSwitch('goals')}<button class="btn btn-primary btn-sm" type="button" data-act="add-goal" ${S.mode === 'denied' ? 'disabled' : ''}>${icon('plus')}목표 추가</button></div></div>`;
  if (isLoading()) return head + `<section class="card">${emptyBox('불러오는 중이에요', '')}</section>`;
  const goals = goalsArr();
  if (!goals.length) return head + policyCard() + `<section class="card">${emptyBox('모으는 목표가 없어요', '적금이나 여행 자금, 비상금처럼 모으고 싶은 돈을 목표로 만들면 얼마나 모였는지, 매달 얼마씩 넣으면 되는지 알려 드려요.', `<button class="btn btn-primary btn-sm" type="button" data-act="add-goal">${icon('plus')}목표 추가</button>`)}</section>`;
  const stats = goals.map(g => goalStats(g));
  const saved = sum(stats.map(s => s.saved)), target = sum(stats.map(s => s.target));
  const thisMonth = ymOf(todayStr());
  const monthIn = sum(stats.flatMap(s => s.deps.filter(d => ymOf(d.date) === thisMonth).map(d => d.amount)));
  const summary = `<section class="card loan-sum">
    <span class="hero-label">지금까지 모은 돈</span>
    <p class="hero-num">${fmt(saved)}<span class="u">원</span></p>
    <span class="muted" style="font-size:13.5px">목표 ${goals.length}개 · 전체 목표 ${won(target)}의 ${target ? Math.round((saved / target) * 100) : 0}%</span>
    <div class="stat-grid">
      <div><span class="stat-l">이번 달 모은 돈</span><span class="stat-v">${won(monthIn)}</span></div>
      <div><span class="stat-l">남은 목표 금액</span><span class="stat-v">${won(sum(stats.map(s => s.left)))}</span></div>
      <div><span class="stat-l">만기 이자 + 기여금</span><span class="stat-v">${won(sum(stats.map(s => (s.net || 0) + (s.contrib || 0))))}</span></div>
      <div><span class="stat-l">한 달에 넣을 돈</span><span class="stat-v">${won(sum(stats.map(s => (s.left ? s.perMonth : 0))))}</span></div>
    </div>
  </section>`;
  return head + summary + goals.map(goalCard).join('') + policyCard() + '<p class="set-note muted" style="font-size:12.5px">적금 이자는 매달 같은 금액을 넣는 정기적금 단리 기준이고, 이자소득세 15.4%를 뺀 금액이에요. 은행 상품마다 조금 다를 수 있어요.</p>';
}
function homeGoalsCard() {
  const goals = goalsArr();
  if (!goals.length) return '';
  return `<section class="card" data-o="5">
    <div class="card-h"><h2 class="card-t">모으는 중</h2><button class="card-link" type="button" data-view="goals">전체${icon('right')}</button></div>
    <div class="rank">${goals.slice(0, 4).map(g => { const s = goalStats(g), p = s.target ? Math.min(1, s.saved / s.target) : 0; return `<button class="rank-row" type="button" data-view="goals"><span class="emo" aria-hidden="true">${esc(g.emoji || (g.kind === 'saving' ? '🏦' : '🐷'))}</span><span class="rank-main"><span class="rank-line"><span class="rank-name">${esc(g.name)}</span><span class="rank-amt">${won(s.saved)}</span></span><span class="bar"><span style="width:${(p * 100).toFixed(1)}%"></span></span></span><span class="rank-pct">${Math.round(p * 100)}%</span></button>`; }).join('')}</div>
  </section>`;
}
/* goal sheet */
function openGoalSheet(id) {
  if (S.mode === 'denied') return;
  const g = id && S.goals[id], t = todayStr();
  F = g
    ? { mode: 'goal', id, kind: g.kind === 'saving' ? 'saving' : 'free', name: g.name || '', emoji: g.emoji || '', target: g.target || 0, monthly: g.monthly || 0, rate: String(g.rate ?? ''), term: g.term || 12, start: g.start || t, end: g.end || addMonthsYmd(t, 12), day: g.day || 1, auto: g.auto !== false, contrib: String(g.contrib || ''), taxFree: !!g.taxFree, ex: !!g.ex, since: g.since || t }
    : { mode: 'goal', id: null, kind: 'saving', name: '', emoji: '', target: 0, monthly: 0, rate: '', term: 12, start: t, end: addMonthsYmd(t, 12), day: +t.slice(8), auto: true, contrib: '', taxFree: false, ex: false, since: t };
  showSheet(goalSheet(), g ? null : '#g-name');
}
const canSaveGoal = () => !!(F && F.name.trim() && isYmd(F.start) && (F.kind === 'saving' ? F.monthly > 0 && F.term >= 1 && (F.rate === '' || (+F.rate >= 0 && +F.rate < 100)) : F.target > 0 && isYmd(F.end) && F.end > F.start));
function goalPreview() {
  if (!canSaveGoal()) return F.kind === 'saving' ? '매달 넣을 금액과 기간을 넣으면 만기에 받을 돈을 계산해 드려요.' : '목표 금액과 날짜를 넣으면 매달 얼마씩 모으면 되는지 알려 드려요.';
  const s = goalStats({ ...F, rate: +F.rate || 0, contrib: +F.contrib || 0, deposits: {} });
  return F.kind === 'saving'
    ? `만기 ${s.end.replace(/-/g, '.')} · 원금 ${won(s.target)} + ${F.taxFree ? '이자(비과세)' : '세후 이자'} ${won(s.net)}${s.contrib ? ` + 정부 기여금 ${won(s.contrib)}` : ''} = ${won(s.maturity)}`
    : `${s.end.replace(/-/g, '.')}까지 매달 약 ${won(Math.ceil(F.target / Math.max(1, monthsBetween(F.start, F.end) || 1) / 100) * 100)}씩 모으면 돼요`;
}
function goalSheet() {
  const f = F, isEdit = !!f.id;
  return `<form id="goalForm" autocomplete="off" novalidate>
    <div class="sheet-h"><h2 id="sheetTitle">${isEdit ? '목표 고치기' : '모으기 목표 추가'}</h2><button class="icon-btn" type="button" data-act="close" aria-label="닫기">${icon('x')}</button></div>
    <div class="seg" role="group" aria-label="목표 종류" style="width:100%"><button type="button" id="gk-saving" data-act="g-kind" data-v="saving" ${pressed(f.kind === 'saving')}>정기적금</button><button type="button" id="gk-free" data-act="g-kind" data-v="free" ${pressed(f.kind === 'free')}>자유 모으기</button></div>
    <div class="field"><label class="lab" for="g-name">이름</label><div class="set-row m" style="grid-template-columns:56px minmax(0,1fr)"><input class="input emoji" id="g-emoji" value="${esc(f.emoji)}" placeholder="${f.kind === 'saving' ? '🏦' : '🐷'}" aria-label="아이콘 이모지" maxlength="8"><input class="input" id="g-name" maxlength="30" placeholder="${f.kind === 'saving' ? '예: 1년 정기적금' : '예: 여행 자금, 비상금'}" value="${esc(f.name)}"></div></div>
    ${f.kind === 'saving' ? `
    <div class="field"><label class="lab" for="g-monthly">매달 넣는 금액</label><div class="amt"><input id="g-monthly" inputmode="numeric" placeholder="0" value="${f.monthly ? fmt(f.monthly) : ''}"><span>원</span></div></div>
    <div class="field-row"><div class="field"><label class="lab" for="g-term">기간 (개월)</label><input class="input" id="g-term" inputmode="numeric" value="${f.term || ''}" placeholder="예: 12"></div><div class="field"><label class="lab" for="g-rate">연 이자율 (%)</label><input class="input" id="g-rate" inputmode="decimal" value="${esc(f.rate)}" placeholder="예: 3.5"></div></div>
    <div class="field-row"><div class="field"><label class="lab" for="g-start">가입일 (첫 납입)</label><input class="input" type="date" id="g-start" value="${f.start}"></div><div class="field"><label class="lab" for="g-day">매달 납입일</label><select class="input" id="g-day">${range(1, 31).map(d => `<option value="${d}"${d === f.day ? ' selected' : ''}>${d}일</option>`).join('')}</select></div></div>
    <div class="field-row"><div class="field"><label class="lab" for="g-contrib">정부 기여금 (%) <span class="muted" style="font-weight:400">선택</span></label><input class="input" id="g-contrib" inputmode="decimal" value="${esc(f.contrib)}" placeholder="없으면 비워 두기"></div><label class="check" style="align-self:end;padding-bottom:10px"><input type="checkbox" id="g-taxfree"${f.taxFree ? ' checked' : ''}><span>이자 비과세</span></label></div>
    <label class="check"><input type="checkbox" id="g-auto"${f.auto ? ' checked' : ''}><span>납입일이 되면 넣은 것으로 자동 기록하기</span></label>
    ${!f.id ? `<div class="sheet-note">청년 정책 적금이라면 <button class="card-link" type="button" data-act="g-preset" style="display:inline;padding:0;color:var(--accent)">청년미래적금 조건으로 채우기</button> · 3년, 월 최대 50만 원, 정부 기여금 6%(우대형 12%), 이자 비과세 기준이에요. 은행 금리와 실제 조건은 가입하는 은행 안내로 확인하세요.</div>` : ''}`
    : `
    <div class="field"><label class="lab" for="g-target">목표 금액</label><div class="amt"><input id="g-target" inputmode="numeric" placeholder="0" value="${f.target ? fmt(f.target) : ''}"><span>원</span></div></div>
    <div class="field-row"><div class="field"><label class="lab" for="g-start">시작일</label><input class="input" type="date" id="g-start" value="${f.start}"></div><div class="field"><label class="lab" for="g-end">목표일</label><input class="input" type="date" id="g-end" value="${f.end}"></div></div>`}
    <p class="sheet-note" id="gPrev">${esc(goalPreview())}</p>
    <div class="sheet-actions">${isEdit ? `<button class="btn btn-danger" type="button" data-act="g-delete">${icon('trash')}삭제</button>` : ''}<button class="btn btn-primary btn-block" type="submit" id="g-save" ${canSaveGoal() ? '' : 'disabled'}>${isEdit ? '고친 내용 저장' : '추가하기'}</button></div>
  </form>`;
}
function refreshGoalSheet() {
  const p = $('#gPrev'); if (p) p.textContent = goalPreview();
  const s = $('#g-save'); if (s) s.disabled = !canSaveGoal();
}
function saveGoal() {
  const f = F;
  if (!canSaveGoal()) return;
  const t = todayStr(), id = f.id || uid('g'), prev = f.id ? S.goals[f.id] : null;
  const g = { name: f.name.trim().slice(0, 30), emoji: firstGrapheme(f.emoji), kind: f.kind, start: f.start, ex: !!f.ex,
    target: f.kind === 'free' ? f.target : 0, end: f.kind === 'free' ? f.end : '', monthly: f.kind === 'saving' ? f.monthly : 0,
    term: f.kind === 'saving' ? Math.min(600, Math.max(1, f.term | 0)) : 0, rate: f.kind === 'saving' ? Math.round((+f.rate || 0) * 1000) / 1000 : 0,
    contrib: f.kind === 'saving' ? Math.min(100, Math.max(0, +f.contrib || 0)) : 0, taxFree: f.kind === 'saving' && !!f.taxFree,
    day: f.kind === 'saving' ? f.day : 0, auto: f.kind === 'saving' ? f.auto : false,
    since: prev ? (prev.auto === false && f.auto && (prev.since || t) < t ? t : prev.since || t) : f.start < t ? f.start : t };
  // a new 적금 started in the past backfills its payments (up to the auto-record window)
  writeGoals({ [id]: prev ? g : { ...g, deposits: {} } });
  closeSheet();
  toast(f.id ? '고쳤어요' : `‘${g.name}’ 목표를 만들었어요`);
  autoRecord();
}
function deleteGoal() {
  const f = F, prev = S.goals[f.id];
  closeSheet();
  if (!prev) return;
  writeGoals({ [f.id]: null });
  toast('목표를 지웠어요', { undo: () => writeGoals({ [f.id]: prev }) });
}
/* deposit sheet */
function openDepSheet(gid) {
  const g = S.goals[gid];
  if (!g || S.mode === 'denied') return;
  F = { mode: 'dep', gid, kind: 'in', amount: g.kind === 'saving' ? g.monthly || 0 : 0, date: todayStr(), memo: '' };
  showSheet(depSheet(), '#dep-amount');
}
function depSheet() {
  const f = F, g = S.goals[f.gid] || {};
  return `<form id="depForm" autocomplete="off" novalidate>
    <div class="sheet-h"><h2 id="sheetTitle">${esc(g.name || '')}</h2><button class="icon-btn" type="button" data-act="close" aria-label="닫기">${icon('x')}</button></div>
    <div class="seg" role="group" aria-label="넣기·빼기" style="width:100%"><button type="button" id="dk-in" data-act="d-kind" data-v="in" ${pressed(f.kind === 'in')}>넣기</button><button type="button" id="dk-out" data-act="d-kind" data-v="out" ${pressed(f.kind === 'out')}>빼기</button></div>
    <div class="field"><label class="lab" for="dep-amount">금액</label><div class="amt"><input id="dep-amount" inputmode="numeric" placeholder="0" value="${f.amount ? fmt(f.amount) : ''}"><span>원</span></div></div>
    <div class="field-row"><div class="field"><label class="lab" for="dep-date">날짜</label><input class="input" type="date" id="dep-date" value="${f.date}"></div><div class="field"><label class="lab" for="dep-memo">메모 <span class="muted" style="font-weight:400">(선택)</span></label><input class="input" id="dep-memo" maxlength="30" placeholder="예: 보너스" value="${esc(f.memo)}"></div></div>
    <div class="sheet-actions"><button class="btn btn-primary btn-block" type="submit" id="dep-save" ${f.amount > 0 ? '' : 'disabled'}>${f.kind === 'in' ? '넣기' : '빼기'}</button></div>
  </form>`;
}
function saveDep() {
  const f = F;
  if (!(f.amount > 0) || !isYmd(f.date)) return;
  const id = uid('d');
  writeGoals({ [f.gid]: { deposits: { [id]: { date: f.date, amount: f.kind === 'in' ? f.amount : -f.amount, memo: f.memo.trim().slice(0, 30), auto: false, at: Date.now() } } } });
  closeSheet();
  toast(f.kind === 'in' ? `${won(f.amount)}을 넣었어요` : `${won(f.amount)}을 뺐어요`, { undo: () => writeGoals({ [f.gid]: { deposits: { [id]: null } } }) });
}
function openGoalHistory(gid) {
  const g = S.goals[gid];
  if (!g) return;
  const s = goalStats({ ...g, id: gid });
  F = { mode: 'view', gid };
  showSheet(`<div class="day-sheet">
    <div class="sheet-h"><h2 id="sheetTitle">${esc(g.name)} 모은 기록</h2><button class="icon-btn" type="button" data-act="close" aria-label="닫기">${icon('x')}</button></div>
    <div class="day-sum"><div><span class="stat-l">모은 돈</span><span class="stat-v">${won(s.saved)}</span></div><div><span class="stat-l">목표</span><span class="stat-v">${won(s.target)}</span></div><div><span class="stat-l">기록</span><span class="stat-v">${s.deps.length}건</span></div></div>
    ${s.deps.length ? `<div class="rank">${s.deps.map(d => `<div class="dep-row"><span class="emo" aria-hidden="true">${d.amount > 0 ? '＋' : '－'}</span><span class="tx-main"><span class="tx-title">${esc(d.memo || (d.amount > 0 ? '넣음' : '뺌'))}${d.auto ? '<span class="tag sub">자동</span>' : ''}</span><span class="tx-sub">${mdw(d.date)} ${d.date.slice(0, 4)}</span></span><span class="tx-amt${d.amount > 0 ? ' in' : ''}">${d.amount > 0 ? '+' : '−'}${won(Math.abs(d.amount))}</span><button class="icon-btn" type="button" data-act="dep-del" data-gid="${esc(gid)}" data-id="${esc(d.id)}" aria-label="이 기록 지우기">${icon('trash')}</button></div>`).join('')}</div>` : '<p class="muted cal-none">아직 넣은 기록이 없어요.</p>'}
    <button class="btn btn-primary btn-block" type="button" data-act="goal-dep" data-id="${esc(gid)}">${icon('plus')}넣기·빼기</button>
  </div>`);
}
function deleteDep(gid, id) {
  const g = S.goals[gid], prev = g && g.deposits && g.deposits[id];
  if (!prev) return;
  writeGoals({ [gid]: { deposits: { [id]: null } } });
  openGoalHistory(gid);
  toast('기록을 지웠어요', { undo: () => { writeGoals({ [gid]: { deposits: { [id]: prev } } }); if (F && F.mode === 'view' && F.gid === gid) openGoalHistory(gid); } });
}
function autoRecordGoals(t, floor) {
  const patch = {};
  for (const g of goalsArr()) {
    if (g.kind !== 'saving' || !g.auto || !(g.monthly > 0)) continue;
    const since = isYmd(g.since) ? g.since : t, from = since > floor ? since : floor;
    for (const s of savingSchedule(g)) {
      if (s.date < from || s.date > t) continue;
      const id = 'a_' + s.date.slice(0, 7).replace('-', '');
      if ((g.deposits && id in g.deposits) || attempted.has(g.id + id)) continue;
      attempted.add(g.id + id);
      ((patch[g.id] ||= { deposits: {} }).deposits)[id] = { date: s.date, amount: g.monthly, memo: `${s.k}회차 자동 납입`, auto: true, at: parseD(s.date).getTime() + 9 * 36e5 };
    }
  }
  if (Object.keys(patch).length) writeGoals(patch);
}

/* ================= habits: 무지출 체크, 연속 기록, 주간 리포트 ================= */
function writeNoSpend(date, on) {
  const ym = ymOf(date);
  S.nospend[ym] = { ...(S.nospend[ym] || {}), [date]: on ? true : null };
  scheduleRender();
  if (!S.db) return Promise.resolve();
  const ref = S.db.doc('months/' + ym), patch = { nospend: { [date]: on ? true : null } };
  return track(enqueue('months/' + ym, async () => {
    try { await retry(() => ref.update(patch)); }
    catch (e) {
      if (e && e.code === 'invalid_argument' && !S.monthDocs.has(ym)) await retry(() => ref.set({ items: {}, ...patch }));
      else throw e;
    }
    S.monthDocs.add(ym);
  }));
}
const isNoSpend = d => !!(S.nospend[ymOf(d)] && S.nospend[ymOf(d)][d]);
function habitStats() {
  const t = todayStr(), days = new Set(), outDays = new Set();
  for (const x of allTxs()) { days.add(x.date); if (x.kind === 'out') outDays.add(x.date); }
  for (const ym in S.nospend) for (const d in S.nospend[ym]) if (S.nospend[ym][d]) days.add(d);
  let d = days.has(t) ? t : addDays(t, -1), streak = 0;
  while (days.has(d) && streak < 3660) { streak++; d = addDays(d, -1); }
  const ym = ymOf(t), marks = S.nospend[ym] || {};
  const noSpendMonth = Object.keys(marks).filter(k => marks[k] && !outDays.has(k)).length;
  return { streak, noSpendMonth, todayOut: outDays.has(t), todayMarked: isNoSpend(t), todayAny: days.has(t) };
}
function weekReport() {
  const t = todayStr(), dow = (parseD(t).getDay() + 6) % 7; // 월요일 = 0
  const mon = addDays(t, -dow), lmon = addDays(mon, -7), lend = addDays(t, -7);
  const outs = allTxs().filter(x => x.kind === 'out');
  const inRange = (x, a, b) => x.date >= a && x.date <= b;
  const cur = outs.filter(x => inRange(x, mon, t)), prev = outs.filter(x => inRange(x, lmon, lend));
  const byCat = list => { const o = {}; for (const x of list) o[x.cat || ''] = (o[x.cat || ''] || 0) + x.amount; return o; };
  const a = byCat(cur), b = byCat(prev);
  const changes = [...new Set([...Object.keys(a), ...Object.keys(b)])].map(c => ({ c, d: (a[c] || 0) - (b[c] || 0) })).filter(x => x.d).sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
  return { cur: sum(cur.map(x => x.amount)), prev: sum(prev.map(x => x.amount)), food: [(a.food || 0), (b.food || 0)], top: changes[0] || null, days: dow + 1, mon };
}
function homeHabitCard() {
  const h = habitStats(), t = todayStr();
  const todayBtn = h.todayOut ? '<p class="bud-foot">오늘 기록이 있어요. 내일도 꼬박꼬박 적어 봐요.</p>'
    : h.todayMarked ? `<p class="bud-foot">오늘은 무지출로 체크했어요. <button class="card-link" type="button" data-act="nospend" data-date="${t}" data-on="0">체크 취소</button></p>`
    : `<div class="habit-acts"><button class="btn btn-soft btn-sm" type="button" data-act="nospend" data-date="${t}" data-on="1" ${S.mode === 'denied' ? 'disabled' : ''}>오늘은 돈을 안 썼어요</button><button class="btn btn-ghost btn-sm" type="button" data-act="add">${icon('plus')}오늘 기록하기</button></div>`;
  return `<section class="card" data-o="4">
    <div class="card-h"><h2 class="card-t">꼬박꼬박 기록</h2></div>
    <div class="habit-row"><div><span class="stat-l">연속 기록</span><span class="habit-num">${h.streak}<small>일째</small></span></div><div><span class="stat-l">이번 달 무지출</span><span class="habit-num">${h.noSpendMonth}<small>일</small></span></div></div>
    ${todayBtn}
  </section>`;
}
function homeReportCard() {
  const r = weekReport();
  if (!r.cur && !r.prev) return '';
  const diff = r.cur - r.prev;
  const lines = [];
  lines.push(diff < 0 ? `지난주 같은 기간보다 <b>${won(-diff)}</b> 덜 썼어요.` : diff > 0 ? `지난주 같은 기간보다 <b>${won(diff)}</b> 더 썼어요.` : '지난주 같은 기간과 똑같이 썼어요.');
  const fd = r.food[0] - r.food[1];
  if (r.food[0] || r.food[1]) lines.push(`가장 큰 지출인 식비는 ${fd < 0 ? `<b>${won(-fd)}</b> 줄었어요` : fd > 0 ? `<b>${won(fd)}</b> 늘었어요` : '그대로예요'}.`);
  if (r.top && r.top.c !== 'food') { const c = catOf(r.top.c); lines.push(`${esc(c.emoji)} ${esc(josa(c.name, '이/가'))} 가장 크게 ${r.top.d > 0 ? '늘었어요' : '줄었어요'} (${r.top.d > 0 ? '+' : '−'}${won(Math.abs(r.top.d))}).`); }
  return `<section class="card" data-o="6">
    <div class="card-h"><h2 class="card-t">이번 주 리포트</h2><span class="muted" style="font-size:13px">${mdLabel(r.mon)}부터 ${r.days}일</span></div>
    <p class="report-num">${won(r.cur)}<span class="muted"> 지출</span></p>
    <ul class="report-list">${lines.map(l => `<li>${l}</li>`).join('')}</ul>
  </section>`;
}

/* ================= 첫 설정 도우미 ================= */
// 청년 가구 생활비 구조(식비 비중이 가장 큼)를 참고한 시작용 비율. 쓰면서 고치는 게 전제예요.
const SETUP_SPLIT = { food: 0.40, cafe: 0.08, living: 0.12, shop: 0.12, transit: 0.12, fun: 0.10, etc: 0.06 };
function setupPlan(f) {
  const save = Math.round((f.income * f.rate) / 100 / 1000) * 1000;
  const living = Math.max(0, f.income - save - f.fixed);
  const cats = catsOf('out').filter(c => SETUP_SPLIT[c.id]);
  const tot = sum(cats.map(c => SETUP_SPLIT[c.id])) || 1;
  const split = {};
  for (const c of cats) split[c.id] = Math.floor((living * SETUP_SPLIT[c.id]) / tot / 1000) * 1000;
  return { save, living, split, daily: Math.floor(living / 30 / 100) * 100 };
}
function openSetupSheet() {
  if (S.mode === 'denied') return;
  F = { mode: 'setup', income: 0, fixed: 0, rate: 20, goal: true };
  showSheet(setupSheet(), '#su-income');
}
function setupSheet() {
  const f = F, ok = f.income > 0 && f.income > f.fixed, p = ok ? setupPlan(f) : null;
  return `<form id="setupForm" autocomplete="off" novalidate>
    <div class="sheet-h"><h2 id="sheetTitle">첫 설정 도우미</h2><button class="icon-btn" type="button" data-act="close" aria-label="닫기">${icon('x')}</button></div>
    <p class="set-note">세 가지만 알려 주면 한 달 예산을 추천해 드려요. 나중에 언제든 바꿀 수 있어요.</p>
    <div class="field"><label class="lab" for="su-income">① 한 달 실수령액 (세금 떼고 받는 돈)</label><div class="amt"><input id="su-income" inputmode="numeric" placeholder="0" value="${f.income ? fmt(f.income) : ''}"><span>원</span></div></div>
    <div class="field"><label class="lab" for="su-fixed">② 매달 꼭 나가는 돈 (월세·관리비·통신비·대출 상환 등)</label><div class="amt"><input id="su-fixed" inputmode="numeric" placeholder="0" value="${f.fixed ? fmt(f.fixed) : ''}"><span>원</span></div></div>
    <div class="field"><span class="lab" id="suLab">③ 수입에서 먼저 떼어 둘 저축</span><div class="seg" role="group" aria-labelledby="suLab" style="width:100%">${[10, 20, 30, 40].map(r => `<button type="button" id="su-r${r}" data-act="su-rate" data-v="${r}" ${pressed(f.rate === r)}>${r}%</button>`).join('')}</div></div>
    <div class="setup-plan" id="suPlan">${p ? `
      <div class="day-sum"><div><span class="stat-l">저축</span><span class="stat-v">${won(p.save)}</span></div><div><span class="stat-l">고정비</span><span class="stat-v">${won(f.fixed)}</span></div><div><span class="stat-l">생활비 예산</span><span class="stat-v">${won(p.living)}</span></div></div>
      <p class="set-note">하루 약 <b>${won(p.daily)}</b>로 생활하면 돼요. 생활비는 청년 가구 지출 구조(식비 비중이 가장 큼)를 참고해 이렇게 나눠요.</p>
      <div class="setup-cats">${Object.entries(p.split).map(([id, v]) => `<span>${esc(catOf(id).emoji)} ${esc(catOf(id).name)} <b>${won(v)}</b></span>`).join('')}</div>
      <label class="check"><input type="checkbox" id="su-goal"${f.goal ? ' checked' : ''}><span>매달 ${won(p.save)}씩 모으는 ‘비상금’ 목표도 만들기</span></label>` : '<p class="set-note muted">실수령액을 넣으면 추천 예산이 여기에 보여요.</p>'}</div>
    <div class="sheet-actions"><button class="btn btn-primary btn-block" type="submit" id="su-save" ${ok ? '' : 'disabled'}>이대로 예산 정하기</button></div>
  </form>`;
}
function saveSetup() {
  const f = F;
  if (!(f.income > 0 && f.income > f.fixed)) return;
  const p = setupPlan(f), st = cfg();
  saveSettings({ ...st, budget: { total: p.living, cats: p.split }, budgetEx: false, setup: { income: f.income, fixed: f.fixed, rate: f.rate } });
  if (f.goal && p.save > 0) {
    const t = todayStr();
    writeGoals({ [uid('g')]: { name: '비상금', emoji: '🛟', kind: 'free', target: p.save * 6, start: t, end: addMonthsYmd(t, 6), monthly: 0, term: 0, rate: 0, contrib: 0, taxFree: false, day: 0, auto: false, since: t, ex: false, deposits: {} } });
  }
  closeSheet();
  toast('추천 예산을 정했어요. 예산 화면에서 언제든 고칠 수 있어요');
}

/* ================= 카드 결제 문자 붙여넣기 ================= */
const CARD_WORDS = [['신한', '신한'], ['KB', '국민'], ['국민', '국민'], ['삼성', '삼성'], ['현대', '현대'], ['롯데', '롯데'], ['하나', '하나'], ['우리', '우리'], ['NH', '농협'], ['농협', '농협'], ['BC', '비씨'], ['비씨', '비씨'], ['카카오', '카카오'], ['토스', '토스'], ['씨티', '씨티'], ['IBK', '기업'], ['기업', '기업']];
function parseSms(text) {
  const s = String(text || '').replace(/\[Web발신\]/g, ' ').replace(/\r/g, '');
  const am = s.match(/([\d,]{1,12})\s*원/);
  if (!am) return null;
  const amount = +am[1].replace(/,/g, '');
  if (!(amount > 0)) return null;
  let date = null;
  const dm = s.match(/(\d{1,2})\s*[\/.-]\s*(\d{1,2})(?!\d)/);
  if (dm) {
    const t = todayStr(), y = +t.slice(0, 4), m = +dm[1], d = +dm[2];
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) { let c = `${y}-${pad(m)}-${pad(d)}`; if (c > t) c = `${y - 1}-${pad(m)}-${pad(d)}`; date = c; }
  }
  // 가게 이름: 시각(12:34) 뒤 글자, 없으면 금액·날짜·카드 정보가 아닌 줄
  let memo = '';
  const tm = s.match(/\d{1,2}:\d{2}\s*([^\n]+)/);
  if (tm) memo = tm[1];
  if (!memo) memo = s.split('\n').map(x => x.trim()).find(x => x && !/원|승인|카드|누적|잔액|\d{1,2}[\/.-]\d{1,2}|\*/.test(x)) || '';
  memo = memo.replace(/누적.*$|잔액.*$|일시불|할부.*$|[\d,]+원/g, '').trim().slice(0, 40);
  const cancel = /취소/.test(s);
  let method = '';
  const card = CARD_WORDS.find(([w]) => s.includes(w));
  if (card) { const m = cfg().methods.find(x => x.name.includes(card[1])); if (m) method = m.id; }
  if (!method) { const m = cfg().methods.find(x => /체크/.test(s) ? /체크/.test(x.name) : /신용/.test(x.name)); if (m && /카드/.test(s)) method = m.id; }
  return { amount, date, memo, cancel, method };
}
function applySms() {
  const box = $('#f-sms');
  if (!box || !F) return;
  const r = parseSms(box.value);
  const hint = $('#smsHint');
  if (!r) { if (hint) hint.textContent = '금액을 찾지 못했어요. 문자 전체를 붙여 넣어 주세요.'; return; }
  F.amount = r.amount;
  if (r.date) F.date = r.date;
  if (r.memo) F.memo = r.memo;
  if (r.method) F.method = r.method;
  F.smsOpen = false;
  rerenderSheet(txSheet());
  learnFromMemo();
  const h = $('#learnHint');
  if (h) h.textContent = `문자에서 읽었어요: ${won(r.amount)}${r.memo ? ' · ' + r.memo : ''}${r.date ? ' · ' + mdLabel(r.date) : ''}${r.cancel ? ' · 취소 문자예요. 원래 기록을 지우는 게 좋아요' : ''}`;
}

/* ================= 신용점수 ================= */
function creditArr() {
  const a = [];
  for (const id in S.credit) { const c = S.credit[id]; if (c && c.score) a.push({ ...c, id }); }
  return a.sort((x, y) => (x.date !== y.date ? (x.date < y.date ? 1 : -1) : (y.at || 0) - (x.at || 0)));
}
function writeCredit(patch) {
  S.credit = { ...S.credit, ...patch };
  scheduleRender();
  if (!S.db) return Promise.resolve();
  const ref = S.db.doc('meta/credit');
  return track(enqueue('meta/credit', async () => {
    try { await retry(() => ref.update({ items: patch })); }
    catch (e) {
      if (e && e.code === 'invalid_argument' && !S.creditDoc) await retry(() => ref.set({ items: patch }));
      else throw e;
    }
    S.creditDoc = true;
  }));
}
function vCredit() {
  const head = `<div class="view-h"><h1 class="view-title">신용점수</h1><div class="view-acts">${vAssetsSwitch('credit')}</div></div>`;
  if (isLoading()) return head + `<section class="card">${emptyBox('불러오는 중이에요', '')}</section>`;
  const list = creditArr(), t = todayStr();
  const byAg = ag => list.filter(c => c.agency === ag);
  const tile = ag => {
    const l = byAg(ag);
    if (!l.length) return `<div><span class="stat-l">${ag}</span><span class="habit-num">–</span><span class="sub muted">아직 기록이 없어요</span></div>`;
    const d = l[1] ? l[0].score - l[1].score : 0;
    return `<div><span class="stat-l">${ag} · ${l[0].date.replace(/-/g, '.')}</span><span class="habit-num">${l[0].score}<small>점</small></span><span class="sub ${d > 0 ? 'in-c' : 'muted'}">${l[1] ? (d > 0 ? `지난번보다 ${d}점 올랐어요` : d < 0 ? `지난번보다 ${-d}점 내렸어요` : '지난번과 같아요') : '첫 기록이에요'}</span></div>`;
  };
  const form = `<form id="creditForm" class="credit-form" autocomplete="off" novalidate>
      <label class="field"><span class="lab">점수</span><input class="input" id="cr-score" inputmode="numeric" maxlength="4" placeholder="예: 850"></label>
      <label class="field"><span class="lab">평가사</span><select class="input" id="cr-agency"><option>NICE</option><option>KCB</option></select></label>
      <label class="field"><span class="lab">확인한 날</span><input class="input" type="date" id="cr-date" value="${t}"></label>
      <button class="btn btn-primary" type="submit" id="cr-save" ${S.mode === 'denied' ? 'disabled' : ''}>기록</button>
    </form>`;
  return head + `<section class="card"><div class="habit-row">${tile('NICE')}${tile('KCB')}</div></section>
    <section class="card"><h2 class="card-t" style="margin-bottom:10px">점수 기록하기</h2>${form}
      <p class="set-note" style="margin-top:12px">신용점수는 은행·카드 앱이나 토스·카카오페이 같은 앱에서 무료로 볼 수 있어요. 점수를 조회해도 점수가 내려가지 않아요. 한 달에 한 번 적어 두면 변화를 보기 좋아요.</p></section>
    <section class="card"><h2 class="card-t" style="margin-bottom:6px">기록</h2>${list.length ? `<div class="rank">${list.map(c => `<div class="dep-row"><span class="emo" aria-hidden="true">${c.agency === 'KCB' ? 'K' : 'N'}</span><span class="tx-main"><span class="tx-title">${c.score}점${c.ex ? '<span class="tag">예시</span>' : ''}</span><span class="tx-sub">${c.agency} · ${c.date.replace(/-/g, '.')}</span></span><span></span><button class="icon-btn" type="button" data-act="credit-del" data-id="${esc(c.id)}" aria-label="이 기록 지우기">${icon('trash')}</button></div>`).join('')}</div>` : emptyBox('아직 기록이 없어요', '위에서 오늘 점수를 적어 보세요.')}</section>
    <section class="card"><h2 class="card-t" style="margin-bottom:6px">점수 관리 기본</h2><ul class="report-list">
      <li>카드값·대출 이자는 하루도 늦지 않게 내요. 연체가 점수에 가장 크게 영향을 줘요.</li>
      <li>신용카드 한도를 꽉 채워 쓰지 않는 게 좋아요.</li>
      <li>통신비·공과금을 꾸준히 낸 기록을 평가사에 제출하면 점수에 반영될 수 있어요.</li>
    </ul></section>`;
}
function saveCredit() {
  const score = +($('#cr-score') || {}).value, agency = ($('#cr-agency') || {}).value || 'NICE', date = ($('#cr-date') || {}).value;
  if (!(score >= 1 && score <= 1000) || !isYmd(date)) { toast('점수(1~1000)와 날짜를 확인해 주세요'); return; }
  writeCredit({ [uid('c')]: { score, agency, date, at: Date.now(), ex: false } });
  toast(`${agency} ${score}점을 기록했어요`);
}
const POLICY_LINK = 'https://www.youthcenter.go.kr';
function policyCard() {
  return `<section class="card policy-card">
    <h2 class="card-t">청년 자산형성 정책 찾아보기</h2>
    <p class="set-note">정부·지자체 청년 적금, 주거·월세 지원, 대출 지원은 온통청년(청년정책 통합 플랫폼)에서 나이와 지역으로 찾아볼 수 있어요. 가입 조건과 지원 금액은 해마다 바뀌니 꼭 공식 안내로 확인하세요.</p>
    <a class="btn btn-soft btn-sm" href="${POLICY_LINK}" target="_blank" rel="noopener">온통청년 열기 ↗</a>
  </section>`;
}

/* ================= 통계 ================= */
const WD = ['월', '화', '수', '목', '금', '토', '일'];
function statsSwitch(cur) {
  return `<div class="seg" role="group" aria-label="통계·예산 화면"><button type="button" id="sv-stats" data-view="stats" aria-pressed="${cur === 'stats'}">통계</button><button type="button" id="sv-budget" data-view="budget" aria-pressed="${cur === 'budget'}">예산</button></div>`;
}
function statsData(ym) {
  const t = todayStr(), curYm = ymOf(t), isCur = ym === curYm;
  const days = isCur ? +t.slice(8) : daysIn(ym);
  const list = txsOf(ym), outs = list.filter(x => x.kind === 'out'), tot = totals(list);
  const prevYm = addMonths(ym, -1), prevAll = txsOf(prevYm).filter(x => x.kind === 'out');
  const cut = isCur ? Math.min(+t.slice(8), daysIn(prevYm)) : 31;
  const prevOuts = prevAll.filter(x => +x.date.slice(8) <= cut);
  const hasPrev = prevAll.length > 0, prevOut = sum(prevOuts.map(x => x.amount));
  const fixed = sum(outs.filter(x => x.sub || x.loan).map(x => x.amount));
  const spentOn = new Set(outs.map(x => x.date));
  let free = 0;
  for (let d = 1; d <= days; d++) if (!spentOn.has(`${ym}-${pad(d)}`)) free++;
  const by = {}, pby = {}, cnt = {};
  for (const x of outs) { const k = x.cat || ''; by[k] = (by[k] || 0) + x.amount; cnt[k] = (cnt[k] || 0) + 1; }
  for (const x of prevOuts) { const k = x.cat || ''; pby[k] = (pby[k] || 0) + x.amount; }
  const cats = Object.entries(by).sort((a, b) => b[1] - a[1]).map(([id, v]) => ({ id, v, n: cnt[id], d: hasPrev ? v - (pby[id] || 0) : null }));
  const wSum = Array(7).fill(0), wCnt = Array(7).fill(0), wN = Array(7).fill(0);
  for (let d = 1; d <= days; d++) wCnt[(parseD(`${ym}-${pad(d)}`).getDay() + 6) % 7]++;
  for (const x of outs) { const w = (parseD(x.date).getDay() + 6) % 7; wSum[w] += x.amount; wN[w]++; }
  const wAvg = wSum.map((v, i) => (wCnt[i] ? v / wCnt[i] : 0));
  const months = [];
  for (let i = 5; i >= 0; i--) { const m = addMonths(ym, -i), tt = totals(txsOf(m)); months.push({ ym: m, out: tt.out, in: tt.in }); }
  const done = months.filter(m => m.out > 0 && m.ym < curYm);
  const avg = done.length >= 2 ? sum(done.map(m => m.out)) / done.length : 0;
  const fm = {};
  for (const x of outs) {
    const k = (x.memo || '').trim(); if (!k) continue;
    if (!fm[k]) fm[k] = { k, n: 0, v: 0, cat: x.cat };
    fm[k].n++; fm[k].v += x.amount;
  }
  const freq = Object.values(fm).filter(f => f.n >= 2).sort((a, b) => b.n - a.n || b.v - a.v).slice(0, 5);
  const big = [...outs].sort((a, b) => b.amount - a.amount || byRecent(a, b)).slice(0, 3);
  return { ym, isCur, days, tot, outs, prevYm, prevOut, hasPrev, fixed, free, cats, wAvg, wSum, wN, wCnt, months, avg, freq, big };
}
const share = (v, total) => { const p = total > 0 ? v / total * 100 : 0; return p > 0 && p < 1 ? '<1%' : Math.round(p) + '%'; };
function statsSummary(D) {
  const L = [];
  if (D.hasPrev) {
    const d = D.tot.out - D.prevOut, lab = D.isCur ? '지난달 이맘때보다' : '지난달보다';
    L.push(d < 0 ? `${lab} <b>${won(-d)}</b> 덜 썼어요.` : d > 0 ? `${lab} <b>${won(d)}</b> 더 썼어요.` : `${D.isCur ? '지난달 이맘때와' : '지난달과'} 똑같이 썼어요.`);
  }
  if (D.cats.length) {
    const c = catOf(D.cats[0].id);
    L.push(`${esc(c.emoji)} <b>${esc(josa(c.name, '이/가'))}</b> 전체의 ${share(D.cats[0].v, D.tot.out)}로 가장 커요.`);
  }
  if (D.outs.length >= 5) {
    const w = D.wAvg.indexOf(Math.max(...D.wAvg));
    L.push(`<b>${WD[w]}요일</b>에 가장 많이 써요. 하루 평균 ${won(D.wAvg[w])}이에요.`);
  }
  if (D.fixed > 0) L.push(`구독·대출 같은 고정비가 지출의 ${share(D.fixed, D.tot.out)}예요.`);
  return L;
}
/* column chart: one series, emphasis on one column, value label only on the emphasised one */
function colChart(id, label, cols, opt) {
  const max = Math.max(1, ...cols.map(c => c.v), opt.ref || 0) * 1.08;
  const ref = opt.ref > 0 ? `<span class="cc-ref" style="bottom:${(opt.ref / max * 100).toFixed(2)}%"><em>${esc(opt.refLabel)}</em></span>` : '';
  return `<div class="cc" id="${id}" role="group" aria-label="${esc(label)}">
    <div class="cc-plot">${ref}${cols.map(c => {
      const h = c.v > 0 ? Math.max(1.5, c.v / max * 100) : 0;
      return `<button type="button" class="cc-col${c.on ? ' on' : ''}" data-tip-t="${esc(c.tipT)}" data-tip-r="${esc(JSON.stringify(c.rows))}" aria-label="${esc(c.aria)}"><span class="cc-bar" style="height:${h.toFixed(2)}%">${c.on && c.v > 0 ? `<em>${compact(c.v)}</em>` : ''}</span></button>`;
    }).join('')}</div>
    <div class="cc-x" aria-hidden="true">${cols.map(c => `<span${c.on ? ' class="on"' : ''}>${esc(c.x)}</span>`).join('')}</div>
    <div class="tip" hidden></div>
  </div>`;
}
function ccTip(col) {
  const host = col.closest('.cc'), tip = host && host.querySelector('.tip');
  if (!tip) return;
  host.querySelectorAll('.cc-col.hov').forEach(x => x.classList.remove('hov'));
  col.classList.add('hov');
  tip.textContent = '';
  const h = document.createElement('p'); h.className = 'tip-d'; h.textContent = col.dataset.tipT; tip.appendChild(h);
  let rows = []; try { rows = JSON.parse(col.dataset.tipR || '[]'); } catch (e) { /* ignore */ }
  for (const [n, v] of rows) {
    const r = document.createElement('div'); r.className = 'tip-r';
    const a = document.createElement('span'); a.className = 'n'; a.textContent = n;
    const b = document.createElement('span'); b.className = 'v'; b.textContent = v;
    r.append(a, b); tip.appendChild(r);
  }
  tip.hidden = false;
  const hr = host.getBoundingClientRect(), cr = col.getBoundingClientRect(), tw = tip.offsetWidth;
  let left = cr.left - hr.left + cr.width / 2 - tw / 2;
  left = Math.max(0, Math.min(left, hr.width - tw));
  tip.style.left = left + 'px';
}
function ccHide(host) {
  if (!host) return;
  host.querySelectorAll('.cc-col.hov').forEach(x => x.classList.remove('hov'));
  const tip = host.querySelector('.tip'); if (tip) tip.hidden = true;
}
document.addEventListener('pointerover', e => { const c = e.target.closest && e.target.closest('.cc-col'); if (c) ccTip(c); });
document.addEventListener('pointerout', e => { const h = e.target.closest && e.target.closest('.cc'); if (h && !h.contains(e.relatedTarget) && !h.contains(document.activeElement)) ccHide(h); });
document.addEventListener('focusin', e => { const c = e.target.closest && e.target.closest('.cc-col'); if (c) ccTip(c); });
document.addEventListener('focusout', e => { const h = e.target.closest && e.target.closest('.cc'); if (h && !h.contains(e.relatedTarget)) ccHide(h); });

function vStats() {
  const ym = S.ym, top = `<div class="view-switch">${statsSwitch('stats')}</div>`;
  const head = `${top}<div class="view-h"><h1 class="view-title">${mLabel(ym)} 통계</h1></div>`;
  if (isLoading()) return head + `<section class="card">${emptyBox('불러오는 중이에요', '')}</section>`;
  if (ym > ymOf(todayStr())) return head + `<section class="card">${emptyBox('아직 시작하지 않은 달이에요', '이번 달로 돌아가면 지금까지의 통계를 볼 수 있어요.', `<button class="btn btn-soft btn-sm" type="button" data-act="month-now">이번 달 보기</button>`)}</section>`;
  const D = statsData(ym);
  if (!D.outs.length && !D.tot.in) return head + `<section class="card">${emptyBox(`${mLabel(ym)} 기록이 아직 없어요`, '지출을 몇 건만 적어도 어디에 많이 쓰는지, 무슨 요일에 많이 쓰는지 정리해 드려요.', `<button class="btn btn-primary btn-sm" type="button" data-act="add">${icon('plus')}기록하기</button>`)}</section>`;
  const T = S.stTables || {};
  const lines = statsSummary(D);
  const hero = `<section class="card st-hero">
    <p class="hero-label">${mLabel(ym)} 지출${D.isCur ? ' · 오늘까지' : ''}</p>
    <p class="hero-num">${fmt(D.tot.out)}<span class="u">원</span></p>
    ${lines.length ? `<ul class="st-sum">${lines.map(l => `<li>${l}</li>`).join('')}</ul>` : ''}
  </section>`;
  const rate = D.tot.in > 0 ? (D.tot.in - D.tot.out) / D.tot.in : null;
  const kpi = `<section class="card"><div class="kpi">
    <div><span class="stat-l">하루 평균 지출</span><span class="kpi-v">${won(D.tot.out / D.days)}</span><span class="kpi-s">${D.days}일 기준</span></div>
    <div><span class="stat-l">저축률</span><span class="kpi-v">${rate == null ? '–' : (rate < 0 ? '−' : '') + Math.round(Math.abs(rate) * 100) + '%'}</span><span class="kpi-s">${rate == null ? '수입을 적으면 보여요' : rate < 0 ? '수입보다 더 썼어요' : '수입 중 남긴 돈'}</span></div>
    <div><span class="stat-l">지출 없는 날</span><span class="kpi-v">${D.free}<small>일</small></span><span class="kpi-s">${D.days}일 중</span></div>
    <div><span class="stat-l">고정비 비중</span><span class="kpi-v">${D.tot.out ? share(D.fixed, D.tot.out) : '–'}</span><span class="kpi-s">구독·대출 ${won(D.fixed)}</span></div>
  </div></section>`;

  const trendCols = D.months.map(m => ({
    v: m.out, on: m.ym === ym, x: `${+m.ym.slice(5)}월`, tipT: mLabel(m.ym),
    rows: [['지출', won(m.out)], ['수입', won(m.in)]], aria: `${mLabel(m.ym)} 지출 ${won(m.out)}, 수입 ${won(m.in)}`,
  }));
  const trend = `<section class="card">
    <div class="card-h"><h2 class="card-t">최근 6개월 지출</h2><button class="card-link" type="button" data-act="st-table" data-k="trend">${T.trend ? '그래프로 보기' : '표로 보기'}</button></div>
    ${T.trend ? `<div class="tbl-wrap"><table class="tbl"><caption class="sr-only">최근 6개월 지출과 수입</caption><thead><tr><th scope="col">달</th><th scope="col">지출</th><th scope="col">수입</th></tr></thead><tbody>${D.months.map(m => `<tr><td>${mLabel(m.ym)}</td><td>${won(m.out)}</td><td>${won(m.in)}</td></tr>`).join('')}</tbody></table></div>`
      : colChart('st-trend', '최근 6개월 지출', trendCols, { ref: D.avg, refLabel: `월평균 ${compact(D.avg)}` })}
    <p class="bud-foot">${D.avg ? `지난 달들의 월평균은 <b>${won(D.avg)}</b>이에요.` : '두 달 이상 기록이 쌓이면 월평균을 함께 보여 드려요.'}</p>
  </section>`;

  const wMax = Math.max(...D.wAvg), wTop = D.outs.length ? D.wAvg.indexOf(wMax) : -1;
  const weekCols = WD.map((w, i) => ({
    v: D.wAvg[i], on: i === wTop, x: w, tipT: `${w}요일`,
    rows: [['하루 평균', won(D.wAvg[i])], ['합계', `${won(D.wSum[i])} · ${D.wN[i]}건`]], aria: `${w}요일 하루 평균 ${won(D.wAvg[i])}`,
  }));
  const week = `<section class="card">
    <div class="card-h"><h2 class="card-t">요일별 하루 평균</h2><button class="card-link" type="button" data-act="st-table" data-k="week">${T.week ? '그래프로 보기' : '표로 보기'}</button></div>
    ${T.week ? `<div class="tbl-wrap"><table class="tbl"><caption class="sr-only">요일별 지출</caption><thead><tr><th scope="col">요일</th><th scope="col">하루 평균</th><th scope="col">합계</th><th scope="col">건수</th></tr></thead><tbody>${WD.map((w, i) => `<tr><td>${w}요일</td><td>${won(D.wAvg[i])}</td><td>${won(D.wSum[i])}</td><td>${D.wN[i]}</td></tr>`).join('')}</tbody></table></div>`
      : colChart('st-week', '요일별 하루 평균 지출', weekCols, {})}
    <p class="bud-foot">${wTop >= 0 ? `<b>${WD[wTop]}요일</b>에 가장 많이 써요. 그날만 조금 줄여도 효과가 커요.` : '지출을 적으면 무슨 요일에 많이 쓰는지 알려 드려요.'}</p>
  </section>`;

  const maxC = D.cats.length ? D.cats[0].v : 1;
  const cats = `<section class="card">
    <div class="card-h"><h2 class="card-t">카테고리별 지출</h2><span class="muted" style="font-size:13px">${D.hasPrev ? (D.isCur ? '지난달 이맘때와 비교' : '지난달과 비교') : `${D.outs.length}건`}</span></div>
    ${D.cats.length ? `<div class="rank">${D.cats.map(c => {
      const k = catOf(c.id);
      const dl = c.d == null ? `${c.n}건` : c.d > 0 ? `<span class="dlt up">▲ ${won(c.d)}</span>` : c.d < 0 ? `<span class="dlt down">▼ ${won(-c.d)}</span>` : '<span class="dlt">변화 없음</span>';
      return `<button class="rank-row" type="button" data-act="filter-cat" data-cat="${esc(c.id)}" aria-label="${esc(k.name)} ${won(c.v)}, 내역 보기">
        <span class="emo" aria-hidden="true"${ccStyle(k)}>${esc(k.emoji)}</span>
        <span class="rank-main"><span class="rank-line"><span class="rank-name">${esc(k.name)}</span><span class="rank-amt">${won(c.v)}</span></span><span class="bar"><span style="width:${(c.v / maxC * 100).toFixed(1)}%"></span></span><span class="rank-sub">${dl}</span></span>
        <span class="rank-pct">${share(c.v, D.tot.out)}</span></button>`;
    }).join('')}</div>` : emptyBox('지출이 아직 없어요', '')}
  </section>`;

  const fx = D.tot.out ? D.fixed / D.tot.out : 0;
  const split = `<section class="card">
    <div class="card-h"><h2 class="card-t">고정비와 생활비</h2></div>
    <div class="split" role="img" aria-label="고정비 ${share(D.fixed, D.tot.out)}, 생활비 ${share(D.tot.out - D.fixed, D.tot.out)}">${fx > 0 ? `<span class="s-fix" style="flex:${fx.toFixed(4)}"></span>` : ''}${fx < 1 ? `<span class="s-var" style="flex:${(1 - fx).toFixed(4)}"></span>` : ''}</div>
    <div class="split-leg">
      <div><i class="k fix"></i><span class="n">고정비 <small>구독·대출</small></span><b>${won(D.fixed)}</b><span class="muted">${share(D.fixed, D.tot.out)}</span></div>
      <div><i class="k var"></i><span class="n">생활비 <small>그 밖의 지출</small></span><b>${won(D.tot.out - D.fixed)}</b><span class="muted">${share(D.tot.out - D.fixed, D.tot.out)}</span></div>
    </div>
    <p class="bud-foot">고정비는 매달 저절로 나가는 돈이에요. 안 쓰는 구독을 정리하면 생활비를 더 쓸 수 있어요.</p>
  </section>`;

  const freq = `<section class="card">
    <div class="card-h"><h2 class="card-t">자주 쓴 곳</h2><button class="card-link" type="button" data-act="go-often">반복 지출 전체${icon('right')}</button></div>
    ${D.freq.length ? `<div class="rank">${D.freq.map((f, i) => `<button class="rank-row freq" type="button" data-act="st-search" data-q="${esc(f.k)}" aria-label="${esc(f.k)} ${f.n}번 ${won(f.v)}, 내역 보기">
      <span class="emo num" aria-hidden="true">${i + 1}</span>
      <span class="rank-main"><span class="rank-line"><span class="rank-name">${esc(f.k)}</span><span class="rank-amt">${won(f.v)}</span></span><span class="rank-sub">${esc(catOf(f.cat).name)} · ${f.n}번</span></span>
      <span class="rank-pct">${icon('right')}</span></button>`).join('')}</div>`
      : emptyBox('아직 두 번 이상 쓴 곳이 없어요', '메모에 가게 이름을 적어 두면 자주 가는 곳을 모아 드려요.')}
  </section>`;

  const big = `<section class="card">
    <div class="card-h"><h2 class="card-t">가장 큰 지출</h2></div>
    ${D.big.length ? `<div class="rank">${D.big.map(txRow).join('')}</div>` : emptyBox('지출이 아직 없어요', '')}
  </section>`;

  return head + hero + kpi + `<div class="cols"><div class="col">${trend}${week}${split}</div><div class="col">${cats}${freq}${big}</div></div>`;
}

/* ================= 예정된 정기 납부 (구독·고정 납부·대출) ================= */
const periodKey = id => id.slice(id.lastIndexOf('_') + 1);
const isSkipped = (o, id) => !!(o && o.skips && o.skips[periodKey(id)]);
const BILL_PRESETS = [
  { name: '월세', emoji: '🏠', cat: 'home' }, { name: '관리비', emoji: '🏢', cat: 'home' }, { name: '통신비', emoji: '📱', cat: 'home' },
  { name: '공과금', emoji: '💡', cat: 'home' }, { name: '보험료', emoji: '🛡️', cat: 'health' }, { name: '학원비', emoji: '📚', cat: 'edu' },
];
// every payment that is due between two dates and not yet recorded (or skipped on purpose)
function plannedIn(from, to) {
  if (from > to) return [];
  const keys = allKeys(), out = [];
  for (const s of subsArr()) {
    if (!s.active || !(s.amount > 0)) continue;
    const since = isYmd(s.since) ? s.since : from;
    for (const d of occsBetween(s, since > from ? since : from, to)) {
      const id = subTxId(s, d);
      if (keys.has(id) || isSkipped(s, id)) continue;
      out.push({ date: d, id, src: 'sub', ref: s.id, bill: s.type === 'bill', name: s.name, emoji: s.emoji || catOf(s.cat).emoji, amount: s.amount, cat: s.cat, method: s.method });
    }
  }
  for (const l of loansArr()) {
    if (!(l.principal > 0)) continue;
    for (const r of loanSchedule(l)) {
      if (r.date < from || r.date > to || !(r.pay > 0)) continue;
      const id = `l_${l.id}_${r.date.slice(0, 7).replace('-', '')}`;
      if (keys.has(id) || isSkipped(l, id)) continue;
      out.push({ date: r.date, id, src: 'loan', ref: l.id, name: l.name, emoji: '💸', amount: r.pay, cat: 'loan', method: l.method, k: r.k, int: r.int, memo: loanMemo(l, r),
        lmeta: l.entry === 'quick' && l.type === 'bullet' ? (r.prin > 0 ? `만기 · 원금 ${won(r.prin)} + 이자 ${won(r.int)}` : '이자만') : `${r.k}회차 · 이자 ${won(r.int)}` });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.name.localeCompare(b.name)));
}
if (window.__MOCK__) { window.__plannedIn = plannedIn; window.__acct = id => acctState(acctOf(id)); } // test hook
const planKind = p => (p.src === 'loan' ? '대출' : p.bill ? '고정 납부' : '구독');
function planRow(p) {
  const early = p.date > todayStr(), m = methodOf(p.method);
  const meta = [p.src === 'loan' ? p.lmeta : catOf(p.cat).name];
  if (m) meta.push(m.name);
  return `<div class="plan-row">
    <span class="emo" aria-hidden="true">${esc(p.emoji)}</span>
    <span class="tx-main"><span class="tx-title">${esc(p.name)}<span class="tag plan">${planKind(p)}</span></span><span class="tx-sub">${esc(meta.join(' · '))}</span></span>
    <span class="tx-amt plan-amt">−${won(p.amount)}</span>
    <div class="plan-acts">
      <button class="btn btn-primary btn-sm" type="button" data-act="plan-pay" data-id="${esc(p.id)}" data-date="${p.date}" ${S.mode === 'denied' ? 'disabled' : ''}>${early ? '미리 냈어요' : '냈어요'}</button>
      <button class="btn btn-soft btn-sm" type="button" data-act="plan-skip" data-id="${esc(p.id)}" data-date="${p.date}" ${S.mode === 'denied' ? 'disabled' : ''}>이번엔 안 내요</button>
      <button class="btn btn-ghost btn-sm" type="button" data-act="${p.src === 'loan' ? 'edit-loan' : 'edit-sub'}" data-id="${esc(p.ref)}">${p.src === 'loan' ? '대출 고치기' : '정기 납부 고치기'}</button>
    </div>
  </div>`;
}
function plannedBlock(date) {
  const items = date >= todayStr() ? plannedIn(date, date) : [];
  if (!items.length) return '';
  return `<div class="plan-box"><p class="plan-h">${icon('repeat', 'sm')}예정된 정기 납부 <span class="muted">${items.length}건 · ${won(sum(items.map(p => p.amount)))}</span></p>${items.map(planRow).join('')}</div>`;
}
const findPlan = (id, date) => plannedIn(date, date).find(p => p.id === id) || null;
function payPlan(id, date) {
  const p = findPlan(id, date);
  if (!p || S.mode === 'denied') return;
  const t = todayStr(), early = p.date > t;
  if (p.src === 'loan') ensureLoanCat();
  F = {
    mode: 'tx', id: null, newId: p.id, planDate: p.date, origYm: null, kind: 'out', amount: p.amount,
    cat: p.src === 'loan' ? 'loan' : p.cat, memo: p.src === 'loan' ? p.memo : p.name,
    date: early ? t : p.date, method: p.method || '', sub: p.src === 'sub' ? p.ref : '', loan: p.src === 'loan' ? p.ref : '', ex: false, at: 0, catTouched: true,
  };
  showSheet(txSheet(), '#f-amount');
}
function skipPlan(id, date) {
  const p = findPlan(id, date);
  if (!p || S.mode === 'denied') return;
  const k = periodKey(p.id);
  const setSkip = on => {
    if (p.src === 'loan') { const l = S.loans[p.ref]; if (l) writeLoans({ [p.ref]: { ...l, skips: { ...(l.skips || {}), [k]: on } } }); }
    else { const s = S.subs[p.ref]; if (s) writeSubs({ [p.ref]: { ...s, skips: { ...(s.skips || {}), [k]: on } } }); }
    refreshDaySheet();
  };
  setSkip(true);
  toast(`${mdLabel(p.date)} ‘${p.name}’ 납부는 건너뛸게요`, { undo: () => setSkip(false) });
}
function refreshDaySheet() { if (F && F.mode === 'day' && $('#sheet .day-sheet')) rerenderSheet(daySheetHtml(F.date)); }
function openBillSheet(date) {
  openSubSheet(null);
  if (!F || F.mode !== 'sub') return;
  F.type = 'bill';
  if (isYmd(date)) { F.day = +date.slice(8); F.month = +date.slice(5, 7); }
  const home = catsOf('out').find(c => c.id === 'home');
  if (home) F.cat = home.id;
  rerenderSheet(subSheet());
  const n = $('#s-name'); if (n) n.focus();
}
function loanRow(l) {
  const st = loanStats(l), t = todayStr();
  const keys = allKeys();
  const nx = st.rows.find(r => r.date >= t && !keys.has(`l_${l.id}_${r.date.slice(0, 7).replace('-', '')}`) && !isSkipped(l, `l_${l.id}_${r.date.slice(0, 7).replace('-', '')}`));
  const left = st.rows.filter(r => r.date >= t).length;
  return `<button class="sub-row" type="button" data-act="edit-loan" data-id="${esc(l.id)}">
    <span class="emo" aria-hidden="true">💸</span>
    <span class="tx-main"><span class="sub-name">${esc(l.name)}<span class="tag plan">대출</span>${l.ex ? '<span class="tag">예시</span>' : ''}</span><span class="sub-meta">매월 ${l.day}일 · ${l.open ? '이자만 · 만기 미정' : left ? `${left}회 남음` : '상환 끝'}${nx ? ` · 다음 ${mdLabel(nx.date)}` : ''}</span></span>
    <span class="sub-end"><span class="sub-amt">${nx ? won(nx.pay) : '–'}</span>${nx ? `<span class="dday${diffDays(t, nx.date) <= 3 ? ' soon' : ''}">${ddayText(nx.date)}</span>` : ''}</span>
  </button>`;
}
const loanMonthly = l => { const st = loanStats(l), r = st.thisMonth || st.next; return r ? r.pay : 0; };

/* ================= 대출 간편 입력: 남은 원금 + 매달 이자만 넣으면 끝 ================= */
const LOAN_PRESETS = [
  { name: '전세자금대출', kind: 'int', e: '🏠' }, { name: '학자금대출', kind: 'amort', e: '🎓' }, { name: '신용대출', kind: 'amort', e: '💳' },
  { name: '주택담보대출', kind: 'amort', e: '🏡' }, { name: '자동차 할부', kind: 'amort', e: '🚗' },
];
const rateText = r => `연 ${(Math.round(r * 100) / 100).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}%`;
function quickF(l, id, extra) {
  const t = todayStr();
  const base = { mode: 'loan', quick: true, id: id || null, name: '', lender: '', principal: 0, kind: 'int', int: 0, pay: 0, endY: '', endM: +t.slice(5, 7), day: +t.slice(8), method: (cfg().methods.find(m => /이체|계좌/.test(m.name)) || {}).id || lastMethod(), auto: true, ex: false, since: t };
  if (!l) return { ...base, ...(extra || {}) };
  const st = loanStats({ ...l, id }), nx = st.next;
  return {
    ...base, name: l.name || '', lender: l.lender || '', principal: st.remaining, kind: l.type === 'bullet' ? 'int' : 'amort',
    int: l.type === 'bullet' ? Math.round(+l.fixedInt || (nx ? nx.int : 0)) : (nx ? nx.int : 0), pay: Math.round(+l.fixedPay || (nx ? nx.pay : 0)),
    endY: l.type === 'bullet' && !l.open ? +st.end.slice(0, 4) : '', endM: l.type === 'bullet' && !l.open ? +st.end.slice(5, 7) : +t.slice(5, 7),
    day: l.day || 1, method: l.method || '', auto: l.auto !== false, ex: !!l.ex, since: l.since || t,
  };
}
// turn the simple answers into a regular loan (schedule starts with the next payment day)
function quickCalc(f) {
  const t = todayStr(), P = f.principal, I = f.int, A = f.pay;
  if (!f.name.trim()) return { ok: false, msg: '대출 이름을 넣어 주세요.' };
  if (!(P > 0)) return { ok: false, msg: '지금 남은 원금을 넣어 주세요.' };
  if (f.kind === 'int' && !(I > 0)) return { ok: false, msg: '매달 내는 이자를 넣어 주세요.' };
  if (f.kind === 'amort' && !(A > 0)) return { ok: false, msg: '매달 내는 돈(원금+이자)을 넣어 주세요.' };
  if (f.kind === 'amort' && !(A > I)) return { ok: false, msg: '매달 내는 돈이 이자보다 많아야 원금이 줄어요.' };
  const first = nextOcc({ day: f.day }, t), fy = +first.slice(0, 4), fm = +first.slice(5, 7);
  const py = fm === 1 ? fy - 1 : fy, pm = fm === 1 ? 12 : fm - 1;
  const start = occOn({ day: f.day }, py, pm), rate = (I * 12) / P * 100;
  let loan;
  if (f.kind === 'int') {
    let term = 360, open = true;
    if (f.endY) {
      term = (f.endY * 12 + f.endM) - (py * 12 + pm); open = false;
      if (term < 1) return { ok: false, msg: '만기가 다음 납부일보다 빨라요. 만기를 확인해 주세요.' };
    }
    loan = { type: 'bullet', principal: P, rate, start, term, fixedInt: I, fixedPay: 0, open };
  } else {
    const r = rate / 100 / 12;
    const term = r > 0 ? Math.ceil(-Math.log(1 - (r * P) / A) / Math.log(1 + r) - 1e-9) : Math.ceil(P / A);
    if (!(term >= 1) || term > 600) return { ok: false, msg: '다 갚는 데 50년이 넘게 걸려요. 금액을 확인해 주세요.' };
    loan = { type: 'equal', principal: P, rate, start, term, fixedInt: 0, fixedPay: A, open: false };
  }
  const st = loanStats({ ...loan, day: f.day });
  let msg;
  if (f.kind === 'int') msg = `매달 ${f.day}일에 이자 ${won(I)}을 내요 (${rateText(rate)} 수준) · 첫 납부 ${mdw(first)}` + (loan.open ? ' · 만기는 정하지 않았어요' : ` · ${f.endY}년 ${f.endM}월 만기에 원금 ${won(P)}을 갚아요`);
  else msg = `매달 ${f.day}일에 ${won(A)}씩 내요 (${rateText(rate)} 수준) · ${loan.term}개월 뒤 ${st.end.slice(0, 4)}년 ${+st.end.slice(5, 7)}월에 다 갚아요 · 앞으로 낼 이자 약 ${won(st.restInt)}`;
  return { ok: true, msg, loan, first };
}
function quickLoanSheet() {
  const f = F, isEdit = !!f.id, q = quickCalc(f), t = todayStr(), y0 = +t.slice(0, 4);
  return `<form id="qloanForm" autocomplete="off" novalidate>
    <div class="sheet-h"><h2 id="sheetTitle">${isEdit ? '대출 고치기' : '대출 추가'}</h2><button class="icon-btn" type="button" data-act="close" aria-label="닫기">${icon('x')}</button></div>
    ${isEdit ? '' : `<div class="seg" role="group" aria-label="입력 방식" style="width:100%"><button type="button" id="lq-quick" data-act="l-qmode" data-v="quick" aria-pressed="true">간편 입력</button><button type="button" id="lq-detail" data-act="l-qmode" data-v="detail" aria-pressed="false">자세히 입력</button></div>
    <div class="chips preset" role="group" aria-label="자주 쓰는 대출">${LOAN_PRESETS.map((p, i) => `<button class="chip" type="button" data-act="l-preset" data-i="${i}">${p.e} ${p.name}</button>`).join('')}</div>`}
    <div class="field"><label class="lab" for="q-name">이름</label><input class="input" id="q-name" maxlength="30" placeholder="예: 전세자금대출" value="${esc(f.name)}"></div>
    <div class="field"><label class="lab" for="q-principal">지금 남은 원금</label><div class="amt"><input id="q-principal" inputmode="numeric" placeholder="0" value="${f.principal ? fmt(f.principal) : ''}"><span>원</span></div><p class="amt-hint" id="qpHint">${f.principal >= 1e4 ? koreanWon(f.principal) : '처음 빌린 금액이 아니라 오늘 기준으로 남은 금액이에요.'}</p></div>
    <div class="field"><span class="lab" id="qkLab">갚는 방식</span><div class="seg" role="group" aria-labelledby="qkLab" style="width:100%"><button type="button" id="qk-int" data-act="l-kind" data-v="int" ${pressed(f.kind === 'int')}>이자만 내요</button><button type="button" id="qk-amort" data-act="l-kind" data-v="amort" ${pressed(f.kind === 'amort')}>원금도 같이 갚아요</button></div></div>
    ${f.kind === 'amort' ? `<div class="field"><label class="lab" for="q-pay">매달 내는 돈 <span class="muted" style="font-weight:400">(원금+이자)</span></label><div class="amt"><input id="q-pay" inputmode="numeric" placeholder="0" value="${f.pay ? fmt(f.pay) : ''}"><span>원</span></div></div>` : ''}
    <div class="field"><label class="lab" for="q-int">${f.kind === 'amort' ? '그중 이번 달 이자' : '매달 내는 이자'}</label><div class="amt"><input id="q-int" inputmode="numeric" placeholder="0" value="${f.int ? fmt(f.int) : ''}"><span>원</span></div><p class="amt-hint">은행 앱의 ‘상환 내역’이나 문자에서 볼 수 있어요. 금리는 자동으로 계산해요.</p></div>
    ${f.kind === 'int' ? `<div class="field"><span class="lab" id="qeLab">만기 <span class="muted" style="font-weight:400">(모르면 비워 두세요)</span></span><div class="field-row" role="group" aria-labelledby="qeLab"><select class="input" id="q-end-y" aria-label="만기 연도"><option value="">정하지 않음</option>${range(y0, y0 + 40).map(y => `<option value="${y}"${y === f.endY ? ' selected' : ''}>${y}년</option>`).join('')}</select><select class="input" id="q-end-m" aria-label="만기 월" ${f.endY ? '' : 'disabled'}>${range(1, 12).map(m => `<option value="${m}"${m === f.endM ? ' selected' : ''}>${m}월</option>`).join('')}</select></div></div>` : ''}
    <div class="field"><label class="lab" for="q-day">매달 내는 날</label><select class="input" id="q-day">${range(1, 31).map(d => `<option value="${d}"${d === f.day ? ' selected' : ''}>${d}일</option>`).join('')}</select></div>
    <div class="field"><span class="lab" id="qmLab">결제수단</span><div class="chips" role="group" aria-labelledby="qmLab">${cfg().methods.map(m => `<button class="chip" type="button" id="lm-${esc(m.id)}" data-act="l-method" data-id="${esc(m.id)}" ${pressed(f.method === m.id)}>${esc(m.name)}</button>`).join('')}</div></div>
    <label class="check"><input type="checkbox" id="q-auto"${f.auto ? ' checked' : ''}><span>내는 날이 되면 내역에 ‘대출 상환’ 지출로 자동 기록하기</span></label>
    <p class="sheet-note q-prev${q.ok ? ' ok' : ''}" id="qPrev">${esc(q.msg)}</p>
    <p class="set-note" style="font-size:12.5px">저장하면 정기결제 목록과 달력에 바로 올라가요. 금리가 바뀌면 ‘고치기’에서 이자만 바꾸면 돼요.</p>
    <div class="sheet-actions">${isEdit ? `<button class="btn btn-danger" type="button" data-act="l-delete">${icon('trash')}삭제</button>` : ''}<button class="btn btn-primary btn-block" type="submit" id="q-save" ${q.ok ? '' : 'disabled'}>${isEdit ? '고친 내용 저장' : '추가하기'}</button></div>
  </form>`;
}
function refreshQuick() {
  const q = quickCalc(F), p = $('#qPrev');
  if (p) { p.textContent = q.msg; p.classList.toggle('ok', q.ok); }
  const s = $('#q-save'); if (s) s.disabled = !q.ok;
}
function saveQuickLoan() {
  const f = F, q = quickCalc(f);
  if (!q.ok) return;
  const t = todayStr(), id = f.id || uid('l'), prev = f.id ? S.loans[f.id] : null;
  const loan = {
    name: f.name.trim().slice(0, 30), lender: (f.lender || '').trim().slice(0, 20), principal: q.loan.principal, rate: Math.round(q.loan.rate * 1e6) / 1e6,
    start: q.loan.start, term: q.loan.term, type: q.loan.type, day: f.day, method: f.method, auto: f.auto,
    since: prev && prev.since && prev.since < t ? (f.auto && !prev.auto ? t : prev.since) : t,
    ex: !!f.ex, entry: 'quick', fixedInt: q.loan.fixedInt, fixedPay: q.loan.fixedPay, open: q.loan.open, skips: (prev && prev.skips) || {},
  };
  if (loan.auto) ensureLoanCat();
  writeLoans({ [id]: loan });
  closeSheet();
  toast(f.id ? '고쳤어요. 오늘 기준으로 다시 계산했어요' : `‘${loan.name}’${josa(loan.name, '을/를').slice(-1)} 추가했어요. 달력에 ${mdLabel(q.first)}부터 보여요`);
  autoRecord();
}
const loanMemo = (l, r) => (l.entry === 'quick' && l.type === 'bullet'
  ? `${l.name} ${r.prin > 0 ? '만기 상환' : '이자'}${r.prin > 0 ? ` (이자 ${fmt(r.int)}원)` : ''}`
  : `${l.name} ${r.k}회차 (이자 ${fmt(r.int)}원)`);

/* ================= 쓸 돈 메모 + 자주 쓴 내역 ================= */
// 같은 내용인지 비교할 때: 띄어쓰기·기호·대소문자를 무시해요 ("점심 " = "점심", "스타벅스!" = "스타벅스")
const normMemo = s => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
function memosArr() {
  const a = [];
  for (const id in S.memos) { const m = S.memos[id]; if (m && m.name != null) a.push({ ...m, id }); }
  return a;
}
const openMemos = () => memosArr().filter(m => m.status === 'plan');
function writeMemos(patch) {
  S.memos = { ...S.memos, ...patch };
  scheduleRender();
  if (!S.db) return Promise.resolve();
  const ref = S.db.doc('meta/memos');
  return track(enqueue('meta/memos', async () => {
    try { await retry(() => ref.update({ items: patch })); }
    catch (e) {
      if (e && e.code === 'invalid_argument' && !S.memosDoc) await retry(() => ref.set({ items: patch }));
      else throw e;
    }
    S.memosDoc = true;
  }));
}
const memoSort = (a, b) => (a.date || '9999') < (b.date || '9999') ? -1 : (a.date || '9999') > (b.date || '9999') ? 1 : (a.at || 0) - (b.at || 0);
// open memos that belong to a month: dated in that month, or undated (shown in the current month)
function memosFor(ym) {
  const cur = ymOf(todayStr());
  return openMemos().filter(m => (m.date ? ymOf(m.date) === ym : ym === cur)).sort(memoSort);
}
function memoTotalThisMonth() {
  const cur = ymOf(todayStr());
  return sum(memosFor(cur).map(m => m.amount || 0));
}

/* --- repeated spending: same memo written two or more times --- */
function repeatGroups(fromYm, toYm) {
  const g = {};
  for (const ym of Object.keys(S.months)) {
    if (ym < fromYm || ym > toYm) continue;
    for (const t of txsOf(ym)) {
      if (t.kind !== 'out' || t.sub || t.loan) continue;
      const k = normMemo(t.memo); if (!k) continue;
      const x = g[k] || (g[k] = { k, names: {}, n: 0, total: 0, min: Infinity, max: 0, last: null, cats: {}, methods: {}, months: {} });
      x.n++; x.total += t.amount; x.min = Math.min(x.min, t.amount); x.max = Math.max(x.max, t.amount);
      x.names[t.memo.trim()] = (x.names[t.memo.trim()] || 0) + 1;
      x.cats[t.cat || ''] = (x.cats[t.cat || ''] || 0) + 1;
      if (t.method) x.methods[t.method] = (x.methods[t.method] || 0) + 1;
      x.months[ymOf(t.date)] = (x.months[ymOf(t.date)] || 0) + 1;
      if (!x.last || byRecent(t, x.last) < 0) x.last = t;
    }
  }
  const top = o => Object.entries(o).sort((a, b) => b[1] - a[1])[0];
  return Object.values(g).filter(x => x.n >= 2).map(x => ({
    ...x, name: top(x.names)[0], cat: (top(x.cats) || [''])[0], method: (top(x.methods) || [''])[0], avg: x.total / x.n,
  })).sort((a, b) => b.n - a.n || b.total - a.total);
}
const OFTEN_RANGES = { 1: '이번 달', 3: '최근 3개월', 6: '최근 6개월' };
function oftenMode(ym) {
  if (isLoading()) return emptyBox('불러오는 중이에요', '');
  const span = S.oftenRange || 3, fromYm = addMonths(ym, -(span - 1));
  const groups = repeatGroups(fromYm, ym);
  let allOut = 0;
  for (const m of Object.keys(S.months)) if (m >= fromYm && m <= ym) allOut += totals(txsOf(m)).out;
  const seg = `<div class="seg" role="group" aria-label="기간">${Object.entries(OFTEN_RANGES).map(([k, v]) => `<button type="button" id="or-${k}" data-act="often-range" data-v="${k}" aria-pressed="${+k === span}">${v}</button>`).join('')}</div>`;
  if (!groups.length) return `<div class="often-head">${seg}</div>` + emptyBox('아직 두 번 이상 적은 내용이 없어요', '같은 내용(예: 점심, 스타벅스)으로 두 번 넘게 적으면 여기에 모여요. 다시 적을 때도 한 번에 채울 수 있어요.');
  const rep = sum(groups.map(x => x.total)), maxN = groups[0].n;
  const range = `${+fromYm.slice(5)}월~${+ym.slice(5)}월`;
  return `<div class="often-head">${seg}</div>
    <div class="often-sum">
      <div><span class="stat-l">반복해서 쓴 지출</span><span class="kpi-v">${groups.length}<small>가지</small></span><span class="kpi-s">${span === 1 ? mLabel(ym) : range}</span></div>
      <div><span class="stat-l">합계</span><span class="kpi-v">${won(rep)}</span><span class="kpi-s">전체 지출의 ${share(rep, allOut)}</span></div>
      <div><span class="stat-l">가장 자주</span><span class="kpi-v often-top">${esc(groups[0].name)}</span><span class="kpi-s">${groups[0].n}번 · 평균 ${won(groups[0].avg)}</span></div>
    </div>
    <div class="rank often-list">${groups.slice(0, 30).map((x, i) => {
      const c = catOf(x.cat);
      const spread = x.min === x.max ? `매번 ${won(x.min)}` : `${won(x.min)}~${won(x.max)}`;
      return `<div class="often-row">
        <span class="emo" aria-hidden="true"${ccStyle(c)}>${esc(c.emoji)}</span>
        <span class="rank-main"><span class="rank-line"><span class="rank-name">${esc(x.name)}</span><span class="rank-amt">${won(x.total)}</span></span><span class="bar"><span style="width:${(x.n / maxN * 100).toFixed(1)}%"></span></span><span class="rank-sub"><b>${x.n}번</b> · 평균 ${won(x.avg)} · ${spread} · 마지막 ${mdLabel(x.last.date)}</span></span>
        <div class="often-acts"><button class="btn btn-soft btn-sm" type="button" data-act="often-again" data-k="${esc(x.k)}" ${S.mode === 'denied' ? 'disabled' : ''}>${icon('plus', 'sm')}다시 기록</button><button class="btn btn-ghost btn-sm" type="button" data-act="st-search" data-q="${esc(x.name)}">내역 보기</button></div>
      </div>`;
    }).join('')}</div>
    <p class="set-note" style="margin-top:12px">띄어쓰기나 기호가 달라도 같은 내용으로 모아요. 정기결제·대출 자동 기록은 빼고 셌어요.</p>`;
}
function againFromGroup(k) {
  const span = S.oftenRange || 3, ym = S.ym;
  const x = repeatGroups(addMonths(ym, -(span - 1)), ym).find(g => g.k === k) || repeatGroups('0000-00', '9999-99').find(g => g.k === k);
  if (!x) return;
  openTxSheet({});
  if (!F || F.mode !== 'tx') return;
  Object.assign(F, { kind: 'out', memo: x.name, amount: x.last.amount, cat: x.cat || F.cat, method: x.method || x.last.method || F.method, catTouched: true, date: todayStr() });
  rerenderSheet(txSheet());
  const a = $('#f-amount'); if (a) { a.focus(); a.select(); }
}
// chips at the top of a new record: the things written most often lately
function oftenChips() {
  const ym = ymOf(todayStr());
  return repeatGroups(addMonths(ym, -2), ym).slice(0, 6);
}

/* --- 쓸 돈 메모 sheet --- */
function openMemoSheet(id, date) {
  if (S.mode === 'denied') return;
  const m = id && S.memos[id];
  if (id && !m) return;
  F = m
    ? { mode: 'memo', id, name: m.name || '', amount: m.amount || 0, cat: m.cat || lastCat('out'), date: m.date || '', note: m.note || '', ex: !!m.ex, at: m.at || 0 }
    : { mode: 'memo', id: null, name: '', amount: 0, cat: lastCat('out'), date: isYmd(date) ? date : '', note: '', ex: false, at: 0 };
  showSheet(memoSheet(), m ? null : '#m-name');
}
const canSaveMemo = () => !!(F && F.name.trim());
function memoHints() {
  const f = F, k = normMemo(f.name);
  if (!k) return '';
  const out = [];
  const dup = openMemos().find(m => m.id !== f.id && normMemo(m.name) === k);
  if (dup) out.push(`<div class="memo-hint warn">${icon('alert', 'sm')}<span>이미 ‘${esc(dup.name)}’ 메모가 있어요 (${dup.date ? mdLabel(dup.date) : '날짜 미정'} · ${won(dup.amount || 0)}).</span><button class="card-link" type="button" data-act="memo-edit" data-id="${esc(dup.id)}">그 메모 고치기</button></div>`);
  const past = repeatGroups('0000-00', '9999-99').find(g => g.k === k) || (() => {
    const hit = allTxs().find(t => t.kind === 'out' && normMemo(t.memo) === k);
    return hit ? { n: 1, avg: hit.amount, last: hit, cat: hit.cat } : null;
  })();
  if (past) out.push(`<div class="memo-hint">${icon('repeat', 'sm')}<span>지금까지 ${past.n}번 썼어요 · ${past.n > 1 ? `평균 ${won(past.avg)}` : won(past.avg)} · 마지막 ${mdLabel(past.last.date)}</span>${f.amount ? '' : `<button class="card-link" type="button" data-act="memo-fill" data-v="${Math.round(past.avg)}" data-cat="${esc(past.cat || '')}">그 금액으로 채우기</button>`}</div>`);
  return out.join('');
}
function memoSheet() {
  const f = F, isEdit = !!f.id, t = todayStr();
  const sat = (() => { const d = parseD(t), add = (6 - d.getDay() + 7) % 7 || 7; return addDays(t, add); })();
  return `<form id="memoForm" autocomplete="off" novalidate>
    <div class="sheet-h"><h2 id="sheetTitle">${isEdit ? '쓸 돈 메모 고치기' : '쓸 돈 메모'}</h2><button class="icon-btn" type="button" data-act="close" aria-label="닫기">${icon('x')}</button></div>
    <p class="set-note">앞으로 쓸 돈을 미리 적어 두면 남은 예산에서 빼고 보여 드려요. 실제로 쓰면 ‘썼어요’로 바로 기록이 돼요.</p>
    <div class="field"><label class="lab" for="m-name">무엇을 살 건가요?</label><input class="input" id="m-name" list="memoList2" maxlength="40" placeholder="예: 겨울 패딩, 친구 생일 선물" value="${esc(f.name)}"><datalist id="memoList2">${memoSuggestions('out').map(m => `<option value="${esc(m)}"></option>`).join('')}</datalist><div id="memoHints" aria-live="polite">${memoHints()}</div></div>
    <div class="field"><label class="lab" for="m-amount">얼마쯤 쓸까요? <span class="muted" style="font-weight:400">(대략이어도 괜찮아요)</span></label><div class="amt"><input id="m-amount" inputmode="numeric" placeholder="0" value="${f.amount ? fmt(f.amount) : ''}"><span>원</span></div></div>
    <div class="field"><span class="lab" id="mcLab">카테고리</span><div class="cat-grid" role="group" aria-labelledby="mcLab">${catsOf('out').map(c => `<button class="cat-opt" type="button" id="mc-${esc(c.id)}" data-act="memo-cat" data-id="${esc(c.id)}" ${pressed(f.cat === c.id)}><span class="e" aria-hidden="true"${ccStyle(c)}>${esc(c.emoji)}</span>${esc(c.name)}</button>`).join('')}</div></div>
    <div class="field"><label class="lab" for="m-date">언제 쓸까요?</label><div class="field-row"><input class="input" type="date" id="m-date" value="${f.date}" min="${isEdit ? '' : t}"><div class="chips"><button class="chip" type="button" data-act="memo-date" data-v="${sat}" ${pressed(f.date === sat)}>이번 주말</button><button class="chip" type="button" data-act="memo-date" data-v="" ${pressed(!f.date)}>날짜 미정</button></div></div></div>
    <div class="field"><label class="lab" for="m-note">메모 <span class="muted" style="font-weight:400">(선택)</span></label><input class="input" id="m-note" maxlength="60" placeholder="예: 블랙프라이데이 때 사기" value="${esc(f.note)}"></div>
    <div class="sheet-actions">${isEdit ? `<button class="btn btn-danger" type="button" data-act="memo-delete">${icon('trash')}삭제</button>` : ''}<button class="btn btn-primary btn-block" type="submit" id="m-save" ${canSaveMemo() ? '' : 'disabled'}>${isEdit ? '고친 내용 저장' : '메모하기'}</button></div>
  </form>`;
}
function refreshMemoHints() {
  const h = $('#memoHints'); if (h) h.innerHTML = memoHints();
  const s = $('#m-save'); if (s) s.disabled = !canSaveMemo();
}
function saveMemo() {
  const f = F;
  if (!canSaveMemo()) return;
  const id = f.id || uid('m'), prev = f.id ? S.memos[f.id] : null;
  const m = { name: f.name.trim().slice(0, 40), amount: Math.round(f.amount || 0), cat: f.cat, date: isYmd(f.date) ? f.date : '', note: f.note.trim().slice(0, 60), status: prev ? prev.status : 'plan', tx: prev ? prev.tx || '' : '', spent: prev ? prev.spent || 0 : 0, doneAt: prev ? prev.doneAt || '' : '', ex: !!f.ex, at: f.at || Date.now() };
  writeMemos({ [id]: m });
  closeSheet();
  toast(f.id ? '고쳤어요' : `‘${m.name}’ 메모했어요${m.date ? ` · ${mdLabel(m.date)}` : ''}`);
}
function deleteMemo() {
  const f = F, prev = S.memos[f.id];
  closeSheet();
  if (!prev) return;
  writeMemos({ [f.id]: null });
  toast('메모를 지웠어요', { undo: () => writeMemos({ [f.id]: prev }) });
}
// 썼어요: the memo becomes a real record (amount can be corrected before saving)
function spendMemo(id) {
  const m = S.memos[id];
  if (!m || S.mode === 'denied') return;
  const t = todayStr();
  openTxSheet({});
  if (!F || F.mode !== 'tx') return;
  Object.assign(F, { kind: 'out', memo: m.name, amount: m.amount || 0, cat: m.cat || F.cat, catTouched: true, date: m.date && m.date <= t ? m.date : t, memoId: id });
  rerenderSheet(txSheet());
  const a = $('#f-amount'); if (a) { a.focus(); a.select(); }
}
function dropMemo(id) {
  const m = S.memos[id];
  if (!m) return;
  writeMemos({ [id]: { ...m, status: 'drop', doneAt: todayStr() } });
  refreshDaySheet();
  toast(`‘${m.name}’ 안 사기로 했어요${m.amount ? ` · ${won(m.amount)} 아꼈어요` : ''}`, { undo: () => { writeMemos({ [id]: m }); refreshDaySheet(); } });
}
function markMemoDone(id, txId, amount, date) {
  const m = S.memos[id];
  if (!m) return;
  writeMemos({ [id]: { ...m, status: 'done', tx: txId, spent: amount, doneAt: date } });
}
// after a hand-written record: is it the thing that was on the list?
function matchMemo(tx) {
  const k = normMemo(tx.memo);
  if (!k) return null;
  return openMemos().find(m => {
    const mk = normMemo(m.name);
    if (!mk || !(mk === k || (mk.length >= 2 && k.includes(mk)) || (k.length >= 2 && mk.includes(k)))) return false;
    return !m.date || Math.abs(diffDays(m.date, tx.date)) <= 31;
  }) || null;
}
function memoRow(m, compact) {
  const t = todayStr(), c = catOf(m.cat);
  const when = m.date ? `${mdw(m.date)}${m.date >= t ? ` · ${ddayText(m.date)}` : ' · 지났어요'}` : '날짜 미정';
  return `<div class="plan-row memo-row${m.date && m.date < t ? ' late' : ''}">
    <span class="emo" aria-hidden="true"${ccStyle(c)}>${esc(c.emoji)}</span>
    <span class="tx-main"><span class="tx-title">${esc(m.name)}<span class="tag plan">메모</span>${m.ex ? '<span class="tag">예시</span>' : ''}</span><span class="tx-sub">${esc(when)}${m.note ? ' · ' + esc(m.note) : ''}</span></span>
    <span class="tx-amt plan-amt">${m.amount ? won(m.amount) : '금액 미정'}</span>
    <div class="plan-acts">
      <button class="btn btn-primary btn-sm" type="button" data-act="memo-spend" data-id="${esc(m.id)}" ${S.mode === 'denied' ? 'disabled' : ''}>썼어요</button>
      <button class="btn btn-soft btn-sm" type="button" data-act="memo-drop" data-id="${esc(m.id)}" ${S.mode === 'denied' ? 'disabled' : ''}>안 사기로 했어요</button>
      ${compact ? '' : `<button class="btn btn-ghost btn-sm" type="button" data-act="memo-edit" data-id="${esc(m.id)}">고치기</button>`}
    </div>
  </div>`;
}
function memoBlock(date) {
  const items = openMemos().filter(m => m.date === date);
  if (!items.length) return '';
  return `<div class="plan-box memo-box"><p class="plan-h">📝 쓸 돈 메모 <span class="muted">${items.length}건 · ${won(sum(items.map(m => m.amount || 0)))}</span></p>${items.map(m => memoRow(m, true)).join('')}</div>`;
}
function planMode(ym) {
  if (isLoading()) return emptyBox('불러오는 중이에요', '');
  const t = todayStr(), cur = ymOf(t), list = memosFor(ym);
  const dated = list.filter(m => m.date), undated = list.filter(m => !m.date);
  const planned = sum(list.map(m => m.amount || 0));
  const bs = budgetSummary(ym, totals(txsOf(ym)).out);
  const closed = memosArr().filter(m => m.status !== 'plan' && m.doneAt && ymOf(m.doneAt) === ym).sort((a, b) => (a.doneAt < b.doneAt ? 1 : -1));
  const done = closed.filter(m => m.status === 'done'), dropped = closed.filter(m => m.status === 'drop');
  const savedByDrop = sum(dropped.map(m => m.amount || 0));
  const diff = sum(done.filter(m => m.amount).map(m => m.amount - (m.spent || 0)));
  let budgetLine = '';
  if (bs && ym >= cur && planned) {
    const left = bs.left - planned;
    budgetLine = left >= 0 ? `메모한 돈까지 쓰면 예산이 <b>${won(left)}</b> 남아요.` : `메모한 돈까지 쓰면 예산보다 <b>${won(-left)}</b> 넘어요. 미룰 수 있는 건 다음 달로 옮겨 보세요.`;
  }
  const head = `<div class="memo-top">
      <div><span class="stat-l">${ym === cur ? '이번 달 쓸 돈 메모' : `${mLabel(ym)} 쓸 돈 메모`}</span><span class="kpi-v">${won(planned)}</span><span class="kpi-s">${list.length}건${undated.length ? ` · 날짜 미정 ${undated.length}건 포함` : ''}</span></div>
      <button class="btn btn-primary btn-sm" type="button" data-act="memo-add" ${S.mode === 'denied' ? 'disabled' : ''}>${icon('plus')}메모하기</button>
    </div>${budgetLine ? `<p class="bud-foot">${budgetLine}</p>` : ''}`;
  if (!list.length && !closed.length) return head + emptyBox(ym < cur ? `${mLabel(ym)}에 메모한 지출이 없어요` : '아직 메모한 지출이 없어요', '사고 싶은 것, 곧 낼 돈을 적어 두세요. 같은 걸 또 적으면 알려 드리고, 실제로 쓰면 한 번에 기록으로 옮겨요.');
  const sec = (title, arr) => arr.length ? `<p class="memo-sec">${title}</p>${arr.map(m => memoRow(m)).join('')}` : '';
  const closedRows = closed.map(m => {
    const c = catOf(m.cat), d = m.status === 'done' && m.amount ? m.amount - (m.spent || 0) : 0;
    const res = m.status === 'drop' ? `안 사기로 했어요${m.amount ? ` · ${won(m.amount)} 아낌` : ''}` : `${won(m.spent || 0)} 썼어요${m.amount ? (d > 0 ? ` · 메모보다 ${won(d)} 덜` : d < 0 ? ` · 메모보다 ${won(-d)} 더` : ' · 메모대로') : ''}`;
    return `<div class="tx memo-closed"><span class="emo" aria-hidden="true"${ccStyle(c)}>${esc(c.emoji)}</span><span class="tx-main"><span class="tx-title">${esc(m.name)}</span><span class="tx-sub">${mdLabel(m.doneAt)} · ${esc(res)}</span></span><button class="icon-btn" type="button" data-act="memo-undo" data-id="${esc(m.id)}" aria-label="${esc(m.name)} 다시 메모로 돌리기">${icon('repeat')}</button></div>`;
  }).join('');
  return head + `<div class="memo-list">${sec('날짜 정한 것', dated)}${sec('날짜 미정', undated)}</div>`
    + (closed.length ? `<div class="memo-done"><p class="memo-sec">${mLabel(ym)}에 끝낸 메모 <span class="muted">${done.length ? `썼어요 ${done.length}건` : ''}${done.length && dropped.length ? ' · ' : ''}${dropped.length ? `안 사기로 ${dropped.length}건` : ''}</span></p>
      ${savedByDrop || diff ? `<p class="bud-foot">${savedByDrop ? `안 사기로 해서 <b>${won(savedByDrop)}</b> 아꼈어요. ` : ''}${diff > 0 ? `산 것도 메모보다 ${won(diff)} 덜 썼어요.` : diff < 0 ? `산 것은 메모보다 ${won(-diff)} 더 썼어요.` : ''}</p>` : ''}
      ${closedRows}</div>` : '');
}

/* ================= 통장 (계좌·페이·현금) ================= */
// 잔액 = 마지막으로 맞춘 잔액(기준) + 그 뒤에 적은 기록. 은행 앱과 가끔 '잔액 맞추기'로 다시 기준을 잡아요.
const ACCT_TYPES = { bank: { n: '입출금', e: '🏦' }, save: { n: '저축·비상금', e: '🐷' }, pay: { n: '페이·지역화폐', e: '📱' }, cash: { n: '현금', e: '💵' } };
const ACCT_PRESETS = [
  { name: '급여통장', type: 'bank' }, { name: '생활비 통장', type: 'bank' }, { name: '비상금 통장', type: 'save' },
  { name: '적금 통장', type: 'save' }, { name: '지역화폐', type: 'pay' }, { name: '현금 지갑', type: 'cash' },
];
const STALE_DAYS = 30;
function acctsArr() {
  const a = [];
  for (const id in S.accts) { const x = S.accts[id]; if (x && x.name != null) a.push({ ...x, id }); }
  return a.sort((p, q) => (q.main ? 1 : 0) - (p.main ? 1 : 0) || (p.at || 0) - (q.at || 0));
}
function writeAccts(patch) {
  S.accts = { ...S.accts, ...patch };
  scheduleRender();
  if (!S.db) return Promise.resolve();
  const ref = S.db.doc('meta/accounts');
  return track(enqueue('meta/accounts', async () => {
    try { await retry(() => ref.update({ items: patch })); }
    catch (e) {
      if (e && e.code === 'invalid_argument' && !S.acctsDoc) await retry(() => ref.set({ items: patch }));
      else throw e;
    }
    S.acctsDoc = true;
  }));
}
const acctOf = id => (id && S.accts[id] && S.accts[id].name != null ? { ...S.accts[id], id } : null);
const acctEmoji = a => (ACCT_TYPES[a.type] || ACCT_TYPES.bank).e;
const mainAcct = () => { const l = acctsArr(); return (l.find(a => a.main) || l[0] || { id: '' }).id; };
// a payment method draws from the account that lists it
const methodAcct = mid => { if (!mid) return ''; const a = acctsArr().find(x => x.methods && x.methods[mid]); return a ? a.id : ''; };
// credit cards: the money leaves the account later, on the card's billing day
const isLater = mid => { const m = methodOf(mid); return !!(m && (m.id === 'credit' || /신용/.test(m.name))); };
const txAcct = t => t.acct && acctOf(t.acct) ? t.acct : t.kind === 'out' ? methodAcct(t.method) : t.kind === 'in' ? mainAcct() : '';
const afterBase = (t, a) => t.date > (a.baseDate || '') || (t.date === a.baseDate && (t.at || 0) >= (a.baseAt || 0));
function acctState(a) {
  const t = todayStr(), cur = ymOf(t), monthEnd = `${cur}-${pad(daysIn(cur))}`;
  let bal = Math.round(+a.base || 0), card = 0, n = 0;
  for (const x of allTxs()) {
    if (!afterBase(x, a)) continue;
    if (x.kind === 'move') {
      if (x.from === a.id) { bal -= x.amount; n++; }
      if (x.to === a.id) { bal += x.amount; n++; }
      continue;
    }
    if (txAcct(x) !== a.id) continue;
    n++;
    if (x.kind === 'in') bal += x.amount;
    else if (isLater(x.method)) card += x.amount;
    else bal -= x.amount;
  }
  const ups = plannedIn(addDays(t, 1), monthEnd).filter(p => methodAcct(p.method) === a.id);
  const upNow = sum(ups.filter(p => !isLater(p.method)).map(p => p.amount));
  const days = a.baseDate ? diffDays(a.baseDate, t) : 0;
  return { bal, card, ups, upNow, proj: bal - card - upNow, n, days, stale: days > STALE_DAYS };
}
function acctMonthFlow(aid, ym) {
  let i = 0, o = 0;
  for (const x of txsOf(ym)) {
    if (x.kind === 'move') { if (x.to === aid) i += x.amount; if (x.from === aid) o += x.amount; continue; }
    if (txAcct(x) !== aid) continue;
    if (x.kind === 'in') i += x.amount; else o += x.amount;
  }
  return { in: i, out: o };
}
const unlinkedMethods = () => cfg().methods.filter(m => !methodAcct(m.id));

/* --- view --- */
function acctCard(a) {
  const st = acctState(a), fl = acctMonthFlow(a.id, S.ym), ty = ACCT_TYPES[a.type] || ACCT_TYPES.bank;
  const ms = cfg().methods.filter(m => a.methods && a.methods[m.id]);
  return `<section class="card acct-card">
    <div class="loan-top"><span class="emo" aria-hidden="true">${acctEmoji(a)}</span><div style="min-width:0"><p class="loan-name">${esc(a.name)}${a.main ? '<span class="tag sub">주 통장</span>' : ''}${a.ex ? '<span class="tag">예시</span>' : ''}</p><p class="loan-meta">${esc([ty.n, a.bank].filter(Boolean).join(' · '))}</p></div><button class="btn btn-ghost btn-sm" type="button" data-act="acct-edit" data-id="${esc(a.id)}">고치기</button></div>
    <p class="acct-bal">${st.bal < 0 ? '−' : ''}${fmt(Math.abs(st.bal))}<span class="u">원</span></p>
    <p class="acct-base${st.stale ? ' stale' : ''}">${a.baseDate ? `${mdLabel(a.baseDate)} 잔액 ${won(a.base || 0)}에서 기록 ${st.n}건 반영` : '아직 잔액을 맞추지 않았어요'}${st.stale ? ` · 잔액을 맞춘 지 ${st.days}일 지났어요` : ''}</p>
    ${st.card || st.upNow ? `<div class="acct-proj">${st.card ? `<div><span>신용카드로 쓴 돈 <small>결제일에 빠져요</small></span><b>−${won(st.card)}</b></div>` : ''}${st.upNow ? `<div><span>이번 달 남은 자동이체 <small>${st.ups.filter(p => !isLater(p.method)).length}건</small></span><b>−${won(st.upNow)}</b></div>` : ''}<div class="tot"><span>다 빠져나간 뒤 예상</span><b>${st.proj < 0 ? '−' : ''}${won(Math.abs(st.proj))}</b></div></div>` : ''}
    <div class="acct-flow"><div><span class="stat-l">${mLabel(S.ym)} 들어온 돈</span><span class="stat-v in-c">+${won(fl.in)}</span></div><div><span class="stat-l">${mLabel(S.ym)} 나간 돈</span><span class="stat-v">−${won(fl.out)}</span></div></div>
    <p class="acct-methods">${ms.length ? `이 통장에서 나가는 결제수단 ${ms.map(m => `<span class="tag plan">${esc(m.name)}${isLater(m.id) ? ' (결제 통장)' : ''}</span>`).join('')}` : '<span class="muted">연결된 결제수단이 없어요. ‘고치기’에서 연결하면 지출이 이 통장에서 빠져요.</span>'}</p>
    <div class="acct-acts"><button class="btn btn-${st.stale ? 'primary' : 'soft'} btn-sm" type="button" data-act="acct-fix" data-id="${esc(a.id)}" ${S.mode === 'denied' ? 'disabled' : ''}>잔액 맞추기</button><button class="btn btn-soft btn-sm" type="button" data-act="acct-move" data-id="${esc(a.id)}" ${S.mode === 'denied' ? 'disabled' : ''}>이체</button><button class="btn btn-ghost btn-sm" type="button" data-act="acct-list" data-id="${esc(a.id)}">내역 보기</button></div>
  </section>`;
}
function vAccounts() {
  const head = `<div class="view-h"><h1 class="view-title">통장</h1><div class="view-acts">${vAssetsSwitch('accounts')}<button class="btn btn-primary btn-sm" type="button" data-act="acct-add" ${S.mode === 'denied' ? 'disabled' : ''}>${icon('plus')}통장 추가</button></div></div>`;
  if (isLoading()) return head + `<section class="card">${emptyBox('불러오는 중이에요', '')}</section>`;
  const list = acctsArr();
  if (!list.length) return head + `<section class="card">${emptyBox('등록된 통장이 없어요', '쓰고 있는 통장과 지금 잔액을 넣으면 지출·수입을 적을 때마다 잔액이 따라 움직여요. 체크카드·계좌이체를 통장에 연결하면 어느 통장에서 나갔는지도 모여요.', `<div class="chips" style="justify-content:center">${ACCT_PRESETS.map((p, i) => `<button class="chip" type="button" data-act="acct-add" data-i="${i}">${ACCT_TYPES[p.type].e} ${p.name}</button>`).join('')}</div>`)}</section>`;
  const sts = list.map(a => ({ a, s: acctState(a) }));
  const total = sum(sts.map(x => x.s.bal)), card = sum(sts.map(x => x.s.card)), up = sum(sts.map(x => x.s.upNow));
  const free = sum(sts.filter(x => x.a.type !== 'save').map(x => x.s.bal));
  const un = unlinkedMethods();
  const stale = sts.filter(x => x.s.stale);
  const summary = `<section class="card loan-sum">
    <span class="hero-label">통장 잔액 합계</span>
    <p class="hero-num">${total < 0 ? '−' : ''}${fmt(Math.abs(total))}<span class="u">원</span></p>
    <span class="muted" style="font-size:13.5px">${list.length}개 · 바로 쓸 수 있는 돈 ${won(free)} (저축·비상금 통장 제외)</span>
    <div class="stat-grid">
      <div><span class="stat-l">신용카드로 쓴 돈</span><span class="stat-v">${card ? '−' + won(card) : '0원'}</span></div>
      <div><span class="stat-l">이번 달 남은 자동이체</span><span class="stat-v">${up ? '−' + won(up) : '0원'}</span></div>
      <div><span class="stat-l">다 빠져나간 뒤 예상</span><span class="stat-v">${won(total - card - up)}</span></div>
    </div>
  </section>`;
  const warns = [];
  if (un.length) warns.push(`<div class="notice warn"><p><b>${un.map(m => esc(m.name)).join(', ')}</b>${josa(un[un.length - 1].name, '은/는').slice(-1)} 어느 통장에도 연결되지 않아서 그 지출은 잔액에 반영되지 않아요. 통장의 ‘고치기’에서 연결해 주세요.</p></div>`);
  if (stale.length) warns.push(`<div class="notice"><p>${stale.map(x => esc(x.a.name)).join(', ')}의 잔액을 맞춘 지 한 달이 넘었어요. 기록하지 않은 지출이 쌓였을 수 있으니 은행 앱 잔액과 맞춰 주세요.</p></div>`);
  return head + summary + warns.join('') + `<div class="acct-grid">${sts.map(x => acctCard(x.a)).join('')}</div>
    <p class="set-note muted" style="font-size:12.5px">계좌번호는 적지 않아요. 이름과 잔액만으로 관리해요. 통장끼리 옮긴 돈이나 지역화폐 충전은 기록 화면의 ‘이체’로 적으면 지출로 잡히지 않아요.</p>`;
}
function homeAcctCard() {
  const list = acctsArr();
  if (!list.length || isLoading()) return '';
  const sts = list.map(a => ({ a, s: acctState(a) }));
  return `<section class="card" data-o="2">
    <div class="card-h"><h2 class="card-t">내 통장</h2><button class="card-link" type="button" data-view="accounts">전체${icon('right')}</button></div>
    <div class="rank">${sts.slice(0, 4).map(({ a, s }) => `<button class="sub-row" type="button" data-view="accounts"><span class="emo" aria-hidden="true">${acctEmoji(a)}</span><span class="tx-main"><span class="sub-name">${esc(a.name)}${a.main ? '<span class="tag sub">주</span>' : ''}</span><span class="sub-meta">${s.stale ? '잔액 맞출 때가 됐어요' : s.card || s.upNow ? `빠져나갈 돈 ${won(s.card + s.upNow)}` : ACCT_TYPES[a.type] ? ACCT_TYPES[a.type].n : ''}</span></span><span class="sub-end"><span class="sub-amt">${s.bal < 0 ? '−' : ''}${won(Math.abs(s.bal))}</span></span></button>`).join('')}</div>
    <p class="bud-foot">합계 <b>${won(sum(sts.map(x => x.s.bal)))}</b></p>
  </section>`;
}

/* --- account sheet --- */
function openAcctSheet(id, preset) {
  if (S.mode === 'denied') return;
  const a = id && acctOf(id), t = todayStr();
  if (id && !a) return;
  const p = ACCT_PRESETS[preset] || null;
  F = a
    ? { mode: 'acct', id, name: a.name, type: a.type || 'bank', bank: a.bank || '', balance: acctState(a).bal, origBal: acctState(a).bal, main: !!a.main, methods: { ...(a.methods || {}) }, ex: !!a.ex, at: a.at || 0 }
    : { mode: 'acct', id: null, name: p ? p.name : '', type: p ? p.type : 'bank', bank: '', balance: 0, origBal: null, main: !acctsArr().length, methods: {}, ex: false, at: 0 };
  if (!a && !acctsArr().length && (!p || p.type === 'bank')) for (const m of cfg().methods) if (!/현금/.test(m.name)) F.methods[m.id] = true; // first account: card·transfer usually come out of it
  if (!a && p && p.type === 'cash') for (const m of cfg().methods) if (/현금/.test(m.name) && !methodAcct(m.id)) F.methods[m.id] = true;
  showSheet(acctSheet(), a ? null : '#a-name');
}
const canSaveAcct = () => !!(F && F.name.trim());
function acctSheet() {
  const f = F, isEdit = !!f.id;
  const ms = cfg().methods;
  return `<form id="acctForm" autocomplete="off" novalidate>
    <div class="sheet-h"><h2 id="sheetTitle">${isEdit ? '통장 고치기' : '통장 추가'}</h2><button class="icon-btn" type="button" data-act="close" aria-label="닫기">${icon('x')}</button></div>
    ${isEdit ? '' : `<div class="chips preset" role="group" aria-label="자주 쓰는 통장">${ACCT_PRESETS.map((p, i) => `<button class="chip" type="button" data-act="a-preset" data-i="${i}">${ACCT_TYPES[p.type].e} ${p.name}</button>`).join('')}</div>`}
    <div class="field-row"><div class="field"><label class="lab" for="a-name">이름</label><input class="input" id="a-name" maxlength="20" placeholder="예: 급여통장" value="${esc(f.name)}"></div><div class="field"><label class="lab" for="a-bank">은행·서비스 <span class="muted" style="font-weight:400">(선택)</span></label><input class="input" id="a-bank" maxlength="20" placeholder="예: ○○은행, 탐나는전" value="${esc(f.bank)}"></div></div>
    <div class="field"><span class="lab" id="atLab">종류</span><div class="seg" role="group" aria-labelledby="atLab" style="width:100%">${Object.entries(ACCT_TYPES).map(([k, v]) => `<button type="button" id="at-${k}" data-act="a-type" data-v="${k}" ${pressed(f.type === k)}>${v.n}</button>`).join('')}</div></div>
    <div class="field"><label class="lab" for="a-bal">${isEdit ? '지금 잔액' : '지금 잔액 (은행 앱에서 확인)'}</label><div class="amt"><input id="a-bal" inputmode="numeric" placeholder="0" value="${f.balance ? fmt(Math.abs(f.balance)) : ''}"><span>원</span></div><p class="amt-hint" id="aHint">${isEdit ? '바꾸면 오늘 기준으로 잔액을 다시 맞춰요.' : '오늘 이후에 적는 기록부터 이 잔액에 더하고 빼요.'}</p></div>
    <div class="field"><span class="lab" id="amLab">이 통장에서 나가는 결제수단</span><div class="chips" role="group" aria-labelledby="amLab">${ms.map(m => { const other = methodAcct(m.id); const o = other && other !== f.id ? acctOf(other) : null; return `<button class="chip" type="button" id="am-${esc(m.id)}" data-act="a-method" data-id="${esc(m.id)}" ${pressed(!!f.methods[m.id])}>${esc(m.name)}${isLater(m.id) ? ' · 결제 통장' : ''}${o ? ` <small>(지금 ${esc(o.name)})</small>` : ''}</button>`; }).join('')}</div>
      <p class="amt-hint">체크카드·계좌이체는 쓰자마자 빠지고, 신용카드는 결제일에 이 통장에서 빠져요. 결제수단 하나는 통장 하나에만 연결돼요.</p></div>
    <div class="switch-row"><div><span class="card-t">주 통장</span><p>통장을 고르지 않은 수입은 이 통장으로 들어온 것으로 봐요.</p></div><button class="switch" type="button" role="switch" id="a-main" aria-checked="${f.main}" data-act="a-main" aria-label="주 통장"></button></div>
    <p class="set-note" style="font-size:12.5px">계좌번호·비밀번호는 적지 마세요. 이름과 잔액만 있으면 돼요.</p>
    <div class="sheet-actions">${isEdit ? `<button class="btn btn-danger" type="button" data-act="a-delete">${icon('trash')}삭제</button>` : ''}<button class="btn btn-primary btn-block" type="submit" id="a-save" ${canSaveAcct() ? '' : 'disabled'}>${isEdit ? '고친 내용 저장' : '추가하기'}</button></div>
  </form>`;
}
function saveAcct() {
  const f = F;
  if (!canSaveAcct()) return;
  const id = f.id || uid('a'), prev = f.id ? S.accts[f.id] : null, now = Date.now(), t = todayStr();
  const rebase = !prev || f.balance !== f.origBal;
  const acct = {
    name: f.name.trim().slice(0, 20), type: f.type, bank: f.bank.trim().slice(0, 20), main: !!f.main, methods: { ...f.methods }, ex: !!f.ex, at: f.at || now,
    base: rebase ? Math.round(f.balance) : prev.base || 0, baseDate: rebase ? t : prev.baseDate || t, baseAt: rebase ? now : prev.baseAt || 0,
  };
  for (const m of cfg().methods) if (!(m.id in acct.methods)) acct.methods[m.id] = false;
  const patch = { [id]: acct };
  for (const o of acctsArr()) { // one account per payment method, one main account
    if (o.id === id) continue;
    const mm = {}; let ch = false;
    for (const mid in f.methods) if (f.methods[mid] && o.methods && o.methods[mid]) { mm[mid] = false; ch = true; }
    if (ch || (acct.main && o.main)) patch[o.id] = { ...S.accts[o.id], methods: { ...(o.methods || {}), ...mm }, main: acct.main ? false : !!o.main };
  }
  writeAccts(patch);
  closeSheet();
  toast(f.id ? (rebase ? `잔액을 ${won(acct.base)}으로 맞췄어요` : '고쳤어요') : `‘${acct.name}’ 통장을 추가했어요`);
}
function deleteAcct() {
  const f = F, prev = S.accts[f.id];
  closeSheet();
  if (!prev) return;
  writeAccts({ [f.id]: null });
  toast('통장을 지웠어요. 지난 기록은 내역에 남아요', { undo: () => writeAccts({ [f.id]: prev }) });
}

/* --- 잔액 맞추기 --- */
function openFixSheet(id) {
  const a = acctOf(id);
  if (!a || S.mode === 'denied') return;
  const st = acctState(a);
  F = { mode: 'fix', id, calc: st.bal, actual: null };
  showSheet(fixSheet(), '#x-bal');
}
function fixSheet() {
  const f = F, a = acctOf(f.id), d = f.actual == null ? null : f.actual - f.calc;
  return `<form id="fixForm" autocomplete="off" novalidate>
    <div class="sheet-h"><h2 id="sheetTitle">${esc(a.name)} 잔액 맞추기</h2><button class="icon-btn" type="button" data-act="close" aria-label="닫기">${icon('x')}</button></div>
    <div class="day-sum" style="grid-template-columns:1fr 1fr"><div><span class="stat-l">가계부 잔액</span><span class="stat-v">${won(f.calc)}</span></div><div><span class="stat-l">마지막으로 맞춘 날</span><span class="stat-v">${a.baseDate ? mdLabel(a.baseDate) : '-'}</span></div></div>
    <div class="field"><label class="lab" for="x-bal">은행 앱에 보이는 지금 잔액</label><div class="amt"><input id="x-bal" inputmode="numeric" placeholder="0" value="${f.actual != null ? fmt(f.actual) : ''}"><span>원</span></div><p class="amt-hint" id="xHint">${d == null ? '신용카드 결제일이 지났다면 카드값이 빠진 잔액을 넣으세요.' : fixHint(d)}</p></div>
    <div class="fix-acts" id="fixActs">${fixActs(d)}</div>
  </form>`;
}
const fixHint = d => d === 0 ? '가계부와 똑같아요. 잘 기록하고 있어요!' : d < 0 ? `가계부보다 ${won(-d)} 적어요. 적지 않은 지출이나 빠져나간 카드값이 있을 수 있어요.` : `가계부보다 ${won(d)} 많아요. 적지 않은 수입이나 이자가 있을 수 있어요.`;
const fixActs = d => d == null ? '' : d === 0
  ? '<button class="btn btn-primary btn-block" type="button" data-act="fix-save" data-rec="0">확인했어요</button>'
  : `<button class="btn btn-primary btn-block" type="button" data-act="fix-save" data-rec="0">잔액만 맞추기</button><button class="btn btn-soft btn-block" type="button" data-act="fix-save" data-rec="1">차이 ${won(Math.abs(d))}을 ${d < 0 ? '‘기타 지출’' : '‘기타 수입’'}로 남기고 맞추기</button>`;
function refreshFix() {
  const d = F.actual == null ? null : F.actual - F.calc;
  const h = $('#xHint'); if (h) h.textContent = d == null ? '신용카드 결제일이 지났다면 카드값이 빠진 잔액을 넣으세요.' : fixHint(d);
  const box = $('#fixActs'); if (box) box.innerHTML = fixActs(d);
}
function saveFix(record) {
  const f = F, a = S.accts[f.id];
  if (!a || f.actual == null) return;
  const t = todayStr(), now = Date.now(), d = f.actual - f.calc;
  if (record && d) {
    const kind = d < 0 ? 'out' : 'in';
    const cat = kind === 'out' ? (catsOf('out').find(c => c.id === 'etc') || catsOf('out')[0] || UNKNOWN_CAT).id : (catsOf('in').find(c => c.id === 'etc_in') || catsOf('in')[0] || UNKNOWN_CAT).id;
    writeMonth(ymOf(t), { [uid('t')]: makeTx({ date: t, kind, amount: Math.abs(d), cat, memo: `잔액 맞춤 (${a.name})`, acct: f.id, at: now - 1 }) });
  }
  writeAccts({ [f.id]: { ...a, base: f.actual, baseDate: t, baseAt: now } });
  const prev = a;
  closeSheet();
  toast(`${a.name} 잔액을 ${won(f.actual)}으로 맞췄어요`, { undo: () => writeAccts({ [f.id]: prev }) });
}

/* --- 이체 (통장 → 통장) --- */
function openMoveSheet(from) {
  openTxSheet({});
  if (!F || F.mode !== 'tx') return;
  F.kind = 'move'; F.from = from || mainAcct(); F.to = (acctsArr().find(a => a.id !== F.from) || { id: '' }).id;
  rerenderSheet(txSheet());
  const el = $('#f-amount'); if (el) el.focus();
}
const acctChips = (act, cur, label, none) => `<div class="chips" role="group" aria-label="${label}">${acctsArr().map(a => `<button class="chip" type="button" id="${act}-${esc(a.id)}" data-act="${act}" data-id="${esc(a.id)}" ${pressed(cur === a.id)}>${acctEmoji(a)} ${esc(a.name)}</button>`).join('')}${none ? `<button class="chip" type="button" id="${act}-none" data-act="${act}" data-id="" ${pressed(!cur)}>${none}</button>` : ''}</div>`;

function acctField(f) {
  if (f.kind === 'move' || !acctsArr().length) return '';
  const auto = f.kind === 'out' ? methodAcct(f.method) : mainAcct();
  const cur = f.acct === '-' ? '' : f.acct || auto;
  const lab = f.kind === 'out' ? (isLater(f.method) ? '결제 통장 <span class="muted" style="font-weight:400">(신용카드는 결제일에 빠져요)</span>' : '어느 통장에서 나갔나요?') : '어느 통장으로 들어왔나요?';
  return `<div class="field" id="acctField"><span class="lab">${lab}</span>${acctChips('f-acct', cur, f.kind === 'out' ? '출금 통장' : '입금 통장', '통장 없음')}</div>`;
}
function refreshAcctField() { const el = $('#acctField'); if (el) el.outerHTML = acctField(F); }
function moveFields(f) {
  return `<div class="field"><span class="lab">보내는 통장</span>${acctChips('f-from', f.from, '보내는 통장')}</div>
    <div class="field"><span class="lab">받는 통장</span>${acctChips('f-to', f.to, '받는 통장')}</div>
    <p class="amt-hint">통장끼리 옮긴 돈이에요. 지출·수입 통계에는 넣지 않고 두 통장 잔액만 바꿔요. 지역화폐 충전도 여기에 적어요.</p>`;
}

/* ================= 꾸미기: 직접 만드는 색 · 배경 · 캐릭터 · 글꼴 ================= */
const FONTS = [
  { id: 'plex', name: '기본', note: 'IBM Plex Sans KR', fam: 'IBM Plex Sans KR', q: '' },
  { id: 'noto', name: '본고딕', note: '깔끔한 고딕', fam: 'Noto Sans KR', q: 'Noto+Sans+KR:wght@400;500;700' },
  { id: 'nanum', name: '나눔고딕', note: '익숙한 고딕', fam: 'Nanum Gothic', q: 'Nanum+Gothic:wght@400;700;800' },
  { id: 'dodum', name: '고운돋움', note: '부드러운 고딕', fam: 'Gowun Dodum', q: 'Gowun+Dodum' },
  { id: 'batang', name: '고운바탕', note: '단정한 명조', fam: 'Gowun Batang', q: 'Gowun+Batang:wght@400;700' },
  { id: 'jua', name: '주아', note: '동글동글 귀여운', fam: 'Jua', q: 'Jua' },
  { id: 'gaegu', name: '개구', note: '손글씨', fam: 'Gaegu', q: 'Gaegu:wght@400;700' },
  { id: 'pen', name: '나눔손글씨 펜', note: '펜 손글씨', fam: 'Nanum Pen Script', q: 'Nanum+Pen+Script' },
  { id: 'dohyeon', name: '도현', note: '굵은 제목체', fam: 'Do Hyeon', q: '' },
];
const GRADS = [
  { id: 'dawn', name: '새벽', c: ['#A1C4FD', '#C2E9FB'] }, { id: 'peach', name: '복숭아', c: ['#FFB199', '#FFE29F'] },
  { id: 'lilac', name: '라일락', c: ['#C3B1E1', '#FBC2EB'] }, { id: 'mint', name: '민트', c: ['#84FAB0', '#8FD3F4'] },
  { id: 'sunset', name: '노을', c: ['#FF9A8B', '#FECF71'] }, { id: 'ocean', name: '바다', c: ['#4FACFE', '#43E97B'] },
  { id: 'cotton', name: '솜사탕', c: ['#FBC2EB', '#A6C1EE'] }, { id: 'aurora', name: '오로라', c: ['#7F7FD5', '#91EAE4'] },
];
const ACCENTS = ['#0C7F57', '#0B6E8A', '#2B4FCF', '#6544C4', '#B4245F', '#D2363D', '#B9461A', '#B0500E', '#8A6A00', '#4D6B1F', '#6A3E2A', '#374151'];
const LOOK_DEF = { accent: '#6544C4', mode: 'auto', bg: 'none', grad: 'dawn', g1: '#A1C4FD', g2: '#FBC2EB', angle: 160, power: 2, blur: 1, dim: 2, glass: false, char: 'none', charSize: 'm', charPos: 'r', talk: true, font: 'plex', numBase: true, fs: 'm', radius: 'md' };
const FS = { s: 0.93, m: 1, l: 1.08, xl: 1.16 }, RAD = { sq: 10, md: 20, rd: 28 };
const isHex = v => /^#[0-9a-fA-F]{6}$/.test(String(v || ''));
function normLook(l) {
  const x = l && typeof l === 'object' ? l : {}, d = LOOK_DEF, pick = (v, ok, def) => (ok.includes(v) ? v : def);
  return {
    accent: isHex(x.accent) ? x.accent : d.accent, mode: pick(x.mode, ['auto', 'light', 'dark'], d.mode),
    bg: pick(x.bg, ['none', 'grad', 'photo'], d.bg), grad: pick(x.grad, [...GRADS.map(g => g.id), 'custom'], d.grad),
    g1: isHex(x.g1) ? x.g1 : d.g1, g2: isHex(x.g2) ? x.g2 : d.g2, angle: pick(+x.angle, [180, 160, 90], d.angle),
    power: pick(+x.power, [1, 2, 3], d.power), blur: pick(+x.blur, [0, 1, 2], d.blur), dim: pick(+x.dim, [1, 2, 3], d.dim), glass: !!x.glass,
    char: pick(x.char, ['none', 'coin', 'mine'], d.char), charSize: pick(x.charSize, ['s', 'm', 'l'], d.charSize), charPos: pick(x.charPos, ['r', 'l'], d.charPos), talk: x.talk !== false,
    font: pick(x.font, FONTS.map(f => f.id), d.font), numBase: x.numBase !== false, fs: pick(x.fs, Object.keys(FS), d.fs), radius: pick(x.radius, Object.keys(RAD), d.radius),
  };
}
const look = () => normLook(cfg().look);
const curLook = () => (S.settings ? look() : normLook(prefs.look));
function saveLook(patch) {
  const next = { ...look(), ...patch };
  saveSettings({ ...cfg(), look: next });
  applyLook(next);
}

/* --- colour maths for the made-by-me theme --- */
const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const rgb2hex = c => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const mixHex = (a, b, t) => { const x = hex2rgb(a), y = hex2rgb(b); return rgb2hex(x.map((v, i) => v + (y[i] - v) * t)); };
const relLum = h => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; const [r, g, b] = hex2rgb(h); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contrast = (a, b) => { const x = relLum(a), y = relLum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const darkMQ = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : { matches: false };
function customPalette(accent, dark) {
  const N = dark
    ? { bg: '#0F1312', surface: '#171C1A', s2: '#1D2321', s3: '#262D2A', ink: '#ECF1EE', ink2: '#B3BEB9', muted: '#8E9993', line: '#29312E', ls: '#3B4542', inc: '#6AA3FF', out: '#FF6E73', warn: '#F0A92A', warnInk: '#F3B54A', crit: '#FF6B6B' }
    : { bg: '#F3F5F4', surface: '#FFFFFF', s2: '#F6F7F7', s3: '#E9EDEB', ink: '#17201C', ink2: '#4A5651', muted: '#5F6A65', line: '#E2E8E5', ls: '#C9D2CD', inc: '#2563D9', out: '#D2363D', warn: '#E39B0B', warnInk: '#9A5E00', crit: '#D03B3B' };
  const tint = (c, t) => mixHex(c, accent, t);
  const surface = dark ? tint(N.surface, 0.04) : N.surface;
  let a = accent, n = 0;
  while (contrast(a, surface) < 4.5 && n++ < 40) a = mixHex(a, dark ? '#FFFFFF' : '#000000', 0.07);
  const ai = contrast('#FFFFFF', a) >= contrast('#0B0F0D', a) ? '#FFFFFF' : '#0B0F0D';
  const vars = {
    '--bg': tint(N.bg, dark ? 0.06 : 0.07), '--surface': surface, '--surface-2': tint(N.s2, 0.05), '--surface-3': tint(N.s3, 0.07), '--paper': dark ? tint(N.s2, 0.05) : '#FCFDFB',
    '--ink': N.ink, '--ink-2': N.ink2, '--muted': N.muted, '--line': tint(N.line, 0.06), '--line-strong': tint(N.ls, 0.06),
    '--accent': a, '--accent-ink': ai, '--accent-soft': mixHex(surface, a, dark ? 0.16 : 0.12), '--accent-track': mixHex(surface, a, dark ? 0.28 : 0.22),
    '--in': N.inc, '--out': N.out, '--warn': N.warn, '--warn-ink': N.warnInk, '--crit': N.crit,
    '--toast-bg': N.ink, '--toast-fg': N.bg, '--toast-act': dark ? mixHex(a, '#000000', 0.35) : mixHex(a, '#FFFFFF', 0.45),
    '--scrim': dark ? 'rgba(0, 0, 0, .6)' : 'rgba(12, 18, 15, .42)',
    '--shadow': dark ? '0 0 0 1px rgba(255, 255, 255, .04)' : '0 1px 2px rgba(23, 32, 28, .04), 0 6px 20px rgba(23, 32, 28, .05)',
    '--shadow-lg': dark ? '0 18px 50px rgba(0, 0, 0, .55)' : '0 18px 50px rgba(23, 32, 28, .18)',
  };
  return { vars, adjusted: a.toUpperCase() !== accent.toUpperCase(), accent: a };
}
const CUSTOM_KEYS = Object.keys(customPalette('#6544C4', false).vars);

/* --- applying everything --- */
const loadedFonts = new Set(['plex', 'dohyeon']);
function loadFonts(list) {
  const need = list.filter(f => f.q && !loadedFonts.has(f.id));
  if (!need.length) return;
  need.forEach(f => loadedFonts.add(f.id));
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = `https://fonts.googleapis.com/css2?${need.map(f => 'family=' + f.q).join('&')}&display=swap`;
  document.head.appendChild(l);
}
function applyLook(src) {
  const l = normLook(src), R = document.documentElement;
  try { const keep = { ...l }; if (JSON.stringify(prefs.look) !== JSON.stringify(keep)) { prefs.look = keep; savePrefs(); } } catch (e) { /* ignore */ }
  // made-by-me colours
  for (const k of CUSTOM_KEYS) R.style.removeProperty(k);
  R.style.removeProperty('color-scheme');
  if (R.getAttribute('data-pal') === 'custom') {
    const dark = l.mode === 'dark' || (l.mode === 'auto' && darkMQ.matches);
    const p = customPalette(l.accent, dark);
    for (const k in p.vars) R.style.setProperty(k, p.vars[k]);
    R.style.setProperty('color-scheme', dark ? 'dark' : 'light');
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => { if (m.dataset.orig == null) m.dataset.orig = m.content; m.content = p.vars['--bg']; });
  }
  // fonts, size, corners
  const f = FONTS.find(x => x.id === l.font) || FONTS[0];
  loadFonts([f]);
  if (f.id === 'plex') R.style.removeProperty('--font-ui');
  else R.style.setProperty('--font-ui', `"${f.fam}", "IBM Plex Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif`);
  R.style.setProperty('--font-num', l.numBase ? '"IBM Plex Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif' : 'var(--font-ui)');
  R.setAttribute('data-fs', l.fs);
  R.style.zoom = l.fs === 'm' ? '' : String(FS[l.fs]);
  R.style.setProperty('--radius', RAD[l.radius] + 'px');
  // background
  const wall = S.deco && S.deco.wall, on = l.bg === 'grad' || (l.bg === 'photo' && !!wall);
  let el = document.getElementById('decoBg');
  if (!on) { if (el) el.remove(); R.removeAttribute('data-deco'); }
  else {
    if (!el) { el = document.createElement('div'); el.id = 'decoBg'; el.setAttribute('aria-hidden', 'true'); document.body.prepend(el); }
    R.setAttribute('data-deco', l.bg);
    if (l.bg === 'grad') {
      const g = l.grad === 'custom' ? [l.g1, l.g2] : (GRADS.find(x => x.id === l.grad) || GRADS[0]).c, p = [0, 22, 38, 58][l.power];
      el.style.backgroundImage = `linear-gradient(${l.angle}deg, color-mix(in srgb, ${g[0]} ${p}%, var(--bg)), color-mix(in srgb, ${g[1]} ${p}%, var(--bg)))`;
      el.style.filter = ''; el.removeAttribute('data-dim');
    } else {
      el.style.backgroundImage = `url("${wall}")`;
      el.style.filter = l.blur ? `blur(${[0, 6, 14][l.blur]}px)` : '';
      el.setAttribute('data-dim', String(l.dim));
    }
  }
  if (on && l.glass) R.setAttribute('data-glass', '1'); else R.removeAttribute('data-glass');
  renderMascot(l);
}
if (darkMQ.addEventListener) darkMQ.addEventListener('change', () => { if (document.documentElement.getAttribute('data-pal') === 'custom') applyLook(curLook()); });

/* --- 캐릭터 --- */
// 꼬박이: 새싹이 난 동전 캐릭터 (이 가계부를 위해 새로 그린 그림)
const COIN_SVG = `<svg viewBox="0 0 120 128" aria-hidden="true"><path d="M60 22c-2-10 3-17 13-19-1 9-5 15-13 19z" fill="#5DBB63"/><path d="M60 22c-6-8-14-9-21-5 5 7 12 9 21 5z" fill="#7ED07F"/><path d="M60 21v8" stroke="#3E8E45" stroke-width="3" stroke-linecap="round"/><ellipse cx="60" cy="122" rx="30" ry="4" fill="#000" opacity=".12"/><circle cx="60" cy="74" r="46" fill="#F2B632"/><circle cx="60" cy="74" r="38" fill="#FFCF4D"/><circle cx="60" cy="74" r="38" fill="none" stroke="#E5A520" stroke-width="2" stroke-dasharray="3 5"/><ellipse cx="44" cy="70" rx="5" ry="6.5" fill="#3A2A12"/><ellipse cx="76" cy="70" rx="5" ry="6.5" fill="#3A2A12"/><circle cx="46" cy="67.5" r="1.8" fill="#fff"/><circle cx="78" cy="67.5" r="1.8" fill="#fff"/><ellipse cx="36" cy="84" rx="6" ry="3.5" fill="#FF8A65" opacity=".55"/><ellipse cx="84" cy="84" rx="6" ry="3.5" fill="#FF8A65" opacity=".55"/><path d="M51 85c5 6 13 6 18 0" fill="none" stroke="#3A2A12" stroke-width="3" stroke-linecap="round"/></svg>`;
function renderMascot(l) {
  let el = document.getElementById('mascot');
  const mine = S.deco && S.deco.mascot;
  const src = l.char === 'coin' ? 'coin' : l.char === 'mine' && mine ? mine : '';
  if (!src || !document.getElementById('view')) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement('button');
    el.id = 'mascot'; el.type = 'button'; el.setAttribute('data-act', 'mascot');
    document.body.appendChild(el);
  }
  el.setAttribute('aria-label', l.talk ? '캐릭터 — 누르면 한마디 해요' : '캐릭터');
  el.dataset.size = l.charSize; el.dataset.pos = l.charPos;
  const key = src === 'coin' ? 'coin' : 'mine:' + src.length;
  if (el.dataset.src !== key) {
    el.dataset.src = key;
    el.innerHTML = `<span class="m-pic">${src === 'coin' ? COIN_SVG : `<img src="${src}" alt="">`}</span><span class="bubble" role="status" hidden></span>`;
  }
}
let mascotIdx = 0, bubbleTimer = 0;
function mascotLines() {
  const t = todayStr(), ym = ymOf(t), list = txsOf(ym), out = totals(list).out, bs = budgetSummary(ym, out), L = [];
  if (bs && bs.left > 0) L.push(`오늘은 ${won(Math.floor(bs.left / (daysIn(ym) - +t.slice(8) + 1)))}까지 써도 괜찮아요!`);
  if (bs && bs.left <= 0) L.push('이번 달 예산을 넘었어요. 내일은 무지출 도전 어때요?');
  const h = habitStats();
  if (h.streak >= 2) L.push(`${h.streak}일째 꼬박꼬박 기록 중이에요. 대단해요!`);
  if (!h.todayAny) L.push('오늘 쓴 돈, 잊기 전에 적어 볼까요?');
  else if (!h.todayOut) L.push('오늘은 아직 쓴 돈이 없어요. 이대로 무지출?');
  const up = plannedIn(addDays(t, 1), addDays(t, 3))[0];
  if (up) L.push(`${ddayText(up.date)} ‘${up.name}’ ${won(up.amount)}이 나가요.`);
  const m = openMemos().filter(x => x.date && x.date >= t).sort(memoSort)[0];
  if (m) L.push(`메모해 둔 ‘${m.name}’, ${ddayText(m.date)}예요.`);
  L.push('적는 만큼 돈이 보여요. 오늘도 꼬박꼬박!');
  return L;
}
function mascotTalk() {
  const el = document.getElementById('mascot');
  if (!el) return;
  el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop');
  if (!look().talk) return;
  const b = el.querySelector('.bubble'), L = mascotLines();
  b.textContent = L[mascotIdx++ % L.length];
  b.hidden = false;
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => { b.hidden = true; }, 4200);
}
function mascotCheer() { const el = document.getElementById('mascot'); if (el) { el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop'); } }

/* --- 사진 넣기: 브라우저에서 줄여서 저장해요 --- */
async function shrinkImage(file, kind) {
  if (!file || !/^image\//.test(file.type)) throw new Error('사진(이미지) 파일만 넣을 수 있어요.');
  if (file.size > 25e6) throw new Error('25MB보다 작은 사진을 골라 주세요.');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('사진을 읽지 못했어요. 다른 사진으로 해 볼까요?')); i.src = url; });
    const W = img.naturalWidth || 400, H = img.naturalHeight || 400;
    let scale = Math.min(1, (kind === 'wall' ? 1400 : 360) / Math.max(W, H));
    for (let i = 0; i < 6; i++) {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(W * scale)); c.height = Math.max(1, Math.round(H * scale));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      let data = kind === 'wall' ? c.toDataURL('image/jpeg', 0.8) : c.toDataURL('image/webp', 0.9);
      if (!data.startsWith('data:image/webp') && kind !== 'wall') data = c.toDataURL('image/png');
      if (data.length < 600000) return data;
      scale *= 0.75;
    }
    throw new Error('사진이 너무 커요. 다른 사진으로 해 볼까요?');
  } finally { URL.revokeObjectURL(url); }
}
function writeDeco(kind, img) {
  S.deco = { ...S.deco, [kind]: img };
  applyLook(look());
  scheduleRender();
  if (!S.db) return Promise.resolve();
  const body = { img, at: Date.now() };
  return track(enqueue('deco/' + kind, () => retry(() => S.db.doc('deco/' + kind).set(body))));
}
async function pickDeco(kind, file) {
  try {
    toast('사진을 줄이는 중이에요…');
    const data = await shrinkImage(file, kind);
    await writeDeco(kind, data);
    if (kind === 'wall') saveLook({ bg: 'photo' }); else saveLook({ char: 'mine' });
    toast(kind === 'wall' ? '배경 사진을 넣었어요' : '캐릭터를 넣었어요');
  } catch (e) { toast(e && e.message ? e.message : '사진을 넣지 못했어요'); }
}

/* --- 설정의 꾸미기 카드 --- */
const segBtns = (act, cur, opts) => `<div class="seg" role="group" style="width:100%">${opts.map(([v, n]) => `<button type="button" data-act="${act}" data-v="${v}" aria-pressed="${String(cur) === String(v)}">${n}</button>`).join('')}</div>`;
function lookCard() {
  const tab = S.lookTab || 'color', l = look(), cur = cfg().theme;
  const tabs = `<div class="seg look-tabs" role="tablist" aria-label="꾸미기">${[['color', '색'], ['bg', '배경'], ['char', '캐릭터'], ['font', '글꼴·크기']].map(([v, n]) => `<button type="button" role="tab" id="lt-${v}" data-act="look-tab" data-v="${v}" aria-pressed="${tab === v}" aria-selected="${tab === v}">${n}</button>`).join('')}</div>`;
  let body = '';
  if (tab === 'color') {
    const grp = m => THEMES.filter(x => m.includes(x.mode)).map(x => themeOpt(x, cur)).join('');
    const cp = customPalette(l.accent, l.mode === 'dark' || (l.mode === 'auto' && darkMQ.matches));
    const mine = `<button class="theme-opt" type="button" role="radio" id="th-custom" data-act="theme" data-id="custom" aria-checked="${cur === 'custom'}"><span class="theme-prev" aria-hidden="true" style="background:${cp.vars['--bg']}"><i style="background:${cp.vars['--surface']}"><b style="background:${cp.vars['--accent']}"></b><s style="background:${cp.vars['--ink']}"></s></i></span><span class="theme-n">직접 만들기</span></button>`;
    body = `<div role="radiogroup" aria-label="색상 테마">
      <p class="theme-gt">기기 설정 따라가기 <span>밝은 화면·어두운 화면이 기기 설정에 맞춰 바뀌어요</span></p>
      <div class="themes">${grp(['auto'])}</div>
      <p class="theme-gt">늘 같은 색 <span>기기 설정과 상관없이 이 색 그대로 보여요</span></p>
      <div class="themes">${grp(['light', 'dark'])}</div>
      <p class="theme-gt">나만의 색 <span>좋아하는 색 하나만 고르면 나머지는 맞춰 드려요</span></p>
      <div class="themes">${mine}</div></div>
      ${cur === 'custom' ? `<div class="look-box">
        <span class="lab">포인트 색</span>
        <div class="swatches">${ACCENTS.map(c => `<button type="button" class="sw" data-act="lk-accent" data-v="${c}" style="background:${c}" aria-label="${c}" aria-pressed="${l.accent.toUpperCase() === c}"></button>`).join('')}<label class="sw sw-pick" title="직접 고르기"><input type="color" id="lk-accent" value="${l.accent}" aria-label="색 직접 고르기"><span aria-hidden="true">+</span></label></div>
        ${cp.adjusted ? `<p class="amt-hint">글자가 잘 보이도록 고른 색을 조금 ${l.mode === 'dark' ? '밝게' : '진하게'} 맞췄어요.</p>` : ''}
        <span class="lab">바탕</span>${segBtns('lk-mode', l.mode, [['auto', '기기 따라'], ['light', '늘 밝게'], ['dark', '늘 어둡게']])}
      </div>` : ''}`;
  } else if (tab === 'bg') {
    const wall = S.deco && S.deco.wall;
    const gradTiles = GRADS.map(g => `<button type="button" class="grad-opt" data-act="lk-grad" data-v="${g.id}" aria-pressed="${l.bg === 'grad' && l.grad === g.id}"><span style="background:linear-gradient(135deg, ${g.c[0]}, ${g.c[1]})"></span>${g.name}</button>`).join('')
      + `<button type="button" class="grad-opt" data-act="lk-grad" data-v="custom" aria-pressed="${l.bg === 'grad' && l.grad === 'custom'}"><span style="background:linear-gradient(135deg, ${l.g1}, ${l.g2})"></span>직접</button>`;
    body = `${segBtns('lk-bg', l.bg, [['none', '기본'], ['grad', '그라데이션'], ['photo', '사진']])}
      ${l.bg !== 'photo' ? `<div class="look-box"><div class="grads">${gradTiles}</div>
        ${l.grad === 'custom' ? `<div class="field-row"><label class="field"><span class="lab">시작 색</span><input type="color" class="input color-in" id="lk-g1" value="${l.g1}"></label><label class="field"><span class="lab">끝 색</span><input type="color" class="input color-in" id="lk-g2" value="${l.g2}"></label></div>` : ''}
        ${l.bg === 'grad' ? `<span class="lab">방향</span>${segBtns('lk-angle', l.angle, [['180', '위→아래'], ['160', '비스듬히'], ['90', '왼쪽→오른쪽']])}
        <span class="lab">진하기</span>${segBtns('lk-power', l.power, [['1', '은은하게'], ['2', '보통'], ['3', '진하게']])}` : '<p class="amt-hint">그라데이션을 하나 고르면 바로 적용돼요.</p>'}</div>` : ''}
      ${l.bg === 'photo' ? `<div class="look-box">
        ${wall ? `<div class="wall-prev" style="background-image:url('${wall}')"></div>` : '<p class="set-note">갤러리에서 사진을 고르면 화면 뒤에 깔아 드려요. 사진은 자동으로 작게 줄여서 내 계정에만 저장해요.</p>'}
        <div class="habit-acts"><label class="btn btn-primary btn-sm file-btn">${icon('plus', 'sm')}${wall ? '사진 바꾸기' : '사진 고르기'}<input type="file" id="lk-wall" accept="image/*" hidden></label>${wall ? '<button class="btn btn-ghost btn-sm" type="button" data-act="lk-wall-del">사진 빼기</button>' : ''}</div>
        ${wall ? `<span class="lab">흐리게</span>${segBtns('lk-blur', l.blur, [['0', '선명하게'], ['1', '살짝'], ['2', '많이']])}
        <span class="lab">위에 덮는 색 <span class="muted" style="font-weight:400">(글자가 잘 보이게)</span></span>${segBtns('lk-dim', l.dim, [['1', '조금'], ['2', '보통'], ['3', '많이']])}` : ''}</div>` : ''}
      ${l.bg !== 'none' ? `<div class="switch-row"><div><span class="card-t">카드 반투명하게</span><p>배경이 카드 뒤로 은은하게 비쳐요. 글자가 잘 안 보이면 꺼 주세요.</p></div><button class="switch" type="button" role="switch" aria-checked="${l.glass}" data-act="lk-glass" aria-label="카드 반투명하게"></button></div>` : ''}`;
  } else if (tab === 'char') {
    const mine = S.deco && S.deco.mascot;
    body = `<div class="char-opts">
        <button type="button" class="char-opt" data-act="lk-char" data-v="none" aria-pressed="${l.char === 'none'}"><span class="cp-none">없음</span></button>
        <button type="button" class="char-opt" data-act="lk-char" data-v="coin" aria-pressed="${l.char === 'coin'}"><span class="cp-img">${COIN_SVG}</span>꼬박이</button>
        <button type="button" class="char-opt" data-act="lk-char" data-v="mine" aria-pressed="${l.char === 'mine'}" ${mine ? '' : 'disabled'}><span class="cp-img">${mine ? `<img src="${mine}" alt="">` : ''}</span>내 그림</button>
      </div>
      <div class="habit-acts"><label class="btn btn-soft btn-sm file-btn">${icon('plus', 'sm')}${mine ? '내 그림 바꾸기' : '내 그림 넣기'}<input type="file" id="lk-mascot" accept="image/*" hidden></label>${mine ? '<button class="btn btn-ghost btn-sm" type="button" data-act="lk-mascot-del">내 그림 빼기</button>' : ''}</div>
      <p class="amt-hint">배경이 투명한 PNG 그림이 가장 예뻐요. 직접 그린 그림이나 사진을 써 주세요. 다른 사람의 캐릭터를 공개된 곳에 쓰면 저작권 문제가 생길 수 있어요.</p>
      ${l.char !== 'none' ? `<span class="lab">크기</span>${segBtns('lk-csize', l.charSize, [['s', '작게'], ['m', '보통'], ['l', '크게']])}
      <span class="lab">자리</span>${segBtns('lk-cpos', l.charPos, [['r', '오른쪽 아래'], ['l', '왼쪽 아래']])}
      <div class="switch-row"><div><span class="card-t">말 걸기</span><p>누르면 오늘 쓸 수 있는 돈, 다가오는 결제 같은 한마디를 해요.</p></div><button class="switch" type="button" role="switch" aria-checked="${l.talk}" data-act="lk-talk" aria-label="말 걸기"></button></div>` : ''}`;
  } else {
    loadFonts(FONTS);
    body = `<div class="font-list" role="radiogroup" aria-label="글꼴">${FONTS.map(f => `<button type="button" class="font-opt" role="radio" data-act="lk-font" data-v="${f.id}" aria-checked="${l.font === f.id}" style="font-family:'${f.fam}', 'IBM Plex Sans KR', sans-serif"><span class="fo-n">${f.name}</span><span class="fo-s">꼬박꼬박 12,500원</span><small>${f.note}</small></button>`).join('')}</div>
      <div class="switch-row"><div><span class="card-t">금액은 기본 글꼴로 보기</span><p>손글씨 글꼴은 숫자가 헷갈릴 수 있어요. 켜 두면 금액만 또렷한 기본 글꼴로 보여요.</p></div><button class="switch" type="button" role="switch" aria-checked="${l.numBase}" data-act="lk-num" aria-label="금액은 기본 글꼴로 보기"></button></div>
      <span class="lab">글자 크기</span>${segBtns('lk-fs', l.fs, [['s', '작게'], ['m', '보통'], ['l', '크게'], ['xl', '아주 크게']])}
      <span class="lab">카드 모서리</span>${segBtns('lk-radius', l.radius, [['sq', '각지게'], ['md', '보통'], ['rd', '둥글게']])}`;
  }
  return `<section class="card look-card">
    <div class="card-h"><h2 class="card-t">꾸미기</h2><button class="card-link" type="button" data-act="lk-reset">처음 모습으로</button></div>
    ${tabs}<div class="look-body">${body}</div>
    <p class="set-note" style="margin-top:12px">고른 모습은 계정에 저장돼서 다른 기기에서도 똑같이 보여요.</p>
  </section>`;
}

/* ================= 카테고리 아이콘 고르기 ================= */
// [아이콘, 찾는 말] — 검색과 이름에 맞는 아이콘 추천에 써요
const ICON_GROUPS = [
  { id: 'food', name: '음식', items: [
    ['🍚', '밥 식사 한식 식비'], ['🍜', '라면 국수 면 우동'], ['🍝', '파스타 스파게티 양식'], ['🍛', '카레 덮밥'], ['🍲', '찌개 국 탕 전골'], ['🍱', '도시락 배달'],
    ['🍣', '초밥 회 일식'], ['🍤', '튀김 새우'], ['🍙', '삼각김밥 주먹밥 편의점'], ['🥟', '만두 중식'], ['🍗', '치킨 닭'], ['🍖', '고기 갈비'],
    ['🥩', '소고기 스테이크 정육'], ['🍔', '햄버거 패스트푸드'], ['🍟', '감자튀김'], ['🍕', '피자'], ['🌭', '핫도그'], ['🌮', '타코 멕시칸'],
    ['🥪', '샌드위치'], ['🥗', '샐러드 다이어트'], ['🥘', '요리 냄비'], ['🍳', '계란 아침 요리'], ['🥞', '팬케이크 브런치'], ['🥐', '빵 크루아상 베이커리'],
    ['🍞', '식빵 빵집'], ['🧀', '치즈'], ['🍢', '어묵 분식 떡볶이'], ['🍡', '떡'], ['🍰', '케이크 디저트'], ['🎂', '생일 케이크'],
    ['🧁', '컵케이크'], ['🍩', '도넛'], ['🍪', '쿠키 과자'], ['🍫', '초콜릿'], ['🍬', '사탕'], ['🍦', '아이스크림'],
    ['🍧', '빙수'], ['🍿', '팝콘 간식'], ['🍎', '사과 과일'], ['🍊', '귤 감귤 과일'], ['🍌', '바나나'], ['🍉', '수박'],
    ['🍇', '포도'], ['🍓', '딸기'], ['🍑', '복숭아'], ['🥑', '아보카도'], ['🥦', '채소 야채 브로콜리'], ['🥕', '당근 채소'],
    ['🌽', '옥수수'], ['🥔', '감자'], ['🍄', '버섯'], ['🥜', '견과 땅콩'], ['🛒', '장보기 마트 식료품'], ['🥡', '포장 테이크아웃 중식'],
  ] },
  { id: 'drink', name: '음료·카페', items: [
    ['☕', '커피 카페 아메리카노'], ['🍵', '차 녹차'], ['🧋', '버블티 밀크티'], ['🥤', '음료 탄산 주스'], ['🧃', '주스'], ['🥛', '우유'],
    ['🍺', '맥주 술 호프'], ['🍻', '술자리 회식 건배'], ['🍷', '와인'], ['🥂', '샴페인 축하'], ['🍸', '칵테일 바'], ['🍶', '소주 사케 전통주'],
    ['🍹', '칵테일 휴가'], ['🧉', '음료'], ['🫖', '차 티타임'],
  ] },
  { id: 'shop', name: '쇼핑·패션', items: [
    ['🛍️', '쇼핑 구매'], ['👕', '옷 티셔츠 의류'], ['👖', '바지 청바지'], ['👗', '원피스 드레스'], ['🧥', '외투 코트 패딩'], ['👚', '블라우스'],
    ['👟', '운동화 신발'], ['👠', '구두 힐'], ['👜', '가방 핸드백'], ['🎒', '백팩 가방'], ['👛', '지갑'], ['🧢', '모자'],
    ['🕶️', '선글라스'], ['👓', '안경'], ['💍', '반지 주얼리 액세서리'], ['⌚', '시계'], ['🧦', '양말'], ['🧣', '목도리'],
    ['💄', '화장품 메이크업 뷰티'], ['💅', '네일'], ['🧴', '로션 스킨케어'], ['🧼', '비누 세제'], ['📦', '택배 온라인 쇼핑'], ['🏷️', '할인 세일 기타'],
  ] },
  { id: 'home', name: '집·생활', items: [
    ['🏠', '집 월세 주거'], ['🏢', '관리비 아파트 오피스텔'], ['🛏️', '침대 가구'], ['🛋️', '소파 인테리어'], ['🪑', '의자 가구'], ['🚿', '샤워 욕실'],
    ['🧺', '빨래 세탁 생활'], ['🧹', '청소'], ['🧻', '휴지 생필품'], ['🧽', '주방 설거지'], ['🔑', '열쇠 보증금'], ['💡', '전기 공과금'],
    ['🔥', '가스 난방'], ['💧', '수도 물'], ['🪴', '화분 식물'], ['🔧', '수리 공구'], ['🧰', '공구 수리'], ['🗑️', '쓰레기'],
    ['🧯', '안전'], ['🕯️', '향초 캔들'], ['🖼️', '액자 소품'], ['🪞', '거울'],
  ] },
  { id: 'move', name: '교통·차', items: [
    ['🚌', '버스 교통'], ['🚇', '지하철'], ['🚆', '기차'], ['🚄', 'KTX 고속열차'], ['🚕', '택시'], ['🚗', '자동차 차'],
    ['🚙', 'SUV 차'], ['⛽', '주유 기름 연료'], ['🅿️', '주차'], ['🛣️', '고속도로 톨게이트 통행료'], ['🏍️', '오토바이'], ['🛵', '스쿠터 배달'],
    ['🚲', '자전거 따릉이'], ['🛴', '킥보드 킥고잉'], ['✈️', '비행기 항공'], ['🚢', '배 여객선'], ['🚤', '보트'], ['🚐', '렌터카 승합차'],
    ['🔩', '정비 차량'], ['🚦', '교통 신호'],
  ] },
  { id: 'digital', name: '통신·디지털', items: [
    ['📱', '휴대폰 통신비 핸드폰'], ['💻', '노트북 컴퓨터'], ['🖥️', '모니터 컴퓨터'], ['⌨️', '키보드'], ['🖱️', '마우스'], ['🎧', '이어폰 헤드폰'],
    ['📺', 'TV 구독 OTT 넷플릭스'], ['🎮', '게임'], ['🕹️', '게임 오락'], ['📷', '카메라'], ['🔋', '배터리 충전'], ['🌐', '인터넷 와이파이'],
    ['☁️', '클라우드 저장공간'], ['🎵', '음악 스트리밍 멜론'], ['📡', '통신 위성'], ['🤖', 'AI 앱 구독'],
  ] },
  { id: 'health', name: '건강·운동', items: [
    ['💊', '약 약국 의료'], ['🏥', '병원'], ['🩺', '진료 검진'], ['🦷', '치과'], ['👁️', '안과 렌즈'], ['🩹', '밴드 응급'],
    ['💉', '주사 예방접종'], ['🏋️', '헬스 운동 피트니스'], ['🧘', '요가 필라테스 명상'], ['🏃', '러닝 달리기'], ['🚴', '자전거 운동'], ['🏊', '수영'],
    ['⚽', '축구'], ['🏀', '농구'], ['⚾', '야구'], ['🎾', '테니스'], ['🏸', '배드민턴'], ['⛳', '골프'],
    ['🎳', '볼링'], ['🧗', '클라이밍'], ['💆', '마사지'], ['💇', '미용실 헤어 커트'], ['🧖', '사우나 찜질방'], ['🛡️', '보험'],
  ] },
  { id: 'study', name: '교육·일', items: [
    ['📚', '책 도서 교육'], ['📖', '독서'], ['📝', '시험 공부 메모'], ['✏️', '문구 필기'], ['🎓', '학비 등록금 대학'], ['🏫', '학원 학교'],
    ['💼', '업무 회사 출장'], ['📊', '자격증 강의'], ['🖨️', '인쇄 복사'], ['📎', '사무용품'], ['🧑‍💻', '코딩 개발 온라인강의'], ['🗣️', '어학 영어 회화'],
    ['🎹', '음악 레슨 피아노'], ['🖍️', '미술 아이'], ['🔬', '과학 실험'], ['📮', '우편 등기'],
  ] },
  { id: 'fun', name: '문화·여가', items: [
    ['🎬', '영화 극장'], ['🎟️', '티켓 공연'], ['🎤', '노래방 콘서트'], ['🎸', '기타 악기'], ['🎨', '그림 취미 미술'], ['🎭', '연극 뮤지컬'],
    ['🎪', '축제 페스티벌'], ['🎡', '놀이공원'], ['🎲', '보드게임'], ['🧩', '퍼즐 취미'], ['🎯', '다트 취미'], ['🎣', '낚시'],
    ['🏕️', '캠핑'], ['⛺', '텐트 캠핑'], ['🏖️', '바다 해변'], ['⛰️', '등산 산'], ['📸', '사진 촬영'], ['🧶', '뜨개질 공예'],
    ['🪁', '연'], ['🎧', '음악 감상'], ['📕', '만화 웹툰'], ['🎰', '복권 로또'],
  ] },
  { id: 'travel', name: '여행', items: [
    ['🧳', '여행 캐리어'], ['🏨', '호텔 숙소 숙박'], ['🗺️', '여행 지도'], ['🌍', '해외여행'], ['🏝️', '휴양 섬 제주'], ['🗼', '해외 관광'],
    ['🏯', '관광 문화재'], ['🛫', '출국 항공권'], ['🚠', '케이블카'], ['🌋', '관광 자연'], ['🎑', '명절 추석'], ['🛂', '여권 비자'],
  ] },
  { id: 'people', name: '사람·마음', items: [
    ['🎁', '선물 경조사'], ['💐', '꽃 꽃다발'], ['💝', '선물 기념일'], ['💌', '편지 축의금'], ['🎉', '축하 파티'], ['🎈', '파티 생일'],
    ['💒', '결혼 결혼식 축의금'], ['🕊️', '조의금 부의금'], ['👶', '아기 육아'], ['🍼', '분유 육아'], ['🧸', '장난감 아이'], ['👪', '가족'],
    ['💑', '데이트 연애'], ['👵', '부모님 용돈 효도'], ['🙏', '기부 후원 헌금'], ['🤝', '모임 회비'], ['🧧', '세뱃돈 용돈'], ['❤️', '사랑'],
  ] },
  { id: 'pet', name: '반려동물', items: [
    ['🐶', '강아지 반려견'], ['🐱', '고양이 반려묘'], ['🐰', '토끼'], ['🐹', '햄스터'], ['🐟', '물고기 어항'], ['🐦', '새'],
    ['🐢', '거북이'], ['🦴', '간식 사료'], ['🐾', '반려동물 펫 동물병원'], ['🦮', '산책'],
  ] },
  { id: 'money', name: '돈·금융', items: [
    ['💰', '돈 부수입 수입'], ['💵', '현금 지폐'], ['💳', '카드 결제'], ['🏦', '은행 금융 이자'], ['💸', '대출 상환 이체'], ['🪙', '동전 잔돈'],
    ['📈', '투자 주식 수익'], ['📉', '손실'], ['🧾', '영수증 세금 기타'], ['🐷', '저금 적금 저축'], ['🏧', 'ATM 인출'], ['💼', '급여 월급 회사'],
    ['🧮', '세금 회계'], ['🏛️', '공공 세금 과태료'], ['📜', '계약 증명서'], ['🎫', '상품권 쿠폰'],
  ] },
  { id: 'etc', name: '자연·기호', items: [
    ['🌱', '새싹 시작'], ['🌸', '벚꽃 봄'], ['🌻', '해바라기 여름'], ['🍁', '단풍 가을'], ['⛄', '눈사람 겨울'], ['🍀', '행운'],
    ['🌈', '무지개'], ['☀️', '해 맑음'], ['🌙', '달 밤'], ['⭐', '별 즐겨찾기'], ['✨', '반짝 특별'], ['💎', '보석 사치'],
    ['🔔', '알림'], ['📌', '고정 중요'], ['✅', '완료 체크'], ['❗', '중요 긴급'], ['🎀', '리본'], ['🧿', '부적'],
  ] },
];
const ALL_ICONS = ICON_GROUPS.flatMap(g => g.items.map(([e, k]) => ({ e, k: `${k} ${g.name}`, g: g.id })));
const CAT_COLORS = ['', '#E5484D', '#F76B15', '#FFC53D', '#46A758', '#12A594', '#0090FF', '#3E63DD', '#8E4EC6', '#D6409F', '#AD7F58', '#8B8D98'];
const ccStyle = c => (c && c.color ? ` style="--cc:${c.color}"` : '');
function iconSearch(q) {
  const s = String(q || '').trim().toLowerCase();
  if (!s) return [];
  const words = s.split(/\s+/);
  return ALL_ICONS.filter(x => words.every(w => x.k.toLowerCase().includes(w) || x.e === w));
}
// 이름에 맞는 아이콘 추천: "고양이 사료" → 🐱 🦴 ...
function iconSuggest(name) {
  const toks = String(name || '').toLowerCase().split(/[\s,·/]+/).filter(t => t.length >= 1);
  if (!toks.length) return [];
  const score = new Map();
  for (const x of ALL_ICONS) {
    const keys = x.k.toLowerCase().split(' ');
    let sc = 0;
    for (const t of toks) for (const k of keys) { if (k === t) sc += 3; else if (t.length >= 2 && (k.includes(t) || (k.length >= 2 && t.includes(k)))) sc += 1; }
    if (sc) score.set(x.e, Math.max(sc, score.get(x.e) || 0));
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x[0]);
}
const recentIcons = () => (Array.isArray(prefs.recentIcons) ? prefs.recentIcons.slice(0, 12) : []);
function pushRecentIcon(e) { prefs.recentIcons = [e, ...recentIcons().filter(x => x !== e)].slice(0, 12); savePrefs(); }

/* --- the picker (shared by the record sheet and the category sheet) --- */
function iconGridHtml(ip, cur) {
  const list = ip.q ? iconSearch(ip.q) : ip.grp === 'recent' ? recentIcons().map(e => ({ e })) : (ICON_GROUPS.find(g => g.id === ip.grp) || ICON_GROUPS[0]).items.map(([e]) => ({ e }));
  if (!list.length) return `<p class="ip-empty">${ip.q ? `‘${esc(ip.q)}’에 맞는 아이콘이 없어요. 다른 말로 찾거나 아래에 이모지를 직접 넣어 보세요.` : '아직 고른 아이콘이 없어요.'}</p>`;
  return list.map(x => `<button type="button" class="ip-ic" data-act="ip-pick" data-e="${esc(x.e)}" aria-pressed="${x.e === cur}" aria-label="${esc(x.e)}">${esc(x.e)}</button>`).join('');
}
function iconPicker(t, ip) {
  const groups = [...(recentIcons().length ? [{ id: 'recent', name: '최근' }] : []), ...ICON_GROUPS];
  return `<div class="ip" id="iconPicker">
    <label class="search ip-search">${icon('search')}<span class="sr-only">아이콘 찾기</span><input class="input" id="ip-q" type="search" placeholder="찾기: 커피, 고양이, 월세…" value="${esc(ip.q)}" autocomplete="off"></label>
    <div class="ip-groups" role="tablist" aria-label="아이콘 묶음" ${ip.q ? 'hidden' : ''}>${groups.map(g => `<button type="button" class="chip" role="tab" data-act="ip-grp" data-v="${g.id}" aria-pressed="${ip.grp === g.id}">${g.name}</button>`).join('')}</div>
    <div class="ip-grid" id="ipGrid">${iconGridHtml(ip, t.emoji)}</div>
    <label class="ip-own"><span>키보드 이모지로 직접</span><input class="input emoji" id="ip-own" maxlength="8" placeholder="입력" autocomplete="off"></label>
  </div>`;
}
function catFormHtml(t, ip, kind) {
  const sug = iconSuggest(t.name).filter(e => e !== t.emoji);
  return `<div class="nc-head">
      <button type="button" class="nc-prev" id="ncPrev" data-act="ip-toggle" aria-label="아이콘 고르기"${ccStyle(t)}>${esc(t.emoji || '🏷️')}</button>
      <div class="field" style="flex:1;min-width:0"><label class="lab" for="nc-name">${kind === 'in' ? '수입' : '지출'} 카테고리 이름</label><input class="input" id="nc-name" maxlength="20" placeholder="${kind === 'in' ? '예: 중고거래, 이자' : '예: 반려동물, 술자리, 덕질'}" value="${esc(t.name)}" autocomplete="off"></div>
    </div>
    <div class="nc-sug" id="ncSug">${sug.length ? `<span>추천</span>${sug.map(e => `<button type="button" class="ip-ic sm" data-act="ip-pick" data-e="${esc(e)}" aria-label="${esc(e)}">${esc(e)}</button>`).join('')}` : ''}</div>
    <div class="nc-colors" role="group" aria-label="색"><span>색</span>${CAT_COLORS.map(c => `<button type="button" class="nc-sw${c ? '' : ' none'}" data-act="nc-color" data-v="${c}" aria-pressed="${(t.color || '') === c}" aria-label="${c || '색 없음'}"${c ? ` style="background:${c}"` : ''}></button>`).join('')}</div>
    ${ip.open ? iconPicker(t, ip) : ''}`;
}
const pickTarget = () => (F && F.mode === 'cat' ? F : F && F.nc ? F.nc : null);
function refreshPickerBits() {
  const t = pickTarget(); if (!t) return;
  const p = $('#ncPrev'); if (p) { p.textContent = t.emoji || '🏷️'; if (t.color) p.style.setProperty('--cc', t.color); else p.style.removeProperty('--cc'); }
  document.querySelectorAll('#sheet [data-act="ip-pick"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.e === t.emoji)));
  document.querySelectorAll('#sheet [data-act="nc-color"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === (t.color || ''))));
  const g = $('#ipGrid'); if (g && F.ip) g.innerHTML = iconGridHtml(F.ip, t.emoji);
  const s = $('#ncSug');
  if (s) { const sug = iconSuggest(t.name).filter(e => e !== t.emoji); s.innerHTML = sug.length ? `<span>추천</span>${sug.map(e => `<button type="button" class="ip-ic sm" data-act="ip-pick" data-e="${esc(e)}" aria-label="${esc(e)}">${esc(e)}</button>`).join('')}` : ''; }
  const sv = $('#cat-save'); if (sv) sv.disabled = !(t.name || '').trim();
  const ns = $('#nc-save'); if (ns) ns.disabled = !(t.name || '').trim();
}
// a typed name picks a fitting icon until the person chooses one
function autoIcon(t) { if (!t.iconTouched) { const s = iconSuggest(t.name)[0]; t.emoji = s || '🏷️'; } }

/* --- new category inside the record sheet --- */
function ncBlock(f) {
  if (!f.nc) return '';
  return `<div class="nc-box" id="ncBox">${catFormHtml(f.nc, f.ip, f.kind)}
    <div class="habit-acts"><button class="btn btn-primary btn-sm" type="button" id="nc-save" data-act="nc-save" ${(f.nc.name || '').trim() ? '' : 'disabled'}>추가하고 고르기</button><button class="btn btn-ghost btn-sm" type="button" data-act="nc-cancel">취소</button></div></div>`;
}
function addCategory(kind, t) {
  const name = (t.name || '').trim().slice(0, 20);
  if (!name) return null;
  const st = cfg(), same = st.cats.find(c => c.kind === kind && c.name === name);
  if (same) { toast(`‘${name}’ 카테고리가 이미 있어서 그걸로 골랐어요`); return same.id; }
  const id = uid('c'), cat = { id, name, emoji: t.emoji || '🏷️', kind };
  if (t.color) cat.color = t.color;
  saveSettings({ ...st, cats: [...st.cats, cat] });
  if (t.emoji) pushRecentIcon(t.emoji);
  toast(`‘${name}’ 카테고리를 만들었어요`);
  return id;
}

/* --- category sheet (settings) --- */
function openCatSheet(id, kind) {
  if (S.mode === 'denied') return;
  const c = id && cfg().cats.find(x => x.id === id);
  F = c ? { mode: 'cat', id, kind: c.kind, name: c.name, emoji: c.emoji, color: c.color || '', iconTouched: true, ip: { open: true, q: '', grp: recentIcons().length ? 'recent' : 'food' } }
    : { mode: 'cat', id: null, kind: kind || 'out', name: '', emoji: '🏷️', color: '', iconTouched: false, ip: { open: true, q: '', grp: 'food' } };
  showSheet(catSheet(), c ? null : '#nc-name');
}
function catSheet() {
  const f = F;
  return `<form id="catForm" autocomplete="off" novalidate>
    <div class="sheet-h"><h2 id="sheetTitle">${f.id ? '카테고리 고치기' : '카테고리 만들기'}</h2><button class="icon-btn" type="button" data-act="close" aria-label="닫기">${icon('x')}</button></div>
    ${catFormHtml(f, f.ip, f.kind)}
    <div class="sheet-actions"><button class="btn btn-primary btn-block" type="submit" id="cat-save" ${(f.name || '').trim() ? '' : 'disabled'}>${f.id ? '고친 내용 저장' : '만들기'}</button></div>
  </form>`;
}
function saveCatSheet() {
  const f = F, name = (f.name || '').trim().slice(0, 20);
  if (!name) return;
  if (!f.id) { addCategory(f.kind, f); closeSheet(); return; }
  const st = cfg();
  saveSettings({ ...st, cats: st.cats.map(c => (c.id === f.id ? { ...c, name, emoji: f.emoji || c.emoji, color: f.color || '' } : c)) });
  if (f.emoji) pushRecentIcon(f.emoji);
  closeSheet();
  toast('카테고리를 고쳤어요');
}


/* ================= 설정 목록 순서 바꾸기 (끌기 · 화살표 키) ================= */
function saveOrder(list, ids) {
  const st = cfg();
  if (list === 'method') {
    const by = Object.fromEntries(st.methods.map(m => [m.id, m]));
    const next = ids.map(id => by[id]).filter(Boolean);
    if (next.length !== st.methods.length || next.every((m, i) => m === st.methods[i])) return false;
    saveSettings({ ...st, methods: next });
  } else {
    const kind = S.setKind, own = st.cats.filter(c => c.kind === kind), by = Object.fromEntries(own.map(c => [c.id, c]));
    const next = ids.map(id => by[id]).filter(Boolean);
    if (next.length !== own.length || next.every((c, i) => c === own[i])) return false;
    let i = 0;
    saveSettings({ ...st, cats: st.cats.map(c => (c.kind === kind ? next[i++] : c)) });
  }
  return true;
}
const listIds = list => [...list.children].map(r => r.dataset && r.dataset.id).filter(Boolean);
let drag = null;
document.addEventListener('pointerdown', e => {
  const h = e.target.closest && e.target.closest('.drag-h');
  if (!h || h.disabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const row = h.closest('[data-id]'), list = row && row.parentElement;
  if (!list || !list.dataset.list) return;
  e.preventDefault();
  drag = { h, row, list, y0: e.clientY, pid: e.pointerId, moved: false };
  try { h.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  row.classList.add('dragging');
});
document.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.pid) return;
  e.preventDefault();
  const { row, list } = drag;
  let dy = e.clientY - drag.y0;
  if (Math.abs(dy) > 3) drag.moved = true;
  row.style.transform = `translateY(${dy}px)`;
  const r = row.getBoundingClientRect(), mid = r.top + r.height / 2;
  const prev = row.previousElementSibling, next = row.nextElementSibling;
  let swap = null;
  if (next && next.dataset.id) { const q = next.getBoundingClientRect(); if (mid > q.top + q.height / 2) swap = () => list.insertBefore(next, row); }
  if (!swap && prev && prev.dataset.id) { const q = prev.getBoundingClientRect(); if (mid < q.top + q.height / 2) swap = () => list.insertBefore(row, prev); }
  if (swap) {
    const before = row.offsetTop; swap(); const after = row.offsetTop;
    drag.y0 += after - before; dy = e.clientY - drag.y0;
    row.style.transform = `translateY(${dy}px)`;
  }
}, { passive: false });
function endDrag(e) {
  if (!drag || (e && e.pointerId !== drag.pid)) return;
  const { row, list, moved } = drag;
  drag = null;
  row.classList.remove('dragging'); row.style.transform = '';
  if (moved && saveOrder(list.dataset.list, listIds(list))) toast('순서를 바꿨어요');
}
document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', endDrag);
document.addEventListener('keydown', e => {
  const h = e.target.closest && e.target.closest('.drag-h');
  if (!h || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
  e.preventDefault();
  const row = h.closest('[data-id]'), list = row.parentElement, ids = listIds(list), i = ids.indexOf(row.dataset.id), j = i + (e.key === 'ArrowUp' ? -1 : 1);
  if (j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  S.focusAfter = h.id;
  if (saveOrder(list.dataset.list, ids)) toast(`${j + 1}번째로 옮겼어요`);
});

/* ================= toast ================= */
let toastTimer = 0, toastUndo = null;
function toast(msg, opts = {}) {
  const el = $('#toast');
  toastUndo = opts.undo || null;
  el.innerHTML = `<span>${esc(msg)}</span>${toastUndo ? `<button type="button" data-act="toast-undo">${esc(opts.label || '되돌리기')}</button>` : ''}`;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, opts.ms || (toastUndo ? 6000 : 2600));
}
function hideToast() { $('#toast').hidden = true; toastUndo = null; }

/* ================= events ================= */
function go(view) {
  if (!VIEWS[view]) return;
  if (view !== S.view) { paceHover = null; S.confirmClear = false; S.leave = null; }
  S.view = view; prefs.view = view; savePrefs();
  render();
  window.scrollTo(0, 0);
}
function shiftMonth(d) { S.ym = addMonths(S.ym, d); S.selDay = null; paceHover = null; render(); }
function onMoneyInput(el) {
  const digits = el.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 12);
  const v = digits ? +digits : 0;
  const shown = digits ? fmt(v) : '';
  if (el.value !== shown) el.value = shown;
  if (!F) return;
  if (el.id === 'f-amount') { F.amount = v; syncTxSheet(); }
  else if (el.id === 's-amount') { F.amount = v; $('#s-save').disabled = !canSaveSub(); }
  else if (el.id === 'g-target') { F.target = v; refreshGoalSheet(); }
  else if (el.id === 'g-monthly') { F.monthly = v; refreshGoalSheet(); }
  else if (el.id === 'dep-amount') { F.amount = v; $('#dep-save').disabled = !(v > 0); }
  else if (el.id === 'su-income' || el.id === 'su-fixed') { F[el.id === 'su-income' ? 'income' : 'fixed'] = v; const pl = document.createElement('div'); pl.innerHTML = setupSheet(); const np = pl.querySelector('#suPlan'); if (np) $('#suPlan').innerHTML = np.innerHTML; $('#su-save').disabled = !(F.income > 0 && F.income > F.fixed); }
  else if (el.id === 'm-amount') { F.amount = v; refreshMemoHints(); }
  else if (el.id === 'a-bal') { F.balance = v; }
  else if (el.id === 'x-bal') { F.actual = digits ? v : null; refreshFix(); }
  else if (el.id === 'q-principal') { F.principal = v; $('#qpHint').textContent = v >= 1e4 ? koreanWon(v) : '처음 빌린 금액이 아니라 오늘 기준으로 남은 금액이에요.'; refreshQuick(); }
  else if (el.id === 'q-pay') { F.pay = v; refreshQuick(); }
  else if (el.id === 'q-int') { F.int = v; refreshQuick(); }
  else if (el.id === 'l-principal') { F.principal = v; $('#lpHint').textContent = v >= 1e4 ? koreanWon(v) : ''; refreshLoanSheet(); }
  else if (el.id === 'b-total') { F.total = v; $('#bHint').textContent = budHint(); }
  else if (el.dataset.bcat) {
    F.cats[el.dataset.bcat] = v;
    $('#bHint').textContent = budHint();
    const cs = budCatSum(); $('#b-total').placeholder = cs ? fmt(cs) : '0';
  }
}
const ACT = {
  add: el => openTxSheet({ date: el.dataset.date }),
  close: () => closeSheet(),
  month: el => shiftMonth(+el.dataset.d),
  'month-now': () => { S.ym = ymOf(todayStr()); S.selDay = null; paceHover = null; render(); },
  'edit-tx': el => openTxSheet({ id: el.dataset.id }),
  'edit-sub': el => openSubSheet(el.dataset.id),
  'add-sub': () => openSubSheet(null),
  'add-bill': el => openBillSheet(el.dataset.date),
  'memo-add': el => openMemoSheet(null, el.dataset.date),
  'memo-edit': el => openMemoSheet(el.dataset.id),
  'memo-spend': el => spendMemo(el.dataset.id),
  'memo-drop': el => dropMemo(el.dataset.id),
  'memo-delete': () => deleteMemo(),
  'memo-undo': el => { const m = S.memos[el.dataset.id]; if (!m) return; writeMemos({ [el.dataset.id]: { ...m, status: 'plan', tx: '', spent: 0, doneAt: '' } }); toast('다시 메모로 돌렸어요'); },
  'memo-cat': el => { F.cat = el.dataset.id; for (const b of document.querySelectorAll('#sheet [data-act="memo-cat"]')) b.setAttribute('aria-pressed', String(b.dataset.id === F.cat)); },
  'memo-date': el => { F.date = el.dataset.v; rerenderSheet(memoSheet()); },
  'memo-fill': el => { F.amount = +el.dataset.v || 0; if (el.dataset.cat && catsOf('out').some(c => c.id === el.dataset.cat)) F.cat = el.dataset.cat; rerenderSheet(memoSheet()); },
  'often-range': el => { S.oftenRange = +el.dataset.v; renderView(); },
  'often-again': el => againFromGroup(el.dataset.k),
  'f-often': el => { const x = oftenChips().find(g => g.k === el.dataset.k); if (!x) return; Object.assign(F, { memo: x.name, cat: x.cat || F.cat, method: x.method || F.method, catTouched: true }); if (!F.amount) F.amount = x.last.amount; rerenderSheet(txSheet()); const a = $('#f-amount'); if (a) { a.focus(); a.select(); } },
  'go-memos': () => { S.listMode = 'plan'; prefs.listMode = 'plan'; savePrefs(); go('list'); },
  'go-often': () => { S.listMode = 'often'; prefs.listMode = 'often'; savePrefs(); go('list'); },
  'plan-pay': el => payPlan(el.dataset.id, el.dataset.date),
  'plan-skip': el => skipPlan(el.dataset.id, el.dataset.date),
  'sub-filter': el => { S.subFilter = el.dataset.v; renderView(); },
  's-type': el => { if (el.dataset.v === 'loan') { const day = F.day; openLoanSheet(null, { prefill: { day } }); return; } F.type = el.dataset.v; const has = id => catsOf('out').some(c => c.id === id); if (F.type === 'bill' && F.cat === 'subs' && has('home')) F.cat = 'home'; if (F.type === 'sub' && F.cat === 'home' && has('subs')) F.cat = 'subs'; rerenderSheet(subSheet()); },
  's-preset': el => { const b = BILL_PRESETS[+el.dataset.i]; if (!b) return; F.name = b.name; F.emoji = b.emoji; if (catsOf('out').some(c => c.id === b.cat)) F.cat = b.cat; rerenderSheet(subSheet()); const a = $('#s-amount'); if (a) a.focus(); },
  'edit-budget': () => openBudgetSheet(),
  'filter-cat': el => { S.filter = { kind: 'all', cat: el.dataset.cat, method: '', q: '' }; S.listMode = 'list'; go('list'); },
  'filter-method': el => { S.filter = { kind: 'out', cat: '', method: el.dataset.id, q: '' }; S.listMode = 'list'; go('list'); },
  'list-mode': el => { S.listMode = el.dataset.mode; prefs.listMode = S.listMode; savePrefs(); renderView(); },
  'kind-filter': el => { S.filter.kind = el.dataset.kind; renderView(); },
  'reset-filter': () => { S.filter = { kind: 'all', cat: '', method: '', q: '' }; renderView(); },
  'cal-day': el => { S.selDay = el.dataset.date; renderView(); },
  'pace-table': () => { S.showTable = !S.showTable; renderView(); },
  'toggle-auto': () => { const on = !cfg().autoSubs; saveSettings({ ...cfg(), autoSubs: on }); if (on) autoRecord(); },
  'ex-ask': () => { S.confirmClear = true; renderNotice(); },
  'ex-cancel': () => { S.confirmClear = false; renderNotice(); },
  'ex-clear': () => { S.confirmClear = false; clearExamples(); toast('예시를 지웠어요. 이제 내 기록을 시작해 보세요'); },
  'set-kind': el => { S.setKind = el.dataset.kind; renderView(); },
  'add-cat': () => openCatSheet(null, S.setKind),
  'cat-icon': el => openCatSheet(el.dataset.id),
  'nc-open': () => { F.nc = { name: '', emoji: '🏷️', color: '', iconTouched: false }; F.ip = { open: true, q: '', grp: recentIcons().length ? 'recent' : 'food' }; rerenderSheet(txSheet()); const n = $('#nc-name'); if (n) n.focus(); },
  'nc-cancel': () => { F.nc = null; rerenderSheet(txSheet()); },
  'nc-save': () => { const id = addCategory(F.kind, F.nc); if (!id) return; F.cat = id; F.catTouched = true; F.nc = null; rerenderSheet(txSheet()); },
  'nc-color': el => { const t = pickTarget(); if (!t) return; t.color = el.dataset.v; refreshPickerBits(); },
  'ip-pick': el => { const t = pickTarget(); if (!t) return; t.emoji = el.dataset.e; t.iconTouched = true; refreshPickerBits(); },
  'ip-grp': el => { F.ip.grp = el.dataset.v; F.ip.q = ''; document.querySelectorAll('#sheet [data-act="ip-grp"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === F.ip.grp))); refreshPickerBits(); },
  'ip-toggle': () => { F.ip.open = !F.ip.open; rerenderSheet(F.mode === 'cat' ? catSheet() : txSheet()); },
  'del-cat': el => {
    const st = cfg(), c = st.cats.find(x => x.id === el.dataset.id);
    if (!c) return;
    if (st.cats.filter(x => x.kind === c.kind).length <= 1) { toast('카테고리는 하나 이상 있어야 해요'); return; }
    const before = st.cats;
    saveSettings({ ...st, cats: st.cats.filter(x => x.id !== c.id) });
    toast(`‘${c.name}’ 카테고리를 지웠어요`, { undo: () => saveSettings({ ...cfg(), cats: before }) });
  },
  'add-method': () => {
    const st = cfg(), id = uid('m');
    S.focusAfter = 'mn-' + id;
    saveSettings({ ...st, methods: [...st.methods, { id, name: '새 결제수단' }] });
  },
  'del-method': el => {
    const st = cfg(), m = st.methods.find(x => x.id === el.dataset.id);
    if (!m) return;
    const before = st.methods;
    saveSettings({ ...st, methods: st.methods.filter(x => x.id !== m.id) });
    toast(`‘${m.name}’${josa(m.name,'을/를').slice(-1)} 지웠어요`, { undo: () => saveSettings({ ...cfg(), methods: before }) });
  },
  'toast-undo': () => { const u = toastUndo; hideToast(); if (u) u(); },
  ai: () => openAiSheet(),
  'day-open': el => openDaySheet(el.dataset.date),
  'add-goal': () => openGoalSheet(null),
  nospend: el => { writeNoSpend(el.dataset.date, el.dataset.on === '1'); toast(el.dataset.on === '1' ? '무지출로 체크했어요. 잘했어요!' : '무지출 체크를 취소했어요'); if (F && F.mode === 'day') openDaySheet(el.dataset.date); },
  setup: () => openSetupSheet(),
  'su-rate': el => { if (!F) return; F.rate = +el.dataset.v; rerenderSheet(setupSheet()); },
  'credit-del': el => { const id = el.dataset.id, prev = S.credit[id]; if (!prev) return; writeCredit({ [id]: null }); toast('기록을 지웠어요', { undo: () => writeCredit({ [id]: prev }) }); },
  'sms-open': () => { if (!F) return; F.smsOpen = true; rerenderSheet(txSheet()); const b = $('#f-sms'); if (b) b.focus(); },
  'sms-close': () => { if (!F) return; F.smsOpen = false; rerenderSheet(txSheet()); },
  'sms-apply': () => applySms(),
  'g-preset': () => { if (!F) return; Object.assign(F, { kind: 'saving', name: F.name.trim() || '청년미래적금', term: 36, monthly: F.monthly || 500000, contrib: '6', taxFree: true }); rerenderSheet(goalSheet()); },
  'edit-goal': el => openGoalSheet(el.dataset.id),
  'goal-dep': el => openDepSheet(el.dataset.id),
  'goal-hist': el => openGoalHistory(el.dataset.id),
  'dep-del': el => deleteDep(el.dataset.gid, el.dataset.id),
  'g-kind': el => { F.kind = el.dataset.v; rerenderSheet(goalSheet()); },
  'g-delete': () => deleteGoal(),
  'd-kind': el => { F.kind = el.dataset.v; rerenderSheet(depSheet()); },
  'open-cal': () => { S.listMode = 'cal'; S.selDay = null; prefs.listMode = 'cal'; savePrefs(); go('list'); },
  'add-loan': () => openLoanSheet(null),
  'edit-loan': el => openLoanSheet(el.dataset.id),
  'loan-sched': el => openSchedule(el.dataset.id),
  'l-type': el => { F.type = el.dataset.v; rerenderSheet(loanSheet()); },
  'l-kind': el => { F.kind = el.dataset.v; F.kindTouched = true; rerenderSheet(quickLoanSheet()); },
  'l-preset': el => { const p = LOAN_PRESETS[+el.dataset.i]; if (!p) return; F.name = p.name; F.kind = p.kind; F.kindTouched = true; rerenderSheet(quickLoanSheet()); const a = $('#q-principal'); if (a) a.focus(); },
  'l-qmode': el => {
    if (el.dataset.v === 'quick' || !F || !F.quick) return;
    const q = F; openLoanSheet(null, { detail: true });
    Object.assign(F, { name: q.name, principal: q.principal, day: q.day, method: q.method }, q.kindTouched ? { type: q.kind === 'int' ? 'bullet' : 'equal' } : {});
    if (q.principal > 0 && q.int > 0) F.rate = String(Math.round(q.int * 12 / q.principal * 100 * 100) / 100);
    rerenderSheet(loanSheet());
  },
  'l-qmode2': () => { const d = F; F = quickF(null, null, { name: d.name, principal: d.principal, day: d.day, method: d.method, kind: d.type === 'bullet' ? 'int' : 'amort' }); rerenderSheet(quickLoanSheet()); },
  'l-method': el => { F.method = el.dataset.id; for (const b of document.querySelectorAll('#sheet [data-act="l-method"]')) b.setAttribute('aria-pressed', String(b.dataset.id === F.method)); },
  'l-delete': () => deleteLoan(),
  theme: el => { saveSettings({ ...cfg(), theme: el.dataset.id }); applyTheme(el.dataset.id); },
  'look-tab': el => { S.lookTab = el.dataset.v; renderView(); },
  'lk-accent': el => saveLook({ accent: el.dataset.v }),
  'lk-mode': el => saveLook({ mode: el.dataset.v }),
  'lk-bg': el => saveLook({ bg: el.dataset.v }),
  'lk-grad': el => saveLook({ bg: 'grad', grad: el.dataset.v }),
  'lk-angle': el => saveLook({ angle: +el.dataset.v }),
  'lk-power': el => saveLook({ power: +el.dataset.v }),
  'lk-blur': el => saveLook({ blur: +el.dataset.v }),
  'lk-dim': el => saveLook({ dim: +el.dataset.v }),
  'lk-glass': () => saveLook({ glass: !look().glass }),
  'lk-char': el => saveLook({ char: el.dataset.v }),
  'lk-csize': el => saveLook({ charSize: el.dataset.v }),
  'lk-cpos': el => saveLook({ charPos: el.dataset.v }),
  'lk-talk': () => saveLook({ talk: !look().talk }),
  'lk-font': el => saveLook({ font: el.dataset.v }),
  'lk-num': () => saveLook({ numBase: !look().numBase }),
  'lk-fs': el => saveLook({ fs: el.dataset.v }),
  'lk-radius': el => saveLook({ radius: el.dataset.v }),
  'lk-reset': () => { saveSettings({ ...cfg(), theme: 'forest', look: { ...LOOK_DEF } }); applyTheme('forest'); toast('처음 모습으로 되돌렸어요'); },
  'lk-wall-del': () => { writeDeco('wall', ''); saveLook({ bg: 'none' }); },
  'lk-mascot-del': () => { writeDeco('mascot', ''); if (look().char === 'mine') saveLook({ char: 'none' }); },
  mascot: () => mascotTalk(),
  'backup-json': () => saveFile(`꼬박꼬박가계부_백업_${todayStr()}.json`, JSON.stringify(backupData())),
  'backup-csv': () => saveFile(`꼬박꼬박가계부_내역_${todayStr()}.csv`, csvData()),
  'restore-pick': () => { const i = $('#restoreFile'); if (i) { i.value = ''; i.click(); } },
  'restore-yes': () => { applyRestore(); renderView(); },
  'restore-no': () => { S.restore = null; renderView(); },
  'st-table': el => { S.stTables = { ...(S.stTables || {}), [el.dataset.k]: !(S.stTables || {})[el.dataset.k] }; renderView(); },
  'st-search': el => { S.filter = { kind: 'out', cat: '', method: '', q: el.dataset.q || '' }; S.listMode = 'list'; go('list'); },
  'leave-ask': () => { S.leave = {}; renderView(); const i = $('#leaveWord'); if (i) { i.scrollIntoView({ block: 'center' }); i.focus(); } },
  'leave-no': () => { S.leave = null; renderView(); },
  'leave-yes': () => { if (window.ttbPlatform && window.ttbPlatform.deleteAccount && !(S.leave && S.leave.busy)) leaveAccount(); },
  logout: () => { if (window.ttbPlatform) window.ttbPlatform.signOut(); },
  'ai-ex': el => askAi(el.dataset.q),
  'ai-stop': () => { if (aiCtl) aiCtl.abort(); },
  'ai-undo': el => undoAi(+el.dataset.i),
  // transaction sheet
  'f-kind': el => {
    if (F.kind === el.dataset.kind) return;
    F.kind = el.dataset.kind; F.acct = '';
    if (F.kind === 'move') { F.from = F.from || mainAcct(); F.to = F.to && F.to !== F.from ? F.to : (acctsArr().find(a => a.id !== F.from) || { id: '' }).id; rerenderSheet(txSheet()); return; }
    if (catOf(F.cat).kind !== F.kind || !catOf(F.cat).id) { F.cat = lastCat(F.kind); F.catTouched = false; }
    rerenderSheet(txSheet());
  },
  'f-plus': el => { F.amount = Math.min(999999999999, F.amount + +el.dataset.v); syncTxSheet(); },
  'f-clear': () => { F.amount = 0; syncTxSheet(); $('#f-amount').focus(); },
  'f-cat': el => { F.cat = el.dataset.id; F.catTouched = true; $('#learnHint').textContent = ''; syncTxSheet(); },
  'f-day': el => { F.date = addDays(todayStr(), +el.dataset.d); $('#f-date').value = F.date; syncTxSheet(); },
  'f-method': el => { F.method = el.dataset.id; syncTxSheet(); refreshAcctField(); },
  'f-acct': el => { F.acct = el.dataset.id || '-'; refreshAcctField(); },
  'f-from': el => { F.from = el.dataset.id; if (F.to === F.from) F.to = (acctsArr().find(a => a.id !== F.from) || { id: '' }).id; rerenderSheet(txSheet()); },
  'f-to': el => { F.to = el.dataset.id; if (F.from === F.to) F.from = (acctsArr().find(a => a.id !== F.to) || { id: '' }).id; rerenderSheet(txSheet()); },
  'acct-add': el => openAcctSheet(null, el.dataset.i != null ? +el.dataset.i : null),
  'acct-edit': el => openAcctSheet(el.dataset.id),
  'acct-fix': el => openFixSheet(el.dataset.id),
  'acct-move': el => openMoveSheet(el.dataset.id),
  'acct-list': el => { S.filter = { kind: 'all', cat: '', method: '', q: '', acct: el.dataset.id }; S.listMode = 'list'; go('list'); },
  'a-preset': el => { const p = ACCT_PRESETS[+el.dataset.i]; if (!p) return; F.name = p.name; F.type = p.type; rerenderSheet(acctSheet()); const b = $('#a-bal'); if (b) b.focus(); },
  'a-type': el => { F.type = el.dataset.v; rerenderSheet(acctSheet()); },
  'a-method': el => { const id = el.dataset.id; F.methods[id] = !F.methods[id]; el.setAttribute('aria-pressed', String(!!F.methods[id])); },
  'a-main': el => { F.main = !F.main; el.setAttribute('aria-checked', String(F.main)); },
  'a-delete': () => deleteAcct(),
  'fix-save': el => saveFix(el.dataset.rec === '1'),
  'f-delete': () => deleteTx(),
  // subscription sheet
  's-cycle': el => { F.cycle = el.dataset.v; rerenderSheet(subSheet()); },
  's-method': el => { F.method = el.dataset.id; for (const b of document.querySelectorAll('#sheet [data-act="s-method"]')) b.setAttribute('aria-pressed', String(b.dataset.id === F.method)); },
  's-active': el => { F.active = !F.active; el.setAttribute('aria-checked', String(F.active)); },
  's-delete': () => deleteSub(),
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act], [data-view]');
  if (!el || el.disabled) return;
  if (el.dataset.act) {
    const fn = ACT[el.dataset.act];
    if (fn && (!el.dataset.act.match(/^[fsldg]-/) || F)) { e.preventDefault(); fn(el, e); }
  } else if (el.dataset.view) go(el.dataset.view);
});
document.addEventListener('input', e => {
  const el = e.target;
  if (el.id === 'flt-q') { S.filter.q = el.value; updateListResults(); return; }
  if (el.id === 'nc-name' || el.id === 'ip-q' || el.id === 'ip-own') {
    const t = pickTarget(); if (!t) return;
    if (el.id === 'nc-name') { t.name = el.value; autoIcon(t); }
    else if (el.id === 'ip-q') { F.ip.q = el.value; const g = document.querySelector('#sheet .ip-groups'); if (g) g.hidden = !!el.value.trim(); }
    else { const v = firstGrapheme(el.value); if (v) { t.emoji = v; t.iconTouched = true; } }
    refreshPickerBits();
    return;
  }
  if (el.id === 'lk-accent' && isHex(el.value)) { applyLook({ ...look(), accent: el.value }); return; } // live preview while dragging
  if (el.id === 'ai-q') { S.aiDraft = el.value; return; }
  if (el.id === 'f-amount' || el.id === 'm-amount' || el.id === 'a-bal' || el.id === 'x-bal' || el.id === 's-amount' || el.id === 'b-total' || el.id === 'l-principal' || el.id === 'q-principal' || el.id === 'q-pay' || el.id === 'q-int' || el.id === 'g-target' || el.id === 'g-monthly' || el.id === 'dep-amount' || el.id === 'su-income' || el.id === 'su-fixed' || (el.dataset && el.dataset.bcat)) { onMoneyInput(el); return; }
  if (F && F.mode === 'goal') {
    if (el.id === 'g-name') F.name = el.value;
    else if (el.id === 'g-emoji') F.emoji = el.value;
    else if (el.id === 'g-rate') { const v = el.value.replace(/[^\d.]/g, ''); if (v !== el.value) el.value = v; F.rate = v; }
    else if (el.id === 'g-term') { const v = el.value.replace(/\D/g, '').slice(0, 3); if (v !== el.value) el.value = v; F.term = +v || 0; }
    else if (el.id === 'g-contrib') { const v = el.value.replace(/[^\d.]/g, ''); if (v !== el.value) el.value = v; F.contrib = v; }
    refreshGoalSheet();
    return;
  }
  if (F && F.mode === 'dep' && el.id === 'dep-memo') { F.memo = el.value; return; }
  if (F && F.mode === 'loan' && F.quick) { if (el.id === 'q-name') { F.name = el.value; refreshQuick(); } return; }
  if (F && F.mode === 'loan') {
    if (el.id === 'l-name') F.name = el.value;
    else if (el.id === 'l-lender') F.lender = el.value;
    else if (el.id === 'l-rate') { const v = el.value.replace(/[^\d.]/g, ''); if (v !== el.value) el.value = v; F.rate = v; }
    else if (el.id === 'l-term') { const v = el.value.replace(/\D/g, '').slice(0, 3); if (v !== el.value) el.value = v; F.term = +v || 0; }
    refreshLoanSheet();
    return;
  }
  if (!F) return;
  if (F.mode === 'acct') { if (el.id === 'a-name') { F.name = el.value; const b = $('#a-save'); if (b) b.disabled = !canSaveAcct(); } else if (el.id === 'a-bank') F.bank = el.value; return; }
  if (F.mode === 'memo') { if (el.id === 'm-name') { F.name = el.value; refreshMemoHints(); } else if (el.id === 'm-note') F.note = el.value; return; }
  if (el.id === 'f-memo') { F.memo = el.value; if (!F.catTouched) $('#learnHint').textContent = ''; }
  else if (el.id === 's-name') { F.name = el.value; $('#s-save').disabled = !canSaveSub(); }
  else if (el.id === 's-emoji') F.emoji = el.value;
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'flt-cat') { S.filter.cat = el.value; renderView(); return; }
  if (el.id === 'flt-method') { S.filter.method = el.value; renderView(); return; }
  if (el.id === 'flt-acct') { S.filter.acct = el.value; renderView(); return; }
  if (el.dataset && el.dataset.field && el.dataset.cat) { updateCat(el.dataset.cat, el.dataset.field, el.value); return; }
  if (el.dataset && el.dataset.method && el.id.startsWith('mn-')) { updateMethod(el.dataset.method, el.value); return; }
  if (el.id === 'restoreFile') { readRestore(el.files && el.files[0]); return; }
  if (el.id === 'lk-wall' || el.id === 'lk-mascot') { const f = el.files && el.files[0]; el.value = ''; if (f) pickDeco(el.id === 'lk-wall' ? 'wall' : 'mascot', f); return; }
  if (el.id === 'lk-accent' && isHex(el.value)) { saveLook({ accent: el.value.toUpperCase() }); return; }
  if ((el.id === 'lk-g1' || el.id === 'lk-g2') && isHex(el.value)) { saveLook({ [el.id === 'lk-g1' ? 'g1' : 'g2']: el.value.toUpperCase() }); return; }
  if (!F) return;
  switch (el.id) {
    case 'f-memo': F.memo = el.value; learnFromMemo(); break;
    case 'f-date': if (isYmd(el.value)) { F.date = el.value; syncTxSheet(); } break;
    case 'm-date': F.date = isYmd(el.value) ? el.value : ''; rerenderSheet(memoSheet()); break;
    case 's-day': F.day = +el.value; rerenderSheet(subSheet()); break;
    case 's-month': F.month = +el.value; rerenderSheet(subSheet()); break;
    case 's-cat': F.cat = el.value; break;
    case 's-record': F.recordNow = el.checked; break;
    case 'l-start': if (isYmd(el.value)) { F.start = el.value; rerenderSheet(loanSheet()); } break;
    case 'l-day': F.day = +el.value; rerenderSheet(loanSheet()); break;
    case 'q-day': F.day = +el.value; refreshQuick(); break;
    case 'q-end-y': F.endY = el.value ? +el.value : ''; rerenderSheet(quickLoanSheet()); break;
    case 'q-end-m': F.endM = +el.value; refreshQuick(); break;
    case 'q-auto': F.auto = el.checked; break;
    case 'l-auto': F.auto = el.checked; rerenderSheet(loanSheet()); break;
    case 'l-record': F.recordNow = el.checked; break;
    case 'g-start': if (isYmd(el.value)) { F.start = el.value; refreshGoalSheet(); } break;
    case 'g-end': if (isYmd(el.value)) { F.end = el.value; refreshGoalSheet(); } break;
    case 'g-day': F.day = +el.value; refreshGoalSheet(); break;
    case 'g-auto': F.auto = el.checked; break;
    case 'g-taxfree': F.taxFree = el.checked; refreshGoalSheet(); break;
    case 'su-goal': F.goal = el.checked; break;
    case 'dep-date': if (isYmd(el.value)) F.date = el.value; break;
    default: break;
  }
});
document.addEventListener('submit', e => {
  e.preventDefault();
  if (e.target && e.target.id === 'creditForm') { saveCredit(); return; }
  if (!F) return;
  const ae = document.activeElement && document.activeElement.id;
  if (F.nc && (ae === 'nc-name' || ae === 'ip-q' || ae === 'ip-own')) { if (ae === 'nc-name' && (F.nc.name || '').trim()) ACT['nc-save'](); return; }
  if (F.mode === 'cat') { if (ae === 'ip-q' || ae === 'ip-own') return; saveCatSheet(); return; }
  if (F.mode === 'tx') saveTx();
  else if (F.mode === 'sub') saveSub();
  else if (F.mode === 'budget') saveBudget();
  else if (F.mode === 'loan') saveLoan();
  else if (F.mode === 'goal') saveGoal();
  else if (F.mode === 'setup') saveSetup();
  else if (F.mode === 'dep') saveDep();
  else if (F.mode === 'memo') saveMemo();
  else if (F.mode === 'acct') saveAcct();
  else if (F.mode === 'fix') { if (F.actual != null) saveFix(false); }
  else if (F.mode === 'ai') { const q = $('#ai-q'); if (q) askAi(q.value); }
});
document.addEventListener('keydown', e => {
  if ($('#sheetWrap').hidden) return;
  if (e.key === 'Escape') { e.preventDefault(); closeSheet(); return; }
  if (e.key === 'Tab') { // keep focus inside the open sheet
    const els = [...$('#sheet').querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled])')].filter(x => x.offsetParent !== null);
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
let lastDay = todayStr();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || todayStr() === lastDay) return;
  lastDay = todayStr();
  autoRecord();
  render();
});

boot();
})();
