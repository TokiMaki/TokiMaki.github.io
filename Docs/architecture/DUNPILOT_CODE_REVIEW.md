# DunPilot Code Review Checklist

이 문서는 Codex와 개발자가 DunPilot 변경 후 확인해야 할 리뷰 기준이다.
일반적인 코드 스타일보다 현재 서버 구조, 추천 정확도, 운영 안정성, payload 호환성을 우선한다.

## 핵심 금지 원칙

명시적인 요청이나 별도 검증 계획 없이 다음을 변경하지 않는다.

- 계산식과 보정값
- 추천 기준, 후보 필터링, 정렬 순서
- API 응답 payload 구조와 필드 의미
- 프론트 구현
- 경매장 row 필터링과 가격 선택 정책
- 캐시 TTL, key, max entries, 저장 조건
- `Docs/*.json`, `Docs/*.tsv`, `Docs/*.txt` 위치와 내용

경매장 가격 선택 정책을 바꾸는 변경은 항상 별도 fixture 또는 live 검증이 필요하다.
프론트 수정은 사용자가 명시적으로 요청한 경우에만 포함한다.

## 서버 레이어별 체크리스트

### API Client

대상 예: `server/neople_client.py`

- 네오플 API URL 구성, HTTP 요청, 원본 payload/rows 반환만 담당하는가
- 캐시, TTL, single-flight, 추천 후보 선택이 들어가지 않았는가
- 최저가 선택, 후보 필터링, payload 정규화가 남아 있지 않은가
- service, repository, candidate, calculator, presenter를 역방향 import하지 않는가
- API 실패를 도메인 정책으로 바꾸는 경우 전용 예외와 호출부 정책이 명확한가

### Repository / Cache

대상 예: `server/repositories/`

- cache key에 결과에 영향을 주는 입력이 모두 포함되어 있는가
- TTL, max entries, memory/disk 여부가 명확한가
- 실패, 예외, 불완전한 결과를 캐시하지 않는가
- 캐시 hit 반환값이 호출부 mutation에 오염되지 않게 방어되는가
- single-flight entry가 성공과 실패 모두에서 cleanup 되는가
- fallback이 기존 실패 처리 정책을 바꾸지 않는가
- repository가 service, candidate, presenter를 import하지 않는가

### Candidate Resolver

대상 예: `server/candidates/`

- 후보 탐색, 검색어 구성, 후보 필터링까지만 담당하는가
- 딜/버프 계산, 효율 계산, 최종 row 조립이 섞이지 않았는가
- 경매장 가격 후보를 해석하는 경우 캐릭터별 계산값을 캐시하지 않는가
- fallback 후보와 기본 후보의 병합 순서가 기존 추천 정책을 유지하는가
- 결과가 호출부에서 기존과 같은 입력 형태로 사용되는가

### Calculator

대상 예: `server/calculators/`

- 딜, 버프, 계수, 효율 같은 수치 계산만 담당하는가
- 네오플 API, repository, cache, 파일 시스템 호출이 없는가
- payload 필드 조립이나 프론트 표시용 문구가 섞이지 않았는가
- 누락값 fallback과 rounding이 기존 함수와 동일한가
- 계산 변경이 있으면 before/after fixture가 있는가

### Presenter

대상 예: `server/presenters/`

- 이미 조회와 계산이 끝난 값으로 row 또는 response dict만 조립하는가
- API 호출, 캐시 조회, 가격 조회, 계산 함수 호출이 없는가
- service helper를 직접 호출하지 않는가
- 기존 payload 필드명, null 처리, 리스트 순서를 유지하는가
- debug/timing 구조를 새로 계산하지 않고 전달받은 값을 담기만 하는가

### Route

대상 예: `neople_hell_api_server.py`

- query/body 검증, service 호출, 응답 status/body, CORS/cache header만 담당하는가
- heavy semaphore, short response cache, single-flight 적용 순서가 의도대로인가
- cache hit이 불필요하게 heavy semaphore를 타지 않는가
- 실패 응답을 캐시하지 않는가
- route handler에 추천 계산이나 후보 탐색 로직이 들어가지 않았는가

## 캐시 리뷰 체크리스트

### character-loadout short cache / single-flight

- key는 `("character-loadout", serverId, characterId)` 기준인가
- TTL 15초, max entries 64 정책을 유지하는가
- 성공한 200 응답만 캐시하는가
- payload에 `cacheHit` 같은 진단 필드를 추가하지 않았는가
- 실패 시 in-flight entry가 정리되고 재요청이 다시 계산을 시도하는가

### item detail prefetch

- 현재 장착/버프강화 itemId만 best-effort로 미리 cache warm-up 하는가
- prefetch 실패가 전체 loadout 실패로 이어지지 않는가
- 본 계산 단계의 기존 예외 흐름은 숨기지 않는가
- 반환 payload나 추천 계산 입력으로 prefetch 결과를 직접 사용하지 않는가

### resolved_price_repository

적용 domain:

- `avatar_emblem`
- `platinum_emblem`
- `black_fang_scroll`
- `switching_fragment`
- `aura`

확인할 것:

