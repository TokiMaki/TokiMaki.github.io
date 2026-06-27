# CODE_STRUCTURE

이 문서는 `dnf-hell-optimizer-react` 저장소를 사람이 따라가기 쉽게 요약한 구조도다.

## 한 줄 요약

- 프론트는 `React로 마크업을 렌더`하고, 실제 동작은 `src/dnfHellTool/*.js` 모듈들이 DOM 기반으로 붙는다.
- 백엔드는 `neople_hell_api_server.py` 하나가 HTTP 엔드포인트를 열고, 실제 계산과 데이터 조립은 `server/*.py`가 맡는다.
- 계산 로직은 프론트 `src/logic/*.js`, 기준 데이터는 `Docs/*.json`, 화면 스타일은 `src/styles/*.css`에 모여 있다.

---

## 전체 계층도

```text
dnf-hell-optimizer-react
├─ package.json
├─ vite.config.js
├─ neople_hell_api_server.py          # 로컬 API 서버 진입점
├─ Docs/                              # 규칙, 계산 기준, DB, 캐시
│  ├─ DNF_HELL_OPTIMIZER_SPEC.md
│  ├─ WORK_CONTEXT.md
│  ├─ QUESTION_LOG.md
│  ├─ *_upgrade_db.json
│  ├─ *_expected_db.json
│  └─ .price_cache/*.json
├─ server/                            # 백엔드 로직
│  ├─ neople_client.py                # 네오플 API 호출 공통
│  ├─ enchant_service.py              # 시세/추천 후보 로딩
│  ├─ character_equipment_service.py  # 현재 캐릭 세팅/스펙업 데이터 조립
│  ├─ avatar_skill_optimizer.py       # 아바타 스킬 효율 계산
│  ├─ character_summary.py            # 타임라인/서약 요약
│  ├─ effects.py                      # 옵션 정규화 공통
│  ├─ price_cache.py                  # 시세 캐시 공통
│  ├─ upgrade_payloads.py             # 칭호/크리쳐/오라 payload 보조
│  └─ data_store.py                   # Docs 경로/DB 로더
├─ src/
│  ├─ main.jsx                        # React 시작
│  ├─ App.jsx
│  ├─ components/
│  │  ├─ DnfHellTool.jsx             # 마크업 + init 연결
│  │  └─ DnfHellToolMarkup.jsx       # 화면 HTML 골격
│  ├─ dnfHellTool/                    # 실제 프론트 기능 모듈
│  │  ├─ initDnfHellTool.js
│  │  ├─ domRefs.js
│  │  ├─ browserState.js
│  │  ├─ eventBindings.js
│  │  ├─ hellApiState.js
│  │  ├─ hellRenderCalc.js
│  │  ├─ enchantView.js
│  │  ├─ characterPresentation.js
│  │  ├─ supplyViewApi.js
│  │  ├─ supplyStateActions.js
│  │  ├─ supplyContentRules.js
│  │  ├─ supplySelectionRules.js
│  │  ├─ supplyRenderSections.js
│  │  ├─ supplySheetRows.js
│  │  ├─ hellCharacterData.js
│  │  ├─ hellCharacterState.js
│  │  ├─ storageCache.js
│  │  └─ storageKeys.js
│  ├─ logic/                          # 계산 함수
│  │  ├─ hellCalculator.js
│  │  ├─ supplyCalculator.js
│  │  ├─ supplyFatigue.js
│  │  ├─ supplyRecovery.js
│  │  ├─ supplyDate.js
│  │  └─ formatters.js
│  ├─ data/                           # 프론트 상수/기간 설정
│  │  ├─ supplyConstants.js
│  │  ├─ supplyContentConfig.js
│  │  ├─ accountRevelationConfig.js
│  │  └─ eventRevelationConfig.js
│  └─ styles/
│     ├─ theme.css
│     ├─ global.css
│     ├─ base.css
│     ├─ character-detail.css
│     ├─ supply.css
│     └─ tables-responsive.css
└─ 이미지/                            # 로고, 배경 등 정적 자산
```

---

## 프론트 구조

### 1. 진입 순서

```text
src/main.jsx
└─ src/App.jsx
   └─ src/components/DnfHellTool.jsx
      ├─ src/components/DnfHellToolMarkup.jsx   # JSX로 화면 틀 생성
      └─ src/dnfHellTool/initDnfHellTool.js     # 실제 기능 초기화
```

즉, 이 프로젝트는 겉으로는 React지만, 내부 동작은 전통적인 `DOM 조회 + 이벤트 바인딩 + 상태 객체 공유` 방식이 꽤 강하다.

