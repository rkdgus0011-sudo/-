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
const VIEW_NAMES = ['home', 'list', 'subs', 'loans', 'budget', 'settings'];

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
  loaded: { months: false, meta: false },
  definitive: { months: false, meta: false },
  pending: 0, syncError: false, storeError: false,
  view: VIEW_NAMES.includes(prefs.view) ? prefs.view : 'home',
  ym: ymOf(todayStr()),
  listMode: prefs.listMode === 'cal' ? 'cal' : 'list',
  filter: { kind: 'all', cat: '', method: '', q: '' },
  selDay: null, showTable: false, setKind: 'out', confirmClear: false, focusAfter: null,
};
let F = null; // open sheet's form state

/* ================= settings / lookups ================= */
function normSettings(st) {
  const s = st && typeof st === 'object' ? st : {};
  const cats = Array.isArray(s.cats) && s.cats.length ? s.cats.filter(c => c && c.id && (c.kind === 'in' || c.kind === 'out')).map(c => ({ id: c.id, name: c.name || '이름 없음', emoji: c.emoji || '🏷️', kind: c.kind })) : DEFAULT_CATS;
  const methods = Array.isArray(s.methods) ? s.methods.filter(m => m && m.id).map(m => ({ id: m.id, name: m.name || '이름 없음' })) : DEFAULT_METHODS;
  const b = s.budget && typeof s.budget === 'object' ? s.budget : {};
  const theme = ['forest', 'ocean', 'sunset', 'lavender', 'blossom', 'graphite'].includes(s.theme) ? s.theme : 'forest';
  return { cats, methods, budget: { total: +b.total > 0 ? +b.total : 0, cats: { ...(b.cats || {}) } }, budgetEx: !!s.budgetEx, autoSubs: s.autoSubs !== false, theme };
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
  for (const t of list) { if (t.kind === 'in') i += t.amount; else o += t.amount; }
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
  const kind = t.kind === 'in' ? 'in' : 'out';
  return {
    date: t.date, kind, amount: Math.round(t.amount), cat: t.cat || '',
    memo: String(t.memo || '').trim().slice(0, 40), method: kind === 'in' ? '' : (t.method || ''),
    sub: t.sub || '', loan: t.loan || '', ex: !!t.ex, at: t.at || Date.now(),
  };
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
  const d = nextOcc(s, t);
  return d === t && keys.has(subTxId(s, d)) ? nextOcc(s, addDays(t, 1)) : d;
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
      if (keys.has(id) || attempted.has(id)) continue; // recorded, or deleted on purpose
      attempted.add(id);
      (patches[ymOf(d)] ||= {})[id] = makeTx({ date: d, kind: 'out', amount: sub.amount, cat: sub.cat, memo: sub.name, method: sub.method, sub: sub.id, ex: !!sub.ex, at: parseD(d).getTime() + 9 * 36e5 });
    }
  }
  for (const l of loansArr()) {
    if (!l.auto || !(l.principal > 0)) continue;
    const since = isYmd(l.since) ? l.since : t, from = since > floor ? since : floor;
    for (const r of loanSchedule(l)) {
      if (r.date < from || r.date > t || !(r.pay > 0)) continue;
      const id = `l_${l.id}_${r.date.slice(0, 7).replace('-', '')}`;
      if (keys.has(id) || attempted.has(id)) continue;
      attempted.add(id);
      (patches[ymOf(r.date)] ||= {})[id] = makeTx({ date: r.date, kind: 'out', amount: r.pay, cat: 'loan', memo: `${l.name} ${r.k}회차 (이자 ${fmt(r.int)}원)`, method: l.method, loan: l.id, ex: !!l.ex, at: parseD(r.date).getTime() + 9 * 36e5 });
    }
  }
  for (const ym in patches) writeMonth(ym, patches[ym]);
}

