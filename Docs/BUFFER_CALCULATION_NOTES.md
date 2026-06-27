# Buffer Calculation Notes

## 목적

이 문서는 DunPilot의 버퍼 baseline, 버프강화, 버퍼 추천 계산 기준을 설명한다.

대상 흐름:

- `load_character_buffer_baseline()`
- `load_character_buffer_skill_levels()`
- `get_buffer_switching_stat_delta()`
- `get_buffer_switching_metrics()`
- 버퍼 마법부여/플래티넘/엠블렘/버프강화 칭호/크리쳐 추천
- skill context와 skill detail lazy cache

개별 캐릭터 실측 메모는 공식 흐름 문서에 누적하지 않는다. 계산 기준을 바꿀 때는 fixture나 고정 mock으로 결과 동일성을 먼저 확인한다.

## 큰 흐름

```text
character-loadout
-> load_character_enchants()
-> load_character_buffer_baseline()
-> load_character_avatar(..., bufferBaseline)
-> buffer-specific recommendations
-> presenter row/payload
```

버퍼 계산은 캐릭터별 현재 상태와 버프강화 상태를 모두 사용한다. 가격 후보 cache와 캐릭터별 계산값을 섞어 저장하지 않는다.

## 캐릭터 payload 조회

버퍼 계산에 필요한 캐릭터 payload는 `character_repository.get_character_cached_payload()` 경유로 조회한다.

주요 resource:

- `status`
- `equip/equipment`
- `equip/avatar`
- `equip/creature`
- `skill/style`
- `skill/buff/equip/equipment`
- `skill/buff/equip/avatar`
- `skill/buff/equip/creature`

`character_repository`는 짧은 TTL payload cache를 제공한다. Service는 직접 네오플 URL을 만들지 않고 repository를 통해 resource payload를 요청한다.

## Buffer Baseline

위치: `server/character_equipment_service.py`

`load_character_buffer_baseline(server_id, character_id)`는 현재 캐릭터가 지원 버퍼인지 판정하고 `bufferBaseline` payload를 만든다.

현재 버퍼 판정:

- 남크루: `프리스트(남) / 眞 크루세이더`
- 여크루: `프리스트(여) / 眞 크루세이더`
- 인챈트리스: `마법사(여) / 眞 인챈트리스`
- 뮤즈: `아처 / 眞 뮤즈`
- 패러메딕: `거너(여) / 眞 패러메딕`

남크루가 딜러 스타일인 경우 `성령의 메이스` 여부로 버퍼 baseline에서 제외한다.

baseline에 포함되는 주요 값:

- `isBuffer`
- `bufferKey`
- `jobName`
- `jobGrowName`
- `statName`
- 현재 `stat`
- 현재 `buffPower`
- 현재 `buffAmplification`
- 30레벨 버프 스킬명/레벨
- 50레벨 1차 각성기 스킬명/레벨
- switching stat delta
- switching buff amplification delta
- current self stat skill 정보

## Skill Level Flow

`load_character_buffer_skill_levels()`는 30레벨 버프와 50레벨 1차 각성기 레벨을 정리한다.

30레벨 버프:

- `skill/buff/equip/equipment`의 `skillInfo.option.level`을 사용한다.

50레벨 각성기:

- `skill/style`에서 `requiredLevel == 50`인 active skill을 찾는다.
- base level은 최소 15레벨로 보정한다.
- 현재 장비, 아바타, 크리쳐의 각성기 레벨 보너스를 합산한다.
- 장비 enchant의 `reinforceSkill`도 각성기 레벨 보너스에 포함한다.

## Switching Stat Delta

`get_buffer_switching_stat_delta()`는 현재 장착 세팅과 버프강화 세팅의 차이를 계산한다.

입력으로 사용하는 현재 세팅:

- 현재 장비
- 현재 아바타
- 현재 크리쳐

입력으로 사용하는 버프강화 세팅:

- 버프강화 장비
- 버프강화 아바타
- 버프강화 크리쳐

계산 항목:

- 직접 주스탯 차이
- 아이템/아바타/크리쳐 skill bonus 차이
- self stat skill level 변화에 따른 주스탯 차이
- 버프력 증폭 차이
- 현재 self stat skill의 이전/현재/다음 레벨 값
- aura stat / aura attack 관련 party stat 값