### 2. 프론트 핵심 파일 역할

- [src/components/DnfHellToolMarkup.jsx](src/components/DnfHellToolMarkup.jsx:1)
  화면의 큰 골격을 만든다. 탭 버튼, 입력창, 표, portrait 카드 같은 HTML 구조가 여기 있다.

- [src/dnfHellTool/initDnfHellTool.js](src/dnfHellTool/initDnfHellTool.js:1)
  전체 프론트 조립 지점이다. `ctx`를 만들고 각 기능 모듈을 설치한다.

- [src/dnfHellTool/domRefs.js](src/dnfHellTool/domRefs.js:1)
  `document.getElementById(...)`를 한 곳에 모아 둔 파일이다. 화면 요소를 찾고 싶으면 여기부터 보면 된다.

- [src/dnfHellTool/eventBindings.js](src/dnfHellTool/eventBindings.js:1)
  버튼 클릭, 입력 변경 같은 사용자 이벤트 연결 담당이다.

- [src/dnfHellTool/browserState.js](src/dnfHellTool/browserState.js:1)
  현재 탭, 개발자 모드, 저장소 namespace 같은 브라우저 상태를 다룬다.

- [src/dnfHellTool/hellApiState.js](src/dnfHellTool/hellApiState.js:1)
  서버 API 호출과 로딩 상태를 다룬다.

- [src/dnfHellTool/hellRenderCalc.js](src/dnfHellTool/hellRenderCalc.js:1)
  헬 계산기 탭의 결과 계산과 렌더링 중심이다.

- [src/dnfHellTool/enchantView.js](src/dnfHellTool/enchantView.js:1429)
  스펙업 순서 탭의 핵심 파일이다. 마부, 칭호, 크리쳐, 오라, 아바타, 강화/증폭 추천까지 거의 다 여기 있다.

- [src/dnfHellTool/characterPresentation.js](src/dnfHellTool/characterPresentation.js:1)
  캐릭터 portrait 카드 마크업과 표현 로직을 담당한다.

- [src/dnfHellTool/supplyViewApi.js](src/dnfHellTool/supplyViewApi.js:1)
  계시 관리 탭 렌더링 중심 파일이다.

### 3. 프론트 모듈 조립 방식

`initDnfHellTool.js` 안에서 대략 이런 순서로 붙는다.

```text
createToolDomRefs()
-> createToolState()
-> createToolConfig()
-> installBrowserState(ctx)
-> installSupplySheetRows(ctx)
-> installHellCharacterState(ctx)
-> installSupplyContentRules(ctx)
-> installSupplySelectionRules(ctx)
-> installSupplyRenderSections(ctx)
-> installSupplyStateActions(ctx)
-> installSupplyViewApi(ctx)
-> installHellApiState(ctx)
-> installHellRenderCalc(ctx)
-> installEnchantView(ctx)
-> installBootstrap(ctx)
-> bindToolEvents(ctx)
-> ctx.actions.bootstrap()
```

핵심은 `ctx` 하나를 모든 모듈이 공유한다는 점이다.

```text
ctx
├─ els        # DOM refs
├─ state      # 현재 화면 상태
├─ config     # 정렬/공급 컨텐츠 설정
├─ deps       # 계산 함수, formatter, markup helper
├─ constants  # storage key, API base, 상수
├─ caches     # localStorage 캐시 래퍼
└─ actions    # install 단계에서 주입되는 함수들
```

즉 이 프로젝트 프론트는 `React 상태관리`보다는 `공용 컨텍스트 객체 기반 모듈 시스템`에 가깝다.

---

## 기능별 프론트 읽는 위치

### 헬 계산기

```text
DnfHellToolMarkup.jsx
-> hellRenderCalc.js
-> logic/hellCalculator.js
-> hellCharacterData.js / hellCharacterState.js
```

- 화면 틀: `DnfHellToolMarkup.jsx`
- 계산식: [src/logic/hellCalculator.js](src/logic/hellCalculator.js:1)
- 캐릭터 목록 상태: `hellCharacterState.js`
- 결과 렌더: `hellRenderCalc.js`

### 스펙업 순서

```text
DnfHellToolMarkup.jsx
-> enchantView.js
-> hellApiState.js
-> server /api/character-loadout, /api/*-upgrades
```

- 가장 중요한 프론트 파일: [src/dnfHellTool/enchantView.js](src/dnfHellTool/enchantView.js:1)
- 캐릭터 portrait 관련 표현: `characterPresentation.js`
- 서버에서 내려주는 현재 장비/추천 후보를 받아 표와 hover를 렌더한다.

