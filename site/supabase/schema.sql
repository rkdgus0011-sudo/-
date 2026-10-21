-- 꼬박꼬박 가계부 · Supabase 데이터베이스 설정
-- Supabase 대시보드 > SQL Editor에 이 파일 전체를 붙여 넣고 Run을 누르세요. 여러 번 실행해도 괜찮아요.

-- 1) 가계부 문서 테이블: 사용자마다 월별 내역(months/2026-10), 설정(meta/settings),
--    구독(meta/subs), 대출(meta/loans)을 JSON 문서로 저장해요.
create table if not exists public.ledger_docs (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  path       text not null check (path ~ '^[A-Za-z0-9_.~:@+-]+/[A-Za-z0-9_.~:@+-]+$'),
  data       jsonb not null default '{}'::jsonb
             check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 1048576),
  updated_at timestamptz not null default now(),
  primary key (user_id, path)
);

-- 2) 행 단위 보안: 로그인한 본인 문서만 읽고 쓸 수 있어요.
alter table public.ledger_docs enable row level security;
drop policy if exists "ledger_docs_own" on public.ledger_docs;
create policy "ledger_docs_own" on public.ledger_docs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
revoke all on public.ledger_docs from anon;
grant select, insert, update, delete on public.ledger_docs to authenticated;

-- 3) 문서 일부만 합쳐 쓰기(기록 한 건 추가·수정). 중첩된 객체는 합치고 나머지 값은 덮어써요.
create or replace function public.jsonb_deep_merge(a jsonb, b jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare k text; v jsonb; r jsonb;
begin
  if a is null or jsonb_typeof(a) <> 'object' or jsonb_typeof(b) <> 'object' then
    return b;
  end if;
  r := a;
  for k, v in select key, value from jsonb_each(b) loop
    if jsonb_typeof(v) = 'object' and jsonb_typeof(r -> k) = 'object' then
      r := r || jsonb_build_object(k, public.jsonb_deep_merge(r -> k, v));
    else
      r := r || jsonb_build_object(k, v);
    end if;
  end loop;
  return r;
end $$;

-- 문서가 있으면 합치고 true, 없으면 false를 돌려줘요 (앱이 그때 새로 만들어요).
create or replace function public.ledger_update(p_path text, p_patch jsonb)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  update public.ledger_docs
     set data = public.jsonb_deep_merge(data, p_patch), updated_at = now()
   where user_id = auth.uid() and path = p_path;
  return found;
end $$;

revoke execute on function public.ledger_update(text, jsonb) from public, anon;
grant execute on function public.ledger_update(text, jsonb) to authenticated;
grant execute on function public.jsonb_deep_merge(jsonb, jsonb) to authenticated;

-- 4) 실시간 동기화: 폰에서 적으면 PC 화면에도 바로 반영돼요.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ledger_docs') then
    alter publication supabase_realtime add table public.ledger_docs;
  end if;
end $$;

-- 5) 회원 탈퇴: 로그인한 본인 계정과 가계부 기록을 한 번에 지워요. (설정 > 회원 탈퇴 버튼이 불러요)
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  delete from public.ledger_docs where user_id = uid;
  delete from auth.users where id = uid;
end $$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
