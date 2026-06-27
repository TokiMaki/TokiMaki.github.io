# DunPilot Architecture

## 목적

이 문서는 던파일럿의 서버/프론트 구조를 빠르게 이해하기 위한 운영용 구조 요약이다.

던파일럿은 던전앤파이터 캐릭터의 현재 세팅을 조회하고, 마법부여, 증폭, 장비 조율, 서약 조율, 버프강화, 칭호, 크리쳐, 오라, 흑아 같은 스펙업 후보를 골드 효율 기준으로 비교한다.

## 핵심 서버 레이어

### Route

- 위치: `neople_hell_api_server.py`
- HTTP query 파싱, validation, JSON 응답, HTTP status 처리 담당
- public response cache, heavy request semaphore, loadout short response cache 같은 route-level 정책 담당
- 계산식, 후보 탐색, payload row 조립은 route에 두지 않는다.

### API Client

- 위치: `server/neople_client.py`
- 네오플 API URL 구성, HTTP 요청, 원본 payload 반환 담당
- 캐시, 후보 선택, 가격 선택, 프론트 payload 조립을 하지 않는다.

### Repository / Cache

- 위치: `server/repositories/`
- 캐시, TTL, single-flight, fallback, 중립적인 묶음 조회 담당
- 주요 파일:
  - `character_repository.py`: 캐릭터 resource payload 캐시
  - `item_repository.py`: item detail, item search 캐시
  - `auction_repository.py`: 경매장 rows 조회와 중립적인 최저가 요약
  - `material_price_repository.py`: 강화/증폭/흑아 재료 시세 payload 캐시
  - `resolved_price_repository.py`: 도메인별 resolved price cache

### Candidate Resolver

- 위치: `server/candidates/`
- 비교 후보와 가격 기준 source 탐색 담당
- 후보 검색어, DB 후보 해석, 직업/스킬/부위 필터링처럼 후보 원천을 정리한다.
- 캐릭터별 효율 계산, 최종 추천 정렬, 프론트 row 조립은 하지 않는다.

### Calculator

- 위치: `server/calculators/`
- 딜, 버프, 스킬 배율, 효율 등 순수 수치 계산 담당
- API 호출, 캐시 조회, 후보 탐색, payload 조립을 하지 않는다.

### Presenter

- 위치: `server/presenters/`
- 이미 계산/조회/필터링이 끝난 값을 프론트용 row 또는 payload dict로 조립한다.
- repository, neople_client, service, calculator를 import하지 않는 방향을 유지한다.

### Service

- 주요 위치:
  - `server/character_equipment_service.py`
  - `server/enchant_service.py`
  - `server/avatar_skill_optimizer.py`
  - `server/character_search_service.py`
  - `server/character_summary_service.py`
- 캐릭터 조회, 후보 추천 흐름 조합, repository/candidate/calculator/presenter 호출, 최종 응답 구성 담당
- 계산식이나 추천 기준을 바꾸지 않는 선에서 함수 단위로만 점진 정리한다.

## 주요 디렉터리

```text
server/
  neople_client.py              # 네오플 API client
  repositories/                 # 캐시, TTL, fallback, 중립 조회
  candidates/                   # 후보 탐색
  calculators/                  # 순수 계산
  presenters/                   # 프론트 row/payload 조립
  character_equipment_service.py
  enchant_service.py
  avatar_skill_optimizer.py

src/
  components/                   # React 마크업 컴포넌트
  dnfHellTool/                  # DOM 기반 화면 상태/이벤트/렌더 모듈
  logic/                        # 프론트 계산 보조
  styles/

Docs/
  README.md
  WORK_CONTEXT.md
  ARCHITECTURE.md
  DEPLOY_LIGHTSAIL.md
  legacy/
  research/
  *.json / *.tsv / *.txt        # 서버/스크립트가 직접 참조할 수 있는 기준 데이터
```

## 최근 주요 구조

### Character Repository

`character_repository.py`는 캐릭터 resource payload를 `serverId`, `characterId`, resource 기준으로 캐시한다. Service는 직접 네오플 URL을 만들지 않고 repository를 통해 캐릭터 payload를 요청한다.

### Auction Repository

`auction_repository.py`는 itemId, itemName, itemIds 기반 경매장 rows 조회와 중립적인 최저가 요약을 담당한다. 도메인별 가격 정책이나 추천 정렬은 service/candidate 쪽에 남긴다.