function hasExamples() {
  if (cfg().budgetEx) return true;
  for (const id in S.subs) if (S.subs[id] && S.subs[id].ex) return true;
  for (const id in S.loans) if (S.loans[id] && S.loans[id].ex) return true;
  for (const ym in S.months) for (const id in S.months[ym]) { const t = S.months[ym][id]; if (t && t.ex) return true; }
  return false;
}
function exampleCounts() {
  let tx = 0, subs = 0;
  for (const ym in S.months) for (const id in S.months[ym]) { const t = S.months[ym][id]; if (t && t.ex) tx++; }
  for (const id in S.subs) if (S.subs[id] && S.subs[id].ex) subs++;
  let loans = 0;
  for (const id in S.loans) if (S.loans[id] && S.loans[id].ex) loans++;
  return { tx, subs, loans, budget: cfg().budgetEx };
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
    const months = {}, docs = new Set();
    for (const d of snap.docs) { const data = d.data() || {}; docs.add(d.id); months[d.id] = { ...(data.items || {}) }; }
    S.months = months; S.monthDocs = docs; S.loaded.months = true;
    if (!snap.metadata || !snap.metadata.fromCache) S.definitive.months = true;
    onData();
  }, onStoreError);
  db.collection('meta').onSnapshot(snap => {
    let st = null, subs = {}, subsDoc = false, loans = {}, loansDoc = false;
    for (const d of snap.docs) {
      const data = d.data() || {};
      if (d.id === 'settings') st = data;
      else if (d.id === 'subs') { subs = { ...(data.items || {}) }; subsDoc = true; }
      else if (d.id === 'loans') { loans = { ...(data.items || {}) }; loansDoc = true; }
    }
    S.settings = st ? normSettings(st) : null; S.subs = subs; S.subsDoc = subsDoc; S.loans = loans; S.loansDoc = loansDoc; S.loaded.meta = true;
    if (st) applyTheme(S.settings.theme);
    if (!snap.metadata || !snap.metadata.fromCache) S.definitive.meta = true;
    onData();
  }, onStoreError);
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
    if (b.dataset.view === S.view) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  }
  $('#monthNav').hidden = !['home', 'list', 'budget'].includes(S.view);
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
    const what = [n.tx ? `예시 내역 ${n.tx}건` : '', n.subs ? `예시 구독 ${n.subs}개` : '', n.loans ? `예시 대출 ${n.loans}건` : '', n.budget ? '예시 예산' : ''].filter(Boolean).join(', ');
    h = S.confirmClear
      ? `<div class="notice"><p>${what}을 지울까요? 직접 적은 기록은 그대로 남아요.</p><div class="acts"><button class="btn btn-sm btn-primary" type="button" id="exYes" data-act="ex-clear">지우기</button><button class="btn btn-sm btn-soft" type="button" data-act="ex-cancel">취소</button></div></div>`
      : `<div class="notice"><p>지금 보이는 내역·구독·대출·예산은 <b>예시</b>예요. 둘러본 뒤 지우고 내 기록을 시작하세요.</p><div class="acts"><button class="btn btn-sm btn-soft" type="button" id="exAsk" data-act="ex-ask">예시 지우기</button></div></div>`;
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
const VIEWS = { home: vHome, list: vList, subs: vSubs, loans: vLoans, budget: vBudget, settings: vSettings };
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
  const c = catOf(t.cat), m = t.kind === 'out' ? methodOf(t.method) : null;
  const sub = [c.name]; if (m) sub.push(m.name);
  return `<button class="tx" type="button" data-act="edit-tx" data-id="${esc(t.id)}">
    <span class="emo" aria-hidden="true">${esc(c.emoji)}</span>
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
      <div class="welcome-acts"><button class="btn btn-primary" type="button" data-act="add" ${isLoading() ? 'disabled' : ''}>${icon('plus')}첫 기록 남기기</button><button class="btn btn-soft" type="button" data-act="add-sub" ${isLoading() ? 'disabled' : ''}>구독 등록하기</button></div>
    </section>`;
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
  const budget = `<section class="card" data-o="2">
    <div class="card-h"><h2 class="card-t">${mLabel(ym)} 예산</h2><button class="card-link" type="button" data-view="budget">자세히${icon('right')}</button></div>
    ${bs ? `<div class="bud-head"><p class="bud-pct">${Math.round(bs.pct * 100)}%<small>사용</small></p>${stateChip(bs.state, bs.left)}<span class="bud-of">${won(bs.B)} 중 ${won(tot.out)}</span></div>${meter(bs.pct, bs.state)}<p class="bud-foot">${bs.foot}</p>`
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
      <span class="emo" aria-hidden="true">${esc(c.emoji)}</span>
      <span class="rank-main"><span class="rank-line"><span class="rank-name">${esc(c.name)}</span><span class="rank-amt">${won(v)}</span></span><span class="bar"><span style="width:${(v / maxC * 100).toFixed(1)}%"></span></span></span>
      <span class="rank-pct">${pct(v)}</span></button>`;
  }).join('') + (rest.length ? (() => {
    const v = sum(rest.map(r => r[1]));
    return `<div class="rank-row"><span class="emo" aria-hidden="true">⋯</span><span class="rank-main"><span class="rank-line"><span class="rank-name">그 외 ${rest.length}개</span><span class="rank-amt">${won(v)}</span></span><span class="bar"><span style="width:${(v / maxC * 100).toFixed(1)}%"></span></span></span><span class="rank-pct">${pct(v)}</span></div>`;
  })() : '');
  const cats = `<section class="card" data-o="3">
    <div class="card-h"><h2 class="card-t">어디에 썼을까</h2>${outs.length ? `<span class="muted" style="font-size:13px">${outs.length}건</span>` : ''}</div>
    ${outs.length ? `<div class="rank">${catRows}</div>` : emptyBox(`${mLabel(ym)} 지출이 아직 없어요`, '지출을 기록하면 카테고리별로 모아서 보여 드려요.')}
  </section>`;

  const ups = upcoming(30, 4);
  const monthEnd = `${curYm}-${pad(daysIn(curYm))}`;
  const restThisMonth = sum(subsArr().filter(s => s.active && s.amount > 0).map(s => { const d = nextOcc(s, addDays(t, 1)); return d <= monthEnd ? s.amount : 0; }));
  const upc = `<section class="card" data-o="4">
    <div class="card-h"><h2 class="card-t">다가오는 정기결제</h2><button class="card-link" type="button" data-view="subs">전체${icon('right')}</button></div>
    ${ups.length ? `<div class="rank">${ups.map(({ s, d }) => { const m = methodOf(s.method); return `<button class="sub-row" type="button" data-act="edit-sub" data-id="${esc(s.id)}">
        <span class="emo" aria-hidden="true">${esc(s.emoji || catOf(s.cat).emoji)}</span>
        <span class="tx-main"><span class="sub-name">${esc(s.name)}</span><span class="sub-meta">${mdw(d)}${m ? ' · ' + esc(m.name) : ''}</span></span>
        <span class="sub-end"><span class="sub-amt">${won(s.amount)}</span><span class="dday${diffDays(t, d) <= 3 ? ' soon' : ''}">${ddayText(d)}</span></span></button>`; }).join('')}</div>
      ${restThisMonth ? `<p class="bud-foot">이번 달 남은 정기결제 <b>${won(restThisMonth)}</b></p>` : ''}`
      : emptyBox('30일 안에 예정된 결제가 없어요', '', `<button class="btn btn-soft btn-sm" type="button" data-act="add-sub">구독 등록하기</button>`)}
  </section>`;

  const byM = {};
  for (const x of outs) byM[x.method || ''] = (byM[x.method || ''] || 0) + x.amount;
  const mRanked = Object.entries(byM).sort((a, b) => b[1] - a[1]);
  const maxM = mRanked.length ? mRanked[0][1] : 1;
  const meth = `<section class="card" data-o="6">
    <div class="card-h"><h2 class="card-t">결제수단별 지출</h2></div>
    ${mRanked.length ? `<div class="rank">${mRanked.map(([id, v]) => {
      const m = methodOf(id), name = m ? m.name : '결제수단 없음';
      const inner = `<span class="emo" aria-hidden="true">${icon(methodIcon(name))}</span><span class="rank-main"><span class="rank-line"><span class="rank-name">${esc(name)}</span><span class="rank-amt">${won(v)}</span></span><span class="bar"><span style="width:${(v / maxM * 100).toFixed(1)}%"></span></span></span><span class="rank-pct">${pct(v)}</span>`;
      return m ? `<button class="rank-row" type="button" data-act="filter-method" data-id="${esc(id)}" aria-label="${esc(name)} ${won(v)}, 내역 보기">${inner}</button>` : `<div class="rank-row">${inner}</div>`;
    }).join('')}</div>` : emptyBox('아직 지출이 없어요', '')}
  </section>`;

  const recentList = list.slice(0, 6);
  const recent = `<section class="card" data-o="7">
    <div class="card-h"><h2 class="card-t">최근 기록</h2><button class="card-link" type="button" data-view="list">전체 보기${icon('right')}</button></div>
    ${recentList.length ? `<div class="rank">${recentList.map(txRow).join('')}</div>` : emptyBox(`${mLabel(ym)} 기록이 없어요`, '', `<button class="btn btn-soft btn-sm" type="button" data-act="add">${icon('plus')}기록하기</button>`)}
  </section>`;

  const P = paceData(ym);
  const anyPace = P.thisC.some(v => v > 0) || P.hasPrev;
  const pace = `<section class="card" data-o="5">
    <div class="card-h"><h2 class="card-t">누적 지출</h2><div class="legend"><span><i class="key"></i>${mLabel(ym)}</span>${P.hasPrev ? `<span><i class="key prev"></i>${mLabel(P.prevYm)}</span>` : ''}${P.B > 0 ? '<span><i class="key bud"></i>예산</span>' : ''}</div></div>
    ${anyPace ? (S.showTable ? paceTable(P) : `<div class="chart" id="pace" tabindex="0" role="img" aria-label="${esc(paceSummary(P))}"></div>`) + `<div class="chart-foot"><button class="card-link" type="button" id="paceToggle" data-act="pace-table">${S.showTable ? '그래프로 보기' : '표로 보기'}</button></div>`
      : emptyBox('아직 그릴 지출이 없어요', '기록이 쌓이면 날마다 얼마나 썼는지 지난달과 비교해 그려 드려요.')}
  </section>`;

  return `<div class="cols">
    <div class="col">${hero}${pace}${recent}</div>
    <div class="col">${budget}${cats}${upc}${meth}</div>
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
      <div class="seg" role="group" aria-label="보기 방식"><button type="button" id="lm-list" data-act="list-mode" data-mode="list" aria-pressed="${S.listMode === 'list'}">목록</button><button type="button" id="lm-cal" data-act="list-mode" data-mode="cal" aria-pressed="${S.listMode === 'cal'}">달력</button></div></div>
    <div class="filters">
      <div class="seg" role="group" aria-label="수입·지출 구분">${[['all', '전체'], ['out', '지출'], ['in', '수입']].map(([k, l]) => `<button type="button" id="fk-${k}" data-act="kind-filter" data-kind="${k}" aria-pressed="${f.kind === k}">${l}</button>`).join('')}</div>
      <select class="input" id="flt-cat" aria-label="카테고리로 거르기">${catOpts}</select>
      <select class="input" id="flt-method" aria-label="결제수단으로 거르기">${mOpts}</select>
      <label class="search">${icon('search')}<span class="sr-only">내용 검색</span><input class="input" id="flt-q" type="search" placeholder="내용 검색" value="${esc(f.q)}" autocomplete="off"></label>
    </div>
    <section class="card sumbar" id="listSum" aria-label="거른 내역 합계">${sumBar(list)}</section>
    <section class="card" id="listRes">${S.listMode === 'cal' ? calView(ym, list) : listView(all, list)}</section>`;
}
function updateListResults() {
  if (S.view !== 'list') return;
  const all = txsOf(S.ym), list = applyFilter(all);
  const sumEl = $('#listSum'), res = $('#listRes');
  if (!sumEl || !res) return;
  sumEl.innerHTML = sumBar(list);
  res.innerHTML = S.listMode === 'cal' ? calView(S.ym, list) : listView(all, list);
}
const filtersOn = () => S.filter.kind !== 'all' || S.filter.cat || S.filter.method || S.filter.q.trim();
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
function calView(ym, list) {
  const first = parseD(ym + '-01').getDay(), n = daysIn(ym), t = todayStr();
  const by = {};
  for (const x of list) { const d = +x.date.slice(8); const o = by[d] || (by[d] = { in: 0, out: 0 }); o[x.kind] += x.amount; }
  const maxOut = Math.max(0, ...Object.values(by).map(o => o.out));
  const sel = S.selDay && ymOf(S.selDay) === ym ? S.selDay : (ymOf(t) === ym ? t : null);
  let cells = DOW.map((d, i) => `<div class="cal-dow${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}" aria-hidden="true">${d}</div>`).join('');
  for (let i = 0; i < first; i++) cells += '<div class="cal-cell blank" aria-hidden="true"></div>';
  for (let d = 1; d <= n; d++) {
    const ds = `${ym}-${pad(d)}`, o = by[d];
    const r = o && maxOut ? o.out / maxOut : 0;
    const heat = r === 0 ? '' : r <= 1 / 3 ? ' h1' : r <= 2 / 3 ? ' h2' : ' h3';
    const label = `${+ym.slice(5)}월 ${d}일${ds === t ? ' 오늘' : ''}${o ? `${o.in ? `, 수입 ${won(o.in)}` : ''}${o.out ? `, 지출 ${won(o.out)}` : ''}` : ', 기록 없음'}`;
    cells += `<button type="button" class="cal-cell${heat}${ds === t ? ' today' : ''}" id="cal-${d}" data-act="cal-day" data-date="${ds}" aria-pressed="${ds === sel}" aria-label="${label}"><span class="d">${d}</span>${o && o.in ? `<span class="ci">+${cellAmt(o.in)}</span>` : ''}${o && o.out ? `<span class="co">−${cellAmt(o.out)}</span>` : ''}</button>`;
  }
  const dayList = sel ? list.filter(x => x.date === sel) : [];
  return `<div class="cal" role="group" aria-label="${+ym.slice(0, 4)}년 ${+ym.slice(5)}월 달력">${cells}</div>
    <div class="cal-legend"><span>지출 적음</span><i class="h1"></i><i class="h2"></i><i class="h3"></i><span>많음</span></div>
    ${sel ? `<div class="day cal-day"><div class="day-h"><b>${dayHead(sel)}</b><button class="card-link" type="button" data-act="add" data-date="${sel}">${icon('plus', 'sm')}이 날 기록</button></div>${dayList.length ? dayList.map(txRow).join('') : '<p class="muted cal-none">이 날은 기록이 없어요.</p>'}</div>` : ''}`;
}