- 캐릭터별 추천 row 전체를 캐시하지 않는가
- 캐릭터별 값인 `expectedGold`, `skillDamageMultiplier`, `incrementalDamagePercent`, `changedSlots`가 캐시에 들어가지 않는가
- domain, search mode, wordType, prefix, skillName, scrollName, target item, needed slots 등 결과 영향 인자가 key에 들어갔는가
- `serverId`, `characterId`를 넣으면 안 되는 가격 후보 캐시에 들어가지 않았는가
- 빈 결과, 가격 없음, 예외 결과를 캐시하지 않는 정책을 유지하는가
- `api_fanout_summary.resolvedPrice.byDomain`에는 hit/miss/store/skip만 남기고 원문 itemName이나 skillName은 남기지 않는가

### material_price_repository

- 재료 가격 cache key, TTL 300초, memory cache 정책을 유지하는가
- 개별 재료 가격 조회 실패 시 해당 재료만 빈 auction fallback을 유지하는가
- black_fang 재료 계산과 최종 `materialPrices` payload 구조가 바뀌지 않는가

### aura final payload cache

- 기존 aura final payload cache와 `resolved_price_repository`의 aura 가격 후보 cache를 혼동하지 않는가
- final payload cache의 TTL/key/저장 방식이 의도치 않게 바뀌지 않았는가
- resolved cache는 `build_aura_candidates()` 내부 price item auction 조회만 보조하는가

## 가격 / 경매장 체크리스트

- `itemIds` batch auction 확대는 결과 누락 위험이 있어 신중히 별도 검증하는가
- itemName 검색 `wordType`을 바꾸면 `full`/`match` 결과를 fixture 또는 live로 비교했는가
- 같은 요청 내 중복 조회를 줄여도 가격 선택 기준은 그대로인가
- raw auction rows cache와 resolved price cache를 구분하는가
- 후보 없음과 가격 없음 처리를 기존 no-price 흐름으로 유지하는가

### 업그레이드 가능한 마법부여 카드 / 보주

- 효과를 max upgrade 기준으로 쓰는 경우 가격도 full-upgrade 매물만 사용하는가
- `upgradeMax > 0`이면 가격 후보는 `upgrade == upgradeMax` row만 인정하는가
- lower upgrade 매물 가격으로 full-upgrade 효과를 계산하지 않는가
- full-upgrade 매물이 없으면 가격 없음 처리로 빠지는가
- upgrade 불가능한 카드/보주의 기존 가격 선택 결과는 유지되는가

## 결과 동일성 체크리스트

구조 분리, 캐시 추가, 가격 조회 경로 변경 후에는 debug/timing을 제외하고 다음을 비교한다.

- 추천 개수
- 추천 정렬 순서
- `sourceType`
- `slot`
- `tier`
- `itemName`
- `effects`
- `expectedGold`
- `auction.minUnitPrice`
- `auction.auctionNo`
- `materials`
- `skillDamageMultiplier`
- 서버가 제공하는 경우 `incrementalDamagePercent`

실시간 경매장 가격이 흔들리는 경우 fixture, mock, 저장 응답으로 비교한다.

## 검증 체크리스트

변경 범위에 맞춰 좁게 검증한다.

- Python AST 또는 import 확인
- `git diff --check`
- 관련 fixture/stub 결과 동일성
- 추천 개수와 정렬 동일성
- 핵심 row field 동일성
- 캐시 hit/miss와 TTL 만료 동작
- 필요 시 8799 검증 서버 live 확인
- 운영 서버 8787을 건드리지 않았는지 확인
- `pkill -f neople_hell_api_server.py`를 사용하지 않았는지 확인

8799 검증 서버를 사용할 때도 서버 실행/종료가 필요하면 사용자의 운영 규칙을 먼저 확인한다.

## 문서 / 운영 체크리스트

- 구조나 운영 원칙이 바뀌면 `../WORK_CONTEXT.md` Active Snapshot 갱신이 필요한가
- `ARCHITECTURE.md`와 충돌하는 설명이 없는가
- `../flows/ENCHANT_RECOMMEND_FLOW.md`, `../flows/BUFFER_CALCULATION_NOTES.md`와 정책이 맞는가
- `Docs/*.json`, `Docs/*.tsv`, `Docs/*.txt`를 이동하거나 수정하지 않았는가
- API key, cloudflared token, 개인 절대 경로, 실제 운영 비밀값을 문서에 추가하지 않았는가
- 과거 연구/legacy 내용은 `../legacy/`, `../research/` 참조로만 남겼는가

## 리뷰 결과 작성 기준

리뷰 요청을 받으면 findings를 먼저 쓴다.
문제가 없으면 `확인된 문제 없음`이라고 명확히 말하고, 남은 검증 공백만 적는다.

각 finding에는 다음을 포함한다.

- 위치: 파일과 관련 함수 또는 줄
- 문제: 실제로 깨질 수 있는 동작이나 유지보수 위험
- 근거: 현재 코드 흐름
- 영향: payload, 계산, 가격, 캐시, 운영 중 무엇에 영향을 주는지
- 최소 수정 방향: 함수 이동 또는 좁은 조건 수정 중심

단순 취향, 포맷팅, 파일 길이 자체, 추상화 선호는 finding으로 쓰지 않는다.
개선 제안은 한 번에 하나의 도메인과 최소 변경 단위로 제한한다.