### Item Repository

`item_repository.py`는 item detail 묶음 조회와 itemName 검색 캐시를 담당한다. `/df/multi/items`는 네오플 제한에 맞춰 15개 단위 chunk로 조회한다.

### Resolved Price Repository

`resolved_price_repository.py`는 raw auction rows가 아니라 도메인별로 가격 후보 해석이 끝난 결과를 짧게 캐시한다.

현재 적용 domain:

- `avatar_emblem`
- `platinum_emblem`
- `black_fang_scroll`
- `switching_fragment`
- `aura`

캐릭터별 계산값, 추천 여부, 최종 recommendation row는 캐시하지 않는다.

### Character Loadout Short Cache / Single-Flight

`/api/character-loadout`는 origin 내부 15초 response cache와 같은 `(serverId, characterId)` 요청 single-flight를 가진다.

- 성공 200 body만 캐시
- cache hit은 heavy semaphore와 loadout 계산을 건너뜀
- 실패 응답은 캐시하지 않음
- payload에 cacheHit 같은 필드는 추가하지 않음

### Item Detail Prefetch

`load_character_loadout()` 시작 시 현재 장비, 오라, 크리쳐, 아티팩트, 버프강화 장비/크리쳐 itemId를 모아 item detail cache를 best-effort로 예열한다.

prefetch 실패는 전체 loadout 실패로 만들지 않고, 본 계산 경로는 기존처럼 진행한다.

### API Fan-Out Trace

`api_fanout_summary`는 `/api/character-loadout` 한 요청에서 발생한 네오플 API 호출 수와 캐시 hit/miss를 요약한다.

`resolvedPrice.byDomain`은 resolved price cache의 domain별 hit/miss/store/skip/error만 기록한다. itemName, skillName, scrollName 같은 원문 key는 로그에 남기지 않는다.

## 프론트 구조 요약

프론트는 React로 화면 골격을 렌더하지만, 실제 동작은 `src/dnfHellTool/*` 모듈이 DOM ref, 공용 state, action을 공유하는 구조다.

주요 흐름:

```text
src/main.jsx
-> src/App.jsx
-> src/components/DnfHellTool.jsx
-> src/components/DnfHellToolMarkup.jsx
-> src/dnfHellTool/initDnfHellTool.js
```

스펙업 순서 탭의 핵심 렌더/상태 파일은 `src/dnfHellTool/enchantView.js`다.

## Docs 데이터 주의

`Docs/*.json`, `Docs/*.tsv`, `Docs/*.txt` 중 일부는 서버와 생성 스크립트가 직접 읽는 기준 데이터다.

- 임의 이동 금지
- 임의 수정 금지
- schemaVersion 변경 시 서버 캐시/로더 영향 확인

연구성 문서는 `Docs/research/`, 과거 헬 최적화 문서는 `Docs/legacy/`에 둔다.

## 작업 원칙

- 계산식 변경 금지
- 추천 기준 변경 금지
- payload 구조 변경 금지
- 프론트 수정 금지 unless requested
- 한 번에 하나의 도메인만 분리
- 함수 이동 중심 최소 변경
- 공통 class/interface부터 만들지 않음
- repository, candidate, calculator, presenter 책임 경계를 억지로 확장하지 않음
- 실시간 API 결과가 흔들리면 fixture/mock으로 비교

## 운영/검증 주의

- 운영 API 포트: `8787`
- 검증 API 포트: `8799`
- `pkill -f neople_hell_api_server.py` 금지
- 8799 종료가 필요하면 해당 PID가 8799를 점유하는지 확인하고 그 PID만 종료
- 8787 재시작/종료가 필요하면 실행하지 말고 먼저 보고
- `Docs/*.json`, `Docs/*.tsv`, `Docs/*.txt` 이동 금지

## Legacy / Research

- 과거 헬 운영 최적화 명세: `Docs/legacy/DNF_HELL_OPTIMIZER_SPEC.md`
- 장비점수 역산 연구: `Docs/research/EQUIPMENT_SCORE_REVERSE_ENGINE.md`
- 장비점수 초기 메모: `Docs/research/equipment_score_reverse_notes.md`
- 서약 환산 연구: `Docs/research/OATH_VALUE_REVERSE_TABLE.md`