/* ---------- subscriptions ---------- */
function subRow(s, d) {
  const m = methodOf(s.method), meta = [cycleText(s)];
  if (m) meta.push(m.name);
  const t = todayStr();
  const chip = s.active ? `<span class="dday${diffDays(t, d) <= 3 ? ' soon' : ''}">${ddayText(d)}</span>` : '<span class="dday">일시정지</span>';
  return `<button class="sub-row${s.active ? '' : ' paused'}" type="button" data-act="edit-sub" data-id="${esc(s.id)}">
    <span class="emo" aria-hidden="true">${esc(s.emoji || catOf(s.cat).emoji)}</span>
    <span class="tx-main"><span class="sub-name">${esc(s.name)}${s.ex ? '<span class="tag">예시</span>' : ''}</span><span class="sub-meta">${esc(meta.join(' · '))}${s.active ? ` · 다음 ${mdLabel(d)}` : ''}</span></span>
    <span class="sub-end"><span class="sub-amt">${s.cycle === 'year' ? '연 ' : ''}${won(s.amount)}</span>${chip}</span>
  </button>`;
}
function receipt(active, monthly) {
  const t = todayStr();
  const items = [...active].sort((a, b) => (a.cycle === b.cycle ? 0 : a.cycle === 'month' ? -1 : 1) || (a.cycle === 'year' ? a.month - b.month : 0) || a.day - b.day);
  const lines = items.map(s => `<div class="rc-line"><span class="n">${esc(s.name)}</span><span class="dots"></span><span class="v">${fmt(monthlyOf(s))}</span></div><p class="rc-note">${cycleText(s)}${s.cycle === 'year' ? ` · 연 ${fmt(s.amount)}원 ÷ 12` : ''}</p>`).join('');
  return `<div class="receipt-wrap" data-o="2"><div class="receipt" role="group" aria-label="정기결제 영수증">
    <p class="rc-title">정기결제 영수증</p>
    <p class="rc-sub">${t.replace(/-/g, '.')} 기준 · ${items.length}건 · 월 환산</p>
    <hr class="rc-rule">
    ${lines || '<p class="rc-note" style="text-align:center;margin:0">아직 등록된 정기결제가 없어요</p>'}
    <hr class="rc-rule">
    <div class="rc-line rc-total"><span class="n">월 합계</span><span class="dots"></span><span class="v">${fmt(monthly)}원</span></div>
    <div class="rc-line"><span class="n">1년이면</span><span class="dots"></span><span class="v">${fmt(monthly * 12)}원</span></div>
    <div class="rc-bar" aria-hidden="true"></div>
    <p class="rc-foot">또박또박 가계부</p>
  </div></div>`;
}
function vSubs() {
  const subs = subsArr(), keys = allKeys();
  const active = subs.filter(s => s.active), paused = subs.filter(s => !s.active);
  const monthly = sum(active.map(monthlyOf));
  const rows = [
    ...active.map(s => ({ s, d: nextDue(s, keys) })).sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0)),
    ...paused.map(s => ({ s, d: null })),
  ];
  const listHtml = isLoading() ? emptyBox('불러오는 중이에요', '')
    : rows.length ? `<div class="rank">${rows.map(({ s, d }) => subRow(s, d)).join('')}</div>`
    : emptyBox('등록된 구독이 없어요', '넷플릭스나 휴대폰 요금처럼 매달 나가는 돈을 등록하면 결제일에 자동으로 기록해 드려요.', `<button class="btn btn-primary btn-sm" type="button" data-act="add-sub">${icon('plus')}구독 추가</button>`);
  const auto = cfg().autoSubs;
  return `<div class="view-h"><h1 class="view-title">구독·정기결제</h1><button class="btn btn-primary btn-sm" type="button" data-act="add-sub" ${S.mode === 'denied' ? 'disabled' : ''}>${icon('plus')}추가</button></div>
    <div class="cols">
      <div class="col">
        <section class="card" data-o="1">
          <div class="subs-hero"><span class="hero-label">매달 고정으로 나가는 돈</span><p class="hero-num">${fmt(monthly)}<span class="u">원</span></p><span class="muted" style="font-size:13.5px">1년이면 ${won(monthly * 12)} · ${active.length}개 이용 중${paused.length ? ` · ${paused.length}개 일시정지` : ''}</span></div>
          ${listHtml}
        </section>
        <section class="card" data-o="3">
          <div class="switch-row"><div><h2 class="card-t">결제일에 자동 기록</h2><p>${auto ? '결제일이 되면 내역에 지출로 자동 추가해요. 이미 기록된 달은 건너뛰어요.' : '꺼져 있어요. 정기결제도 직접 기록해야 해요.'}</p></div><button class="switch" type="button" role="switch" id="autoSw" aria-checked="${auto}" data-act="toggle-auto" aria-label="결제일에 자동 기록"></button></div>
        </section>
      </div>
      <div class="col">${receipt(active, monthly)}</div>
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
  const head = `<div class="view-h"><h1 class="view-title">${mLabel(ym)} 예산</h1><button class="btn btn-soft btn-sm" type="button" data-act="edit-budget" ${S.mode === 'denied' ? 'disabled' : ''}>예산 편집</button></div>`;
  if (!bs) {
    return head + `<section class="card">${emptyBox('아직 예산이 없어요', '한 달 전체 예산이나 카테고리별 예산을 정하면 얼마나 남았는지 바로 보여 드려요.', `<button class="btn btn-primary btn-sm" type="button" data-act="edit-budget">예산 정하기</button>`)}</section>`;
  }
  const total = `<section class="card">
      <h2 class="card-t" style="margin-bottom:10px">전체 예산</h2>
      <div class="bud-head"><p class="bud-pct">${Math.round(bs.pct * 100)}%<small>사용</small></p>${stateChip(bs.state, bs.left)}<span class="bud-of">${won(bs.B)} 중 ${won(spent)}</span></div>
      ${meter(bs.pct, bs.state)}
      <p class="bud-foot">${bs.foot}</p></section>`;
  const rows = withB.map(c => {
    const B = +b.cats[c.id], s = by[c.id] || 0, pct = s / B, st = stateOf(pct), left = B - s;
    return `<div class="bud-row"><span class="emo" aria-hidden="true">${esc(c.emoji)}</span><div>
      <div class="bud-top"><span class="bud-name">${esc(c.name)}${stateChip(st, left)}</span><span class="bud-nums"><b>${won(s)}</b> / ${won(B)}</span></div>
      ${meter(pct, st, true)}
      <p class="bud-left">${left >= 0 ? `${won(left)} 남음` : `${won(-left)} 초과`} · ${Math.round(pct * 100)}%</p></div></div>`;
  }).join('');
  const cats = withB.length ? `<section class="card"><h2 class="card-t" style="margin-bottom:4px">카테고리별 예산</h2>${rows}</section>`
    : `<section class="card">${emptyBox('카테고리별 예산은 아직 없어요', '식비, 카페처럼 자주 넘치는 곳만 정해 둬도 좋아요.', `<button class="btn btn-soft btn-sm" type="button" data-act="edit-budget">카테고리 예산 정하기</button>`)}</section>`;
  const others = noB.length ? `<section class="card"><div class="card-h"><h2 class="card-t">예산 밖 지출</h2><span class="muted" style="font-size:13px">${won(sum(noB.map(x => x[1])))}</span></div><div class="rank">${noB.map(([id, v]) => {
    const c = catOf(id);
    return `<button class="rank-row" type="button" data-act="filter-cat" data-cat="${esc(id)}"><span class="emo" aria-hidden="true">${esc(c.emoji)}</span><span class="rank-main"><span class="rank-line"><span class="rank-name">${esc(c.name)}</span><span class="rank-amt">${won(v)}</span></span></span><span class="rank-pct">${icon('right', 'sm')}</span></button>`;
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
      ${themeCard()}
      <section class="card">
        <div class="card-h"><h2 class="card-t">카테고리</h2><div class="seg" role="group" aria-label="카테고리 구분"><button type="button" id="sk-out" data-act="set-kind" data-kind="out" aria-pressed="${kind === 'out'}">지출</button><button type="button" id="sk-in" data-act="set-kind" data-kind="in" aria-pressed="${kind === 'in'}">수입</button></div></div>
        <div class="set-list">${cats.map(c => `<div class="set-row">
          <input class="input emoji" id="ce-${esc(c.id)}" data-cat="${esc(c.id)}" data-field="emoji" value="${esc(c.emoji)}" aria-label="${esc(c.name)} 아이콘" maxlength="8" autocomplete="off" ${ro}>
          <input class="input" id="cn-${esc(c.id)}" data-cat="${esc(c.id)}" data-field="name" value="${esc(c.name)}" aria-label="카테고리 이름" maxlength="20" autocomplete="off" ${ro}>
          <button class="icon-btn" type="button" data-act="del-cat" data-id="${esc(c.id)}" aria-label="${esc(c.name)} 삭제" title="${used[c.id] ? `기록 ${used[c.id]}건에 쓰였어요` : '삭제'}" ${ro}>${icon('trash')}</button></div>`).join('')}</div>
        <button class="btn btn-soft btn-sm set-add" type="button" data-act="add-cat" ${ro}>${icon('plus')}카테고리 추가</button>
        <p class="set-note" style="margin-top:12px">아이콘 칸에는 이모지를 하나 넣어 주세요. 지운 카테고리의 기록은 ‘미분류’로 보여요.</p>
      </section>
    </div><div class="col">
      <section class="card">
        <div class="card-h"><h2 class="card-t">결제수단</h2></div>
        <div class="set-list">${methods.map(m => `<div class="set-row m"><input class="input" id="mn-${esc(m.id)}" data-method="${esc(m.id)}" value="${esc(m.name)}" aria-label="결제수단 이름" maxlength="20" autocomplete="off" ${ro}><button class="icon-btn" type="button" data-act="del-method" data-id="${esc(m.id)}" aria-label="${esc(m.name)} 삭제" ${ro}>${icon('trash')}</button></div>`).join('') || '<p class="set-note">결제수단이 없어요.</p>'}</div>
        <button class="btn btn-soft btn-sm set-add" type="button" data-act="add-method" ${ro}>${icon('plus')}결제수단 추가</button>
        <p class="set-note" style="margin-top:12px">‘신한 체크’, ‘카카오페이’처럼 실제로 쓰는 이름으로 바꿔 두면 결제수단별 지출을 보기 좋아요.</p>
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
    F = { mode: 'tx', id, origYm: hit.ym, kind: t.kind === 'in' ? 'in' : 'out', amount: t.amount, cat: t.cat, memo: t.memo || '', date: t.date, method: t.method || '', sub: t.sub || '', loan: t.loan || '', ex: !!t.ex, at: t.at || 0, catTouched: true };
  } else {
    F = { mode: 'tx', id: null, origYm: null, kind: 'out', amount: 0, cat: lastCat('out'), memo: '', date: isYmd(date) ? date : defaultDate(), method: lastMethod(), sub: '', ex: false, at: 0, catTouched: false };
  }
  showSheet(txSheet(), hit ? null : '#f-amount');
}
function txSheet() {
  const f = F, isEdit = !!f.id, t = todayStr();
  return `<form id="txForm" autocomplete="off" novalidate>
    <div class="sheet-h"><h2 id="sheetTitle">${isEdit ? '기록 고치기' : '새 기록'}</h2><button class="icon-btn" type="button" data-act="close" aria-label="닫기">${icon('x')}</button></div>
    <div class="seg" role="group" aria-label="지출·수입" style="width:100%"><button type="button" id="fk2-out" data-act="f-kind" data-kind="out" ${pressed(f.kind === 'out')}>지출</button><button type="button" id="fk2-in" data-act="f-kind" data-kind="in" ${pressed(f.kind === 'in')}>수입</button></div>
    <div class="field">
      <label class="lab" for="f-amount">금액</label>
      <div class="amt"><input id="f-amount" inputmode="numeric" enterkeyhint="done" placeholder="0" value="${f.amount ? fmt(f.amount) : ''}" aria-describedby="amtHint"><span>원</span></div>
      <p class="amt-hint" id="amtHint">${f.amount >= 1e4 ? koreanWon(f.amount) : ''}</p>
      <div class="quick">${[[1000, '+1천'], [5000, '+5천'], [10000, '+1만'], [50000, '+5만'], [100000, '+10만']].map(([v, l]) => `<button class="chip" type="button" data-act="f-plus" data-v="${v}">${l}</button>`).join('')}<button class="chip chip-x" type="button" data-act="f-clear" aria-label="금액 지우기">${icon('x')}</button></div>
    </div>
    <div class="field"><span class="lab" id="catLab">카테고리</span>
      <div class="cat-grid" role="group" aria-labelledby="catLab">${catsOf(f.kind).map(c => `<button class="cat-opt" type="button" id="fc-${esc(c.id)}" data-act="f-cat" data-id="${esc(c.id)}" ${pressed(f.cat === c.id)}><span class="e" aria-hidden="true">${esc(c.emoji)}</span>${esc(c.name)}</button>`).join('')}</div>
      <p class="learn" id="learnHint" aria-live="polite"></p>
    </div>
    <div class="field"><label class="lab" for="f-memo">내용</label><input class="input" id="f-memo" list="memoList" maxlength="40" placeholder="${f.kind === 'in' ? '예: 10월 급여' : '예: 점심, 마트 장보기'}" value="${esc(f.memo)}"><datalist id="memoList">${memoSuggestions(f.kind).map(m => `<option value="${esc(m)}"></option>`).join('')}</datalist></div>
    <div class="field"><label class="lab" for="f-date">날짜</label><div class="field-row"><input class="input" type="date" id="f-date" value="${f.date}" required><div class="chips"><button class="chip" type="button" id="fd-0" data-act="f-day" data-d="0" ${pressed(f.date === t)}>오늘</button><button class="chip" type="button" id="fd-1" data-act="f-day" data-d="-1" ${pressed(f.date === addDays(t, -1))}>어제</button></div></div></div>
    ${f.kind === 'out' ? `<div class="field"><span class="lab" id="mLab">결제수단</span><div class="chips" role="group" aria-labelledby="mLab">${cfg().methods.map(m => `<button class="chip" type="button" id="fm-${esc(m.id)}" data-act="f-method" data-id="${esc(m.id)}" ${pressed(f.method === m.id)}>${esc(m.name)}</button>`).join('') || '<span class="muted" style="font-size:13px">설정에서 결제수단을 추가할 수 있어요</span>'}</div></div>` : ''}
    ${f.loan ? `<p class="sheet-note">‘${esc((S.loans[f.loan] || {}).name || '삭제된 대출')}’ 상환 일정에서 자동으로 기록된 내역이에요. 지워도 다시 생기지 않아요.</p>` : ''}
    ${f.sub ? `<p class="sheet-note">‘${esc(subName(f.sub))}’ 정기결제에서 자동으로 기록된 내역이에요. 지워도 다시 생기지 않아요.</p>` : ''}
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
  const id = f.id || uid('t');
  const tx = makeTx({ ...f, at: f.at || Date.now() });
  const ym = ymOf(tx.date);
  if (f.id && f.origYm && f.origYm !== ym) writeMonth(f.origYm, { [id]: null });
  writeMonth(ym, { [id]: tx });
  prefs.lastCat = { ...(prefs.lastCat || {}), [tx.kind]: tx.cat };
  if (tx.method) prefs.lastMethod = tx.method;
  savePrefs();
  const wasEdit = !!f.id;
  closeSheet();
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
    F = { mode: 'sub', id, name: s.name || '', emoji: s.emoji || '', amount: s.amount || 0, cycle: s.cycle === 'year' ? 'year' : 'month', day: s.day || 1, month: s.month || 1, cat: s.cat || '', method: s.method || '', active: s.active !== false, ex: !!s.ex, since: s.since || t, recordNow: false };
  } else {
    const outs = catsOf('out');
    F = { mode: 'sub', id: null, name: '', emoji: '', amount: 0, cycle: 'month', day: +t.slice(8), month: +t.slice(5, 7), cat: (outs.find(c => c.id === 'subs') || outs[0] || UNKNOWN_CAT).id, method: lastMethod(), active: true, ex: false, since: t, recordNow: true };
  }
  showSheet(subSheet(), s ? null : '#s-name');
}
const canSaveSub = () => !!(F && F.name.trim() && F.amount > 0);
function subSheet() {
  const f = F, isEdit = !!f.id, t = todayStr();
  const occ = curPeriodOcc(f);
  const showRecord = !isEdit && cfg().autoSubs && occ <= t && diffDays(occ, t) <= BACKFILL_DAYS;
  return `<form id="subForm" autocomplete="off" novalidate>
    <div class="sheet-h"><h2 id="sheetTitle">${isEdit ? '구독 고치기' : '구독 추가'}</h2><button class="icon-btn" type="button" data-act="close" aria-label="닫기">${icon('x')}</button></div>
    <div class="field"><label class="lab" for="s-name">이름</label><div class="set-row m" style="grid-template-columns:56px minmax(0,1fr)"><input class="input emoji" id="s-emoji" value="${esc(f.emoji)}" placeholder="${esc(catOf(f.cat).emoji)}" aria-label="아이콘 이모지" maxlength="8"><input class="input" id="s-name" value="${esc(f.name)}" placeholder="예: 넷플릭스, 휴대폰 요금" maxlength="30"></div></div>
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
  const sub = { name: f.name.trim().slice(0, 30), emoji: firstGrapheme(f.emoji), amount: f.amount, cycle: f.cycle, day: f.day, month: f.month, cat: f.cat, method: f.method, since, active: f.active, ex: !!f.ex };
  writeSubs({ [id]: sub });
  closeSheet();
  toast(f.id ? '고쳤어요' : `‘${sub.name}’을 추가했어요`);
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
      <div class="b-grid">${catsOf('out').map(c => `<label class="b-item" for="b-${esc(c.id)}"><span class="emo" aria-hidden="true">${esc(c.emoji)}</span><span>${esc(c.name)}</span><input class="input" id="b-${esc(c.id)}" data-bcat="${esc(c.id)}" inputmode="numeric" placeholder="없음" value="${f.cats[c.id] ? fmt(f.cats[c.id]) : ''}"></label>`).join('')}</div></div>
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
const AI_RULES = `너는 '또박또박 가계부' 앱 안에 있는 도우미야. 사용자의 요청을 읽고 가계부 기록을 추가·수정·삭제하거나 질문에 답해.
반드시 JSON 객체 하나로만 답해: {"reply": "사용자에게 보여 줄 짧은 한국어 답(존댓말, 1~3문장)", "actions": [ ... ]}
actions에 넣을 수 있는 것:
- {"type":"add_tx","date":"YYYY-MM-DD","kind":"out 또는 in","amount":정수,"cat":"카테고리 id","memo":"내용","method":"결제수단 id"}
- {"type":"update_tx","id":"기록 id", 바꿀 필드만 (date, kind, amount, cat, memo, method)}
- {"type":"delete_tx","id":"기록 id"}
- {"type":"add_sub","name":"이름","amount":정수,"cycle":"month 또는 year","day":1~31,"month":1~12(매년일 때),"cat":"카테고리 id","method":"결제수단 id"}
- {"type":"update_sub","id":"구독 id", 바꿀 필드만 (name, amount, cycle, day, month, cat, method, active)}
- {"type":"delete_sub","id":"구독 id"}
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
  L.push(recent.length ? recent.map(x => `${x.id} | ${x.date} | ${x.kind === 'in' ? '수입' : '지출'} | ${x.amount} | ${x.cat} | ${x.memo || '-'} | ${x.method || '-'}`).join('\n') : '(없음)');
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
  const pmt = l.type === 'equal' ? (r ? (B0 * r) / (1 - Math.pow(1 + r, -n)) : B0 / n) : 0;
  const out = [];
  let bal = B0;
  for (let k = 1; k <= n; k++) {
    const idx = sm - 1 + k, y = sy + Math.floor(idx / 12), m = (idx % 12) + 1;
    const int = Math.round(bal * r);
    let prin = l.type === 'equal' ? Math.round(pmt) - int : l.type === 'principal' ? Math.round(B0 / n) : 0;
    if (k === n) prin = bal;
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
    paidInt: sum(paid.map(r => r.int)), restInt: sum(rest.map(r => r.int)),
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
  const head = `<div class="view-h"><h1 class="view-title">대출</h1><button class="btn btn-primary btn-sm" type="button" data-act="add-loan" ${S.mode === 'denied' ? 'disabled' : ''}>${icon('plus')}대출 추가</button></div>`;
  if (isLoading()) return head + `<section class="card">${emptyBox('불러오는 중이에요', '')}</section>`;
  const loans = loansArr();
  if (!loans.length) return head + `<section class="card">${emptyBox('등록된 대출이 없어요', '대출 원금, 이자율, 기간, 상환 방식을 넣으면 매달 갚을 돈과 이자를 계산하고 납입일에 자동으로 기록해 드려요.', `<button class="btn btn-primary btn-sm" type="button" data-act="add-loan">${icon('plus')}대출 추가</button>`)}</section>`;
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
    const meta = [l.lender, `연 ${(+l.rate).toLocaleString('ko-KR', { maximumFractionDigits: 3 })}%`, LOAN_TYPES[l.type] || '', `매월 ${l.day}일`].filter(Boolean).join(' · ');
    return `<section class="card loan-card">
      <div class="loan-top"><span class="emo" aria-hidden="true">${icon('bank')}</span><div style="min-width:0"><p class="loan-name">${esc(l.name)}${l.ex ? '<span class="tag">예시</span>' : ''}</p><p class="loan-meta">${esc(meta)}</p></div><button class="btn btn-ghost btn-sm" type="button" data-act="edit-loan" data-id="${esc(l.id)}">고치기</button></div>
      <div class="loan-prog">
        <div class="row"><span>원금 <b>${Math.round(pct * 100)}%</b> 갚음</span><span>남은 원금 <b>${won(s.remaining)}</b> / ${won(s.B0)}</span></div>
        ${meter(pct, '', true)}
        ${l.type === 'bullet' && s.remaining > 0 ? `<p class="bud-left">만기일(${mdLabel(s.end)}, ${s.end.slice(0, 4)}년)에 원금을 한 번에 갚는 방식이에요.</p>` : ''}
      </div>
      <div class="loan-facts">
        <div><span class="stat-l">다음 납입 ${nx ? `· ${ddayText(nx.date)}` : ''}</span><span class="stat-v">${nx ? won(nx.pay) : '다 갚았어요'}</span>${nx ? `<span class="sub">${mdw(nx.date)} · 원금 ${fmt(nx.prin)} + 이자 ${fmt(nx.int)}</span>` : ''}</div>
        <div><span class="stat-l">이자 합계</span><span class="stat-v">${won(s.paidInt + s.restInt)}</span><span class="sub">낸 이자 ${fmt(s.paidInt)} · 남은 이자 ${fmt(s.restInt)}</span></div>
        <div><span class="stat-l">만기</span><span class="stat-v">${s.end.replace(/-/g, '.')}</span><span class="sub">남은 ${s.rest.length}회 / 전체 ${s.rows.length}회</span></div>
        <div><span class="stat-l">결제수단 · 자동 기록</span><span class="stat-v" style="font-size:14.5px">${esc((methodOf(l.method) || {}).name || '없음')}</span><span class="sub">${l.auto ? '납입일에 내역에 자동 기록' : '자동 기록 꺼짐'}</span></div>
      </div>
      <div class="loan-acts"><button class="btn btn-soft btn-sm" type="button" data-act="loan-sched" data-id="${esc(l.id)}">상환 일정 보기</button></div>
    </section>`;
  }).join('');
  return head + `${summary}${cards}<p class="set-note muted" style="font-size:12.5px">이자는 매달 남은 원금 × 연 이자율 ÷ 12로 계산해요. 금리가 바뀌거나 중도에 갚았다면 ‘고치기’에서 원금과 금리를 지금 기준으로 바꿔 주세요.</p>`;
}
function openLoanSheet(id) {
  if (S.mode === 'denied') return;
  const l = id && S.loans[id], t = todayStr();
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
  const f = F;
  if (!canSaveLoan()) return;
  const t = todayStr(), id = f.id || uid('l');
  let since = f.since;
  if (!f.id) {
    const cur = loanSchedule({ ...f, rate: +f.rate }).find(r => ymOf(r.date) === ymOf(t));
    since = cur && cur.date <= t && f.recordNow ? cur.date : addDays(t, cur && cur.date <= t ? 1 : 0);
  } else if (f.auto && S.loans[f.id] && !S.loans[f.id].auto && since < t) since = t;
  const loan = { name: f.name.trim().slice(0, 30), lender: f.lender.trim().slice(0, 20), principal: f.principal, rate: Math.round(+f.rate * 1000) / 1000, start: f.start, term: Math.min(600, Math.max(1, f.term | 0)), type: f.type, day: f.day, method: f.method, auto: f.auto, since, ex: !!f.ex };
  if (loan.auto) ensureLoanCat();
  writeLoans({ [id]: loan });
  closeSheet();
  toast(f.id ? '고쳤어요' : `‘${loan.name}’을 추가했어요`);
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
  const rows = s.rows.map(r => `<tr class="${r.date <= t ? 'paid' : ''}${s.next && r.k === s.next.k ? ' now' : ''}"><td>${r.k}회</td><td>${r.date.slice(2).replace(/-/g, '.')}</td><td>${fmt(r.pay)}</td><td>${fmt(r.prin)}</td><td>${fmt(r.int)}</td><td>${fmt(r.bal)}</td></tr>`).join('');
  F = { mode: 'view' };
  showSheet(`<div style="display:grid;gap:14px">
    <div class="sheet-h"><h2 id="sheetTitle">${esc(l.name)} 상환 일정</h2><button class="icon-btn" type="button" data-act="close" aria-label="닫기">${icon('x')}</button></div>
    <p class="set-note">총 ${s.rows.length}회 · 총 이자 ${won(s.paidInt + s.restInt)} · 흐린 줄은 지난 회차, 색칠된 줄은 다음 회차예요.</p>
    <div class="tbl-wrap tall"><table class="tbl"><caption class="sr-only">${esc(l.name)} 회차별 상환 일정</caption><thead><tr><th scope="col">회차</th><th scope="col">날짜</th><th scope="col">납입액</th><th scope="col">원금</th><th scope="col">이자</th><th scope="col">남은 원금</th></tr></thead><tbody>${rows}</tbody></table></div>
  </div>`);
  const now = $('#sheet tr.now'); if (now) now.scrollIntoView({ block: 'center' });
}

/* ================= colour themes ================= */
const THEMES = [
  { id: 'forest', name: '숲', sw: ['#0C7F57', '#F2F5F3'] },
  { id: 'ocean', name: '바다', sw: ['#0B6E8A', '#F0F5F7'] },
  { id: 'sunset', name: '노을', sw: ['#B9461A', '#F7F3F0'] },
  { id: 'lavender', name: '라벤더', sw: ['#6544C4', '#F4F3F9'] },
  { id: 'blossom', name: '벚꽃', sw: ['#B4245F', '#F9F2F5'] },
  { id: 'graphite', name: '먹', sw: ['#374151', '#F3F4F5'] },
];
function applyTheme(id) {
  const ok = THEMES.some(x => x.id === id) ? id : 'forest';
  if (ok === 'forest') document.documentElement.removeAttribute('data-pal');
  else document.documentElement.setAttribute('data-pal', ok);
  if (prefs.theme !== ok) { prefs.theme = ok; savePrefs(); }
}
function themeCard() {
  const cur = cfg().theme;
  return `<section class="card">
    <div class="card-h"><h2 class="card-t">색상 테마</h2></div>
    <div class="themes" role="radiogroup" aria-label="색상 테마">${THEMES.map(x => `<button class="theme-opt" type="button" role="radio" id="th-${x.id}" data-act="theme" data-id="${x.id}" aria-checked="${cur === x.id}"><span class="theme-sw" aria-hidden="true"><i style="background:${x.sw[0]}"></i><i style="background:${x.sw[1]}"></i></span>${x.name}</button>`).join('')}</div>
    <p class="set-note" style="margin-top:12px">고른 테마는 계정에 저장돼서 다른 기기에서도 똑같이 보여요. 밝은 화면·어두운 화면은 기기 설정을 따라가요.</p>
  </section>`;
}

/* ================= account + backup ================= */
async function loadAccount() {
  try {
    const user = await window.claude.use('user');
    if (!user) return;
    const me = await user.me();
    S.user = { name: me.name || '', avatar: me.avatarUrl || '', email: me.email || '' };
    const f = $('#railFoot'); if (f) f.textContent = `${S.user.name || S.user.email || '내 계정'}으로 로그인됨`;
    if (S.view === 'settings') renderView();
  } catch (e) { /* account details are optional */ }
}
function backupData() {
  const settings = clone(cfg());
  return { app: 'ttb-ledger', version: 1, exportedAt: new Date().toISOString(), settings, subs: clone(S.subs), loans: clone(S.loans), months: clone(S.months) };
}
function csvData() {
  const q = v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const rows = [['날짜', '구분', '금액', '카테고리', '내용', '결제수단']];
  for (const t of [...allTxs()].reverse()) rows.push([t.date, t.kind === 'in' ? '수입' : '지출', t.kind === 'in' ? t.amount : -t.amount, catOf(t.cat).name, t.memo, (methodOf(t.method) || {}).name || '']);
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
    ${web ? '<p class="set-note" style="margin-top:12px"><b>폰에서 앱처럼 쓰기</b> · 안드로이드 크롬은 메뉴(⋮) → ‘홈 화면에 추가’, 아이폰 사파리는 공유 버튼 → ‘홈 화면에 추가’를 누르세요.</p>' : ''}
    ${r ? `<div class="notice warn" style="margin-top:12px"><p>${esc(r.when)}에 저장한 백업(기록 ${fmt(r.count)}건)으로 지금 기록을 모두 바꿀까요? 지금 기록은 사라져요.</p><div class="acts"><button class="btn btn-sm btn-primary" type="button" id="rsYes" data-act="restore-yes">바꾸기</button><button class="btn btn-sm btn-soft" type="button" data-act="restore-no">취소</button></div></div>` : ''}
  </section>`;
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
    } catch (e) { toast('또박또박 가계부 백업 파일이 아니에요'); }
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
  if (b.settings) saveSettings(b.settings);
  toast('백업으로 되살렸어요');
}