### 계시 관리

```text
DnfHellToolMarkup.jsx
-> supplyViewApi.js
-> supplyStateActions.js
-> supplyContentRules.js
-> supplySelectionRules.js
-> logic/supplyCalculator.js
-> logic/supplyFatigue.js
-> logic/supplyRecovery.js
```

- 렌더 중심: [src/dnfHellTool/supplyViewApi.js](src/dnfHellTool/supplyViewApi.js:1)
- 실제 수치 계산: `src/logic/supply*.js`
- 일일/주간 컨텐츠 기준: `src/data/*.js`

---

## 백엔드 구조

### 1. 진입 순서

```text
neople_hell_api_server.py
└─ HellApiHandler
   ├─ /api/search
   ├─ /api/summarize
   ├─ /api/enchant-cards
   ├─ /api/character-enchants
   ├─ /api/character-loadout
   ├─ /api/character-preview
   ├─ /api/creature-upgrades
   ├─ /api/character-creature
   ├─ /api/title-upgrades
   ├─ /api/character-title
   ├─ /api/aura-upgrades
   ├─ /api/character-aura
   ├─ /api/character-avatar
   └─ /api/avatar-skill-efficiency
```

즉, 엔드포인트 라우팅은 Flask/FastAPI가 아니라 `http.server` 기반 수동 분기다.

### 2. 백엔드 핵심 파일 역할

- [neople_hell_api_server.py](neople_hell_api_server.py:1)
  서버 진입점, 라우팅, JSON 응답.

- [server/neople_client.py](server/neople_client.py:1)
  네오플 API 호출 공통. `request_json`, `search_character`, `fetch_item_details`가 여기 있다.

- [server/character_equipment_service.py](server/character_equipment_service.py:1)
  현재 캐릭터 세팅 조립의 중심. `character-loadout`, `preview`, `title`, `creature`, `aura`, `avatar`, `enchants`가 여기서 만들어진다.

- [server/enchant_service.py](server/enchant_service.py:1)
  추천 후보 DB를 읽고 시세를 붙여서 프론트용 추천 payload를 만든다.

- [server/avatar_skill_optimizer.py](server/avatar_skill_optimizer.py:1)
  아바타 상의/플래티넘 후보의 실질 딜 효율 계산 전용 파일.

- [server/effects.py](server/effects.py:1)
  아이템 status를 `최종뎀`, `속강`, `공격력 증가` 같은 공통 effect map으로 정규화한다.

- [server/upgrade_payloads.py](server/upgrade_payloads.py:1)
  칭호/크리쳐/오라 payload를 만들 때 쓰는 보조 함수 모음이다.

- [server/data_store.py](server/data_store.py:1)
  `Docs/*.json` 경로와 캐시 로더가 있다.

- [server/price_cache.py](server/price_cache.py:1)
  경매장 시세 디스크 캐시/메모리 캐시 관리.

---

## 기능별 백엔드 읽는 위치

### 캐릭터 현재 세팅 보기

```text
/api/character-loadout
-> load_character_loadout()
-> load_character_preview()
-> load_character_enchants()
-> load_character_creature()
-> load_character_title()
-> load_character_aura()
-> load_character_avatar()
```

중심 파일:
[server/character_equipment_service.py](server/character_equipment_service.py:479)

### 추천 후보 시세 보기

```text
/api/enchant-cards     -> load_enchant_cards_with_prices()
/api/creature-upgrades -> load_creature_upgrades_with_prices()
/api/title-upgrades    -> load_title_upgrades_with_prices()
/api/aura-upgrades     -> load_aura_upgrades_with_prices()
```

중심 파일:
[server/enchant_service.py](server/enchant_service.py:305)

### 아바타 스킬 효율

```text
/api/avatar-skill-efficiency
-> load_character_avatar_skill_efficiency()
-> option DB + skill level data + current avatar 비교
```

중심 파일:
[server/avatar_skill_optimizer.py](server/avatar_skill_optimizer.py:342)

---

## 데이터 파일 구조

### Docs 폴더는 크게 4종류다

