# Enchant and Upgrade Recommendation Flow

## 목적

이 문서는 `/api/character-loadout`에서 마법부여와 스펙업 추천 payload가 만들어지는 흐름을 설명한다.

대상은 현재 DunPilot의 스펙업 추천 도메인이다.

- 마법부여 카드/보주
- 강화/증폭/장비 조율
- 서약 조율
- 흑아/흑아 변환서
- 칭호
- 크리쳐
- 오라
- 아바타 엠블렘
- 플래티넘 엠블렘
- 버프강화 칭호/크리쳐/플래티넘/짙편린

과거 헬 운영, 계시, 초월, 정가 중심 설명은 `Docs/legacy/`와 `Docs/research/` 문서로 분리한다.

## 전체 흐름

```text
Browser
-> Route: neople_hell_api_server.py
-> Service: character_equipment_service.py
-> Repository / Cache
-> Candidate Resolver
-> Calculator
-> Presenter
-> JSON response
```

프론트의 스펙업 순서 탭은 검색 후 `/api/character-loadout`를 중심으로 현재 캐릭터 세팅, 추천 후보, 가격, 계산 결과를 받는다. 일부 공용 가격 endpoint는 유지되지만, 현재 추천 흐름의 핵심은 character-loadout 응답이다.

## Route

위치: `neople_hell_api_server.py`

Route 책임:

- HTTP query 파라미터 파싱
- 필수 값 검증
- HTTP status와 JSON 응답 반환
- heavy request semaphore 적용
- `/api/character-loadout` short response cache 확인
- 같은 `(serverId, characterId)` 요청 single-flight 처리
- 오류를 HTTP 응답으로 변환

Route에 두지 않는 책임:

- 네오플 API 세부 조회
- 후보 탐색
- 딜/버프/효율 계산
- 추천 row 조립
- 도메인별 가격 선택 기준

## Character Loadout Cache / Single-Flight

`/api/character-loadout`는 같은 캐릭터 반복/동시 요청을 줄이기 위해 origin 내부 short response cache를 사용한다.

- cache key: `(serverId, characterId)`
- TTL: 15초
- 성공 200 body만 캐시
- 실패 응답은 캐시하지 않음
- cache hit은 heavy semaphore와 `load_character_loadout()` 계산을 건너뜀
- 같은 key 계산이 이미 진행 중이면 새 계산을 시작하지 않고 기존 계산 결과를 기다림
- payload에 `cacheHit` 같은 필드는 추가하지 않음

이 캐시는 최종 응답 body 캐시다. 도메인별 가격 후보를 저장하는 `resolved_price_repository`와 역할이 다르다.

## Service

주요 위치: `server/character_equipment_service.py`

Service 책임:

- 캐릭터 resource payload 조회 흐름 조합
- 장비/칭호/크리쳐/오라/아바타/버프강화 상태 해석
- 후보 resolver 호출
- repository 호출
- calculator 호출
- presenter 호출
- 최종 loadout response 구성
- debug timing과 fan-out trace 연결

Service는 전체 추천 흐름의 orchestration을 담당한다. 계산식 자체, 원본 API 호출, row dict 조립은 가능한 한 하위 레이어로 분리한다.

## Repository / Cache

### Character Repository

위치: `server/repositories/character_repository.py`

캐릭터 resource payload를 캐시하고 API Client를 통해 원본 payload를 가져온다.

대표 resource:

- `equipment`
- `avatar`
- `creature`
- `status`
- `buff/equip/*`
- `oath`

### Item Repository

위치: `server/repositories/item_repository.py`

item detail과 itemName 검색을 담당한다.

- `/df/multi/items`는 15개 단위 chunk로 조회
- itemId dedupe 후 cache miss만 조회
- character-loadout 시작 시 현재 착용/버프강화 itemId를 best-effort로 prefetch

prefetch 실패는 전체 loadout 실패로 만들지 않는다. 본 계산 경로에서 필요한 상세 조회는 기존 예외 흐름을 유지한다.

### Auction Repository

위치: `server/repositories/auction_repository.py`

경매장 원본 rows 조회와 중립적인 최저가 요약을 담당한다.

- itemId 기준 rows 조회
- itemName 기준 rows 조회
- itemIds batch rows 조회
- 단일 itemId 최저가 요약
- batch itemIds 최저가 요약

도메인별 후보 우선순위, 추천 제외, 효율 정렬 같은 정책은 repository가 아니라 service/candidate 쪽에 둔다.

### Material Price Repository