스위칭 계산은 가능한 한 `현재 적용 스탯 -> 스위칭 적용 스탯` 차이를 분해하는 방식으로 유지한다. 캐릭터별 고정 오프셋을 새로 추가하지 않는다.

## Switching Metrics

`get_buffer_switching_metrics()`는 버퍼 버프강화 칭호/크리쳐 추천에서 현재 후보와 교체 후보의 metric을 비교하는 데 사용한다.

반환 핵심 값:

- `switchingStatDelta`
- `switchingBuffAmplificationDelta`

후보 칭호나 크리쳐가 직접 스탯, skill bonus, buff amplification을 어떻게 바꾸는지 비교하고, 추천 row에서는 현재 metric과 후보 metric의 차이를 표시한다.

## Skill Context Cache

위치: `server/item_skill_option_service.py`

`get_character_skill_context(server_id, character_id)`는 스킬 관련 조회 결과를 60초 memory cache로 묶는다.

context 구성:

- 캐릭터 상세에서 `jobId`, `jobGrowId` 확인
- `skill/style` payload
- 직업 스킬 목록 payload
- `styleByName`
- `skillByName`
- `skillDetailById`

`skillDetailById`는 lazy mutation 구조다. 특정 item skill option 계산 중 스킬 상세가 필요해질 때 `fetch_skill_detail_from_api(job_id, skill_id)`로 조회하고 context dict에 저장한다.

주의:

- skill context cache key와 TTL을 임의 변경하지 않는다.
- lazy mutation 구조를 바꾸면 `get_item_reinforce_skill_effect()`와 플래티넘/아이템 스킬 옵션 계산 결과가 바뀔 수 있다.
- skill detail API 실패에 새 fallback을 추가하지 않는다.

## Item Reinforce Skill Effect

`get_item_reinforce_skill_effect(detail, skill_context)`는 아이템의 `itemReinforceSkill`이 현재 캐릭터에게 주는 스킬 공격력 효율을 계산한다.

역할:

- item reinforce skill의 jobId와 캐릭터 jobId를 비교
- 현재 style skill level을 확인
- 필요한 skill detail을 lazy 조회
- `get_skill_attack_ratio()`로 공격력 증가 배율 계산
- 가장 높은 `skillDamageMultiplier` 후보를 선택

이 함수는 버퍼 전용은 아니지만, 아바타/플래티넘/아이템 스킬 옵션 판단과 연결되므로 skill context 변경 시 같이 검증한다.

## 버퍼 추천 도메인

### 버프강화 칭호

버퍼 버프강화 칭호 추천은 현재 title contribution과 후보 title contribution을 비교한다.

주요 값:

- `switchingStatDelta`
- `switchingBuffAmplificationDelta`
- `bufferBuffSkillLevelDelta`
- current/candidate title contribution

row 조립은 `server/presenters/buffer_switching_title_presenter.py`가 담당한다. 후보 탐색, 가격 선택, metric 계산, 필터링, 정렬은 service에 남아 있다.

### 버프강화 크리쳐

버퍼 크리쳐 경로는 현재 장착 크리쳐와 버프강화 크리쳐 칸의 상태를 비교한다.

버프강화 칸에 현재 장착 크리쳐보다 약한 크리쳐가 들어간 경우, 크리쳐 해제를 0골드 free action으로 추천할 수 있다.

버퍼 크리쳐 해제 row는 딜러 switching creature row와 구조가 달라 service에 남아 있다.

### 플래티넘 엠블렘

일반 platinum emblem row 조립은 `server/presenters/platinum_emblem_presenter.py`가 담당한다.

버퍼에서 캐릭터별로 유지해야 하는 값:

- changedSlots
- targetSkill
- bufferSkillStatDeltas
- bufferSkillLevels
- bufferBuffSkillLevelDelta
- bufferAwakeningSkillLevelDelta
- expectedGold

가격 후보 해석 결과는 `resolved_price_repository` domain `platinum_emblem`을 사용할 수 있지만, 위 캐릭터별 계산값은 캐시하지 않는다.

### 아바타 엠블렘

버퍼 아바타 엠블렘 추천은 현재/버프강화 slot의 stat scope를 구분한다.

- 현재 세팅 stat 보정
- 버프강화 상/하의 stat 보정
- needCount
- 현재 장착 여부

