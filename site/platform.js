/* 또박또박 가계부 · 웹 버전 플랫폼 계층
   - Supabase로 로그인(이메일·비밀번호, 구글)하고
   - 가계부 화면(app.js)이 쓰는 저장소 API(db·user·downloads)를 Supabase 위에 만들어 줘요. */
(() => {
'use strict';
const VERSION = '1.0.0';
const CFG = window.TTB_CONFIG || {};
const TABLE = 'ledger_docs';
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// remembered colour theme, so the sign-in screen already wears it
try { const p = JSON.parse(localStorage.getItem('ttb-prefs') || '{}'); if (p.theme && p.theme !== 'forest') document.documentElement.setAttribute('data-pal', p.theme); } catch (e) { /* ignore */ }

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

const configured = !!(CFG.supabaseUrl && CFG.supabaseAnonKey && !/YOUR_|여기에/.test(CFG.supabaseUrl + CFG.supabaseAnonKey));
const recovering = /type=recovery/.test(location.hash);
const sb = configured && window.supabase ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;

/* ---------------- sign-in screen ---------------- */
const authEl = $('#auth');
let mode = 'login', busy = false;
function authMsg(text, ok) { const m = $('#authMsg'); if (m) { m.textContent = text || ''; m.className = 'auth-msg' + (ok ? ' ok' : ''); } }
function koError(e) {
  const m = String((e && e.message) || e || '');
  if (/Invalid login credentials/i.test(m)) return '이메일 또는 비밀번호가 맞지 않아요.';
  if (/Email not confirmed/i.test(m)) return '메일함에서 가입 인증 링크를 먼저 눌러 주세요.';
  if (/already registered|already been registered/i.test(m)) return '이미 가입된 이메일이에요. 로그인해 주세요.';
  if (/Password should be at least/i.test(m)) return '비밀번호는 8자 이상으로 정해 주세요.';
  if (/valid email|invalid format|Unable to validate email/i.test(m)) return '이메일 주소를 다시 확인해 주세요.';
  if (/rate limit|too many/i.test(m)) return '요청이 너무 많아요. 잠시 뒤에 다시 시도해 주세요.';
  if (/provider is not enabled/i.test(m)) return '구글 로그인이 아직 설정되지 않았어요. 안내서의 구글 로그인 단계를 확인해 주세요.';
  if (/fetch|network/i.test(m)) return '인터넷 연결을 확인해 주세요.';
  return '잠시 후 다시 시도해 주세요. (' + m + ')';
}
function renderAuth() {
  const card = (title, sub, body) => `<div class="auth-card">
    <p class="brand"><b>또박또박</b><small>가계부</small></p>
    <h1 class="auth-title">${title}</h1>${sub ? `<p class="auth-sub">${sub}</p>` : ''}${body}</div>`;
  const google = CFG.googleLogin !== false ? `<button class="btn btn-soft btn-block" type="button" data-auth="google">구글 계정으로 계속하기</button><p class="auth-or">또는 이메일로</p>` : '';
  let html;
  if (!configured) {
    html = card('서버 연결이 필요해요', '', `<p class="auth-sub">이 사이트의 <b>config.js</b>에 Supabase 프로젝트 주소와 공개 키(anon key)를 넣어야 로그인할 수 있어요. 함께 드린 안내서의 2단계를 따라 해 주세요.</p>`);
  } else if (mode === 'newpw') {
    html = card('새 비밀번호 정하기', '앞으로 쓸 비밀번호를 입력해 주세요.', `<form class="auth-form" id="authForm" novalidate>
      <label class="field"><span class="lab">새 비밀번호</span><input class="input" type="password" id="a-pw" autocomplete="new-password" minlength="8" required></label>
      <button class="btn btn-primary btn-block" type="submit">비밀번호 바꾸기</button></form><p class="auth-msg" id="authMsg" role="alert"></p>`);
  } else if (mode === 'reset') {
    html = card('비밀번호 찾기', '가입한 이메일로 비밀번호를 다시 정하는 링크를 보내 드려요.', `<form class="auth-form" id="authForm" novalidate>
      <label class="field"><span class="lab">이메일</span><input class="input" type="email" id="a-email" autocomplete="email" required></label>
      <button class="btn btn-primary btn-block" type="submit">링크 보내기</button></form><p class="auth-msg" id="authMsg" role="alert"></p>
      <div class="auth-links"><button type="button" data-auth="login">로그인으로 돌아가기</button></div>`);
  } else {
    const signup = mode === 'signup';
    html = card(signup ? '회원가입' : '로그인', signup ? '가입하면 폰과 PC 어디서나 같은 가계부를 쓸 수 있어요.' : '로그인하면 저장해 둔 가계부를 이어서 볼 수 있어요.', `${google}<form class="auth-form" id="authForm" novalidate>
      <label class="field"><span class="lab">이메일</span><input class="input" type="email" id="a-email" autocomplete="email" required></label>
      <label class="field"><span class="lab">비밀번호${signup ? ' <span class="muted" style="font-weight:400">(8자 이상)</span>' : ''}</span><input class="input" type="password" id="a-pw" autocomplete="${signup ? 'new-password' : 'current-password'}" required></label>
      <button class="btn btn-primary btn-block" type="submit">${signup ? '가입하기' : '로그인'}</button></form>
      <p class="auth-msg" id="authMsg" role="alert"></p>
      <div class="auth-links">${signup ? '<button type="button" data-auth="login">이미 계정이 있어요</button>' : '<button type="button" data-auth="signup">회원가입</button><button type="button" data-auth="reset">비밀번호를 잊었어요</button>'}</div>`);
  }
  authEl.innerHTML = html;
  authEl.hidden = false;
  const first = authEl.querySelector('input'); if (first) first.focus();
}
authEl.addEventListener('click', async e => {
  const b = e.target.closest('[data-auth]');
  if (!b || busy) return;
  const a = b.dataset.auth;
  if (a === 'google') {
    busy = true; authMsg('구글로 이동하는 중이에요…', true);
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
    busy = false;
    if (error) authMsg(koError(error));
    return;
  }
  mode = a; renderAuth();
});
authEl.addEventListener('submit', async e => {
  e.preventDefault();
  if (busy || !sb) return;
  const email = ($('#a-email') || {}).value, pw = ($('#a-pw') || {}).value;
  busy = true;
  const btn = authEl.querySelector('button[type="submit"]'); if (btn) btn.disabled = true;
  try {
    if (mode === 'login') {
      if (!email || !pw) throw new Error('이메일과 비밀번호를 입력해 주세요.');
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: pw });
      if (error) throw error;
    } else if (mode === 'signup') {
      if (!email || !pw) throw new Error('이메일과 비밀번호를 입력해 주세요.');
      if (pw.length < 8) throw new Error('Password should be at least 8 characters');
      const { data, error } = await sb.auth.signUp({ email: email.trim(), password: pw, options: { emailRedirectTo: location.origin + location.pathname } });
      if (error) throw error;
      if (!data.session) { mode = 'login'; renderAuth(); authMsg(`${email.trim()}로 인증 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요.`, true); }
    } else if (mode === 'reset') {
      if (!email) throw new Error('이메일을 입력해 주세요.');
      const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin + location.pathname });
      if (error) throw error;
      authMsg('메일을 보냈어요. 메일의 링크를 눌러 새 비밀번호를 정해 주세요.', true);
    } else if (mode === 'newpw') {
      if (!pw || pw.length < 8) throw new Error('Password should be at least 8 characters');
      const { data, error } = await sb.auth.updateUser({ password: pw });
      if (error) throw error;
      history.replaceState(null, '', location.pathname);
      start(data.user);
    }
  } catch (err) {
    authMsg(/입력해 주세요/.test(err.message) ? err.message : koError(err));
  } finally {
    busy = false;
    if (btn && document.contains(btn)) btn.disabled = false;
  }
});