위치: `server/repositories/material_price_repository.py`

강화/증폭/조율/흑아에 쓰는 공통 재료 가격 payload를 300초 memory cache로 관리한다.

개별 재료 가격 조회 실패 시 전체 실패로 만들지 않고 해당 재료만 기존 빈 auction fallback을 사용한다.

### Resolved Price Repository

위치: `server/repositories/resolved_price_repository.py`

raw auction rows가 아니라 도메인별 가격 후보 해석 결과를 캐시한다.

현재 domain:

- `avatar_emblem`
- `platinum_emblem`
- `black_fang_scroll`
- `switching_fragment`
- `aura`

저장하지 않는 값:

- 캐릭터 현재 상태
- 추천 여부
- expectedGold
- skillDamageMultiplier
- incrementalDamagePercent
- 최종 recommendation row 전체

### Aura Final Payload Cache와의 차이

기존 aura final payload cache는 오라 업그레이드 endpoint용 최종 후보 payload cache다.

`resolved_price_repository`의 `aura` cache는 `build_aura_candidates()`에 들어가기 전 price item auction 해석 결과만 보조한다. 캐릭터별 딜/버프 계산이나 최종 aura recommendation row를 저장하지 않는다.

## Candidate Resolver

위치: `server/candidates/`

Candidate Resolver는 비교 후보나 가격 기준 source를 찾는다.

주요 파일:

- `black_fang.py`: 흑아 후보와 변환서/재료 후보 탐색
- `avatar_emblem.py`: 아바타 엠블렘 후보와 prefix 가격 후보 탐색
- `aura.py`: 오라 후보와 가격 item 후보 탐색
- `title.py`: 칭호 후보 원천 탐색
- `creature.py`: 크리쳐 효과/가격 후보 원천 탐색
- `switching_fragment.py`: 짙편린 경매장 후보 그룹과 fallback item source 탐색

Candidate Resolver에 두지 않는 책임:

- 현재 장착 상태와 비교한 최종 추천 여부
- 딜/버프 상승량 계산
- expectedGold/효율 계산
- 최종 row payload 조립

## Calculator

위치: `server/calculators/`

Calculator는 입력값만으로 결정되는 순수 계산을 담당한다.

예:

- 스위칭 딜 배율 계산
- damageApplicationRatio 적용
- 아바타 스킬 공격력/레벨 배율 계산
- 플래티넘 스킬 레벨 효과 계산

API 호출, repository 호출, 후보 검색, price cache 조회는 calculator에 두지 않는다.

## Presenter

위치: `server/presenters/`

Presenter는 이미 계산/조회/필터링이 끝난 값을 프론트용 dict로 조립한다.

분리된 row/payload 예:

- black fang recommendation row
- avatar emblem recommendation row
- switching fragment row
- dealer switching title row
- dealer switching creature row
- switching platinum row
- 일반 platinum emblem row
- buffer switching title row
- character preview/avatar/enchants final payload

Presenter는 repository, neople_client, service, calculator를 import하지 않는 방향을 유지한다.

## Domain Flow

### 마법부여 카드/보주

1. `Docs/enchant_card_db.json`에서 후보 DB를 읽는다.
2. 현재 장비 마부와 후보 마부 효과를 비교한다.
3. 필요한 item detail과 auction 가격을 repository 경유로 조회한다.
4. 딜러/버퍼 baseline 기준으로 상승량과 expectedGold를 계산한다.
5. 최종 row는 기존 payload 구조를 유지해 내려준다.

정확도 정책:

- 업그레이드 가능한 카드/보주는 효과를 max upgrade 기준으로 계산한다.
- 이 경우 가격도 `upgrade == upgradeMax`인 풀업 경매장 row만 인정한다.
- 풀업 매물이 없으면 lower upgrade 매물 가격으로 fallback하지 않는다.
- 목적은 풀업 효과와 노업 가격이 섞여 효율이 왜곡되는 것을 막는 것이다.

### 강화/증폭/장비 조율

강화/증폭 기대값 DB와 장비 상태를 비교해 업그레이드 후보를 만든다.

재료 가격은 `material_price_repository`에서 조회한다. 최종 추천 계산과 payload 위치는 service 흐름에 남아 있다.

### 서약 조율

`equip/oath` payload를 character repository 경유로 조회하고, oath stage DB를 기준으로 조율 payload를 만든다.

서약 조율 계산과 최종 response 위치는 기존 loadout 흐름을 유지한다.

### 흑아/흑아 변환서

`candidates/black_fang.py`가 흑아 후보와 변환서 이름을 찾는다.

