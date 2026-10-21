# 꼬박꼬박 가계부 · 웹사이트 설치 안내

Claude 밖에서도 쓸 수 있는 웹사이트 버전이에요. 로그인과 데이터 저장은 **Supabase**(무료 서버 서비스)가 맡고, 사이트 파일은 **Netlify** 같은 무료 호스팅에 올려요. 휴대폰에서는 홈 화면에 추가해 앱처럼 쓸 수 있어요.

전체 30분 정도 걸려요. 구글 로그인(6단계)은 나중에 해도 돼요.

## 들어 있는 파일

```
site/                 ← 이 폴더를 통째로 인터넷에 올려요
  index.html          화면 뼈대와 로그인 화면
  app.js, styles.css  가계부 화면 (Claude 버전과 같은 코드)
  platform.js         로그인과 서버 저장을 담당
  config.js           ★ 내 Supabase 주소와 키를 넣는 파일
  privacy.html, terms.html, legal.css   개인정보 처리방침·이용약관 (★ 운영자 이름·문의 메일 채우기)
  sw.js, manifest.webmanifest, icons/   홈 화면 앱 설정
  vendor/supabase.js  Supabase 연결 라이브러리
supabase/schema.sql   데이터베이스 설정 (한 번만 실행)
```

## 1단계 · Supabase 프로젝트 만들기

1. https://supabase.com 에 가입하고 **New project**를 누르세요.
2. 프로젝트 이름은 아무거나(예: `ttb-ledger`) 정하고, 데이터베이스 비밀번호를 정해 따로 적어 두세요.
3. Region은 **Northeast Asia (Seoul)**을 고르세요.
4. 만들어지기까지 1~2분 기다려요.

## 2단계 · 데이터베이스 설정하고 config.js 채우기

1. 왼쪽 메뉴 **SQL Editor** → 새 쿼리를 열고 `supabase/schema.sql` 내용을 전부 붙여 넣은 뒤 **Run**을 누르세요. `Success`가 나오면 끝이에요.
2. 두 값을 복사하세요. 위쪽 **Connect** 버튼을 누르면 두 값이 한 화면에 나와요.
   - **Project URL** (예: `https://abcdefghijkl.supabase.co`)
   - **Publishable key** (`sb_publishable_`로 시작). **Settings → API Keys**에도 있어요. 예전 방식의 anon 키(`eyJ...`)도 쓸 수 있지만 2026년 말까지 단계적으로 없어질 예정이라 Publishable key를 권해요.
3. `site/config.js`를 메모장으로 열어 두 값을 따옴표 안에 붙여 넣고 저장하세요.
   - **Secret key**(`sb_secret_`)나 **service_role** 키는 절대 넣지 마세요. 모든 데이터를 열 수 있는 관리자 키예요.

## 3단계 · 사이트 올리기 (Netlify)

1. https://app.netlify.com/drop 에 가입하고 접속하세요.
2. `site` 폴더를 통째로 화면에 끌어다 놓으세요.
3. `https://(이름).netlify.app` 같은 주소가 생겨요. 사이트 설정에서 이름을 바꿀 수 있어요.

Vercel이나 GitHub Pages 같은 다른 무료 호스팅에 올려도 돼요. 주소가 **https**로 시작해야 홈 화면 앱 기능이 켜져요.

## 4단계 · Supabase에 내 사이트 주소 알려 주기

**Authentication → URL Configuration**에서

- **Site URL**: 3단계에서 받은 주소
- **Redirect URLs**: 같은 주소를 하나 더 추가하세요 (예: `https://(이름).netlify.app/**`)

이걸 해야 가입 인증 메일과 비밀번호 찾기 링크가 내 사이트로 돌아와요.

## 5단계 · 가입하고 쓰기

1. 사이트에 들어가 **회원가입** → 이메일로 온 인증 링크를 누르세요.
2. 로그인하면 빈 가계부가 열려요.
3. **기존 기록 옮기기**: Claude에 있는 가계부의 설정 → **백업 파일 저장** → 새 사이트의 설정 → **백업에서 되살리기**로 그 파일을 고르면 내역·구독·대출·예산·테마가 그대로 옮겨져요.