/* ---------------- storage bridge for app.js ---------------- */
function makeDb(uid) {
  const META = { fromCache: false, hasPendingWrites: false };
  const listeners = {}, pending = {}, timers = {};
  const collOf = path => path.split('/')[0];
  const toDbError = e => (e && e.code === 'invalid_argument' ? e : { code: 'unavailable', message: (e && e.message) || String(e) });
  async function fetchColl(coll) {
    const { data, error } = await sb.from(TABLE).select('path,data').like('path', coll + '/%');
    if (error) throw error;
    const docs = data.filter(r => r.path.split('/').length === 2)
      .sort((a, b) => (a.path < b.path ? -1 : 1))
      .map(r => ({ id: r.path.split('/')[1], exists: true, data: () => r.data, metadata: META }));
    return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: META };
  }
  function refresh(coll, delay = 150) {
    clearTimeout(timers[coll]);
    timers[coll] = setTimeout(async () => {
      if (!listeners[coll] || !listeners[coll].size || pending[coll]) return;
      try {
        const snap = await fetchColl(coll);
        if (pending[coll]) return; // a newer write is in flight; its own refresh follows
        for (const l of listeners[coll]) l(snap);
      } catch (e) { refresh(coll, 4000); }
    }, delay);
  }
  async function write(path, job) {
    const c = collOf(path);
    pending[c] = (pending[c] || 0) + 1;
    try { await job(); }
    catch (e) { throw toDbError(e); }
    finally { pending[c]--; refresh(c); }
  }
  const db = {
    doc(path) {
      return {
        id: path.split('/').pop(), path,
        async get() {
          const { data, error } = await sb.from(TABLE).select('data').eq('path', path).maybeSingle();
          if (error) throw toDbError(error);
          return { id: path.split('/').pop(), exists: !!data, data: () => (data ? data.data : undefined), metadata: META };
        },
        set: body => write(path, async () => {
          const { error } = await sb.from(TABLE).upsert({ user_id: uid, path, data: body, updated_at: new Date().toISOString() });
          if (error) throw error;
        }),
        update: patch => write(path, async () => {
          const { data, error } = await sb.rpc('ledger_update', { p_path: path, p_patch: patch });
          if (error) throw error;
          if (!data) throw { code: 'invalid_argument', message: 'document does not exist' };
        }),
        delete: () => write(path, async () => {
          const { error } = await sb.from(TABLE).delete().eq('path', path);
          if (error) throw error;
        }),
      };
    },
    collection(coll) {
      return {
        path: coll,
        doc: id => db.doc(coll + '/' + id),
        onSnapshot(next) {
          (listeners[coll] ||= new Set()).add(next);
          refresh(coll, 0);
          return () => listeners[coll].delete(next);
        },
      };
    },
  };
  // other devices' changes arrive live; returning to the tab re-checks too
  try {
    sb.channel('ledger-' + uid)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE, filter: 'user_id=eq.' + uid }, payload => {
        const p = (payload.new && payload.new.path) || (payload.old && payload.old.path);
        if (p) refresh(collOf(p)); else { refresh('months'); refresh('meta'); }
      })
      .subscribe();
  } catch (e) { /* live updates are a bonus */ }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { refresh('months', 0); refresh('meta', 0); } });
  return db;
}
function downloads() {
  return {
    async save({ filename, data }) {
      const type = /\.csv$/i.test(filename) ? 'text/csv;charset=utf-8' : 'application/json';
      const blob = data instanceof Blob ? data : new Blob([data], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return { status: 'saved' };
    },
  };
}

/* ---------------- start ---------------- */
let started = false;
function start(user) {
  if (started || !user) return;
  started = true;
  const meta = user.user_metadata || {};
  const name = meta.full_name || meta.name || '';
  const caps = {
    db: makeDb(user.id),
    user: {
      isOwner: async () => true, canEdit: async () => true, can: async () => true, id: async () => user.id,
      me: async () => ({ id: user.id, name, email: user.email || '', avatarUrl: meta.avatar_url || '', color: '#7F8A85', isOwner: true, canEdit: true }),
    },
    downloads: downloads(),
  };
  window.claude = { use: async n => caps[n] || null };
  window.ttbPlatform = { name: 'web', version: VERSION, email: user.email, signOut: () => sb.auth.signOut().finally(() => location.reload()) };
  authEl.hidden = true;
  authEl.innerHTML = '';
  $('#appRoot').hidden = false;
  const s = document.createElement('script');
  s.src = 'app.js?v=' + VERSION;
  document.body.appendChild(s);
}
async function init() {
  if (!sb) { renderAuth(); return; }
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') { mode = 'newpw'; renderAuth(); }
    else if (event === 'SIGNED_IN' && session && !recovering && mode !== 'newpw') start(session.user);
  });
  const { data } = await sb.auth.getSession();
  if (recovering) { mode = 'newpw'; renderAuth(); return; }
  if (data && data.session) start(data.session.user);
  else renderAuth();
}
init();
})();