- 재료 가격: `material_price_repository`
- 흑아 변환서 가격 후보: `resolved_price_repository` domain `black_fang_scroll`
- 추천 여부와 expectedGold 계산: service/candidate 흐름
- row 조립: presenter

### 칭호

칭호 후보 원천은 `candidates/title.py`가 담당한다.

현재 장착 칭호, 보주 여부, 가격 후보, 스킬/효과 비교는 service 흐름에서 조합한다. 버프강화 칭호 row 조립은 presenter로 분리되어 있다.

### 크리쳐

크리쳐 후보 원천은 `candidates/creature.py`가 담당한다.

효과 후보와 가격 후보를 구분하고, 현재 크리쳐와 비교한 추천 여부는 service에서 판단한다. 딜러 switching creature row 조립은 presenter로 분리되어 있으며, 버퍼 크리쳐 해제처럼 구조가 다른 케이스는 service에 남아 있다.

### 오라

오라 후보 원천은 `candidates/aura.py`가 담당한다.

오라 price item auction 해석 결과는 `resolved_price_repository` domain `aura`로 캐시한다. 기존 aura final payload cache는 유지하며, character-loadout의 캐릭터별 계산과 최종 추천 row는 별도로 처리한다.

### 아바타 엠블렘

아바타 엠블렘 후보와 prefix 가격 후보는 `candidates/avatar_emblem.py`가 담당한다.

가격 후보 해석 결과는 `resolved_price_repository` domain `avatar_emblem`으로 캐시한다. 현재 장착 여부, needCount, statGain, 추천 제외 판단은 캐릭터별 흐름에 남아 있다.

### 플래티넘 엠블렘

플래티넘 엠블렘 가격 후보는 스킬명과 선택상자 허용 여부를 기준으로 `resolved_price_repository` domain `platinum_emblem`에 캐시한다.

캐시하지 않는 값:

- changedSlots
- 현재 장착 여부
- incrementalDamagePercent
- skillDamageMultiplier
- expectedGold

### 짙편린

`candidates/switching_fragment.py`가 자버프명, 직업, slot, suffix 기준으로 경매장 후보 그룹을 만든다.

경매장 후보 그룹 결과는 `resolved_price_repository` domain `switching_fragment`로 캐시한다.

캐시하지 않는 값:

- 현재 스위칭 장비 상태
- 후보/현재 계수 계산
- damageApplicationRatio
- 최종 switchingFragmentRecommendations row
- `/df/items` fallback 이후 itemId별 최저가 확인

### 버퍼 관련 계산

버퍼 baseline과 스위칭 title/creature 계산은 캐릭터별 상태와 스킬 상세 의존성이 강하다.

스킬 상세 API 호출은 API Client 함수를 경유하고, 계산과 payload 조립은 service/calculator/presenter 경계에 맞춰 점진적으로 정리한다.

## Fan-Out Trace

`api_fanout_summary`는 character-loadout 한 요청에서 실제 네오플 API 호출 수와 cache hit/miss를 요약한다.

확인 항목 예:

- character payload 호출 수
- multi/items 호출 수
- item search 호출 수
- auction itemId/itemName/itemIds 호출 수
- skill style/list/detail 호출 수
- item detail cache hit/miss
- resolvedPrice total/byDomain hit/miss/store/skip/error

cache hit이 늘면 fan-out이 줄어야 한다. 단, character-loadout short response cache hit은 loadout 계산 자체를 건너뛰므로 fan-out summary가 새로 찍히지 않을 수 있다.

## 변경 금지 원칙

스펙업 추천 흐름을 수정할 때는 아래를 지킨다.

- 계산식 변경 금지
- 추천 기준 변경 금지
- 추천 개수와 정렬 순서 변경 금지
- payload 구조 변경 금지
- 가격 선택 기준 변경 시 별도 fixture/mock 검증 필요
- `Docs/*.json`, `Docs/*.tsv`, `Docs/*.txt` 이동 금지
- 프론트 수정 금지 unless requested
- 한 번에 하나의 도메인만 수정
- 실시간 가격 변동으로 결과가 흔들리면 mock 또는 fixture로 비교

## 관련 문서

- `../architecture/ARCHITECTURE.md`
- `../WORK_CONTEXT.md`
- `BUFFER_CALCULATION_NOTES.md`
- `../legacy/DNF_HELL_OPTIMIZER_SPEC.md`
- `../research/EQUIPMENT_SCORE_REVERSE_ENGINE.md`