가격 후보 해석 결과는 `resolved_price_repository` domain `avatar_emblem`을 사용할 수 있지만, 캐릭터별 needCount/statGain 판단은 캐시하지 않는다.

### 버퍼 마법부여/장비 추천

마법부여와 장비 관련 추천은 `bufferBaseline`을 기준으로 버프 스탯/공격력/증폭 변화를 계산한다.

마부 카드/보주의 가격 정책은 딜러와 동일하게 적용한다.

- 효과가 max upgrade 기준인 업그레이드 가능 카드/보주는 가격도 full upgrade row만 인정
- full upgrade 매물이 없으면 lower upgrade 가격으로 fallback하지 않음

## Cache 관계

### Character Loadout Short Response Cache

`/api/character-loadout` 전체 성공 응답을 15초 동안 캐시한다.

- 캐릭터별 최종 response body cache
- cache hit 시 버퍼 계산 자체를 다시 수행하지 않음
- payload에 cacheHit 필드를 추가하지 않음

### Repository Cache

- `character_repository`: 캐릭터 resource payload cache
- `item_repository`: item detail/search cache
- `item_skill_option_service`: skill context 60초 cache
- `resolved_price_repository`: 캐릭터와 무관한 가격 후보 해석 결과 cache

### 캐시하면 안 되는 값

아래 값은 캐릭터별 상태에 의존하므로 resolved price cache에 넣지 않는다.

- `bufferBaseline`
- `switchingStatDelta`
- `switchingBuffAmplificationDelta`
- `bufferBuffSkillLevelDelta`
- `changedSlots`
- `expectedGold`
- 최종 recommendation row 전체

## 계산 정책

- 30레벨 버프는 버프강화 스위칭 세팅 기준 적용 스탯과 스위칭 기준 버프력 증폭을 사용한다.
- 50레벨 1차 각성기는 현재 장착 세팅 기준 적용 스탯과 현재 기준 버프력 증폭을 사용한다.
- 현재 `status`에 이미 반영된 패시브/직접 스탯은 중복으로 더하지 않는다.
- 직접 시전해서 적용 스탯에 추가되는 자버프/오라형 스탯은 현재 적용 스탯에 더한 뒤, 스위칭 시 교체 차이를 차감한다.
- 버프강화 상/하의 아바타의 주스탯 엠블렘 차이는 현재/버프강화 API 응답을 비교해 반영한다.
- 현재 칭호의 버프력 증폭은 30레벨 버프 시전 시 스위칭 칭호로 바뀌면 빠진다.
- API 스킬 계수는 정수 표기라 숨은 소수점 오차가 있을 수 있다.

## 점수 공식

현재 버퍼 점수 비교는 아래 형태를 기준으로 한다.

```text
score =
(25000 + totalStat) / 25000
* (3300 + totalAtk) / 3300
* K
* 1.165
```

보정상수는 `K = 333`을 사용한다.

이 문서의 공식은 기준 설명용이다. 서버 계산식을 바꾸려면 fixture 기반 결과 동일성 또는 의도한 결과 차이를 먼저 확인한다.

## 변경 주의사항

- 계산식 변경 금지
- payload 구조 변경 금지
- 추천 기준/정렬 변경 금지
- 버퍼 baseline 변경 시 딜러/버퍼 fixture 모두 검증
- skill context나 skill detail lazy cache 변경 시 결과 동일성 검증
- 가격 후보 cache와 캐릭터별 계산값을 섞지 말 것
- `Docs/*.json`, `Docs/*.tsv`, `Docs/*.txt` 이동 금지
- 프론트 표시 구조 변경은 별도 요청 없이는 하지 않는다.

## 검증 권장

버퍼 계산 관련 코드를 변경할 때는 최소한 아래를 확인한다.

- `load_character_buffer_baseline()` payload 동일성
- `switchingStatDelta` 동일성
- `switchingBuffAmplificationDelta` 동일성
- `bufferBuffSkillLevelDelta` 동일성
- `currentSelfStatSkills` 동일성
- 버퍼 switching title 추천 row 동일성
- 버퍼 platinum emblem 추천 row 동일성
- skill detail API 실패 시 기존 예외 전파 방식 유지

실시간 API와 경매장 가격이 흔들릴 수 있으므로 가능하면 mock/fixture로 비교한다.