참고: Supabase 기본 메일 발송은 시험용이라 시간당 보낼 수 있는 양이 적고, 프로젝트 팀원이 아닌 주소에는 안 갈 수 있어요. 혼자 쓰면 문제없지만 가족도 가입시키려면 **Authentication → Emails**에서 별도 메일 서버(SMTP)를 연결하세요.

## 6단계 · 구글 로그인 켜기 (선택)

1. https://console.cloud.google.com 에서 프로젝트를 만들고 **API 및 서비스 → OAuth 동의 화면**을 설정하세요.
2. **사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID**에서 유형은 **웹 애플리케이션**으로 고르세요.
3. **승인된 리디렉션 URI**에 `https://(내 프로젝트).supabase.co/auth/v1/callback` 을 넣으세요. 정확한 값은 Supabase의 Google 설정 화면에도 나와요.
4. 만들어진 클라이언트 ID와 보안 비밀을 Supabase **Authentication → Providers(Sign In / Providers) → Google**에 넣고 켜세요.
5. 아직 안 했다면 `config.js`의 `googleLogin`을 `false`로 두면 구글 버튼이 숨겨져요.

## 7단계 · 휴대폰에서 앱처럼 쓰기

- **안드로이드 (크롬)**: 사이트 접속 → 메뉴(⋮) → **홈 화면에 추가** 또는 **앱 설치**
- **아이폰 (사파리)**: 사이트 접속 → 공유 버튼 → **홈 화면에 추가**

홈 화면 아이콘으로 열면 주소창 없이 앱처럼 열려요. 폰과 PC에 같은 계정으로 로그인하면 같은 기록이 보여요.

## 8단계 · 공개 전에 꼭 할 일 (청년 대상 서비스)

1. **처리방침·약관 채우기**: `privacy.html`과 `terms.html`에서 노란 칸 `[운영자 이름]`, `[문의 이메일]`, `[프로젝트 지역]`을 내 정보로 바꿔요. 프로젝트 지역은 Supabase 대시보드 > Project Settings > General에서 확인해요. 가능하면 전문가 검토를 한 번 받으세요.
2. **회원 탈퇴 기능 켜기**: `supabase/schema.sql` 전체를 SQL Editor에서 다시 Run 해요. 여러 번 실행해도 괜찮고, 새로 생긴 5번(회원 탈퇴)이 추가돼요.
3. **인증 메일 발송 설정(SMTP)**: Supabase 기본 메일은 시간당 몇 통만 보낼 수 있어서 가입자가 늘면 인증 메일이 안 가요. Authentication > Emails > SMTP Settings에서 메일 발송 서비스(예: Resend, Brevo)의 정보를 넣어 주세요. 같은 화면의 Templates에서 메일 문구를 한국어로 바꿀 수 있어요.
4. **약관 동의**: 가입할 때 ‘만 14세 이상·약관 동의’ 체크가 필수예요. 구글로 가입했거나 이전에 가입한 계정은 처음 들어올 때 동의 화면이 한 번 나와요. 약관을 크게 바꾸면 `platform.js`의 `TERMS_VERSION` 날짜를 올려 다시 동의를 받아요.

## 알아 둘 점

- **AI에게 부탁하기**는 Claude 안의 가계부에서만 동작해요. 웹사이트에서는 버튼이 보이지 않아요.
- Supabase 무료 플랜은 한동안(약 1주) 접속이 없으면 프로젝트가 일시정지될 수 있어요. 그러면 대시보드에서 다시 켜면 되고 데이터는 남아 있어요. 그래도 가끔 **백업 파일 저장**을 해 두세요.
- 사이트를 새 버전으로 바꿀 때는 `config.js`를 새 파일로 덮어쓰지 마세요. 내 서버 주소가 지워져요.
- 데이터는 행 단위 보안(RLS)으로 본인 계정만 읽고 쓸 수 있게 설정돼 있어요.

## 다음 단계 · 앱스토어 출시

이 사이트는 그대로 **Capacitor**로 감싸 안드로이드·iOS 앱으로 만들 수 있는 구조예요. 스토어에 올리려면 개발자 등록비(구글 1회 25달러, 애플 연 99달러)와 심사가 필요해요. 필요해지면 그때 이어서 작업하면 돼요.