```text
Docs/
├─ 규칙 문서
│  ├─ DNF_HELL_OPTIMIZER_SPEC.md
│  ├─ ENCHANT_RECOMMEND_FLOW.md
│  └─ EQUIPMENT_SCORE_REVERSE_ENGINE.md
├─ 작업 메모
│  ├─ WORK_CONTEXT.md
│  └─ QUESTION_LOG.md
├─ 정적 DB
│  ├─ enchant_card_db.json
│  ├─ creature_upgrade_db.json
│  ├─ title_upgrade_db.json
│  ├─ aura_upgrade_db.json
│  ├─ avatar_option_db.json
│  ├─ creature_artifact_db.json
│  ├─ jobBaseStat.json
│  ├─ amplification_expected_db.json
│  └─ reinforcement_expected_db.json
└─ 가격 캐시
   └─ .price_cache/*.json
```

### 자주 참조되는 DB

- `Docs/enchant_card_db.json`
  마법부여 카드 추천 기준.

- `Docs/creature_upgrade_db.json`
  크리쳐 후보 그룹/검색명 기준.

- `Docs/title_upgrade_db.json`
  칭호 후보 그룹/검색명 기준.

- `Docs/avatar_option_db.json`
  직업별 상의/플래티넘 추천 기준.

- `Docs/amplification_expected_db.json`
- `Docs/reinforcement_expected_db.json`
  강화/증폭 기대비용 계산 기준.

---

## 실제 데이터 흐름

### 스펙업 순서 탭

```text
사용자 검색
-> hellApiState.js 가 /api/character-preview 호출
-> portrait 기본 정보 먼저 그림
-> 이어서 /api/character-loadout + 추천 API들 호출
-> server/character_equipment_service.py 가 현재 세팅 조립
-> server/enchant_service.py 가 추천 후보/시세 조립
-> enchantView.js 가 대표 추천/표/hover 렌더
```

### 헬 계산기 탭

```text
사용자 입력
-> hellCharacterState.js 에 캐릭터 목록 유지
-> hellRenderCalc.js 에서 재계산 트리거
-> logic/hellCalculator.js 가 시뮬레이션/정가 비용 계산
-> 화면 summary / table / detail 갱신
```

### 계시 관리 탭

```text
사용자 캐릭터 선택/컨텐츠 선택
-> supplyStateActions.js / supplySelectionRules.js
-> logic/supplyFatigue.js / supplyRecovery.js / supplyCalculator.js 계산
-> supplyViewApi.js 가 roster / 상세 / 합계 렌더
```

---

## 처음 읽을 때 추천 순서

### 1. 프로젝트 전체 흐름만 보고 싶을 때

1. [src/components/DnfHellToolMarkup.jsx](src/components/DnfHellToolMarkup.jsx:1)
2. [src/dnfHellTool/initDnfHellTool.js](src/dnfHellTool/initDnfHellTool.js:1)
3. [src/dnfHellTool/domRefs.js](src/dnfHellTool/domRefs.js:1)
4. [neople_hell_api_server.py](neople_hell_api_server.py:1)

### 2. 스펙업 탭만 이해하고 싶을 때

1. [src/dnfHellTool/enchantView.js](src/dnfHellTool/enchantView.js:1)
2. [src/dnfHellTool/characterPresentation.js](src/dnfHellTool/characterPresentation.js:1)
3. [server/character_equipment_service.py](server/character_equipment_service.py:175)
4. [server/enchant_service.py](server/enchant_service.py:305)

### 3. 헬 계산기만 이해하고 싶을 때

1. [src/logic/hellCalculator.js](src/logic/hellCalculator.js:1)
2. [src/dnfHellTool/hellRenderCalc.js](src/dnfHellTool/hellRenderCalc.js:1)

### 4. 계시 관리만 이해하고 싶을 때

1. [src/dnfHellTool/supplyViewApi.js](src/dnfHellTool/supplyViewApi.js:1)
2. [src/logic/supplyCalculator.js](src/logic/supplyCalculator.js:1)
3. [src/logic/supplyFatigue.js](src/logic/supplyFatigue.js:1)
4. [src/data/supplyContentConfig.js](src/data/supplyContentConfig.js:1)

---

## 구조적으로 기억하면 좋은 점

- 이 프로젝트는 `React component tree`를 깊게 따라가면 잘 안 보인다.
- 실제 핵심은 `initDnfHellTool -> ctx -> install* 모듈들` 구조다.
- 화면을 바꾸고 싶으면 `Markup.jsx + domRefs.js + 해당 View 파일`을 같이 봐야 한다.
- 서버 응답이 이상하면 `neople_hell_api_server.py -> character_equipment_service.py / enchant_service.py` 순서로 따라가면 된다.
- 계산값이 이상하면 UI보다 `src/logic/*.js` 또는 `server/effects.py`를 먼저 보는 편이 빠르다.