/* ================= toast ================= */
let toastTimer = 0, toastUndo = null;
function toast(msg, opts = {}) {
  const el = $('#toast');
  toastUndo = opts.undo || null;
  el.innerHTML = `<span>${esc(msg)}</span>${toastUndo ? '<button type="button" data-act="toast-undo">되돌리기</button>' : ''}`;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, toastUndo ? 6000 : 2600);
}
function hideToast() { $('#toast').hidden = true; toastUndo = null; }

/* ================= events ================= */
function go(view) {
  if (!VIEWS[view]) return;
  if (view !== S.view) { paceHover = null; S.confirmClear = false; }
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
  'add-cat': () => {
    const st = cfg(), id = uid('c');
    S.focusAfter = 'cn-' + id;
    saveSettings({ ...st, cats: [...st.cats, { id, name: '새 카테고리', emoji: '🏷️', kind: S.setKind }] });
  },
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
    toast(`‘${m.name}’을 지웠어요`, { undo: () => saveSettings({ ...cfg(), methods: before }) });
  },
  'toast-undo': () => { const u = toastUndo; hideToast(); if (u) u(); },
  ai: () => openAiSheet(),
  'add-loan': () => openLoanSheet(null),
  'edit-loan': el => openLoanSheet(el.dataset.id),
  'loan-sched': el => openSchedule(el.dataset.id),
  'l-type': el => { F.type = el.dataset.v; rerenderSheet(loanSheet()); },
  'l-method': el => { F.method = el.dataset.id; for (const b of document.querySelectorAll('#sheet [data-act="l-method"]')) b.setAttribute('aria-pressed', String(b.dataset.id === F.method)); },
  'l-delete': () => deleteLoan(),
  theme: el => { applyTheme(el.dataset.id); saveSettings({ ...cfg(), theme: el.dataset.id }); },
  'backup-json': () => saveFile(`또박또박가계부_백업_${todayStr()}.json`, JSON.stringify(backupData())),
  'backup-csv': () => saveFile(`또박또박가계부_내역_${todayStr()}.csv`, csvData()),
  'restore-pick': () => { const i = $('#restoreFile'); if (i) { i.value = ''; i.click(); } },
  'restore-yes': () => { applyRestore(); renderView(); },
  'restore-no': () => { S.restore = null; renderView(); },
  logout: () => { if (window.ttbPlatform) window.ttbPlatform.signOut(); },
  'ai-ex': el => askAi(el.dataset.q),
  'ai-stop': () => { if (aiCtl) aiCtl.abort(); },
  'ai-undo': el => undoAi(+el.dataset.i),
  // transaction sheet
  'f-kind': el => {
    if (F.kind === el.dataset.kind) return;
    F.kind = el.dataset.kind;
    if (catOf(F.cat).kind !== F.kind || !catOf(F.cat).id) { F.cat = lastCat(F.kind); F.catTouched = false; }
    rerenderSheet(txSheet());
  },
  'f-plus': el => { F.amount = Math.min(999999999999, F.amount + +el.dataset.v); syncTxSheet(); },
  'f-clear': () => { F.amount = 0; syncTxSheet(); $('#f-amount').focus(); },
  'f-cat': el => { F.cat = el.dataset.id; F.catTouched = true; $('#learnHint').textContent = ''; syncTxSheet(); },
  'f-day': el => { F.date = addDays(todayStr(), +el.dataset.d); $('#f-date').value = F.date; syncTxSheet(); },
  'f-method': el => { F.method = el.dataset.id; syncTxSheet(); },
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
    if (fn && (!el.dataset.act.match(/^[fsl]-/) || F)) { e.preventDefault(); fn(el, e); }
  } else if (el.dataset.view) go(el.dataset.view);
});
document.addEventListener('input', e => {
  const el = e.target;
  if (el.id === 'flt-q') { S.filter.q = el.value; updateListResults(); return; }
  if (el.id === 'ai-q') { S.aiDraft = el.value; return; }
  if (el.id === 'f-amount' || el.id === 's-amount' || el.id === 'b-total' || el.id === 'l-principal' || (el.dataset && el.dataset.bcat)) { onMoneyInput(el); return; }
  if (F && F.mode === 'loan') {
    if (el.id === 'l-name') F.name = el.value;
    else if (el.id === 'l-lender') F.lender = el.value;
    else if (el.id === 'l-rate') { const v = el.value.replace(/[^\d.]/g, ''); if (v !== el.value) el.value = v; F.rate = v; }
    else if (el.id === 'l-term') { const v = el.value.replace(/\D/g, '').slice(0, 3); if (v !== el.value) el.value = v; F.term = +v || 0; }
    refreshLoanSheet();
    return;
  }
  if (!F) return;
  if (el.id === 'f-memo') { F.memo = el.value; if (!F.catTouched) $('#learnHint').textContent = ''; }
  else if (el.id === 's-name') { F.name = el.value; $('#s-save').disabled = !canSaveSub(); }
  else if (el.id === 's-emoji') F.emoji = el.value;
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'flt-cat') { S.filter.cat = el.value; renderView(); return; }
  if (el.id === 'flt-method') { S.filter.method = el.value; renderView(); return; }
  if (el.dataset && el.dataset.field && el.dataset.cat) { updateCat(el.dataset.cat, el.dataset.field, el.value); return; }
  if (el.dataset && el.dataset.method && el.id.startsWith('mn-')) { updateMethod(el.dataset.method, el.value); return; }
  if (el.id === 'restoreFile') { readRestore(el.files && el.files[0]); return; }
  if (!F) return;
  switch (el.id) {
    case 'f-memo': F.memo = el.value; learnFromMemo(); break;
    case 'f-date': if (isYmd(el.value)) { F.date = el.value; syncTxSheet(); } break;
    case 's-day': F.day = +el.value; rerenderSheet(subSheet()); break;
    case 's-month': F.month = +el.value; rerenderSheet(subSheet()); break;
    case 's-cat': F.cat = el.value; break;
    case 's-record': F.recordNow = el.checked; break;
    case 'l-start': if (isYmd(el.value)) { F.start = el.value; rerenderSheet(loanSheet()); } break;
    case 'l-day': F.day = +el.value; rerenderSheet(loanSheet()); break;
    case 'l-auto': F.auto = el.checked; rerenderSheet(loanSheet()); break;
    case 'l-record': F.recordNow = el.checked; break;
    default: break;
  }
});
document.addEventListener('submit', e => {
  e.preventDefault();
  if (!F) return;
  if (F.mode === 'tx') saveTx();
  else if (F.mode === 'sub') saveSub();
  else if (F.mode === 'budget') saveBudget();
  else if (F.mode === 'loan') saveLoan();
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
