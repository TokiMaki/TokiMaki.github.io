# DunPilot 계산 참조: 딜러 데미지·버퍼 버프점수

> 문서 상태: 저장소 반영 전 상세 초안 — 추가 의존 구현 재검증 반영본
> 분석 기준: `dunpilot-calculation-review.zip` + `dunpilot-calculation-supplement.zip` 코드 스냅샷
> 권위 순서: **실행 코드 > 같은 ZIP의 기존 Markdown 문서 > 명시적으로 표시한 추론**
> 줄 번호: 첨부 파일의 1-based line number
> 범위: 계산 입력 구성, 효과 합성, 후보 재평가, 딜/장비점수 metric, 버퍼 점수, API·cache 계약, 예외·fallback·불변식

---

## 0. 문서 판독 규칙과 검증 범위

이 문서는 던전앤파이터 일반 상식이나 외부 계산 공식을 전제로 삼지 않는다. 수치의 단위, 합성 순서, fallback, 지원 범위는 이 분석 스냅샷의 실행 코드를 권위 근거로 기술한다.

표기 규칙은 다음과 같다.

- **[코드 확정]**: 제공된 코드에서 분기, 데이터 흐름, 수식 또는 상수를 직접 확인했다.
- **[조건부]**: 호출 경로는 확인했지만, 제공되지 않은 presenter·DB·실제 API fixture가 있어 최종 payload 또는 실제 발생 여부를 확정할 수 없다.
- **[추론]**: 코드가 직접 강제하지 않는 해석이다. 계산 규칙으로 사용하면 안 된다.
- **[문서 충돌]**: 기존 Markdown과 현재 코드가 다르며, 이 문서는 현재 코드를 우선한다.
- **[이전 finding 재판정]**: 최초 초안의 finding을 추가 의존 코드로 재검증한 결과다.

제공된 Python 파일은 `py_compile`, `enchantView.js`는 `node --check`로 정적 구문을 재검증했다. 다만 일부 import 대상인 `presenters/*`, `candidates/*`, `api_fanout_trace.py`, `ops_log.py`, `price_cache.py` 등과 실제 `Docs/` 데이터 파일 전체, 데이터베이스, HTTP fixture는 묶음에 없으므로 패키지 import를 포함한 종단 실행까지 통과했다는 뜻은 아니다.

외부 문서는 다음 두 사실만 교차 확인하는 데 사용했다.

1. 코드가 호출하는 캐릭터 상태, 장비·아바타·크리쳐·서약, 스킬 스타일, 버프강화 조회 API 계열이 Neople Open API에 존재한다. 공식 문서는 status가 최근 인게임 접속 기준으로 갱신되며 오차 또는 미제공 가능성이 있고, `skill/style`은 아이템·장비를 통한 스킬 강화를 제외한다고 명시한다.
   [외부 확인: Neople Developers — 던전앤파이터 API Docs](https://developers.neople.co.kr/contents/apiDocs/df)
2. `equipment_score_repository.py`가 조회하는 `df.nexon.com`은 공식 캐릭터검색 서비스이며, 웹사이트 반영에 시간이 걸릴 수 있다고 안내한다.
   [외부 확인: 던전앤파이터 공식 캐릭터검색](https://df.nexon.com/world/character)

외부 문서는 **계산식·계수·합성 규칙의 근거로 사용하지 않는다.** 해당 내용의 권위는 아래에 명시한 코드뿐이다.

### 0.1 종단 계산 경로

딜러 계산은 다음 경로를 따른다.

```text
Neople character payload
  -> character_repository.get_character_cached_payload
  -> character_equipment_service.build_damage_baseline_from_status_payload
  -> character_enchants_presenter / character_avatar_presenter 경계
  -> /api/character-enchants 또는 /api/character-loadout
  -> enchantView.js getDamageBaseline
  -> source별 base-relative change resolver
  -> estimateDamageMultiplier(actual | equipmentScore)
  -> 실제 딜 상승률 또는 공식 장비점수 anchor 기반 예상 장비점수
```

주요 근거:

- raw payload cache: `server/repositories/character_repository.py::get_character_cached_payload` L212-L234
- damage baseline: `character_equipment_service.py::build_damage_baseline_from_status_payload` L548-L598
- enchant 조립과 presenter 호출: `character_equipment_service.py::load_character_enchants` L1014-L1098
- loadout 조립: `character_equipment_service.py::load_character_loadout` L3168-L3269
- 프런트 계산: `enchantView.js::getDamageBaseline` L955-L980, `estimateDamageMultiplier` L1004-L1031, `getReplacementIncrementalDamagePercent` L6064-L6092

버퍼 계산은 다음 경로를 따른다.

```text
Neople status/current equipment/switching equipment/skill payload
  -> character_repository cache
  -> load_character_buffer_baseline
  -> get_buffer_switching_stat_delta + load_character_buffer_skill_levels
  -> build_buffer_enchant_skill_context_payload
  -> source별 change adapter
  -> resolveBufferNetChanges
  -> calculateBufferScore
  -> 내부 absolute score/delta
  -> 공식 buffScore가 있으면 표시 anchor에 내부 delta를 더함
```

주요 근거:

- buffer baseline: `character_equipment_service.py::load_character_buffer_baseline` L606-L655
- switching baseline: `character_equipment_service.py::get_buffer_switching_stat_delta` L4406-L4589
- 절대 스킬 레벨 context: `character_equipment_service.py::build_buffer_enchant_skill_context_payload` L1101-L1388
- 프런트 resolver와 공식: `enchantView.js::resolveBufferNetChanges` L1267-L1352, `calculateBufferScore` L2085-L2124

### 0.2 Neople HTTP·payload 계약

**[코드 확정]** `server/neople_client.py`의 공통 HTTP wrapper 계약은 다음과 같다.

| 항목 | 동작 | 근거 |
|---|---|---|
| API key | `NEOPLE_API_KEY` 환경변수가 비면 예외 | `require_api_key` L34-L37 |
| timeout/retry | 요청 timeout 30초, 최대 3회; 재시도 사이 1초 | 상수 L12-L14, `request_json` L55-L101 |
| 인증 전달 | 모든 공통 요청에 `apikey` HTTP header를 추가; 일부 URL builder는 query에도 `apikey`를 포함 | L44-L53, L104-L186 |
| 정상 root shape | JSON root가 `dict`가 아니면 `ValueError`로 보고 재시도 | L59-L63, L92-L98 |
| 점검 판별 | HTTP 503, `DNF980`, `SYSTEM_INSPECT`를 `NeopleMaintenanceError`로 즉시 변환 | L64-L86 |
| 일반 오류 | HTTP·network·timeout·JSON·shape 오류를 재시도하고 마지막에 `RuntimeError` | L87-L101 |
| 텍스트 정규화 | NBSP를 공백으로 바꾸고 whitespace를 하나로 합칠 뿐, 직업명 alias·`眞`·성별 suffix는 변환하지 않음 | `clean_text` L40-L41 |

endpoint helper가 보장하는 반환 shape도 서로 다르다.

- 경매·아이템 검색·multi item helper는 root의 `rows`를 list로 반환한다.
  근거: `server/neople_client.py` L104-L168.
- 스킬 상세, 스킬 스타일, 직업 스킬 목록, generic character resource는 `request_json`의 dict를 그대로 반환한다.
  근거: L171-L186, L244-L255.
- 캐릭터 검색은 `rows`, `characters`, `characterRows` 중 처음 발견된 list의 dict row만 반환한다.
  근거: `extract_row_list` L208-L213, `search_characters_from_api` L234-L241.
- generic character resource URL은 caller가 전달한 `path`를 사용한다. downstream parser는 resource마다 `status`, `equipment`, `avatar`, `creature`, `oath`, `skill` 등의 필드를 기대한다.
  근거: `fetch_character_payload_from_api` L248-L255 및 각 소비 함수.

공식 API 문서가 `skill/style`에서 장비 스킬 강화를 제외한다고 밝히는 것과 같은 계약을 코드도 전제로 한다. `avatar_skill_optimizer.get_character_avatar_skill_infos`는 style 레벨에 현재 장비·크리쳐·오라·아티팩트의 비아바타 보너스를 별도로 더한다.
근거: `server/avatar_skill_optimizer.py::get_current_non_avatar_skill_bonuses` L87-L123, `get_character_avatar_skill_infos` L420-L484.

### 0.3 repository cache와 single-flight

#### 캐릭터 raw payload cache

**[코드 확정]** `character_repository.get_character_cached_payload`은 다음 순서로 조회한다.

1. process memory cache: 15초 TTL
2. SQLite cache: 60초 TTL
3. Neople API fetch
4. memory와 SQLite에 저장

근거: `server/repositories/character_repository.py` L12-L20, L134-L234.

cache key는 `(lower(serverId), characterId, resource)`이고 `path`는 포함하지 않는다. 따라서 같은 `resource` 문자열은 항상 같은 endpoint path에 대응해야 한다는 숨은 불변식이 있다. stale 반환과 동일 키 single-flight는 구현되어 있지 않다.
근거: `_get_character_cache_key` L41-L46, `get_character_cached_payload` L212-L234.

#### 스킬 상세 cache/single-flight

**[코드 확정]** `skill_repository.get_skill_detail`은 `(clean_text(jobId), clean_text(skillId))`를 key로 쓰는 process-global cache와 동일 key single-flight를 구현한다.

```text
cache hit:
    deepcopy(cached) 반환

first miss(owner):
    in-flight Event 생성
    Neople skill detail fetch
    dict가 아니면 {}
    non-empty dict만 영구 cache
    결과 또는 예외를 waiter와 공유
    finally에서 in-flight 제거 후 Event set

concurrent same-key miss(waiter):
    Event.wait() 후 owner 결과 deepcopy 또는 동일 예외 재발생
```

근거: `server/repositories/skill_repository.py::get_skill_detail` L13-L57.

이 cache에는 TTL, size cap, invalidation이 없고 waiter의 `Event.wait()`에도 timeout이 없다. 빈 dict는 cache하지 않으므로 반복 fetch가 가능하다. 반면 반환·저장 시 `deepcopy`하여 caller의 변이가 공용 cache를 오염시키지 않게 한다.

#### 캐릭터 스킬 context cache

`item_skill_option_service.get_character_skill_context`는 `(lower(serverId), characterId)` key와 60초 TTL을 사용한다. lock은 hit 검사와 저장에만 걸리며 실제 build는 lock 밖에서 수행되므로 동일 캐릭터 동시 miss를 하나로 합치는 single-flight는 아니다. context 내부 `skillDetailById`는 요청 수명과 cache 수명 동안 lazy 채워진다.
근거: `item_skill_option_service.py` L8-L56, L69-L112.

### 0.4 presenter 경계와 본 문서의 확정 한계

추가 파일로 service와 route의 호출 경로는 확인됐다.

- `/api/enchant-cards`: `enchant_service.load_enchant_cards_with_prices`, 버퍼 role이면 `build_buffer_enchant_skill_context_payload`로 래핑
  근거: `neople_hell_api_server.py::handle_enchant_cards` L692-L716.
- `/api/character-enchants`: `character_equipment_service.load_character_enchants`
  근거: `neople_hell_api_server.py::handle_character_enchants` L718-L731.
- `/api/character-loadout`: `load_character_loadout` 결과를 response cache로 전달
  근거: `neople_hell_api_server.py::handle_character_loadout` L733-L761.
- character enchant/avatar 결과는 각각 `build_character_enchants_payload`, `build_character_avatar_payload` presenter를 마지막 단계에서 호출한다.
  근거: `character_equipment_service.py` imports L73-L81, `load_character_enchants` L1078-L1098, `load_character_avatar` L5652-L5681.

그러나 해당 presenter 구현 파일은 제공되지 않았다. 그러므로 **service가 presenter에 넘기는 값과 route 경로는 코드 확정**이지만, presenter가 최종 JSON에서 필드를 제거·개명·재배치하는지는 조건부다. 본 문서의 계산 공식은 presenter 이전 값과 프런트가 실제 소비하는 필드가 서로 일치하는 지점을 근거로 삼는다.

# Part I. 딜러 계산

## 1. 딜러 damage baseline 입력과 출처

### 1.1 baseline 생성 진입점

**[코드 확정]** `load_character_damage_baseline(server_id, character_id, equipment_base_element)`은 캐시된 `status` payload를 읽고 `build_damage_baseline_from_status_payload`에 전달한다.

- 상태 payload: `get_character_cached_payload(server_id, character_id, "status", "status")`
- 생성 함수: `build_damage_baseline_from_status_payload(payload, equipment_base_element)`
- 근거: `character_equipment_service.py` L548-L603.

`equipment_base_element`는 별도 장비 상세 조회로 계산된다. 칭호(`slotId == "TITLE"`)를 제외한 장비 item detail마다 아래 두 값을 비교하여 큰 값을 선택한 뒤, 장비 전체에서 합산한다.

1. `itemStatus`를 `normalize_enchant_status`로 정규화한 `elementAll`
2. `itemExplainDetail` 또는 `itemExplain`에서 정규식으로 찾은 `(?:모든)? 속성 강화 +N`의 최댓값

근거: `character_equipment_service.py::parse_element_bonus_from_text` L504-L509, `get_equipment_detail_base_element_bonus` L512-L517, `_get_equipment_base_element_bonus_debug` L520-L541.

### 1.2 필드별 정의

| baseline 필드 | 실제 생성 규칙 | 직접 출처 | 코드 근거 |
|---|---|---|---|
| `statName` | `힘 >= 지능`이면 `힘`, 아니면 `지능`. 동률이면 힘 | status의 `힘`, `지능` | `build_damage_baseline_from_status_payload` L552 |
| `stat` | 선택된 `statName`의 status 값 | status | L582-L585 |
| `baseStat` | `load_job_base_stats()[jobGrowName][statName]`를 숫자로 파싱 | 직업 기본 스탯 loader | L550-L552, L585 |
| `jobName` | payload `jobName` | status payload | L586 |
| `jobGrowName` | payload `jobGrowName` | status payload | L550, L587 |
| `attack` | `물리 공격`, `마법 공격`, `독립 공격` 중 최댓값 | status | L572-L576, L588 |
| `attackSource` | 최댓값과 같은 공격 유형. 동률 시 순차 덮어쓰기로 `independent > magical > physical` | status | L577-L581, L589 |
| `elementValues` | 화/수/명/암 status 속강 각각에 `equipmentBaseElement`를 동일하게 더한 맵 | status + 장비 상세 | L553-L562, L593 |
| `elementNames` | **장비 보정 전** 4속성 중 최댓값과 같은 양수 속성들의 배열 | status | L563-L565, L592 |
| `elementName` | `elementNames[0]`, 없으면 빈 문자열 | 위 배열 | L591 |
| `element` | 장비 보정 전 4속성 최댓값 + `equipmentBaseElement` | status + 장비 상세 | L563-L565, L590 |
| `elementDamage` | status 이름에 `속성 피해`가 포함된 값들의 최댓값. 그 값이 truthy일 때만 `equipmentBaseElement * 0.45`를 추가 | status + 장비 상세 | L566-L571, L594 |
| `equipmentBaseElement` | 비칭호 장비별 기본 속강 최댓값의 합 | 장비 item detail | L520-L545, L595 |
| `attackIncrease` | status `공격력 증가` | status | L596 |
| `attackAmplification` | status `공격력 증폭` | status | L597 |
| `finalDamage` | **서버 baseline에서 생성하지 않음** | 없음 | 반환 객체 L582-L598에 필드 없음 |

### 1.3 status 행 정규화의 중요한 성질

**[코드 확정]** `status_rows_to_map`은 dict comprehension이다. 동일 이름의 status 행이 여러 개면 합산이나 최댓값이 아니라 **마지막 행이 앞 행을 덮어쓴다**.

근거: `character_equipment_service.py::status_rows_to_map` L496-L501.

이는 아이템 옵션을 정규화하는 `normalize_enchant_status`가 같은 키에 대해 `max`를 사용하는 것과 다르다. 후자는 최종 데미지, 공격력 증가/증폭, 버프력, 속강, 공격력, 주스탯 등을 같은 이름 범주별 최댓값으로 축약한다.

근거: `effects.py::normalize_enchant_status` L28-L72.

### 1.4 장비 속강 보정과 속성 피해의 관계

`equipmentBaseElement`는 네 속성의 `elementValues`와 최종 `element`에 항상 더해진다. 그러나 `elementDamage`에는 아래 조건식이 적용된다.

```text
statusElementDamage가 0 또는 누락이면:
    elementDamage = 0
그 외:
    elementDamage = statusElementDamage + equipmentBaseElement * 0.45
```

근거: `character_equipment_service.py` L566-L571.

프런트의 `getDamageBaseline`은 `baseline.elementDamage`가 `Number.isFinite`이면 0도 유효값으로 인정한다. 따라서 서버가 0을 보낸 경우 프런트 fallback인 `5 + element * 0.45`를 사용하지 않는다.

근거: `enchantView.js::getDamageBaseline` L972-L974.

이 동작은 코드로 확정되며, 의도한 정책인지는 첨부물만으로 확정할 수 없다. 코드 리뷰 finding에서 별도로 다룬다.

### 1.5 직업 기본 스탯의 실제 loader와 직업명 key 계약

**[코드 확정]** `baseStat`의 저장소 경로와 lookup은 다음과 같다.

1. `server/data_store.py`는 저장소 root 아래 `Docs/jobBaseStat.json`을 `JOB_BASE_STAT_PATH`로 선언한다.
   근거: `server/data_store.py` L4, L16.
2. `load_job_base_stats()`는 첫 호출에 `json.load`한 객체를 process-global `_JOB_BASE_STAT_CACHE`에 그대로 저장한다. `FileNotFoundError`만 `{}`로 바꾸며 alias 추가, key 정규화, deep copy는 없다.
   근거: `server/data_store.py::load_job_base_stats` L96-L104.
3. `build_damage_baseline_from_status_payload`는 payload의 `jobGrowName`에 `clean_text`만 적용한 뒤 정확히 `dict.get(job_grow_name)`으로 조회한다.
   근거: `character_equipment_service.py` L548-L552, L585.
4. `clean_text`는 NBSP/whitespace만 정리하므로 `眞`, 괄호, `(남)`/`(여)` suffix를 바꾸지 않는다.
   근거: `server/neople_client.py::clean_text` L40-L41.

따라서 `jobBaseStat`의 key와 Neople payload `jobGrowName`은 **문자열 완전 일치 계약**이다.

#### 크루세이더 key 불일치

제공된 `jobBaseStat.json`에는 다음 key가 있다.

```text
眞 크루세이더(남)
眞 크루세이더(여)
```

근거: `jobBaseStat.json` L36, L42.

반면 지원 버퍼 판별과 남크루 딜러 스타일 판별이 사용하는 실제 tuple은 다음과 같다.

```text
("프리스트(남)", "眞 크루세이더")
("프리스트(여)", "眞 크루세이더")
```

근거: `character_equipment_service.py::load_character_buffer_baseline` L615-L623.

`data_store.py`에는 이를 보정하는 정규화가 없으므로, payload가 위 버퍼 판별과 같은 `jobGrowName == "眞 크루세이더"`를 제공할 때 딜러 baseline의 `load_job_base_stats().get(job_grow_name)`는 빈 dict가 된다. `baseStat`은 `parse_percent_or_number(None)`의 결과인 0으로 만들어지고, 프런트 `getDamageBaseline`은 `Number(baseStat) || 800` 때문에 이를 800으로 치환한다.
근거: `character_equipment_service.py` L550-L552, L585; `enchantView.js::getDamageBaseline` L955-L980.

**영향 범위:** `calculateBufferScore`는 `baseStat`을 사용하지 않으므로 버퍼 점수 공식 자체에는 직접 영향이 없다. 영향은 크루세이더를 딜러 damage baseline으로 평가하는 경로, 특히 남크루 딜러 스타일처럼 buffer baseline이 `None`인 경우의 주스탯 전후비와 equipmentScore metric이다.

**[이전 finding 재판정]** 최초 초안 H3은 “loader 정규화 여부에 따른 조건부”였으나, 추가 파일로 **key 불일치는 코드 확정**됐다. 다만 버퍼 공식 전체를 오염시키는 High가 아니라 딜러 baseline 일부 직업에 한정되므로 심각도는 **Medium으로 하향**한다.

### 1.6 loadout 조립 단계의 주스탯 재선택과 보존되는 수치 invariant

`load_character_loadout`은 비버퍼 딜러에서 아바타 분석의 `primaryStatName`이 힘/지능이면 `damageBaseline.statName`과 `baseStat`을 다시 쓴다. `stat` 필드를 다시 읽지는 않는다.
근거: `character_equipment_service.py::load_character_loadout` L3227-L3233.

초안에서는 이 구조만 보고 `stat`과 `baseStat`의 축이 달라질 수 있다고 판단했으나, 실제 selector 구현을 포함해 보면 현재 코드에서는 다음 invariant가 성립한다.

1. 최초 baseline은 `힘 >= 지능`이면 힘, 아니면 지능을 선택한다.
   근거: `build_damage_baseline_from_status_payload` L552, L582-L585.
2. `resolve_avatar_primary_stat_name`은 status의 힘과 지능이 다르면 동일하게 큰 쪽을 즉시 반환한다.
   근거: `character_equipment_service.py` L3338-L3343.
3. 아바타 엠블렘·옵션·가격·직업 기본 스탯 fallback으로 다른 이름을 고를 수 있는 것은 **힘과 지능이 같은 경우뿐**이다.
   근거: L3345-L3366.
4. 동률이면 `status[힘] == status[지능]`이므로, 이름이 바뀌어도 기존 `damageBaseline.stat`의 수치가 새 이름의 status 수치와 같다.

즉 현재 selector에 한해 다음이 보존된다.

```math
statName_{loadout} \ne statName_{baseline}
\Rightarrow Status(힘)=Status(지능)=damageBaseline.stat
```

따라서 `stat`을 다시 쓰지 않는 것은 구조적으로 취약하지만 **현재 구현에서 수치 축 불일치를 만들지는 않는다.**

**[이전 finding 재판정]** 최초 초안 H1은 **기각**하며 active finding에서 제거한다. 다만 이후 selector가 status 비동률에서도 다른 축을 고를 수 있게 바뀌면 즉시 성립하므로, 다음 불변식은 테스트로 보존해야 한다.

```text
avatar primaryStatName이 initial statName과 다르면
status[힘] == status[지능]이어야 하며
baseline.stat은 두 값과 같아야 한다.
```

보다 방어적인 구현은 `statName`을 다시 쓸 때 status map에서 `stat`도 함께 다시 쓰는 것이다.

## 2. 딜러 최종 데미지 배율 공식

### 2.1 프런트 baseline 정규화

`estimateDamageMultiplier`는 먼저 `getDamageBaseline`을 호출한다.

**[코드 확정]** 다음 값은 0, 빈 문자열, `NaN` 등 falsy 값이면 하드코딩 기본값으로 대체된다.

| 필드 | fallback |
|---|---:|
| `stat` | 6500 |
| `baseStat` | 800 |
| `element` | 330 |
| `attack` | 4000 |
| `attackIncrease` | 0 |
| `attackAmplification` | 0 |

추가 상수는 다음과 같다.

```text
REGION_STAT_FLAT_A = 168350
REGION_STAT_FLAT_B = 297900
REGION_STAT_SCALE  = 3.08
REGION_STAT_OFFSET = 2886
REGION_ATTACK_FLAT = 31215
ELEMENT_DAMAGE_PER_ELEMENT = 0.45
ELEMENT_BASE_DAMAGE_PERCENT = 5
```

근거: `enchantView.js` L313-L327, `getDamageBaseline` L955-L980.

`statName`은 정확히 `지능`일 때만 지능이고 나머지는 힘으로 정규화된다. `finalDamage`는 누락 시 0이다. `elementDamage`는 유한한 숫자라면 0도 그대로 쓰고, 누락 또는 `NaN`일 때만 `5 + element * 0.45`를 사용한다.

근거: `enchantView.js` L964-L979.

### 2.2 변수 정의

아래 기호를 사용한다.

| 기호 | 코드 필드 |
|---|---|
| `F` | baseline `finalDamage` (%p) |
| `AI` | baseline `attackIncrease` (%p) |
| `AA` | baseline `attackAmplification` (%p) |
| `ED` | baseline `elementDamage` (%p) |
| `ATK` | baseline `attack` |
| `S` | baseline `stat` |
| `B` | baseline `baseStat` |
| `ΔF`, `ΔAI`, `ΔAA`, `ΔE`, `ΔATK`, `ΔS` | 후보 effect의 각 변화량 |
| `Mskill` | `skillDamageMultiplier`; 양의 유한값이 아니면 1 |

주스탯 변화 `ΔS`는 `getSelectedStatEffect`가 결정한다.

```text
효과 객체에 finite allStat이 있으면 allStat 사용
그 외 baseline.statName == 지능이면 int
그 외 str
```

`allStat: 0`도 finite이므로 `str`/`int`보다 우선한다.

근거: `enchantView.js::getSelectedStatEffect` L990-L997.

### 2.3 각 항목의 전후비

#### 2.3.1 최종 데미지

```math
R_F = \frac{1 + (F + \Delta F)/100}{1 + F/100}
```

근거: `enchantView.js::estimateDamageMultiplier` L1007-L1009.

#### 2.3.2 공격력 증가

```math
R_{AI} = \frac{1 + (AI + \Delta AI)/100}{1 + AI/100}
```

근거: L1010-L1012.

#### 2.3.3 공격력 증폭

```math
R_{AA} = \frac{1 + (AA + \Delta AA)/100}{1 + AA/100}
```

근거: L1013-L1015.

#### 2.3.4 속성 강화와 속성 피해

일반 effect 경로에서는 `elementAll` 1당 `elementDamage` 0.45%p로 환산한다.

```math
ED' = ED + 0.45 \times \Delta E
```

```math
R_E = \frac{1 + ED'/100}{1 + ED/100}
```

근거: L1016-L1020, 상수 L326-L327.

여기서 `baseline.element` 자체가 직접 배율식에 들어가는 것이 아니라, 이미 만들어진 `baseline.elementDamage`가 분모·분자 기준이다. `element`는 `elementDamage` fallback과 속성별 정렬/교체 보정에 사용된다.

#### 2.3.5 공격력

```math
R_{ATK} = \frac{ATK + 31215 + \Delta ATK}{ATK + 31215}
```

근거: L1021-L1022.

#### 2.3.6 힘·지능

유효 스탯 함수는 다음과 같다.

```math
E(S,B) = S + 168350 + 297900 + \operatorname{trunc}(3.08(S-B)+2886)
```

```math
R_S = \frac{1 + E(S+\Delta S,B)/250}{1 + E(S,B)/250}
```

근거: `enchantView.js::getEquipmentScoreEffectiveStat` L983-L988, `estimateDamageMultiplier` L1023-L1026.

`Math.trunc`는 0 방향 절삭이다. 현재 정상 입력은 대체로 양수일 것으로 보이지만, 음수 테스트에서는 `floor`와 결과가 다르다.

#### 2.3.7 스킬별 multiplier

프런트의 최종 합성 규칙은 단순하다.

```math
R_{skill} =
\begin{cases}
M_{skill}, & M_{skill}\text{가 유한하고 }M_{skill}>0 \\
1, & \text{그 외}
\end{cases}
```

근거: `enchantView.js::estimateDamageMultiplier` L1027-L1030.

`Mskill`을 만드는 실제 서버 구현은 source에 따라 다르다.

##### A. 아바타 상의 옵션·플래티넘 조합

스킬 상세의 레벨별 누적 스킬 공격력 값을 `A(L)`이라 두면, `addedLevel = d`의 배율은 다음과 같다.

```math
M_{skill}(L,d)=\frac{1+A(L+d)/100}{1+A(L)/100}
```

```math
SkillIncrease(\%)=(M_{skill}-1)\times100
```

근거: `avatar_skill_calculator.py::get_skill_attack_ratio` L147-L163. 실제 optimizer는 `.calculators.avatar_skill_calculator.get_skill_attack_ratio`를 import한다.
근거: `server/avatar_skill_optimizer.py` L6-L10.

`A(L)` 추출은 다음 순서다.

1. `skill_detail.levelInfo`가 dict인지 확인한다.
2. `rows`, `option`, `levels` 중 list인 container를 순회한다.
3. 요청 레벨이 row 최대 레벨보다 크면 최대 레벨로 clamp한다. 최소 레벨 미만에 대한 대칭 clamp는 없다.
4. 해당 레벨 row 내부의 모든 문자열에서 정규식으로 “스킬 공격력 … % 증가” 값을 찾는다.
5. 찾지 못하면 `optionDesc`의 placeholder key와 row `optionValue`를 사용한다.
6. 어느 경로에서도 찾지 못하면 `None`이고, ratio는 `calculable: false`다.

근거: `avatar_skill_calculator.py::get_level_attack_percent` L81-L128, `get_skill_attack_ratio` L147-L163.

현재 레벨 `L`은 단순 `skill/style` 레벨이 아니다.

```math
L =
\begin{cases}
OverrideLevel, & \text{양의 override가 있으면} \\
StyleLevel + NonAvatarSetupBonus, & \text{그 외}
\end{cases}
```

`NonAvatarSetupBonus`에는 현재 장비, 크리쳐, 오라, 크리쳐 아티팩트의 item detail `itemReinforceSkill`, 장착 row enchant `reinforceSkill`, item detail `itemBuff.reinforceSkill`이 포함된다. 아바타 자체는 combo의 `addedLevel`로 별도 처리된다.
근거: `server/avatar_skill_optimizer.py::get_current_non_avatar_skill_bonuses` L87-L123, `get_character_avatar_skill_infos` L420-L484.

combo 합성 규칙은 다음과 같다.

- 상의 옵션과 각 플래티넘 슬롯은 해당 스킬에 각각 `+1`로 센다.
- 같은 스킬이 여러 슬롯에 있으면 먼저 `addedLevel`을 합산하고 **한 번의 누적 전후비**를 계산한다.
- 서로 다른 스킬의 ratio는 곱한다.
- 어느 스킬 하나라도 계산 불가면 combo 전체가 `calculable: false`다.

```math
M_{avatarCombo}=\prod_{s\in Skills}
\frac{1+A_s(L_s+d_s)/100}{1+A_s(L_s)/100}
```

근거: `server/avatar_skill_optimizer.py::evaluate_avatar_combo` L328-L367.

추천 정렬은 계산 가능 여부, 딜 증가율 내림차순, 변경 개수, 슬롯 변경 개수, 스킬명 순이다. `prefer_current_top`이면 현재 상의 옵션을 유지하는 계산 가능 후보가 존재할 때 그 pool에서 고른다.
근거: `select_best_avatar_combo_for_character` L495-L556.

##### B. 아이템 `itemReinforceSkill`

`item_skill_option_service.get_item_reinforce_skill_effect`도 같은 `get_skill_attack_ratio`를 사용하지만, 여러 matching 스킬의 ratio를 곱하지 않는다. 계산 가능한 후보 중 `skillDamageMultiplier`가 가장 큰 **한 스킬만** 반환한다.

```math
M_{itemReinforceSkill}=\max_{s\in MatchingSkills} M_s
```

후보가 없거나 모두 계산 불가면 `skillDamageMultiplier = 1`이다.
근거: `item_skill_option_service.py::get_item_reinforce_skill_effect` L59-L112.

따라서 “아바타 combo의 복수 스킬 곱”과 “일반 item reinforce skill의 최대 한 개 선택”을 같은 합성 규칙으로 바꾸면 현재 동작과 달라진다.

### 2.4 최종 합성식

```math
M_{damage}
= R_F
\times R_{AI}
\times R_{AA}
\times R_E
\times R_{ATK}
\times R_S
\times R_{skill}
```

```math
DamageIncrease(\%) = (M_{damage}-1)\times 100
```

근거: `enchantView.js::estimateDamageMultiplier` L1031, `estimateDamagePercent` L999-L1002.

`estimateDamagePercent`는 구현상 `estimateDamageMultiplier(effects) / estimateDamageMultiplier({}) - 1`을 사용한다. 정상 baseline에서는 빈 effect 배율이 1이다.

### 2.5 숫자 예시

다음 값은 코드 구조를 보이기 위한 가상 입력이며 실제 캐릭터 보정값을 주장하지 않는다.

```text
baseline:
  finalDamage = 20
  attackIncrease = 100
  attackAmplification = 10
  elementDamage = 153.5
  attack = 4000
  stat = 6500
  baseStat = 800

candidate effects:
  finalDamage = +5
  attackIncrease = +10
  attackAmplification = +2
  elementAll = +20
  attack = +100
  selected stat = +50
  skillDamageMultiplier = 1.03
```

계산 결과:

```text
최종 데미지 비율       = 1.0416666667
공격력 증가 비율       = 1.0500000000
공격력 증폭 비율       = 1.0181818182
속성 피해 비율         = 1.0355029586
공격력 비율            = 1.0028396990
유효 스탯: 493192 -> 493396
스탯 비율              = 1.0004134224
스킬 multiplier        = 1.0300000000

총 multiplier          = 1.1916343129
딜 상승률              = 19.1634312919%
```

---

## 3. additive, multiplicative, replacement의 경계

### 3.1 additive effect map

`addEffects`는 같은 키를 숫자로 더한다. 이 단계에서 `attackIncrease`, `attackAmplification`, `attack`, `elementAll`, 주스탯 등은 effect map 안에서 additive이다.

```text
result[key] = result[key] + value
```

근거: `enchantView.js::addEffects` L3054-L3062.

차이는 `subtractEffects(next, current)`로 만든다. 절댓값이 `1e-6` 이하이면 결과에서 제거한다.

근거: `enchantView.js::subtractEffects` L3190-L3200; Python 동형 함수 `effects.py::subtract_effects` L148-L154.

### 3.2 category 간 multiplicative 합성

additive로 모은 각 범주의 총 변화는 2장의 전후비로 변환되고, 범주 사이에서는 곱한다. 따라서 `최종 데미지 +5`, `공격력 증가 +10`, `속강 +20`을 하나의 퍼센트 합으로 더하면 코드와 달라진다.

스킬 효과는 effect map에서 `skillDamageMultiplier`라는 **배율**로 전달되며, 퍼센트 포인트로 더하지 않는다.

근거: `enchantView.js` L1027-L1031.

### 3.3 base-relative replacement

아이템·슬롯 교체는 현재 소스의 옵션을 단순히 음수 delta로 넣는 것보다 강한 규칙을 사용한다.

#### 최종 데미지 교체

```math
R_{replace,FD}
= \frac{1+FD_{target}/100}{1+FD_{current}/100}
```

근거: `enchantView.js::getFinalDamageReplacementMultiplier` L3211-L3216.

예를 들어 현재 소스가 최종 데미지 10%, 후보가 20%이면:

```text
1.20 / 1.10 = 1.090909...  => +9.0909%
```

`+10%p`를 baseline의 최종 데미지 총합에 무조건 더하는 것과는 다르다.

#### 공격력 증가·증폭 교체

`getReplacementIncrementalDamagePercent`는 baseline 총합에서 현재 소스 몫을 제거해 소스 외부 기반값을 만든다.

```text
baseAttackIncrease = max(0, baseline.attackIncrease - current.attackIncrease)
baseAttackAmp      = max(0, baseline.attackAmplification - current.attackAmplification)
```

그 뒤 `외부 기반 + 현재 소스`와 `외부 기반 + 후보 소스`의 전후비를 구한다.

근거: `enchantView.js` L6069-L6076.

#### 공격력·주스탯 교체

공격력은 `baseline.attack - current.attack`, 주스탯은 `baseline.stat - currentSelectedStat`으로 소스 외부 기반을 복원한 뒤 후보를 대입한다.

근거: `enchantView.js` L6078-L6087.

공격력 증가·증폭과 달리 공격력·주스탯 기반 복원에는 `max(0, ...)`가 없다.

#### 스킬 multiplier 교체

```math
R_{replace,skill} = \frac{M_{target}}{M_{current}}
```

근거: `enchantView.js` L6088-L6090.

### 3.4 누적 시뮬레이터에서 최종 데미지를 additive delta에서 제거하는 이유

`buildSimulatedDamageBaseline`과 `getSimulatorCumulativeDamageMultiplier`는 여러 소스의 additive 변화량을 `simulated total - base total`로 만든 뒤 `delete effectDelta.finalDamage`를 수행한다.

근거: `enchantView.js` L3361-L3405, L3446-L3492.

최종 데미지는 그 후 소스별 replacement multiplier로 별도 곱한다.

- 마법부여 슬롯별: `getEnchantFinalDamageChangeMultiplier`
- 오라, 크리쳐: `getFinalDamageReplacementMultiplier`
- 크리쳐 아티팩트: `getCreatureArtifactReplacementMultiplier`
- 장비 body/강화·증폭: 전용 final damage change 함수
- 장비 조율, 서약 결정·조율: 전용 multiplier

근거: `enchantView.js::getSimulatorCumulativeDamageMultiplier` L3493-L3534.

이 분리는 같은 범주의 source-local 최종 데미지를 전역 additive 값으로 오인하거나 중복 계산하지 않기 위한 현재 구현의 핵심 불변식이다.

### 3.5 속성별 교체의 특별 처리

일반 `normalize_enchant_status`는 단일 속성 강화도 `elementAll`로 정규화한다.

근거: `effects.py` L47-L50.

그러나 칭호 마법부여와 크리쳐 아티팩트는 별도의 속성 identity를 보존한다.

- 칭호: `get_title_enchant_status_summary`가 `fire/water/light/dark/all`을 기록한다.
  근거: `effects.py` L75-L100.
- 아티팩트: 전체 속강, 단일 속강, 공격 속성을 별도 필드로 기록한다.
  근거: `effects.py` L103-L145.

후보 교체 시 `getAdjustedElementBaselineForRecommendation`은 현재 4속성 값에 소스별 delta를 적용해 새 최댓값을 구하고, **최대 속강의 변화량**만 `0.45`로 `elementDamage`에 반영한다.

```math
ED' = ED + (max(E_{next}) - max(E_{current}))\times 0.45
```

근거: `enchantView.js` L6250-L6277.

칭호가 선호 속성과 맞지 않으면 해당 칭호 마법부여 속강을 유효 effect에서 제거한다.

근거: `enchantView.js::getTitleEffectiveEffects` L6173-L6186.

---

## 4. 현재 상태 대비 후보 재평가

### 4.1 기본 원칙

추천 후보는 항상 최초 baseline만 기준으로 평가되지 않는다. 시뮬레이터에 이미 선택된 변경이 있으면 다음 두 상태를 다시 계산한다.

```text
reference state:
  현재 활성 변경을 모두 유지
  단, 후보와 같은 배타 슬롯/소스의 변경만 원래 base로 되돌림

candidate state:
  reference state에 후보 변경을 삽입

후보 증분 = candidate state - reference state
```

이 방식은 동일 슬롯 교체의 중복 반영을 막고, 다른 활성 변경과의 상호작용을 반영한다.

### 4.2 딜러 경로

`getDealerSimulatorRecommendationContext`는 소스별 reference baseline을 만든다.

- 마법부여: 해당 슬롯의 simulated enchant를 제거하고 base enchant를 복구
  근거: `enchantView.js` L7422-L7457.
- 오라: simulated aura 대신 base aura
  근거: L7458-L7478.
- 크리쳐: simulated creature 대신 base creature
  근거: L7479-L7499.
- 칭호: simulated title 대신 base title
  근거: L7500-L7520.
- 강화·증폭, 흑아, 아바타 소켓, 아티팩트 등도 동일 슬롯/타입을 base로 되돌린 reference를 별도로 만든다.
  근거: L7521-L7700.

각 추천 row는 이 reference baseline과 reference current item을 받아 replacement 또는 additive 계산을 한다.

근거: `enchantView.js::getRepresentativeRecommendationRows` L6653-L6902, 특히 L6677-L6692 및 L6805-L6824.

### 4.3 버퍼 경로

버퍼는 소스별 map을 복사한 뒤 후보의 동일 배타 키를 삭제한다.

- enchant slot, artifact type, upgrade slot
- equipment tune, oath tune, oath acquisition
- black fang slot
- creature, aura, title
- switching creature/title/avatar/platinum
- avatar emblem socket prefix, avatar platinum slot

근거: `enchantView.js::getBufferRecommendationRows` L2397-L2488.

그 후 reference map과 candidate map을 각각 `resolveBufferNetChanges`와 `calculateBufferScore`로 계산한다.

근거: `enchantView.js` L2489-L2626.

resolver가 실패하면 `bufferSimulatorSupported = false`로 바꾸고 초기 단일 후보 계산으로 fallback한다.

근거: L2627-L2631.

### 4.4 반드시 보존할 성질

동일한 최종 선택 집합은 적용 순서와 무관하게 같은 결과가 나와야 한다. 이를 위해 다음을 함께 보존해야 한다.

1. 변화량은 **original base → target** 기준으로 저장한다.
2. 배타 슬롯·소스에는 활성 entry가 하나만 존재한다.
3. 후보 비교 전에 같은 entry만 reference에서 제거한다.
4. 다른 활성 entry는 그대로 둔 채 후보를 재평가한다.
5. final damage와 skill multiplier의 source-local replacement를 additive delta와 섞지 않는다.

---

## 5. 중간·최종 반올림 정책

### 5.1 계산 내부

- `estimateDamageMultiplier`는 범주별 전후비와 최종 곱에 반올림을 하지 않는다.
  근거: `enchantView.js` L1004-L1031.
- `calculateBufferScore`도 중간값과 반환값을 반올림하지 않는다.
  근거: L2085-L2124.
- 주스탯 유효값의 지역 항만 `Math.trunc`를 사용한다.
  근거: L983-L988.
- 장비 조율 stage는 `Math.floor((point-2550)/70)`이다.
  근거: L3858-L3862.
- 서약 blessing step은 Python `// stepPoint` 후 `int`이다.
  근거: `oath_tune_calculator.py` L20-L28.
- effect 차이는 `1e-6` 이하를 버린다.
  근거: `enchantView.js` L3190-L3200.

### 5.2 추천 필터와 표시

- 딜러/버퍼 단일 후보 이득이 `<= 0.0001`이면 추천에서 제외한다.
  근거: `enchantView.js` L6824, L2393-L2394.
- 일반 퍼센트 formatter는 기본 소수점 3자리 `toFixed(3)`이다.
  근거: L950-L953.
- 딜러 누적 딜 상승률은 절댓값이 `0.005%` 미만이면 0으로 만든 뒤 소수점 2자리 표시한다.
  근거: L11685-L11691.
- 예상 장비점수는 `Math.round(baseScore * equipmentScoreMultiplier)`이다.
  근거: L3795-L3800.
- 버프점수 base/current 표시는 `Math.round`한다. 내부 delta의 절댓값이 0.5 미만이면 UI에 `변동 없음`으로 표시한다.
  근거: L11583-L11610, L11633-L11638.

따라서 테스트는 내부 floating 결과, 추천 포함 임계값, UI 표시값을 서로 다른 assertion으로 검증해야 한다.

---

## 6. 실제 딜 metric과 예상 장비점수 metric

### 6.1 두 metric의 공통점과 차이

두 metric 모두 `getSimulatorCumulativeDamageMultiplier(simulator, mode)`를 사용하지만 `mode`에 따라 일부 입력을 다르게 해석한다.

근거: `enchantView.js` L3429-L3580, UI 호출 L11671-L11673.

#### 실제 딜 (`mode = "actual"`)

- 일반 아바타 엠블렘의 실제 parsed effects를 합산한다.
  근거: `getAvatarRegularEmblemEffectsTotal` L2975-L2993.
- 플래티넘 엠블렘은 실제 스킬별 `skillDamageMultiplier`들의 곱을 사용한다.
  근거: `getAvatarPlatinumDamageMultiplier` L1513-L1517.
- 버프강화 metric은 현재/레벨당 계수와 짙은 편린 보정 계수의 곱, `damageApplicationRatio`를 사용한다.
  근거: `getBuffActualDamageMultiplier` L3638-L3673.

#### 예상 장비점수 (`mode = "equipmentScore"`)

- 일반 엠블렘을 실제 옵션이 아니라 슬롯 그룹·등급별 인정 스탯으로 바꾼다.
  근거: 상수 L203-L208, `getAvatarRegularEmblemEffectsTotal` L2981-L2989.
- base 아바타의 실제 스탯과 인정 스탯 차이를 baseline.stat에 먼저 반영한다.
  근거: `getAvatarEmblemMetricBaseline` L2996-L3010.
- 플래티넘 관련 인정 레벨 `L`을 `1.20 + 0.02 × max(L,0)` 계수로 바꾸고 target/current 비율을 사용한다.
  근거: `resolveDealerAvatarSkillCoefficient` L1520-L1523, `getDealerAvatarPlatinumEquipmentScoreMultiplier` L1557-L1575.
- 버프강화 인정 계수는 다음 식이다.

```math
C_{buffScore} = 100 - (20-L)\times 2 + D\times 0.25
```

`L`은 0~20으로 clamp된 유효 레벨이고, `D`는 0~12로 clamp된 짙은 편린 개수다.

근거: `getBuffEnhancementState` L3621-L3630, `getBuffEquipmentScoreCoefficient` L3633-L3635.

### 6.2 엠블렘 인정 스탯

| 슬롯 그룹 | 빛나는 | 화려한 | 찬란한 |
|---|---:|---:|---:|
| red: `HEADGEAR`, `HAIR`, `WEAPON`, `AURORA`, `SKIN` | 10 | 17 | 25 |
| greenYellow: `FACE`, `BREAST`, `JACKET`, `PANTS` | 0 | 10 | 15 |

근거: `enchantView.js` L203-L208.

### 6.3 출력 경계

딜러 UI는 두 값을 별도로 계산한다.

```text
actualMultiplier         = getSimulatorCumulativeDamageMultiplier(..., "actual")
equipmentScoreMultiplier = getSimulatorCumulativeDamageMultiplier(..., "equipmentScore")

딜 상승률       = (actualMultiplier - 1) * 100
예상 장비점수   = round(공식 현재 장비점수 * equipmentScoreMultiplier)
```

근거: `enchantView.js::renderDealerSimulatorMeta` L11653-L11730, `getSimulatedEquipmentScore` L3795-L3800.

### 6.4 섞이면 안 되는 불변 경계

- `equipmentScoreMultiplier`를 실제 딜 상승률로 표시하면 안 된다.
- `actualMultiplier`를 공식 장비점수에 곱하면 안 된다.
- 실제 엠블렘 effect와 인정 스탯을 한 baseline에 동시에 더하면 안 된다.
- 실제 플래티넘 스킬 ratio와 인정 레벨 계수를 동시에 곱하면 안 된다.
- 버프강화의 실제 계수 곱과 장비점수 인정 계수 비율을 동시에 적용하면 안 된다.

두 metric은 소스 상태를 공유할 수 있지만, metric-specific baseline과 multiplier는 별도 호출로 끝까지 유지해야 한다.


---

# Part II. 버퍼 계산

## 7. 버퍼 baseline 입력과 필드 출처

### 7.1 지원 직업과 baseline 생성 조건

`load_character_buffer_baseline`은 `status` payload의 `(jobName, jobGrowName)` 조합을 다음 `bufferKey`로 매핑한다.

| 직업 | `(jobName, jobGrowName)` | `bufferKey` | 적용 스탯 `statName` |
|---|---|---|---|
| 남크루 | `("프리스트(남)", "眞 크루세이더")` | `maleCrusader` | 체력과 정신력 중 큰 값. 동률이면 체력 |
| 여크루 | `("프리스트(여)", "眞 크루세이더")` | `femaleCrusader` | 지능 |
| 인챈트리스 | `("마법사(여)", "眞 인챈트리스")` | `enchantress` | 지능 |
| 뮤즈 | `("아처", "眞 뮤즈")` | `muse` | 정신력 |
| 패러메딕 | `("거너(여)", "眞 패러메딕")` | `paramedic` | 정신력 |

근거: `character_equipment_service.py::load_character_buffer_baseline` L606-L655, 특히 L617-L633.

**[코드 확정]** 다음 경우에는 buffer baseline을 만들지 않는다.

1. 위 5개 조합에 포함되지 않으면 `None`을 반환한다.
   근거: `character_equipment_service.py` L617-L625.
2. 남크루이면서 `skill/style`에 `성령의 메이스`가 1레벨 이상이면 딜러 스타일로 판정해 `None`을 반환한다.
   근거: `character_equipment_service.py::is_male_crusader_dealer_style` L658-L664, 호출 L615-L616.
3. 프런트 `calculateBufferScore`에서 `baseline.bufferKey`에 해당하는 `BUFFER_SCORE_CONFIG`가 없으면 0을 반환한다.
   근거: `enchantView.js::calculateBufferScore` L2085-L2087.

### 7.2 baseline 필드 정의

| baseline 필드 | 생성 규칙 | 원천/중간 함수 | 코드 근거 |
|---|---|---|---|
| `isBuffer` | 항상 `true` | 서버 조립값 | `character_equipment_service.py` L644-L655 |
| `bufferKey` | 7.1의 직업 매핑 | `jobName`, `jobGrowName` | L617-L646 |
| `jobName`, `jobGrowName` | status payload의 직업명 | `status` payload | L611-L614, L647-L648 |
| `statName` | 직업별 규칙. 남크루만 체력/정신력 최댓값 선택 | status | L627-L633 |
| `stat` | status의 `statName` 값 | status | L650 |
| `buffPower` | status의 `버프력` | status | L651 |
| `buffAmplification` | status의 `버프력 증폭` | status | L652 |
| `switchingStatDelta` | 스위칭 세팅과 현재 세팅의 직접 스탯 차이 + 관련 스킬값 차이 | 장비·아바타·크리쳐·스킬 상세 | `get_buffer_switching_stat_delta` L4453-L4489, 반환 L4570-L4576 |
| `switchingDirectStatDelta` | 스위칭/현재 row의 직접 스탯 합 차이 | `get_row_direct_stat` | L4453-L4456, L4573 |
| `switchingSkillStatDelta` | 관련 스킬들의 스위칭 절대 레벨값 − 현재 절대 레벨값 합 | 스킬 상세 | L4471-L4489, L4574 |
| `switchingSkillStatDeltas` | 위 값을 스킬명별로 보관한 map | 스킬 상세 | L4472-L4489, L4575 |
| `switchingBuffAmplificationDelta` | 스위칭 row 버프력 증폭 합 − 현재 row 합 | 아이템·마법부여 effect | L4457-L4460, L4576 |
| `switchingTitleUsesCurrent` | 스위칭 장비에 `TITLE` 슬롯이 없으면 `true` | 버프강화 장비 슬롯 map | L4427-L4431, L4577 |
| `activeSelfStat` | 현재 장착 상태에서 직업별 `activeSelfStat` 스킬들의 현재 절대 스탯값 합 | 스킬 상세 | L4546-L4553 |
| `auraStat` | 현재 장착 상태에서 직업별 aura 스킬의 “힘·지능 증가” 표기값 합 | 스킬 상세 | L4554-L4561 |
| `auraAttack` | 현재 장착 상태에서 직업별 aura 스킬의 “파티원 공격력 증가” 표기값 합 | 스킬 상세 | L4562-L4569 |
| `currentSelfStatSkills` | 각 추적 스킬의 context key, 현재 레벨, 이전/현재/다음 자버프·파티 스탯·파티 공격력 값 | `skill/style` + 스킬 상세 | L4490-L4544 |
| `buffSkillName` | 버프강화 장비 payload의 `skill.buff.skillInfo.name` | `skill/buff/equip/equipment` | L798-L806, L845 |
| `buffSkillLevel` | 위 `skillInfo.option.level`; 별도 재합산하지 않음 | 같은 payload | L805-L806, L846 |
| `awakeningSkillName` | `skill/style`의 active 스킬 중 `requiredLevel == 50`인 첫 row 이름 | `skill/style` | L808-L816, L847 |
| `awakeningBaseLevel` | 각성 스킬이 있으면 `max(15, style row level)`, 없으면 0 | `skill/style` | L817, L848 |
| `awakeningItemLevelBonus` | 현재 장비·아바타·크리쳐 item detail의 각성 레벨 보너스 합 | item detail | L819-L838, L849 |
| `awakeningEnchantLevelBonus` | 현재 장비 마법부여 `reinforceSkill`의 각성 스킬 보너스 합 | 장비 enchant | L839-L842, L850 |
| `awakeningAvatarLevelBonus` | 아바타 `optionAbility`와 엠블렘 이름에서 각성 스킬 `Lv +N`을 파싱한 합 | 아바타 | L784-L795, L843, L851 |
| `awakeningSkillLevel` | `awakeningBaseLevel + awakeningItemLevelBonus + awakeningEnchantLevelBonus + awakeningAvatarLevelBonus` | 위 구성요소 | L852 |

### 7.3 현재 세팅과 스위칭 세팅을 구성하는 원칙

`get_buffer_switching_stat_delta`는 현재 장착과 버프강화 장착을 별도 row 집합으로 만든다.

#### 현재 row 집합

```text
currentRows = 현재 장비 + 현재 아바타 + 현재 크리쳐
```

근거: `character_equipment_service.py` L4415-L4418, L4436.

#### 유효 스위칭 row 집합

```text
switchingRows =
  각 현재 장비 슬롯마다:
    해당 슬롯의 버프강화 장비가 있으면 버프강화 장비
    없으면 현재 장비
  + 유효 버프강화 아바타
  + 버프강화 크리쳐가 있으면 그 크리쳐, 없으면 현재 크리쳐
```

근거: `character_equipment_service.py` L4419-L4441.

버프강화 아바타도 슬롯별로 누락된 row를 현재 아바타로 보충한다. 버프강화 payload에 현재 슬롯 외의 추가 row가 있으면 그 row도 뒤에 붙인다.

근거: `character_equipment_service.py::resolve_effective_buff_avatar_rows` L292-L317.

따라서 스위칭 API에서 어떤 슬롯이 생략됐다는 이유만으로 해당 슬롯의 현재 효과가 0으로 사라지지 않는다. 이 fallback은 `switchingStatDelta`와 `switchingBuffAmplificationDelta`의 기준을 안정화하는 핵심 전제다.

### 7.4 직접 스탯의 세부 출처

`get_row_direct_stat(row, detail, statName)`은 다음을 합산한다.

```text
1. item detail의 itemStatus에서 statName 값
2. 장착 row의 enchant.status에서 statName 값
3. row.optionAbility의 "<statName> N 증가" 정규식 값
4. row.emblems의 itemName에서 추정한 주스탯 값
```

근거: `character_equipment_service.py::get_row_direct_stat` L4294-L4304.

엠블렘 이름 기반 추정값은 코드에 하드코딩돼 있다.

| 이름 판정 | 주스탯 추정값 |
|---|---:|
| `찬란한` + 빨간빛 계열 | 25 |
| `찬란한` + 그 외 지원 색상 | 15 |
| `화려한` + 빨간빛 계열 | 17 |
| `화려한` + 그 외 지원 색상 | 10 |
| `빛나는` + 빨간빛 계열 | 10 |
| `빛나는` + 그 외 지원 색상 | 6 |
| 듀얼 계열 | 10 |

근거: `character_equipment_service.py::get_emblem_primary_stat_value` L4279-L4291.

**[코드 확정]** 이 값들은 item detail의 실제 `itemStatus`를 읽는 대신 이름 패턴으로 추정하는 경로다. 새로운 명명 규칙이나 다른 수치의 엠블렘은 코드 수정 전까지 정확히 반영되지 않을 수 있다.

### 7.5 스킬 레벨 보너스의 세부 출처

`get_setup_skill_bonuses`는 각 row에 대해 다음 정보를 스킬명별 레벨 합으로 만든다.

1. item detail의 `itemReinforceSkill`
2. 장착 row enchant의 `reinforceSkill`
3. item detail의 `itemBuff.reinforceSkill.levelRange`; 현재 style 스킬의 `requiredLevel`이 범위에 들면 가산
4. `optionAbility` 및 엠블렘 이름의 `스킬 Lv +N` 정규식
5. `플래티넘 엠블렘 [스킬명]`이면 해당 스킬 +1

근거: `character_equipment_service.py::get_setup_skill_bonuses` L4323-L4358.

`switchingSkillStatDelta`는 단순히 레벨 차이에 “레벨당 고정값”을 곱하지 않는다. 각 스킬 상세에서 현재 절대 레벨과 스위칭 절대 레벨의 스탯값을 각각 읽어 차감한다.

```math
\Delta S_{switch,skill}
= \sum_k \left(V_k(L_{k,switch}) - V_k(L_{k,current})\right)
```

근거: `character_equipment_service.py` L4474-L4489.

### 7.6 직업별 추적 스킬과 aura 출처

아래 표의 이름은 코드 상수 그대로다. 이 문서는 스킬의 게임 내 의미를 추가 추정하지 않는다.

| 기준 버프 스킬 | `activeSelfStat` 합산 대상 | `auraStat` 합산 대상 | `auraAttack` 합산 대상 |
|---|---|---|---|
| `영광의 축복` | `신념의 오라`, `보호의 징표` | `신념의 오라` | `신념의 오라` |
| `용맹의 축복` | `신실한 열정` | `신실한 열정`, `대천사의 축복` | 없음 |
| `금단의 저주` | `소악마` | `소악마` | 없음 |
| `러블리 템포` | `유명세`, `오늘의 주인공` | `유명세` | 없음 |
| `squad::무기강화();` | `apius::대응체계();`, `squad::장갑강화();` | `apius::대응체계();` | 없음 |

근거: `character_equipment_service.py::BUFFER_SCORE_SKILLS` L116-L138.

스위칭 스탯 변화 추적 대상으로는 더 넓은 집합을 사용한다.

| 기준 버프 스킬 | `BUFFER_SWITCHING_SELF_STAT_SKILLS` |
|---|---|
| `영광의 축복` | `수호의 은총`, `보호의 징표`, `신념의 오라`, `신의 대행자`, `디바인 플래쉬` |
| `용맹의 축복` | `계시 : 아리아`, `신실한 열정`, `라파엘의 축복`, `루클렌티스 엔젤` |
| `금단의 저주` | `퍼페티어`, `소악마`, `어둠에 피는 장미`, `불길한 눈웃음` |
| `러블리 템포` | `센세이션`, `유명세`, `오늘의 주인공`, `브랜드 뉴`, `에피소드 오브 하모니` |
| `squad::무기강화();` | `apius::전장정보();`, `apius::대응체계();`, `apius::제한해제();`, `apius::하드코딩();`, `squad::장갑강화();` |

근거: `character_equipment_service.py::BUFFER_SWITCHING_SELF_STAT_SKILLS` L109-L115.

---

## 8. `calculateBufferScore` 전체 공식

### 8.1 변화량 key의 적용 범위

`resolveBufferNetChanges`가 반환하고 `calculateBufferScore`가 소비하는 scalar key는 다음 11개다.

| key | 공식에서의 범위 |
|---|---|
| `statDelta` | 현재 적용 스탯과 스위칭 적용 스탯에 모두 더하는 공통 직접 스탯 |
| `currentStatDelta` | 현재 장착 기준 적용 스탯에만 더함 |
| `switchingStatDelta` | 버프강화 스위칭 기준 적용 스탯에만 더함 |
| `selfStatSkillDelta` | `baseAppliedStat`에 더하므로 현재·스위칭 양쪽에 공통 반영 |
| `buffPowerDelta` | 메인 버프와 각성 계산의 공통 버프력 |
| `currentBuffAmplificationDelta` | 각성식의 현재 기준 증폭에만 반영 |
| `switchingBuffAmplificationDelta` | 메인 버프식의 스위칭 기준 증폭에만 반영 |
| `buffSkillLevelDelta` | 메인 버프의 스탯/공격력 기초 계수에 반영 |
| `awakeningSkillLevelDelta` | 각성 스탯 기초 계수에 반영 |
| `auraStatDelta` | 최종 `totalStat`에 직접 가산 |
| `auraAttackDelta` | 최종 `totalAttack`에 직접 가산 |

근거: `enchantView.js::BUFFER_SIMULATOR_CHANGE_KEYS` L1201-L1213, `calculateBufferScore` L2088-L2124.

### 8.2 변수 정의

baseline 변수:

| 기호 | 코드 필드 |
|---|---|
| `S_0` | `baseline.stat` |
| `S_self` | `baseline.activeSelfStat` |
| `S_sw0` | `baseline.switchingStatDelta` |
| `B_0` | `baseline.buffPower` |
| `A_0` | `baseline.buffAmplification` (%p) |
| `A_sw0` | `baseline.switchingBuffAmplificationDelta` (%p) |
| `L_b0` | `baseline.buffSkillLevel` |
| `L_a0` | `baseline.awakeningSkillLevel` |
| `U_S0` | `baseline.auraStat` |
| `U_A0` | `baseline.auraAttack` |

change 변수:

| 기호 | 코드 필드 |
|---|---|
| `C` | `changes.statDelta` |
| `R` | `changes.currentStatDelta` |
| `W` | `changes.switchingStatDelta` |
| `P` | `changes.selfStatSkillDelta` |
| `\Delta B` | `changes.buffPowerDelta` |
| `\Delta A_c` | `changes.currentBuffAmplificationDelta` |
| `\Delta A_s` | `changes.switchingBuffAmplificationDelta` |
| `\Delta L_b` | `changes.buffSkillLevelDelta` |
| `\Delta L_a` | `changes.awakeningSkillLevelDelta` |
| `\Delta U_S` | `changes.auraStatDelta` |
| `\Delta U_A` | `changes.auraAttackDelta` |

직업 설정:

```text
J = config.jobCoefficient
M = config.buffMultiplier
J_M = J * M
```

근거: `enchantView.js::BUFFER_SCORE_CONFIG` L246-L262, `calculateBufferScore` L2114.

### 8.3 1단계: 현재/스위칭 적용 스탯

자버프 스킬 변화는 양쪽 세팅의 공통 기초값에 들어간다.

```math
S_{base} = S_0 + S_{self} + P
```

```math
S_{current} = S_{base} + C + R
```

```math
S_{switch} = S_{base} + S_{sw0} + C + W
```

근거: `enchantView.js::calculateBufferScore` L2088-L2097.

중요한 경계:

- `S_sw0`는 이미 서버에서 **스위칭 세팅 − 현재 세팅**으로 계산된 baseline 차이다.
- 후보의 `W`도 original switching base 대비 변화량이어야 한다.
- `P`를 `C`나 `W`에도 중복으로 넣으면 안 된다. `S_base`에서 이미 현재·스위칭 양쪽에 들어간다.

### 8.4 2단계: 버프력과 증폭

```math
B = B_0 + \Delta B
```

현재 장착 기준 증폭:

```math
A_{current} = \frac{A_0 + \Delta A_c}{100}
```

스위칭 기준 증폭:

```math
A_{switch}
= \frac{\max(0, A_0 + A_{sw0} + \Delta A_s)}{100}
```

근거: `enchantView.js` L2098-L2107.

**[코드 확정]** 스위칭 증폭만 0 아래를 clamp한다. 현재 증폭에는 같은 clamp가 없다.

### 8.5 3단계: 메인 버프 factor

```math
F_{buff}
= \left(1+\frac{S_{switch}}{2993}\right)
  \left(2+\frac{B(1+A_{switch})}{4800}\right)
```

근거: `enchantView.js` L2108.

메인 버프와 각성의 최종 레벨:

```math
L_b = L_{b0} + \Delta L_b
```

```math
L_a = L_{a0} + \Delta L_a
```

코드는 `if (!buffSkillLevel || !awakeningSkillLevel) return 0`으로 검사한다. 0 또는 `NaN`은 0점 처리되지만, 음수는 JavaScript에서 truthy이므로 이 guard만으로 차단되지 않는다.

근거: `enchantView.js` L2109-L2111.

### 8.6 4단계: 메인 버프의 스탯·공격력

레벨별 기초값:

```math
BaseStat_b = 150 + 11L_b
```

```math
BaseAttack_b = 36 + 1.8L_b
```

직업 계수를 곱한 메인 버프 결과:

```math
BuffStat = BaseStat_b \times F_{buff} \times J_M
```

```math
BuffAttack = BaseAttack_b \times F_{buff} \times J_M
```

근거: `enchantView.js` L2112-L2116.

### 8.7 5단계: 1차 각성 스탯

각성 기초값:

```math
BaseStat_a = 986 + 92(L_a-30)
```

각성 스탯:

```math
AwakeStat
= BaseStat_a
  \left[
    20
    \left(1+\frac{S_{current}}{15000}\right)
    \left(1+\frac{B(1+A_{current})}{85000}\right)
    -1
  \right]
  \times 1.15
```

근거: `enchantView.js` L2117-L2120.

직업별 `jobCoefficient × buffMultiplier`는 이 각성식에는 들어가지 않는다. 각성식에 들어가는 별도 고정 배율은 마지막 `1.15`다.

### 8.8 6단계: aura와 총합

```math
AuraStat = U_{S0} + \Delta U_S
```

```math
AuraAttack = U_{A0} + \Delta U_A
```

```math
TotalStat = BuffStat + AwakeStat + AuraStat
```

```math
TotalAttack = BuffAttack + AuraAttack
```

근거: `enchantView.js` L2121-L2123.

### 8.9 7단계: 최종 버프점수

```math
Score
= \frac{25000+TotalStat}{25000}
  \times \frac{3300+TotalAttack}{3300}
  \times 333
  \times 1.165
```

근거: `enchantView.js::calculateBufferScore` L2124.

`calculateBufferScore`는 이 값을 실수 그대로 반환하며 내부 반올림을 하지 않는다.

### 8.10 직업별 계수와 적용 위치

| 직업 | `bufferKey` | `jobCoefficient` | `buffMultiplier` | 곱 `J_M` |
|---|---|---:|---:|---:|
| 남크루 | `maleCrusader` | 1.0188 | 1.12 | 1.141056 |
| 여크루 | `femaleCrusader` | 1.016 | 1.12 | 1.13792 |
| 인챈트리스 | `enchantress` | 0.9765 | 1.155 | 1.1278575 |
| 뮤즈 | `muse` | 1.0177 | 1.10 | 1.11947 |
| 패러메딕 | `paramedic` | 1.025 | 1.12 | 1.148 |

근거: `enchantView.js::BUFFER_SCORE_CONFIG` L246-L262.

적용 위치를 식으로 다시 쓰면 다음과 같다.

```text
적용됨:
  BuffStat   *= J_M
  BuffAttack *= J_M

적용되지 않음:
  AwakeStat
  AuraStat
  AuraAttack
  최종 Score 전체
```

즉, 직업 계수를 최종 점수 전체에 한 번 더 곱하거나 각성에 곱하면 현재 코드와 달라진다.

### 8.11 숫자 예시

다음은 공식의 구조를 보이기 위한 가상 baseline이다. 모든 숫자는 코드 식에 직접 대입하며 별도 보정값을 만들지 않는다.

```text
직업: maleCrusader
stat                         = 10,000
activeSelfStat               = 500
switchingStatDelta           = 1,000
buffPower                    = 50,000
buffAmplification            = 20
switchingBuffAmplificationDelta = 5
buffSkillLevel               = 20
awakeningSkillLevel          = 30
auraStat                     = 300
auraAttack                   = 50
changes                      = 모두 0
```

중간값:

```text
S_base       = 10,000 + 500 = 10,500
S_current    = 10,500
S_switch     = 10,500 + 1,000 = 11,500
A_current    = 0.20
A_switch     = 0.25
F_buff       = 72.73536167724691
J_M          = 1.141056
BaseStat_b   = 370
BaseAttack_b = 72
BuffStat     = 30,708.194715977286
BuffAttack   = 5,975.648701487472
BaseStat_a   = 986
AwakeStat    = 64,632.3
TotalStat    = 95,640.49471597729
TotalAttack  = 6,025.648701487472
```

최종값:

```text
Score = 5,290.398313759957
```

여기에 공통 `statDelta = +100`만 적용하면 코드 식상:

```text
Score          = 5,334.481206178033
절대 증가      = 44.082892418076
상대 증가율    = 약 0.8332622575%
```

UI에서는 각각 `Math.round`된 점수로 표시될 수 있지만, 후보 비교와 누적 delta는 반올림 전 실수값으로 계산된다.

---

## 9. 버퍼 스킬 레벨 context: 절대 레벨에서 delta를 만드는 방식

### 9.1 context의 목적

스킬 레벨 효과는 레벨당 증가량이 항상 선형이라는 가정을 하지 않고, **후보 선택 후 도달하는 절대 레벨의 실제 값**을 현재 절대 레벨의 값과 비교한다.

context key는 서버에서 다음 형태로 만든다.

```text
contextKey = "<jobId>:<skillId>"
```

근거: `character_equipment_service.py` L4501-L4505.

### 9.2 서버의 도달 가능 레벨 범위 계산

`build_buffer_enchant_skill_context_payload`는 마법부여, 크리쳐, 오라, 칭호, 스위칭 칭호 등의 추천 그룹마다 다음을 갖는다.

```text
baseContributions      = 현재 소스가 각 context에 기여하는 레벨
candidateContributions = 각 후보가 각 context에 기여하는 레벨
```

근거: `character_equipment_service.py` L1117-L1214, L1228-L1276.

한 context `c`에 대해 각 배타 그룹 `g`에서 가능한 기여값의 최솟값/최댓값을 구하고, 현재 base 기여를 뺀 변화량을 그룹 전체에 합산한다.

```math
\Delta L_{min,c}
= \sum_g \left(\min Choices_{g,c} - Base_{g,c}\right)
```

```math
\Delta L_{max,c}
= \sum_g \left(\max Choices_{g,c} - Base_{g,c}\right)
```

```math
L_{min,c}=L_{current,c}+\Delta L_{min,c}
```

```math
L_{max,c}=L_{current,c}+\Delta L_{max,c}
```

근거: `character_equipment_service.py` L1293-L1312.

### 9.3 context를 생성하지 않는 조건

아래 조건 중 하나라도 만족하면 해당 context를 payload에 넣지 않는다.

1. baseline의 `currentSelfStatSkills`에 해당 context가 없음
2. 현재 레벨이 0 이하이거나 `skillId`가 없음
3. 스킬 상세 `levelInfo.rows`에 `[minimumLevel, maximumLevel]`의 **모든 정수 레벨**이 존재하지 않음
4. 자버프/파티 스탯/파티 공격력 어느 것도 추적하지 않음
5. `optionDesc`에 필요한 의미의 행과 `{valueN}` placeholder가 없음

근거: `character_equipment_service.py` L1283-L1341.

**[코드 확정]** 누락 레벨을 보간하지 않는다. 범위 중 한 레벨만 빠져도 context 전체를 생략한다.

### 9.4 절대 레벨별 net change 작성

현재 레벨 `L_0`에서 읽은 값을 기준으로, 도달 가능한 각 절대 레벨 `L`의 차이를 미리 만든다.

```math
selfStatSkillDelta_c(L) = SelfStat_c(L) - SelfStat_c(L_0)
```

```math
auraStatDelta_c(L) = PartyStat_c(L) - PartyStat_c(L_0)
```

```math
auraAttackDelta_c(L) = PartyAttack_c(L) - PartyAttack_c(L_0)
```

근거: `character_equipment_service.py` L1342-L1385.

payload 형태:

```json
{
  "contextKey": {
    "currentLevel": 10,
    "minReachableLevel": 9,
    "maxReachableLevel": 13,
    "netChangesByLevel": {
      "9":  { "selfStatSkillDelta": -X, "auraStatDelta": -Y, "auraAttackDelta": -Z },
      "10": { "selfStatSkillDelta":  0, "auraStatDelta":  0, "auraAttackDelta":  0 },
      "11": { "selfStatSkillDelta":  X1, "auraStatDelta":  Y1, "auraAttackDelta":  Z1 }
    }
  }
}
```

`X`, `Y`, `Z`는 실제 스킬 상세에서 읽으므로 이 문서에서 임의 수치를 두지 않는다.

### 9.5 프런트 resolver

각 활성 source change는 `baseSkillContributions`와 `targetSkillContributions`를 가진다. resolver는 context별 누적 레벨 변화량을 다음처럼 만든다.

```math
\Delta L_c
= \sum_s \left(TargetContribution_{s,c} - BaseContribution_{s,c}\right)
```

```math
L'_c = L_{current,c} + \Delta L_c
```

그 뒤 반드시 정확한 key `netChangesByLevel[String(L'_c)]`를 조회하고, 해당 세 delta를 총 변화량에 한 번씩 더한다.

근거: `enchantView.js::resolveBufferNetChanges` L1326-L1351.

다음은 오류다.

- context가 없음
- `L'_c`가 정수가 아님
- 해당 절대 레벨의 `netChangesByLevel`이 없음
- delta 값이 유한수가 아님

각각 `RangeError` 또는 `TypeError`가 발생한다. 근거: `enchantView.js` L1338-L1349.

### 9.6 switching 아바타 패키지와 플래티넘의 중복 보정

스위칭 아바타 패키지와 별도 스위칭 플래티넘이 같은 슬롯에 동시에 존재하면, resolver는 별도 플래티넘의 `buffSkillLevelDelta`를 다음으로 교정한다.

```math
\Delta L_{platinum,resolved}
= L_{targetPlatinum} - L_{packagePlatinum}
```

근거: `enchantView.js::resolveBufferNetChanges` L1285-L1299.

이 보정이 없으면 패키지에 포함된 플래티넘 레벨과 별도 플래티넘 교체 레벨이 중복 가산될 수 있다.

### 9.7 축소 fallback context와 근사 경로

서버가 완전한 `bufferSkillContexts`를 주지 못하면 프런트 `getBufferBaselineSkillContexts`가 `currentSelfStatSkills`의 이전/현재/다음 값으로 **현재 ±1 범위만** 만드는 경로가 있다.

근거: `enchantView.js::getBufferBaselineSkillContexts` L1227-L1264.

또한 legacy `getSkillValueDelta`는 `|levelDelta| > 1`일 때도 한 단계 차이를 단순 배수한다.

```text
양수: (next - current) * levelDelta
음수: (current - previous) * levelDelta
```

근거: `enchantView.js::getSkillValueDelta` L2032-L2037, 사용 `getBufferItemSkillChanges` L2039-L2082.

**[코드 확정]** 이 legacy 경로는 비선형 레벨 테이블을 정확히 반영하지 못할 수 있는 근사다. 추천 재평가의 exact resolver가 예외를 던지면 후보 row는 초기 `baseCandidateScore`/`baseScore` 비교로 fallback하고 `bufferSimulatorSupported = false`가 된다.

근거: `enchantView.js` L2627-L2631.

### 9.8 context 범위 산정의 현재 coverage

서버의 reachable-level 범위 산정에 명시적으로 들어가는 추천 source는 다음이다.

```text
마법부여 카드
현재 크리쳐
현재 오라
현재 칭호
스위칭 칭호
```

근거: `character_equipment_service.py::build_buffer_enchant_skill_context_payload` L1193-L1276.

현재 아바타 플래티넘, 스위칭 아바타/플래티넘, 스위칭 크리쳐 등도 프런트에서 context contribution을 만들 수 있지만 위 서버 범위 산정 목록에는 직접 포함되지 않는다. 이 경우 프런트가 합치는 fallback context는 현재 ±1뿐이므로, 여러 활성 source가 같은 context에 누적되어 ±2 이상이 되면 exact lookup이 지원되지 않을 수 있다.

근거: `enchantView.js::getBufferBaselineSkillContexts` L1227-L1264, `resolveBufferNetChanges` L1326-L1345.

이는 현재 구현의 지원 범위이며, 코드 리뷰 finding M11에서 적용 실패 경로를 별도로 정리한다.

---

## 10. change가 최종 resolver에 병합되는 원칙

### 10.1 공통 구조: original base-relative change

딜러와 버퍼 모두 활성 선택에는 “바로 직전 상태 대비 delta”가 아니라 **원래 base source 대비 target**을 저장한다. 누적 상태는 source별 map으로 유지하고, 동일한 배타 key에는 마지막 target 하나만 둔다.

후보 비교 시에는:

```text
reference map = 현재 활성 map에서 후보와 동일한 배타 key 제거
candidate map = reference map + 후보의 base-relative change
```

이 원칙은 적용 순서 의존성을 줄이고 동일 슬롯의 중복 차감을 막는다.

근거: 딜러 `enchantView.js::getDealerSimulatorRecommendationContext` L7389-L7700, 버퍼 `getBufferRecommendationRows` L2397-L2626.

### 10.2 버퍼 최종 resolver의 입력 map

`resolveBufferNetChanges`는 다음 source map들의 value를 한 배열로 펼친다.

```text
마법부여 slot
크리쳐 아티팩트 type
강화·증폭 slot
장비 조율 source
서약 조율 source
서약 획득/결정 source
흑아 slot
크리쳐 source
오라 source
칭호 source
스위칭 크리쳐 source
스위칭 칭호 source
스위칭 아바타 slot
스위칭 플래티넘 slot
아바타 엠블렘 socket 및 현재 플래티넘 slot
```

근거: `enchantView.js::resolveBufferNetChanges` L1267-L1316.

각 scalar key는 source 사이에서 단순 합산된다. 값이 `null`/`undefined`면 0, 숫자로 바꾼 결과가 유한수가 아니면 `TypeError`다.

근거: `enchantView.js` L1317-L1324.

스킬 기여는 scalar와 별도로 context별 절대 레벨을 해석한 뒤 `selfStatSkillDelta`, `auraStatDelta`, `auraAttackDelta`에 합쳐진다.

근거: L1326-L1351.

### 10.3 버퍼 source별 adapter 규칙

| source | 배타 key | 허용·생성 change | 지원 불가 또는 특별 처리 | 코드 근거 |
|---|---|---|---|---|
| 마법부여 | `bufferEnchant:<slot>` | `statDelta`; base/target 스킬 contribution | effect 변화 key가 `allStat` 외에 있으면 `null`; raw 스킬 레벨이 있으나 context contribution 배열이 없으면 `null` | `getBufferEnchantBaseRelativeChanges` L1590-L1620 |
| 크리쳐 아티팩트 | `bufferCreatureArtifact:<type>` | `statDelta`, `buffPowerDelta`, 현재/스위칭 증폭 delta | 변화 key가 `allStat`, `buffPower`, `buffAmplification` 외이면 `null` | L1642-L1661 |
| 흑아 | `bufferBlackFang:<slot>` | 위와 동일 | 지원 슬롯이 아니거나 다른 effect key가 바뀌면 `null` | L1664-L1684 |
| 현재 크리쳐 | `bufferCreature` | 공통 stat·buffPower·양쪽 증폭, 버프/각성 레벨, 스킬 context | 허용 effect key 외 변화면 `null` | `getBufferEquippedItemBaseRelativeChanges` L1714-L1743, wrapper L1745-L1747 |
| 현재 오라 | `bufferAura` | 현재 크리쳐와 같은 일반 item adapter | 동일 | wrapper `getBufferAuraBaseRelativeChanges` L1767-L1775 |
| 현재 칭호 | `bufferTitle` | 같은 일반 item adapter | switching title 상태와 legacy fallback에서 scope가 달라질 수 있음 | wrapper L1802-L1809; legacy L2062-L2076 |
| 스위칭 크리쳐 | source group | `switchingStatDelta`, 스위칭 증폭, 버프 레벨, aura delta | row의 명시 값을 사용 | L1825-L1834 |
| 스위칭 칭호 | source group | 위와 동일 | row의 명시 값을 사용 | L1849-L1858 |
| 스위칭 아바타 패키지 | 슬롯 | `switchingStatDelta`, `buffSkillLevelDelta`, package platinum level | 엠블렘 underlay와 별도 platinum 교정 필요 | L1873-L1883, resolver L1285-L1299 |
| 스위칭 플래티넘 | 슬롯 | `switchingStatDelta`, `buffSkillLevelDelta`, target platinum level | 같은 슬롯 package가 있으면 package 대비 delta로 재작성 | L1900-L1910, resolver L1285-L1299 |
| 강화·증폭 | `bufferUpgrade:<slot>` | `statDelta` | upgrade DB로 계산한 base/target effect의 변화 key가 `allStat` 하나가 아니면 `null` | `getBufferUpgradeBaseRelativeChanges` L1939-L1978 |
| 장비 조율 | source | 양의 `buffPowerDelta` | 0 또는 음수, 비유한 값은 `null` | L1981-L1986 |
| 서약 조율 | source | 양의 `buffPowerDelta` | 0 또는 음수, 비유한 값은 `null` | L1989-L1994 |
| 서약 획득/결정 교체 | source | 결정 effect의 stat·buffPower·양쪽 증폭 + 세트 상태 buffPower 차이 | 허용 effect 외 변화 또는 base/target 세트 상태 조회 실패 시 `null` | `getBufferOathStateBaseRelativeChanges` L4886-L4917 |
| 현재 아바타 일반 엠블렘 | `<slot>:<socket>` | scope에 따라 `statDelta`, `currentStatDelta`, `switchingStatDelta` | socket index가 0/1이 아니거나 target이 없으면 `null` | `getBufferAvatarEmblemChangesBySocket` L1355-L1381 |
| 스위칭 아바타 엠블렘 overlay | `<slot>:<socket>` | `switchingStatDelta` | 패키지 교체 후 실제 underlay가 불명확하면 전체 resolver가 `RangeError` | L1384-L1436, L1464 |
| 현재 플래티넘 엠블렘 | 아바타 슬롯 | 추적 스킬이면 context contribution, 아니면 `bufferStat`; 버프/각성 레벨 delta | 수치가 비유한 값이면 `null` | `getBufferAvatarPlatinumBaseRelativeChanges` L1475-L1503 |

#### 10.3.1 현재 source와 스위칭 source가 분리된 경우의 scope 주의

**[코드 확정]** 일반 현재 장착 item adapter는 대상 source가 실제 스위칭 세팅에서도 현재 item을 공유하는지 확인하지 않는다. `getBufferEquippedItemBaseRelativeChanges`는 항상 다음처럼 반환한다.

```text
직접 스탯 변화       -> statDelta                     (현재 + 스위칭 공통)
버프력 증폭 변화     -> currentBuffAmplificationDelta
                     + switchingBuffAmplificationDelta (양쪽 공통)
스킬 contribution    -> 최종 selfStatSkillDelta 등으로 해석되어 공통 기초값에 반영
```

근거: `enchantView.js::getBufferEquippedItemBaseRelativeChanges` L1714-L1742, `calculateBufferScore` L2092-L2107.

마법부여 adapter도 슬롯의 버프강화 장비 대체 여부와 무관하게 `statDelta`를 사용한다.

근거: `enchantView.js::getBufferEnchantBaseRelativeChanges` L1590-L1620.

반면 baseline은 현재와 스위칭이 다른 장비·아바타·크리쳐를 명시적으로 구분해 `switchingStatDelta`와 `switchingBuffAmplificationDelta`를 만든다. 칭호에 대해서는 `switchingTitleUsesCurrent`까지 제공한다.

근거: `character_equipment_service.py::get_buffer_switching_stat_delta` L4427-L4460, L4570-L4581.

따라서 현재 칭호/크리쳐/장비 슬롯과 스위칭 source가 실제로 분리된 상태에서는, 현재 source 후보 변화가 스위칭 쪽에도 적용되는 현재 adapter 동작을 주의해야 한다. 예를 들어 현재 칭호 증폭만 +10%p 바꾸고 별도 스위칭 칭호는 그대로여도, exact adapter는 current와 switching 증폭 delta에 모두 +10을 넣는다. 이 동작이 의도한 동시 교체 정책인지, scope 버그인지는 후보 UX 계약과 fixture가 없어 최종 확정할 수 없지만 **실행 코드의 현재 결과는 양쪽 공통 적용**이다.

#### 10.3.2 개별 주스탯 effect의 producer→normalizer→adapter 유실 경로

**[코드 확정]** 개별 체력·정신력 유실은 이제 단순 schema 가능성이 아니라 실제 후보 producer 경로까지 확인된다.

1. `effects.normalize_enchant_status`는 status row에서 힘·지능·체력·정신력을 모두 수집한다.
   근거: `effects.py` L53-L60.
2. 네 스탯이 모두 존재하고 값이 같으면 `allStat` 하나를 출력한다. 그 외에는 `str`, `int`만 출력하고 `vit`, `spr`은 출력하지 않는다.
   근거: `effects.py` L64-L72.
3. `order_effects`의 허용 순서에도 `vit`, `spr` key가 없다.
   근거: `effects.py` L3-L13.
4. 실제 마법부여 후보 producer인 `build_material_enchant_sources`와 `build_enchant_sources_from_detail`이 item detail의 `cardInfo.enchant[].status`를 바로 이 normalizer에 통과시킨다.
   근거: `server/enchant_service.py` L289-L325, L328-L363.
5. 버퍼 마법부여 adapter는 target/base effect 변화 key가 `allStat` 이외이면 `null`을 반환한다.
   근거: `enchantView.js::getBufferEnchantBaseRelativeChanges` L1590-L1620.

따라서 다음 결과가 코드로 확정된다.

| 원본 status 형태 | normalizer 결과 | 버퍼 adapter 결과 |
|---|---|---|
| 힘=지능=체력=정신력 동일 | `allStat` | 지원 |
| 체력만 또는 정신력만 | 해당 key가 사라짐 | 직접 스탯 변화 0으로 보일 수 있음 |
| 힘만 또는 지능만 | `str` 또는 `int` | 변화 key가 `allStat`이 아니므로 지원 불가 `null` |
| 체력·정신력이 같지만 힘·지능이 없거나 다름 | `vit`/`spr`을 출력하지 않음 | 직접 스탯 변화 유실 |

실제 운영 DB에 이런 카드가 있는지는 제공된 `Docs/enchant_card_db.json` 전체와 API fixture가 필요하지만, 해당 형태가 producer에 들어왔을 때의 유실은 조건부가 아니다.

**[이전 finding 재판정]** 최초 초안 H5는 **High 유지**다.

### 10.4 딜러 source 병합

`buildSimulatedDamageBaseline`은 base 총합과 simulated 총합의 차이를 먼저 만든다. 포함되는 주요 소스는 다음과 같다.

- 마법부여
- 오라
- 크리쳐
- 크리쳐 아티팩트
- 일반 아바타 엠블렘
- 칭호 본체
- 장비 body effect
- 장비 강화·증폭/성장 effect
- 서약 결정 effect

근거: `enchantView.js::buildSimulatedDamageBaseline` L3324-L3427.

그러나 모든 것을 하나의 additive map으로 끝내지 않는다.

1. additive 가능한 attack/stat/element/attackIncrease/attackAmplification 등은 `simulatedTotal - baseTotal`을 baseline에 더한다.
2. `finalDamage`는 additive delta에서 제거한다.
3. source-local final-damage replacement, skill multiplier, 장비 조율, 서약 조율·결정 multiplier는 `getSimulatorCumulativeDamageMultiplier`에서 별도로 곱한다.

근거: `enchantView.js` L3361-L3405, `getSimulatorCumulativeDamageMultiplier` L3429-L3580.

### 10.5 강화·증폭의 딜러 특례

`getCumulativeUpgradeEffectsForEquipment`은 원래 장비 상태와 목표 강화/증폭 상태를 upgrade DB로 누적 계산한다.

근거: `enchantView.js` L3113-L3135.

독립 공격력 baseline이고 무기 refine가 양수인 경우, 무기 공격력 효과에서 강화 공격력과 재련 공격력 중 큰 값을 사용하는 특례가 있다.

근거: `enchantView.js::getCumulativeUpgradeEffectsForEquipment` L3113-L3135.

장비의 progression final damage는 additive effect와 분리된 전용 replacement multiplier로 계산한다.

근거: `enchantView.js::getEquipmentProgressionFinalDamageChangeMultiplier` L3280-L3310.

### 10.6 조율·서약의 딜러/버퍼 경계

- 장비 조율: 딜러는 단계별 final damage multiplier, 버퍼는 양의 buffPower delta.
  근거: `enchantView.js::getEquipmentTuneDamageMultiplier` L3935-L3940, `getBufferEquipmentTuneBaseRelativeChanges` L1981-L1986.
- 서약 조율: 딜러는 DB가 만든 `damageMultiplier`의 target/base 비율, 버퍼는 buffPower delta.
  근거: `enchantView.js::getOathTuneDamageMultiplier` L4341-L4345, `getBufferOathTuneBaseRelativeChanges` L1989-L1994.
- 서약 결정: 딜러는 additive effect와 final damage replacement를 분리하고, 버퍼는 stat/buffPower/buffAmplification 및 세트 buffPower 차이를 합친다.
  근거: `enchantView.js` L4348-L4366, L4886-L4917.

딜러용 final damage를 버퍼 `buffPowerDelta`로 환산하거나 그 반대로 사용하는 코드는 없다. 추천 payload가 두 역할의 필드를 동시에 가질 수 있더라도 resolver가 역할 관련 effect만 선택한다.

근거: `enchantView.js::getRoleRelevantEffects` L525-L529, irrelevant key 집합 L133-L135.

### 10.7 칭호·오라·크리쳐·아바타의 중복 방지

- 칭호의 마법부여 속강은 일반 칭호 body effect 합에서 제외하고, 선호 속성과 최대 속강 변화에 맞춘 별도 경로에서 처리한다.
  근거: `enchantView.js::getTitleEffectsWithoutEnchantElement` L3245-L3252, `getAdjustedElementBaselineForRecommendation` L6250-L6278.
- 크리쳐 아티팩트는 type별 배타 map을 사용한다.
  근거: `getCreatureArtifactExclusiveGroupKey` L5341-L5346, buffer key L1927-L1936.
- 아바타 일반 엠블렘은 socket별, 플래티넘은 slot별로 보관한다.
  근거: `getBufferAvatarEmblemChangesBySocket` L1355-L1381, `getBufferAvatarPlatinumBaseRelativeChanges` L1475-L1503.
- 스위칭 아바타 패키지와 소켓 overlay는 underlay를 다시 해석한 뒤 delta를 만든다.
  근거: `resolveBufferSwitchingAvatarEmblemChanges` L1409-L1436.
- 아바타 스킬 배율은 동일 스킬의 상의/플래티넘 `+1`을 먼저 합쳐 한 번의 누적 ratio로 계산하므로, 슬롯별 `+1` ratio를 따로 곱해 비선형 레벨표를 왜곡하면 안 된다.
  근거: `server/avatar_skill_optimizer.py::evaluate_avatar_combo` L328-L367.

### 10.8 `enchant_service`와 presenter를 거치는 최종 병합 경계

추가 의존 파일로 마법부여 후보가 프런트에 도달하기 전의 server 경로를 확인할 수 있다.

#### 후보 카탈로그 경로

```text
Docs/enchant_card_db.json
  + item_repository item detail
  + effects.normalize_enchant_status
  + auction/material price
  -> enchant_service.load_enchant_cards_with_prices
  -> (buffer role이면) build_buffer_enchant_skill_context_payload
  -> /api/enchant-cards
```

- 카드 DB의 `cards`와 `bufferCards`, 재료형 `materialEnchantItems`와 `bufferMaterialEnchantItems`를 role과 함께 합친다.
  근거: `server/enchant_service.py::load_enchant_cards_with_prices` L895-L947.
- item detail이 있으면 detail의 최대 upgrade enchant row를 DB fallback보다 우선하여 source를 다시 만든다. detail이 없으면 DB의 source/effects를 사용한다.
  근거: L907-L939, `build_enchant_sources_from_detail` L328-L363.
- material enchant도 detail을 찾으면 `build_material_enchant_sources`로 source를 만든다.
  근거: L948-L994, helper L289-L325.
- source effect끼리 합칠 때 `combine_effects`는 key별 덧셈 후 `order_effects`를 적용한다.
  근거: `server/enchant_service.py::combine_effects` L79-L84.
- 가격 payload는 stale-while-refresh 방식이다. 유효 cache면 즉시 반환하고, 만료된 payload가 있으면 stale을 반환하면서 background refresh를 시작한다. cache가 없고 refresh 중이면 빈 후보 payload를 stale로 반환한다.
  근거: `load_enchant_cards_with_prices` L847-L893.
- `/api/enchant-cards`는 `role=buffer`이며 캐릭터 식별자가 있으면 absolute-level skill context를 덧붙인다.
  근거: `neople_hell_api_server.py::handle_enchant_cards` L692-L716.

#### 현재 캐릭터 enchant/loadout 경로

```text
Neople equip/equipment
  -> build_equipment_enchant_rows_and_upgrades
  -> damage baseline + optional buffer baseline
  -> skill contributions / oath / black fang / upgrade data
  -> build_character_enchants_payload presenter
  -> /api/character-enchants
  -> load_character_loadout가 creature/title/aura/avatar/switching source와 합침
  -> /api/character-loadout
```

근거: `character_equipment_service.py::load_character_enchants` L1014-L1098, `load_character_loadout` L3168-L3269; route `neople_hell_api_server.py` L718-L761.

`load_character_avatar`도 raw/avatar analysis를 만든 뒤 `build_character_avatar_payload` presenter를 호출한다.
근거: `character_equipment_service.py` imports L73-L81, avatar return L5652-L5681.

**확정 경계:** service가 계산한 baseline·row·recommendation·context를 presenter에 전달하는 사실은 확정이다. 그러나 `presenters/character_enchants_presenter.py`와 `presenters/character_avatar_presenter.py` 구현이 제공되지 않아 최종 JSON의 필드 보존·개명·필터링은 확정할 수 없다. 따라서 presenter가 계산값을 재산술하지 않는다는 가정도 이 문서에서는 하지 않는다. 프런트가 실제로 읽는 필드와 server call-site 인자가 일치하는 부분만 계산 계약으로 사용한다.

## 11. 공식 홈페이지 점수와 내부 시뮬레이터 점수

### 11.1 “공식 점수”의 실제 provider와 provenance

**[코드 확정]** `/api/equipment-score`의 점수는 Neople Open API status에서 계산하거나 읽는 값이 아니다. `server/repositories/equipment_score_repository.py`가 던전앤파이터 공식 홈페이지 `df.nexon.com`의 캐릭터검색 fetch endpoint를 직접 조회한 결과다.

```text
GET https://df.nexon.com/world/character/fetch
    ?serverName=<공식 서버 코드>
    &characName=<캐릭터명>
```

근거: `OFFICIAL_EQUIPMENT_SCORE_SOURCE`, endpoint 상수 `server/repositories/equipment_score_repository.py` L13-L18; `_fetch_official_character_rows` L220-L233.

지원 serverId는 `anton`, `bakal`, `cain`, `casillas`, `diregie`, `hilder`, `prey`, `siroco`의 8개이고, 공식 검색용 영문 서버 코드와 한글 label을 각각 mapping한다.
근거: L22-L42.

provider는 응답 root `body`가 list일 때만 row 목록으로 인정하고, 다음 조건의 첫 row를 선택한다.

```text
row characterName/characName == 요청 characterName
그리고
row serverName/serverId가 공식 영문 코드, 내부 serverId, 공식 한글 label 중 하나와 일치
```

근거: `_fetch_official_character_rows` L220-L233, `_select_exact_character_row` L236-L255.

선택 row에서 다음 필드를 읽는다.

| row 입력 | 내부 출력 |
|---|---|
| `characterId` | `officialCharacterKey` 및 profile URL |
| `equipmentPoint` | 복호화 후 `equipmentScore` |
| `buffPoint` | 복호화 후 `buffScore` |
| `obfuscateKey.key`, `obfuscateKey.salt` | 두 점수 복호화 key 재료 |

근거: `_build_payload` L258-L284.

`decode_official_point`는 base64 decode한 key/salt/value에 코드에 박힌 byte sequence를 붙여 XOR·trim한 뒤 쉼표를 제거하고 digit 문자열만 `int`로 반환한다. 실패는 예외가 아니라 `None`이다.
근거: `decode_official_point` L203-L217.

이 코드는 공식 홈페이지 내부 응답 형식에 의존한다. “공식”은 **source가 공식 홈페이지라는 provenance**를 뜻하며, 내부 계산식이 공식 산식을 재현한다거나 공식 홈페이지가 이 endpoint/obfuscation 계약을 보장한다는 뜻은 아니다. 공식 캐릭터검색도 웹사이트 반영에 시간이 걸릴 수 있음을 안내한다.
[외부 확인: 던전앤파이터 공식 캐릭터검색](https://df.nexon.com/world/character)

### 11.2 official score cache와 `/api/equipment-score` 응답 계약

repository cache는 character response cache와 같은 SQLite 파일에 별도 table을 만든다.

| 항목 | 값/동작 | 근거 |
|---|---|---|
| fresh TTL | 60초 | `equipment_score_repository.py` L13 |
| stale TTL | 24시간 | L14 |
| cache identity | `serverId + characterName` | L86-L94 |
| 저장 조건 | `equipmentScore` 또는 `buffScore`가 truthy인 payload만 | `_save_cached_payload` L146-L200 |
| fresh hit | `cached: true`, `stale: false` | `load_official_equipment_score` L294-L299 |
| fetch 예외 | stale cache가 있으면 `cached: true`, `stale: true`; 없으면 null response | L300-L311 |
| HTTP 200이지만 exact row/복호화 payload 없음 | stale을 쓰지 않고 null response | L300-L307 |

정상/실패 모두 프런트가 받을 수 있는 shape는 다음과 같다.

```json
{
  "equipmentScore": null,
  "buffScore": null,
  "officialCharacterKey": null,
  "officialProfileUrl": null,
  "source": "df.nexon.com",
  "cached": false,
  "stale": false
}
```

실제 값이 있으면 nullable 필드가 채워진다.
근거: `_null_response` L97-L106, `_to_response` L109-L118.

`neople_hell_api_server.handle_equipment_score`는 `serverId`와 `characterName`을 요구한다. 지원하지 않는 서버 등 `ValueError`는 HTTP 400으로 보내고, 예상하지 못한 예외는 HTTP 오류 대신 위 null shape에 가까운 JSON을 200 응답으로 보낸다.
근거: `neople_hell_api_server.py` L778-L801.

프런트 `loadCurrentOfficialEquipmentScore`는 이 route를 호출하고, 현재 캐릭터 request id/key가 아직 같은지 확인한 뒤 버퍼면 `buffScore`, 딜러면 `equipmentScore`를 읽는다. 양의 유한수만 ready로 인정한다.
근거: `enchantView.js` L13178-L13240.

### 11.3 딜러: 실제 딜 metric과 예상 장비점수 metric

딜러 시뮬레이터는 같은 선택 상태에서 두 multiplier를 별도로 만든다.

```text
actualMultiplier          -> 실제 딜 metric
 equipmentScoreMultiplier -> 예상 장비점수 metric
```

두 metric은 §6의 서로 다른 baseline·source 해석을 사용한다. 공식 홈페이지 점수는 actual metric에 들어가지 않는다.

예상 장비점수 표시식은 다음과 같다.

```math
EstimatedEquipmentScore
= \operatorname{round}(OfficialEquipmentScore \times M_{equipmentScore})
```

근거: `enchantView.js::getSimulatedEquipmentScore` L3795-L3800, `renderDealerSimulatorMeta` L11653-L11730.

공식 점수가 null·0·비유한수이면 예상 장비점수는 확인 불가지만, actual multiplier와 딜 상승률 계산은 계속 가능하다.

### 11.4 버퍼: 공식 점수는 표시 anchor, 내부 공식은 delta engine

버퍼는 공식 `buffScore`에 내부 비율을 곱하지 않는다.

```math
InternalDelta
= InternalCurrentScore - InternalBaseScore
```

공식 점수가 있으면:

```math
DisplayedBase = OfficialBuffScore
```

```math
DisplayedCurrent = OfficialBuffScore + InternalDelta
```

공식 점수가 없으면:

```math
DisplayedBase = InternalBaseScore
```

```math
DisplayedCurrent = InternalCurrentScore
```

근거: `enchantView.js::renderBufferSimulatorMeta` L11583-L11650.

따라서 `calculateBufferScore`는 공식 홈페이지 점수를 재구현하는 함수가 아니라, 현재 선택 변화의 **내부 absolute score와 delta**를 계산하는 시뮬레이터다. 공식 baseline과 내부 baseline의 차이는 보정하지 않고, 공식 anchor 위에 내부 delta만 평행 이동한다.

### 11.5 반드시 보존할 역할 경계

| 항목 | 딜러 | 버퍼 |
|---|---|---|
| 공식 source | `df.nexon.com`의 `equipmentPoint` 복호화 | 같은 provider의 `buffPoint` 복호화 |
| 내부 성능 metric | `actualMultiplier` | `calculateBufferScore` 및 그 delta |
| 공식 점수와 내부 변화 결합 | 공식 장비점수 × equipmentScore 전용 multiplier 후 `Math.round` | 공식 버프점수 + 내부 absolute delta |
| 공식 조회 실패 | 점수 표시는 불가, 실제 딜 metric은 계산 가능 | 내부 base/current 점수로 표시 |
| 계산식의 권위 | 프런트 actual/equipmentScore resolver | 프런트 buffer resolver와 `calculateBufferScore` |

다음 변경은 금지해야 한다.

- official equipmentScore를 actual damage baseline 또는 multiplier에 섞기
- actual multiplier를 공식 장비점수에 곱해 equipmentScore metric으로 표시하기
- 공식 buffScore에 내부 버프점수의 비율을 곱하기
- 내부 buff score를 공식 산식 재현값이라고 명명하기
- `source: df.nexon.com`을 Neople Open API 점수라고 설명하기

공식 홈페이지 값과 내부 시뮬레이터 값이 특정 캐릭터에서 얼마나 일치하는지는 코드만으로 확정할 수 없으며, 동일 시각의 raw response·공식 화면·내부 baseline을 묶은 golden fixture가 필요하다.

## 12. 계산상 안전장치, fallback, 지원 불가 조건, 근사·하드코딩

### 12.1 딜러 안전장치와 fallback

| 위치 | 동작 | 주의점 |
|---|---|---|
| `getDamageBaseline` L955-L980 | `stat`, `baseStat`, `element`, `attack` 등이 falsy면 하드코딩 기본값 사용 | 합법적 0, lookup 실패, 빈 문자열, `NaN`을 구분하지 못함 |
| `getDamageBaseline` L972-L974 | `elementDamage`가 유한하면 0도 그대로 사용; 비유한/누락만 fallback | 서버의 명시적 0이 `5 + element*0.45`를 차단 |
| `estimateDamageMultiplier` L1027-L1030 | skill multiplier가 양의 유한수가 아니면 1 | 잘못된 후보가 조용히 무효 효과가 됨 |
| `getReplacementIncrementalDamagePercent` L6069-L6076 | 외부 공격력 증가·증폭 기반을 `max(0, ...)`로 clamp | 공격력·스탯 외부 기반에는 같은 clamp가 없음 |
| `subtractEffects` L3190-L3200 | 절댓값 `<=1e-6` delta 제거 | 아주 작은 변화는 상태 map에서 사라짐 |
| 추천 row L6824 | 이득 `<=0.0001` 필터 | UI 반올림 전 내부값 기준 |
| `getTitleEffectiveEffects` L6173-L6186 | 단일 속성 칭호가 선호 속성과 다르면 속강 제거 | 선호 속성 판정과 element identity에 의존 |
| `avatar_skill_calculator.get_level_attack_percent` L81-L128 | 요청 레벨이 table 최대보다 높으면 최대 레벨로 clamp | 최소 미만에는 대칭 clamp 없음 |
| `evaluate_avatar_combo` L328-L367 | 한 스킬이라도 ratio 미계산이면 combo 전체 미지원 | 부분 계산값을 섞지 않음 |
| `get_avatar_platinum_skill_damage_multiplier` L204-L262 | 후보 상승 미계산은 0; 제거되는 현재 스킬 손실 미계산은 손실 0 | 후보를 낙관 평가할 수 있음 |
| `get_item_reinforce_skill_effect` L59-L112 | 여러 matching 스킬 중 가장 큰 multiplier 하나만 선택 | 아바타 combo의 복수 스킬 곱과 다른 정책 |

### 12.2 버퍼 안전장치와 fallback

| 위치 | 동작 | 주의점 |
|---|---|---|
| `load_character_buffer_baseline` L615-L625 | 비지원 직업·남크루 딜러 스타일은 `None` | buffer UI로 진입하면 안 됨 |
| switching row 구성 L4427-L4441 | 스위칭 슬롯 누락 시 현재 장착으로 fallback | 누락을 “미장착”으로 보지 않음 |
| context builder L1319-L1341 | 연속 절대 레벨·필요 label이 없으면 context 생략 | 일부 후보는 exact simulator 미지원 |
| `resolveBufferNetChanges` L1317-L1351 | 비유한 scalar, 잘못된 contribution, 미지원 절대 레벨에 예외 | caller가 원인을 일반 실패로 축약할 수 있음 |
| recommendation fallback L2627-L2631 | resolver 예외 시 초기 후보 비교값 사용, simulator 지원 false | 현재 다른 활성 변경과의 상호작용을 잃을 수 있음 |
| `calculateBufferScore` L2086-L2087 | 직업 config가 없으면 0 | 오류와 실제 0을 구분하지 않음 |
| `calculateBufferScore` L2111 | 버프/각성 레벨이 falsy면 0 | 음수는 truthy이므로 차단하지 않음 |
| switching amp L2102-L2107 | 스위칭 증폭만 0 clamp | 현재 증폭은 음수가 가능 |
| tune adapters L1981-L1994 | 양의 `buffPowerDelta`만 지원 | 감소 후보 또는 원복 표현에는 사용할 수 없음 |
| avatar switching overlay L1428-L1464 | underlay가 불명확하면 `null`/`RangeError` | package·socket 병합 순서가 중요 |
| 개별 체력·정신력 normalizer L53-L72 | 네 스탯 동일이 아니면 `vit`/`spr`을 내보내지 않음 | 실제 enchant producer에서 버퍼 stat 유실 가능 |

### 12.3 HTTP·repository·cache 안전장치

#### Neople API client

- API key가 없으면 요청 전에 `RuntimeError`다.
  근거: `server/neople_client.py::require_api_key` L34-L37.
- timeout은 30초, 최대 3회 재시도한다. HTTP 503, `DNF980`, `SYSTEM_INSPECT`는 일반 재시도 결과가 아니라 `NeopleMaintenanceError`로 분리한다.
  근거: L12-L14, `request_json` L44-L101.
- JSON root가 dict가 아니면 오류로 본다. 각 helper가 기대하는 nested list가 없으면 대부분 빈 list로 축약한다.
  근거: L59-L63, L104-L168, L208-L213.
- 실제 Open API status가 접속 상태에 따라 미제공 또는 지연될 수 있다는 외부 계약이 있으므로, 빈 status를 정상 0 baseline으로 조용히 바꾸는 경로를 테스트해야 한다.
  [외부 확인: Neople Developers — 던전앤파이터 API Docs](https://developers.neople.co.kr/contents/apiDocs/df)

#### 캐릭터 payload repository

- memory 15초, SQLite 60초 fresh cache를 사용한다. cache read/write 실패는 예외를 삼키고 API fetch로 진행한다.
  근거: `server/repositories/character_repository.py` L12-L20, L134-L234.
- API fetch 실패 시 expired/stale payload를 반환하는 fallback은 없다.
- 동일 key miss에 대한 single-flight가 없으므로 동시 요청이 중복 fetch할 수 있다.
- cache key에 `path`가 없으므로 `(serverId, characterId, resource)` 하나가 여러 path에 재사용되면 잘못된 payload가 공유된다.
  근거: `_get_character_cache_key` L41-L46, `get_character_cached_payload` L212-L234.

#### skill detail repository와 character skill context

- skill detail은 동일 `(jobId, skillId)` miss를 Event single-flight로 합치고 owner의 예외를 waiter에게 전달한다.
  근거: `server/repositories/skill_repository.py` L13-L57.
- cache는 non-empty dict만 저장하며 TTL·size cap·invalidation이 없다. waiter에는 timeout이 없다.
- character skill context는 60초 TTL이나 build single-flight가 아니며, 동일 캐릭터 동시 miss가 detail/style/job-skills 호출을 중복 수행할 수 있다.
  근거: `item_skill_option_service.py` L8-L56.

#### 공식 score provider

- 공식 score request timeout은 3초다. fresh cache 60초, stale cache 24시간을 사용한다.
  근거: `equipment_score_repository.py` L13-L18.
- network/parse 예외에서만 stale을 반환한다. HTTP 200 응답이지만 exact row 없음, body shape 변경, decode가 `None`인 경우는 stale이 있어도 null response다.
  근거: `load_official_equipment_score` L294-L311.
- `/api/equipment-score`의 예기치 않은 server 예외는 HTTP 오류가 아니라 null score JSON으로 축약된다.
  근거: `neople_hell_api_server.py::handle_equipment_score` L778-L801.

### 12.4 코드에 박힌 딜러 상수

| 상수 | 값 | 적용 위치 |
|---|---:|---|
| fallback stat | 6500 | `ENCHANT_DAMAGE_BASELINE` |
| fallback baseStat | 800 | 동일 |
| fallback element | 330 | 동일 |
| fallback attack | 4000 | 동일 |
| 지역 스탯 A | 168350 | `getEquipmentScoreEffectiveStat` |
| 지역 스탯 B | 297900 | 동일 |
| 지역 스탯 scale | 3.08 | 동일 |
| 지역 스탯 offset | 2886 | 동일 |
| 공격력 flat | 31215 | 공격력 전후비 |
| 속강 1당 elementDamage | 0.45 | 속성 피해 delta |
| elementDamage fallback base | 5 | `5 + element*0.45` |
| 아바타 플래티넘 final damage 표시값 | 1.62 | `character_equipment_service.py` L92, L4592-L4593 |
| 딜러 인정 스킬 계수 base | 1.20 | `resolveDealerAvatarSkillCoefficient` |
| 인정 레벨당 증가 | 0.02 | 동일 |

근거: `enchantView.js` L313-L327, L983-L1031, L1520-L1523; `character_equipment_service.py` L92, L4592-L4593.

### 12.5 코드에 박힌 버퍼 공식 상수

| 식 위치 | 상수 |
|---|---|
| 메인 버프 적용 스탯 | 2993 |
| 메인 버프 버프력 | 2, 4800 |
| 메인 버프 스탯 base | 150, 레벨당 11 |
| 메인 버프 공격력 base | 36, 레벨당 1.8 |
| 각성 base | 986, 레벨당 92, 기준 레벨 30 |
| 각성 적용 스탯 | 20, 15000 |
| 각성 버프력 | 85000 |
| 각성 후배율 | 1.15 |
| 점수 스탯 정규화 | 25000 |
| 점수 공격력 정규화 | 3300 |
| 점수 전역 계수 | 333, 1.165 |

근거: `enchantView.js::calculateBufferScore` L2108-L2124.

이 상수들의 유도 근거와 version marker는 코드에 없다. 변경 시 외부 지식으로 바로 치환하지 말고 동일 raw baseline에 대한 golden score를 먼저 고정해야 한다.

### 12.6 그 밖의 하드코딩·근사

- 버프강화 유효 레벨은 0~20 clamp, 짙은 편린 개수는 관련 함수에서 집계 후 장비점수 계수에 개당 0.25를 더한다.
  근거: `enchantView.js` L3621-L3635.
- 버프강화 actual metric은 각 계수의 `(1+c/100)` 곱을 사용하고, `damageApplicationRatio`가 `(0,1]` 밖이면 1로 fallback한다.
  근거: L3638-L3673.
- 크리쳐 플래티넘 스킬 데미지 퍼센트는 level tag가 30이면 15, 그 밖의 양수면 10, 없으면 0이다.
  근거: `upgrade_payloads.py::get_creature_platinum_skill_damage_percent` L17-L21.
- 장비 조율 상수는 최소 세트 포인트 2550, step 10, memory 포인트 70, memory final damage 2, memory buffPower 400, 최대 레벨 3이다.
  근거: `enchantView.js` L284-L289.
- 서약 blessing `stepPoint`가 비어 있으면 25를 사용한다. 단계 수는 Python `//`로 계산한다.
  근거: `oath_tune_calculator.py` L20-L28.
- 아바타 엠블렘의 실제 버퍼 baseline 추정값과 equipmentScore 인정값은 서로 다른 하드코딩 표를 사용한다.
  근거: `character_equipment_service.py` L4279-L4291; `enchantView.js` L203-L208.
- `data_store.load_job_base_stats`는 `Docs/jobBaseStat.json`이 없을 때 `{}`를 cache한다. 이후 파일이 생겨도 process restart나 cache reset 없이는 다시 읽지 않는다.
  근거: `server/data_store.py` L20, L96-L104.
- 공식 점수 복호화에는 다음 두 byte suffix가 하드코딩되어 있다. 형식 변경에 대한 version negotiation은 없다.
  근거: `equipment_score_repository.py::decode_official_point` L203-L217.

```text
xor suffix  = [103, 50, 75, 38, 42, 97, 117, 99, 57, 88, 64, 56]
trim suffix = [84, 122, 51, 36, 76, 119, 56, 110, 66, 101, 33, 49]
```

### 12.7 명시적 지원 불가 조건

다음은 코드가 계산을 거부하거나 `None`/0/unsupported로 내려가는 조건이다.

- buffer job tuple이 다섯 지원 직업에 없거나, 남크루가 `성령의 메이스` 활성 딜러 스타일인 경우
  `character_equipment_service.py` L615-L625, L658-L664.
- 아바타 스킬 상세에서 현재/목표 레벨의 누적 공격력 값을 찾지 못한 경우
  `avatar_skill_calculator.py` L131-L163; optimizer L328-L350.
- buffer absolute context에 요청한 절대 레벨이 없거나 scalar/contribution이 비유한 경우
  `enchantView.js::resolveBufferNetChanges` L1317-L1351.
- source adapter가 허용하지 않는 effect key를 발견한 경우
  예: buffer enchant L1590-L1620, upgrade L1939-L1978, oath L4886-L4917.
- 공식 score provider가 serverId를 mapping하지 못하거나 캐릭터명이 빈 경우
  `equipment_score_repository.py::load_official_equipment_score` L287-L293.
- 공식 홈페이지 row의 점수 decode가 모두 실패하거나 exact character row가 없는 경우
  L236-L284, L300-L307.

지원 불가는 “효과 0”과 구분해서 payload/UI/debug metadata에 남기는 것이 안전하다. 현재 일부 경로는 둘을 같은 0 또는 null로 축약한다.

## 13. 기존 문서와 현재 코드의 충돌

코드와 문서가 다를 때 이 초안은 현재 코드를 우선한다.

### 13.1 최종 데미지 baseline 출처

- 기존 문서: API status에서 `최종 데미지 증가`를 읽는 구현 순서를 제시한다.
  근거: `EQUIPMENT_SCORE_REVERSE_ENGINE.md` L720-L724.
- 현재 코드: `build_damage_baseline_from_status_payload` 반환 객체에 `finalDamage`가 없다. 프런트는 누락 시 0을 사용한다.
  근거: `character_equipment_service.py` L582-L598; `enchantView.js` L976-L979.

**판정:** 현재 실행 경로 기준 baseline `finalDamage = 0`이며, source별 final damage는 교체 multiplier로 별도 처리된다. 서버 route의 다른 조립 단계가 필드를 추가하는지는 첨부물만으로 확인할 수 없다.

### 13.2 지역 스탯 절삭

- 기존 문서: `floor(3.08*(stat-baseStat)+2886)`.
  근거: `EQUIPMENT_SCORE_REVERSE_ENGINE.md` L80-L89.
- 현재 코드: `Math.trunc(...)`.
  근거: `enchantView.js::getEquipmentScoreEffectiveStat` L983-L988.

**판정:** 양수 입력에서는 같을 수 있지만 음수 입력에서는 다르므로 테스트와 문서에는 `trunc`를 써야 한다.

### 13.3 속성 배율

- 기존 문서: `1.05 + 속강*0.0045`를 항상 직접 사용한다고 설명한다.
  근거: `EQUIPMENT_SCORE_REVERSE_ENGINE.md` L200-L219.
- 현재 코드: `baseline.elementDamage`가 유한하면 그 값을 사용하고, 누락/NaN일 때만 `5 + element*0.45`를 쓴다. 후보 속강은 이 `elementDamage`에 `0.45*delta`를 더한 전후비다.
  근거: `enchantView.js` L972-L974, L1016-L1020.

**판정:** 현재 코드의 직접 입력은 `elementDamage`이며, `1.05 + element*0.0045`는 fallback을 백분율 배율로 표현한 경우에만 일치한다.

### 13.4 예상 장비점수 반올림

- 기존 문서: 최종 장비점수를 `floor` 처리한다고 제안한다.
  근거: `EQUIPMENT_SCORE_REVERSE_ENGINE.md` L720-L729.
- 현재 코드: `Math.round(baseScore * multiplier)`.
  근거: `enchantView.js::getSimulatedEquipmentScore` L3795-L3800.

**판정:** 현재 구현 문서는 `round`로 써야 한다.

### 13.5 skill detail 조회와 ratio 구현

- 기존 버퍼 문서: `fetch_skill_detail_from_api(job_id, skill_id)`를 직접 lazy 호출한다고 설명한다.
  근거: `BUFFER_CALCULATION_NOTES.md` L135-L154.
- 현재 실행 경로: consumer는 `repositories.skill_repository.get_skill_detail`을 호출하고, repository가 cache/single-flight 뒤 `neople_client.fetch_skill_detail_from_api`를 호출한다.
  근거: `item_skill_option_service.py` L4-L6, L99-L101; `server/repositories/skill_repository.py` L13-L57; `server/neople_client.py` L171-L173.
- 실제 ratio: `avatar_skill_optimizer`가 `.calculators.avatar_skill_calculator.get_skill_attack_ratio`를 import하며, 제공된 calculator 구현은 레벨별 누적 공격력의 전후비 `(1+target/100)/(1+current/100)`를 계산한다.
  근거: `server/avatar_skill_optimizer.py` L6-L10; `avatar_skill_calculator.py` L81-L163.

**판정:** 기존 문서의 “직접 API lazy call” 설명은 현재 repository 계층과 single-flight를 누락하므로 갱신해야 한다. ratio 구현과 복수 스킬 합성 규칙은 §2.3.7을 따른다.

### 13.6 “숨은 소수점 오차” 설명

`BUFFER_CALCULATION_NOTES.md` L266의 “API 스킬 계수는 정수 표기라 숨은 소수점 오차가 있을 수 있다”는 가능성 진술은 첨부 코드만으로 검증되지 않는다. 코드 참조 문서에서는 **[추론/미검증]**으로 남겨야 하며 공식 동작으로 서술하면 안 된다.

---

## 14. 추가 파일 반영 후에도 확정할 수 없는 항목

추가 ZIP으로 `data_store`, Neople client, avatar optimizer, enchant service, 주요 repository, 공식 score provider, HTTP route까지 확인했다. 최초 초안에서 이 파일들의 부재를 이유로 조건부 처리했던 내용은 본 개정본에서 가능한 범위까지 **[코드 확정]**으로 승격했다.

남은 확정 한계는 다음과 같다.

| 필요한 파일/구성 | 필요한 이유 | 현재 확정 가능한 범위 |
|---|---|---|
| `presenters/character_enchants_presenter.py` | `load_character_enchants`가 넘긴 baseline·row·recommendation을 최종 JSON에서 어떻게 보존·개명·필터링하는지 확인 | service call-site와 입력 인자, route는 확정 |
| `presenters/character_avatar_presenter.py` | avatar analysis와 recommendations가 최종 `avatar` payload에 어떻게 배치되는지 확인 | presenter 직전 `avatar_payload`와 호출은 확정 |
| 나머지 `presenters/*` | switching title/creature/platinum/fragment row의 최종 shape와 계산 필드 보존 확인 | builder 호출과 프런트 consumer 요구사항은 확정 |
| `candidates/*`, `price_cache.py` 및 실제 `Docs/*.json` 전체 | 후보 eligibility, DB fallback row, 갱신 주기 상수, 실제 체력·정신력/단일 속성 후보 존재 여부 확인 | `enchant_service`가 normalizer와 cache helper를 호출하는 구조는 확정 |
| 실제 저장소의 package layout | 첨부 묶음에서는 calculator 파일이 평탄화되어 있으나 import는 `.calculators.avatar_skill_calculator`를 사용 | 함수 구현과 import symbol은 확인했지만 배포 경로의 파일 동일성은 종단 import로 확인 필요 |
| `api_fanout_trace.py`, `ops_log.py`, heavy/public response cache 구현 | cache/HTTP 경로의 관측·부하 제한·response cache TTL과 장애 행동 확인 | 계산 repository 내부 cache는 확정 |
| `NEOPLE_API_KEY`, network, SQLite writable path를 갖춘 통합 환경 | 실제 API shape, retry/maintenance, cache read/write, 공식 홈페이지 fetch를 종단 검증 | URL·timeout·retry·shape parser는 확정 |
| 실제 Neople/공식 홈페이지 raw fixture | `elementDamage` 누락 발생 여부, Crusader `jobGrowName`, 공식 점수 decode 성공률과 freshness 확인 | 입력이 주어졌을 때 코드 분기 결과는 확정 |
| 공식 화면과 동일 시각의 golden sample | 내부 expected equipmentScore와 공식 장비점수, 내부 buffer delta와 공식 buffScore의 오차 검증 | 두 metric의 결합 방식은 확정 |
| 운영 로그/측정 데이터 | exact skill context fallback 빈도, single-flight wait 시간, unsupported 후보 비율, stale 공식 점수 사용률 확인 | 잠재 위험과 fallback 경로만 식별 가능 |

공식 API 문서와 공식 캐릭터검색 페이지는 endpoint/service 존재와 freshness 주의를 확인해 줄 뿐, 저장소 내부 계산·cache·presenter 동작을 대신 증명하지 않는다.

## 15. 구현 변경 시 반드시 보존할 불변식

### 15.1 딜러 수식·상태 불변식

1. **baseline과 source delta의 단위를 고정한다.** `finalDamage`, `attackIncrease`, `attackAmplification`, `elementDamage`는 %p이고, `skillDamageMultiplier`는 배율이다.
2. **같은 범주 안에서는 전후비, 범주 사이에서는 곱셈**을 유지한다.
3. `finalDamage`를 additive effect delta와 source-local replacement multiplier에 동시에 넣지 않는다.
4. 후보 change는 **original base-relative**로 저장하고, 추천 비교 시 같은 배타 source만 reference에서 제거한다.
5. actual metric과 equipmentScore metric의 baseline·아바타·버프강화 해석을 분리한다.
6. 칭호/아티팩트의 단일 속성 identity와 `max(elementValues)` 변화 보정을 유지한다.
7. `Math.trunc`, `Math.round`, 표시 `toFixed`, 추천 필터 임계값을 서로 대체하지 않는다.
8. 장비 강화·증폭, 장비 조율, 서약의 전용 multiplier를 일반 enchant effect 합에 중복 병합하지 않는다.
9. `elementDamage`의 “명시적 0”과 “필드 누락” 정책은 server와 frontend 중 한 곳에서 단일 책임으로 정의해야 한다. 현재 분기를 바꿀 때 두 층을 함께 테스트한다.
10. 아바타 combo에서 동일 스킬의 여러 `+1`은 먼저 레벨 delta로 합친 후 한 번의 누적 ratio를 계산하고, 서로 다른 스킬 ratio만 곱한다.
11. 일반 item `itemReinforceSkill`은 현재 **계산 가능한 최대 한 스킬**을 선택한다. 복수 스킬 곱으로 바꾸려면 별도 설계 변경으로 취급한다.
12. 아바타 `primaryStatName`이 초기 baseline과 다르면 현재 구현에서는 `status[힘] == status[지능]`이어야 한다. selector 정책을 바꾸면 `stat`도 새 축으로 재선택한다.
13. `jobBaseStat` lookup은 현재 exact `jobGrowName` key다. alias를 추가하면 loader와 모든 caller가 공유하는 명시적 정규화 함수와 migration test를 둔다.

### 15.2 버퍼 공식·scope 불변식

1. `statDelta`, `currentStatDelta`, `switchingStatDelta`, `selfStatSkillDelta`의 scope를 보존한다.
2. baseline의 `switchingStatDelta`는 “스위칭 − 현재”의 차이이며 절대 스탯이 아니다.
3. 스위칭 슬롯 누락은 현재 슬롯 fallback으로 처리한다.
4. 메인 버프는 스위칭 적용 스탯·스위칭 증폭, 각성은 현재 적용 스탯·현재 증폭을 사용한다.
5. 직업별 `jobCoefficient × buffMultiplier`는 메인 버프 stat/attack에만 적용한다.
6. aura stat/attack은 메인 버프나 각성 factor 안에 넣지 않고 최종 합에 직접 더한다.
7. 스킬 효과는 누적 레벨 delta를 한 단계 값에 곱하지 말고, 가능한 경우 absolute-level context로 평가한다.
8. 같은 context의 여러 source contribution을 먼저 합친 뒤 net change를 정확히 한 번 적용한다.
9. 스위칭 아바타 패키지와 별도 플래티넘의 중복 레벨 보정을 보존한다.
10. 현재 source가 실제 스위칭 세팅에서도 공유되는지를 명시하지 않은 채 `currentStatDelta`를 `statDelta`로 넓히지 않는다. 반대로 공유 source를 current-only로 축소하지 않는다.
11. 개별 힘·지능·체력·정신력 후보를 `allStat`으로 임의 승격하지 않는다. 원본 축을 보존한 뒤 `bufferBaseline.statName`에서 선택한다.
12. 공식 buffScore는 표시 anchor이고 내부 `calculateBufferScore` delta가 이동한다는 UI 계약을 보존한다.
13. config 누락·context 범위 밖·비유한 change와 실제 효과 0을 같은 상태로 숨기지 않는다.

### 15.3 스킬 상세·cache 불변식

1. skill detail cache key는 `(clean(jobId), clean(skillId))`다.
2. 동일 key concurrent miss는 owner 하나만 fetch하고 waiter는 같은 결과 또는 같은 예외를 받아야 한다.
3. cache 저장·반환의 `deepcopy`를 제거해 caller 변이가 전역 cache를 오염시키지 않게 한다.
4. empty dict를 cache하지 않는 현재 정책, TTL 없음, wait timeout 없음 중 어느 하나를 바꾸면 failure/retry contract를 함께 문서화한다.
5. character skill context의 `skill/style` 레벨은 장비 강화 제외 값이며, non-avatar setup bonus를 정확히 한 번만 더한다.
6. level table 최대 초과 clamp와 최소 미만 미지원 정책을 바꿀 때 ratio fixture를 갱신한다.

### 15.4 HTTP·repository 불변식

1. `get_character_cached_payload`의 `resource`는 endpoint `path`와 일대일이어야 한다. 같은 resource를 다른 path에 쓰지 않는다.
2. character payload cache의 memory/SQLite TTL과 API freshness는 서로 다른 개념이다. cache TTL 변경으로 API 의미를 바꾸지 않는다.
3. Neople maintenance (`503`, `DNF980`, `SYSTEM_INSPECT`)와 일반 network/shape 오류를 구분한다.
4. helper별 반환 shape(list vs dict)를 caller와 같은 변경에서 마이그레이션한다.
5. `clean_text`는 whitespace 정리일 뿐 직업명 alias 함수가 아니다. job key 정규화를 이 함수에 암묵적으로 기대하지 않는다.
6. 공식 score provider의 `source`, `cached`, `stale`, nullable score 필드를 보존하거나 versioned migration을 한다.
7. 공식 score fresh miss, semantic null, network exception, stale fallback을 서로 구분한다.
8. 공식 홈페이지 endpoint/obfuscation 형식은 외부 비공개 계약에 가깝다. decoder 변경은 캡처 fixture와 함께 한다.

### 15.5 payload·presenter 계약 불변식

다음 필드와 단위는 producer와 consumer를 같은 변경에서 함께 마이그레이션해야 한다.

- dealer effect key와 `skillDamageMultiplier`
- `damageBaseline.stat`, `statName`, `baseStat`, `elementDamage`, `elementValues`
- buffer scalar change key: `statDelta`, `currentStatDelta`, `switchingStatDelta`, `buffPowerDelta`, 증폭 delta, 레벨 delta
- `bufferSkillContexts[contextKey].currentLevel`
- `netChangesByLevel`의 문자열 absolute-level key
- `baseSkillContributions`/`targetSkillContributions`의 `contextKey`, `levelContribution`
- source별 exclusive group key
- avatar socket key `<slotId>:<socketIndex>`
- switching package의 `targetPlatinumSkillLevel`
- official score 응답 `equipmentScore`, `buffScore`, `source`, `cached`, `stale`

presenter는 계산값의 단위나 의미를 몰래 바꾸는 계층이 되어서는 안 된다. presenter가 필드를 rename/filter할 수 있으므로, service object와 최종 route JSON 사이의 contract test가 필요하다.

## 16. 검증 체크리스트

### 16.1 정적·package·계약 검증

- [x] 제공된 모든 Python 파일 `py_compile` 통과
- [x] `enchantView.js` `node --check` 통과
- [ ] 실제 저장소 package layout에서 import 포함 smoke test 통과
- [ ] `Docs/jobBaseStat.json` 등 runtime path가 배포 artifact에 존재
- [ ] producer가 내보내는 모든 effect/change key가 consumer 허용 목록과 일치
- [ ] `bufferSkillContexts`의 모든 `currentLevel`과 reachable level이 정수
- [ ] context에 기록한 모든 absolute level이 `netChangesByLevel`에 존재
- [ ] 같은 exclusive group에 활성 선택이 둘 이상 남지 않음
- [ ] presenter 전 object와 route JSON의 계산 필드·단위 contract 일치
- [ ] official score API의 nullable/양의 유한수 검증과 `cached`/`stale`/error 상태 유지
- [ ] `resource` 문자열마다 character API `path`가 하나뿐인지 정적 검색

### 16.2 damage baseline·data store 테스트

- [ ] `load_job_base_stats`가 JSON key를 변환하지 않고 한 번 cache함
- [ ] `Docs/jobBaseStat.json` 누락 시 `{}`이며 process 중 자동 재로딩하지 않음
- [ ] 일반 직업 `jobGrowName` exact lookup의 기대 `baseStat`
- [ ] 남/여 크루세이더 `jobGrowName == "眞 크루세이더"` fixture에서 현재 key miss와 frontend 800 fallback 재현
- [ ] alias 정규화를 도입한다면 남/여 직업군을 입력으로 구분하고 충돌 없음
- [ ] 힘>지능, 힘<지능, 힘=지능에서 initial `statName`/`stat`
- [ ] avatar primary stat이 initial과 달라지는 모든 case에서 힘=지능 invariant
- [ ] status duplicate name의 마지막 row 정책
- [ ] `elementDamage` 행 있음/0/누락과 equipment base element 조합

### 16.3 딜러 수식 단위 테스트

- [ ] 빈 effect의 multiplier가 정확히 1
- [ ] finalDamage, attackIncrease, attackAmplification 각각의 단독 전후비
- [ ] `elementAll × 0.45`와 elementDamage fallback 분기
- [ ] 공격력 `+31215` 분모/분자
- [ ] 유효 스탯의 `Math.trunc` 경계: 양수·0·음수
- [ ] `allStat: 0`과 `str`/`int`가 함께 있을 때 현재 우선순위
- [ ] skill multiplier의 0, 음수, NaN, 양수 처리
- [ ] source replacement에서 current=target이면 증분 0
- [ ] 동일 최종 선택을 다른 순서로 적용해도 결과 동일
- [ ] 칭호 단일 속성이 선호 속성과 일치/불일치하는 경우
- [ ] 네 속성 최댓값이 교체로 바뀌는 경우
- [ ] actual과 equipmentScore multiplier가 서로 다른 fixture에서 분리됨
- [ ] 예상 장비점수 `.5` 전후의 `Math.round` 경계

### 16.4 아바타·item skill multiplier 테스트

- [ ] `get_level_attack_percent`가 `rows`/`option`/`levels`와 string/optionValue 형식을 각각 읽음
- [ ] 요청 레벨 최대 초과는 최대 row로 clamp
- [ ] 최소 미만 또는 누락 row는 계산 불가
- [ ] `M=(1+A(L+d)/100)/(1+A(L)/100)` exact 값
- [ ] 동일 스킬 상의+플래티넘 2개가 `d=3` 한 번으로 계산됨
- [ ] 서로 다른 두 스킬 ratio가 곱해짐
- [ ] 스킬 하나 미계산이면 combo 전체 `calculable=false`
- [ ] style base level에 equipment/creature/aura/artifact bonus가 정확히 한 번 추가됨
- [ ] positive override가 style+setup 합보다 우선
- [ ] item reinforce skill이 여러 matching 스킬 중 최대 multiplier 하나만 선택
- [ ] 제거되는 현재 플래티넘 ratio 미계산 시 현재의 손실 0 처리 재현

### 16.5 skill repository·character cache 동시성 테스트

- [ ] 동일 `(jobId, skillId)` 동시 miss N개에서 Neople fetch 1회
- [ ] owner 성공 시 모든 waiter가 동등하지만 서로 독립인 deepcopy를 받음
- [ ] owner 예외 시 모든 waiter가 예외를 받으며 in-flight가 정리됨
- [ ] empty dict는 cache되지 않아 다음 호출이 다시 fetch함
- [ ] 장기 실행에서 skill cache size 관측 또는 cap 정책 테스트
- [ ] waiter hang을 탐지할 timeout/watchdog 테스트
- [ ] character skill context 동일 캐릭터 동시 miss의 중복 build 횟수 측정
- [ ] character memory 15초/SQLite 60초 hit 순서
- [ ] 동일 resource에 다른 path를 의도적으로 넣었을 때 collision을 검출하는 guard test
- [ ] character API 실패 시 stale payload를 반환하지 않는 현재 정책

### 16.6 버퍼 단위 테스트

- [ ] 5개 `bufferKey`별 coefficient table과 기대 점수
- [ ] 비지원 직업, 남크루 딜러 스타일, config 누락 처리
- [ ] `statDelta`가 현재·스위칭 양쪽에 들어감
- [ ] `currentStatDelta`와 `switchingStatDelta`가 서로 다른 항에만 들어감
- [ ] `selfStatSkillDelta`가 두 적용 스탯에 한 번씩만 들어감
- [ ] current/switching 증폭의 clamp 비대칭
- [ ] buff/awakening level 0, NaN, 음수 경계
- [ ] aura stat/attack이 최종 합에만 들어감
- [ ] 직업 계수가 main buff에만 들어감
- [ ] current/switching 슬롯 fallback이 누락 row에서 유지됨
- [ ] context absolute level +2가 실제 레벨 table값을 사용
- [ ] context 범위 밖에서 `RangeError`
- [ ] 비유한 scalar에서 `TypeError`
- [ ] 여러 source가 같은 context에 +1씩 기여할 때 +2 absolute level을 한 번 평가
- [ ] source 하나가 +1, 다른 source가 −1이면 net 0
- [ ] switching avatar package + 별도 platinum 중복 보정
- [ ] 추천 exact resolver 실패 시 row에 지원 불가 상태가 노출됨
- [ ] 공식 buffScore 존재/부재에서 표시 anchor 동작

### 16.7 enchant service·normalizer·presenter 통합 테스트

- [ ] live item detail이 있으면 DB fallback보다 detail source가 우선
- [ ] detail이 없으면 DB source/effects 유지
- [ ] max upgrade enchant row 선택
- [ ] card/material item의 dealer/buffer role 보존
- [ ] 네 스탯 동일 status가 `allStat`
- [ ] 체력 only, 정신력 only, 힘 only, 지능 only의 현재 유실/unsupported 동작을 fixture로 고정
- [ ] normalizer 개선 시 `vit`/`spr` 및 `baseline.statName` 선택 end-to-end
- [ ] fresh price cache, stale-while-refresh, cold-refresh 빈 payload 상태
- [ ] `/api/enchant-cards?role=buffer`가 skill context를 포함
- [ ] `load_character_enchants` presenter 전 object와 `/api/character-enchants` JSON 일치
- [ ] avatar presenter 전 object와 `/api/character-loadout`의 `avatar` shape 일치

### 16.8 source별 시뮬레이터 통합 테스트

- [ ] 마법부여 슬롯 교체와 다른 활성 슬롯 유지
- [ ] 강화 ↔ 증폭 같은 슬롯 교체
- [ ] 장비 조율 level 누적과 원복
- [ ] 서약 조율/획득으로 세트 포인트 구간이 바뀌는 경우
- [ ] 흑아 액세서리 slot 교체
- [ ] 크리쳐와 아티팩트 type의 독립성
- [ ] 오라·칭호·크리쳐가 skill context와 scalar를 동시에 바꾸는 경우
- [ ] 현재 아바타 일반 엠블렘 socket 교체
- [ ] switching avatar package 후 socket overlay 교체
- [ ] 플래티넘 스킬 제거값을 계산할 수 없는 fixture
- [ ] 현재 칭호/크리쳐/장비와 switching source가 다른 캐릭터에서 current-only 후보 scope
- [ ] `switchingTitleUsesCurrent=true/false` 양쪽의 exact/legacy 경로

### 16.9 공식 score provider·UI 통합 테스트

- [ ] 8개 serverId mapping과 unsupported server 400
- [ ] official search `body` list와 exact name/server row 선택
- [ ] 캡처 fixture의 `equipmentPoint`/`buffPoint` decode golden value
- [ ] 잘못된 base64, key, salt, non-digit 결과가 `None`
- [ ] fresh cache hit: `cached=true`, `stale=false`
- [ ] expired cache + network 예외: stale 반환
- [ ] expired cache + HTTP 200 empty/exact miss/decode failure: 현재 null 반환
- [ ] score가 둘 다 null이면 cache에 저장하지 않음
- [ ] route unexpected exception이 null JSON으로 축약됨
- [ ] 프런트 request id/character key 변경 중 늦은 응답 무시
- [ ] 딜러 공식점수 × equipmentScore multiplier + `Math.round`
- [ ] 버퍼 공식점수 + 내부 absolute delta
- [ ] official score 부재에서 actual dealer metric과 internal buffer score가 계속 동작

### 16.10 golden fixture에 저장할 값

각 기준 캐릭터마다 최소 다음을 같은 snapshot으로 저장한다.

```text
Neople raw detail/status/equipment/avatar/creature/oath/skill-style/buff payload
raw payload의 조회 시각과 cache source
jobName/jobGrowName 및 jobBaseStat lookup key/result
server-built damageBaseline
server-built bufferBaseline
bufferSkillContexts
avatar skill detail과 current/style/setup/target level
source별 base-relative change map
reference state resolved changes
candidate state resolved changes
딜러 actual multiplier
딜러 equipmentScore multiplier
내부 base/current buffer score
공식 홈페이지 fetch raw row(민감정보 제외), decoded equipmentScore/buffScore
공식 score cached/stale 상태
표시용 base/current score
UI 반올림 전/후 값
presenter 전 object와 route JSON
```

공식 홈페이지 화면과 API/내부 계산을 비교할 때는 같은 시각에 수집되지 않은 값을 동일 기준값으로 간주하지 않는다.

# 코드 리뷰 findings — 심각도순

> 심각도는 제공된 두 코드 묶음을 함께 정적으로 검토한 결과다. 실제 발생 빈도는 raw API fixture·운영 로그가 있어야 확정할 수 있다. “코드 확정”은 입력이 해당 형태일 때의 동작이 확정됐다는 뜻이며, 운영 데이터에 그 입력이 반드시 존재한다는 뜻은 아니다.

## 이전 High 5건 재판정

| 최초 초안 | 재판정 | 현재 위치 | 근거 요약 |
|---|---|---|---|
| H1 아바타 주스탯 이름 변경 시 `stat`/`baseStat` 축 불일치 | **기각** | active finding에서 제거, §1.6에 invariant 기록 | status 힘≠지능이면 avatar selector도 같은 큰 축을 고르고, 다른 축 선택은 힘=지능일 때만 가능하므로 수치는 동일. `character_equipment_service.py` L552, L3338-L3366 |
| H2 server `elementDamage=0`이 frontend fallback 차단 | **High 유지** | 현재 H1 | server는 0을 명시하고 frontend는 finite 0을 유효값으로 인정. `character_equipment_service.py` L566-L571; `enchantView.js` L972-L974 |
| H3 Crusader `baseStat` key가 loader 정규화에 의존 | **조건부 해제, Medium 하향** | 현재 M1 | loader는 JSON을 무변환 exact key로 읽으므로 mismatch는 확정. 다만 buffer 공식은 `baseStat`을 쓰지 않아 영향 범위가 딜러 baseline 일부로 좁음. `data_store.py` L96-L104 |
| H4 분리된 switching source에도 current change 공통 적용 | **High 유지** | 현재 H2 | baseline은 source를 분리하지만 generic adapter는 `statDelta`와 양쪽 증폭 delta를 사용 |
| H5 개별 체력·정신력 effect 유실 | **High 유지** | 현재 H3 | 실제 `enchant_service` producer가 해당 normalizer를 사용함이 확인됨 |

## High

### H1. server의 `elementDamage = 0`이 frontend fallback을 차단함

**근거**

- status에 `속성 피해` 행이 없거나 최댓값이 0이면 server는 `elementDamage: 0`을 명시한다. 장비 기본 속강의 `×0.45`도 status 값이 truthy일 때만 더한다.
  `character_equipment_service.py::build_damage_baseline_from_status_payload` L566-L571, L594.
- frontend는 `Number.isFinite(Number(baseline.elementDamage))`이면 0도 유효값으로 사용하고, `5 + element*0.45` fallback을 적용하지 않는다.
  `enchantView.js::getDamageBaseline` L972-L974.

**영향**

해당 입력에서는 baseline 속성 배율이 1에서 시작하고, 후보 속강 전후비도 `ED=0` 기준으로 계산된다. 누락 필드와 명시적 0을 같은 값으로 축약하므로 API shape 변화·부분 미제공이 큰 계산 불연속으로 이어질 수 있다.

**확실성**

분기 동작은 코드 확정이다. 실제 Neople status가 지원 캐릭터에서 속성 피해를 항상 제공하는지는 raw fixture가 필요하다. 공식 API 문서는 status가 접속 상태 등에 따라 미제공될 수 있다고 명시한다.
[외부 확인: Neople Developers — 던전앤파이터 API Docs](https://developers.neople.co.kr/contents/apiDocs/df)

**권고**

server가 “행 없음”을 `null`로 보존하고 frontend 한 곳에서 fallback하게 하거나, server가 항상 최종 `elementDamage`를 완성하고 frontend fallback을 제거한다. 세 상태—행 없음, 명시적 0, 양수—를 별도 fixture로 둔다.

### H2. current source 변화가 분리된 switching 세팅에도 공통 적용될 수 있음

**근거**

- baseline builder는 현재 장착과 버프강화 장착을 슬롯별로 분리하고, switching item이 있으면 current 대신 사용한다. `switchingTitleUsesCurrent`도 계산한다.
  `character_equipment_service.py::get_buffer_switching_stat_delta` L4415-L4460, L4570-L4581.
- generic current item adapter는 직접 스탯을 `statDelta`로 만들어 current와 switching 양쪽에 넣고, buff amplification 변화도 current/switching 두 delta에 모두 넣는다.
  `enchantView.js::getBufferEquippedItemBaseRelativeChanges` L1714-L1742.
- current enchant adapter 역시 switching slot 대체 여부를 확인하지 않고 `statDelta`를 사용한다.
  `getBufferEnchantBaseRelativeChanges` L1590-L1620.
- legacy title 경로는 `switchingTitleUsesCurrent`를 보지만 exact generic wrapper는 보지 않는다.
  `getBufferItemSkillChanges` L2062-L2076; `getBufferTitleBaseRelativeChanges` L1802-L1809.

**영향**

현재 칭호·크리쳐·장비와 switching source가 다른 캐릭터에서 current 후보의 stat, amplification, skill contribution이 main buff의 switching 상태에도 적용될 수 있다. baseline의 “switching-current” 차이와 candidate scope가 달라져 과대·과소평가가 가능하다.

**확실성**

runtime 공통 적용은 코드 확정이다. 제품 정책이 current 후보 선택 시 switching item도 함께 바꾸는 것인지는 제공 코드에 없다.

**권고**

source/slot마다 `usesCurrentInSwitching`을 명시하고, 공유하면 `statDelta`, 분리하면 `currentStatDelta`를 사용한다. amplification과 skill context contribution에도 동일 scope를 적용한다.

### H3. 실제 마법부여 후보 경로에서 개별 체력·정신력이 유실될 수 있음

**근거**

- normalizer는 힘·지능·체력·정신력을 읽지만, 네 값이 모두 같을 때만 `allStat`; 그 외 `str`/`int`만 출력한다. `vit`/`spr`은 schema에 없다.
  `effects.py` L3-L13, L53-L72.
- 실제 카드·재료형 마법부여 producer가 item detail status를 이 normalizer에 통과시킨다.
  `server/enchant_service.py::build_material_enchant_sources` L289-L325, `build_enchant_sources_from_detail` L328-L363.
- buffer enchant adapter는 changed effect key가 `allStat` 외이면 지원하지 않는다.
  `enchantView.js::getBufferEnchantBaseRelativeChanges` L1590-L1620.

**영향**

체력/정신력 단일 또는 비대칭 마법부여는 직접 스탯이 사라질 수 있다. 힘/지능 단일 후보는 `str`/`int`가 남아도 buffer adapter가 `null`을 반환한다. 실제 후보 DB/API에 이런 형태가 있으면 후보 누락, 적용 불가, 0점 평가가 가능하다.

**확실성**

입력 형태가 들어왔을 때 유실은 코드 확정이다. 운영 후보가 항상 네 스탯 동일인지는 실제 DB/fixture가 필요하다.

**권고**

effect schema에 `vit`/`spr`을 보존하고 buffer resolver가 `baseline.statName` 축을 선택하게 한다. 또는 producer가 명시적인 `bufferStat` key로 변환하되 원본 축과 변환 이유를 남긴다.

## Medium

### M1. Crusader `jobBaseStat` exact-key mismatch가 800 fallback으로 숨겨짐

**근거**

- loader는 `Docs/jobBaseStat.json`을 무변환 `json.load`하고 cache한다.
  `server/data_store.py::load_job_base_stats` L96-L104.
- JSON key는 `眞 크루세이더(남)`, `眞 크루세이더(여)`다.
  `jobBaseStat.json` L36, L42.
- 실제 지원 tuple은 `jobGrowName == "眞 크루세이더"`이고 damage baseline은 그 문자열로 exact lookup한다.
  `character_equipment_service.py` L550-L552, L615-L623.
- miss의 `baseStat=0`은 frontend truthy fallback으로 800이 된다.
  `enchantView.js::getDamageBaseline` L955-L980.

**영향**

Crusader 딜러 damage/equipmentScore stat factor가 직업 기본값이 아니라 800을 쓸 수 있다. 특히 buffer baseline이 `None`이 되는 남크루 딜러 스타일이 직접 영향권이다. `calculateBufferScore`는 `baseStat`을 사용하지 않으므로 버퍼 공식 자체는 영향받지 않는다.

**권고**

`(jobName, jobGrowName)` 기반 alias table을 단일 함수로 만들거나 JSON key를 API 계약과 일치시킨다. miss를 0으로 숨기지 말고 warning/debug metadata를 남긴다.

### M2. 기존 문서의 status `finalDamage`와 실제 baseline 계약이 다름

**근거**

- 기존 문서는 status에서 최종 데미지를 읽는다고 설명한다.
  `EQUIPMENT_SCORE_REVERSE_ENGINE.md` L720-L724.
- 현재 server damage baseline에는 `finalDamage`가 없다.
  `character_equipment_service.py` L582-L598.
- frontend는 누락을 0으로 처리하고 source-local replacement multiplier를 별도 곱한다.
  `enchantView.js` L976-L979, L3361-L3405.

**영향**

문서대로 baseline final damage를 추가하면 source-local multiplier와 중복될 수 있다. 반대로 total status final damage가 필요했던 설계라면 현재 누락이다.

**권고**

“baseline에 total finalDamage를 포함할지, source-local replacement만 사용할지”를 명시적 결정으로 고정하고 golden test로 중복 여부를 검증한다.

### M3. `getDamageBaseline` truthy fallback이 lookup 실패와 정상값을 구분하지 못함

**근거**

`stat`, `baseStat`, `element`, `attack`은 `Number(value) || hardcodedDefault`다.
`enchantView.js::getDamageBaseline` L955-L980.

**영향**

0, 빈 문자열, `NaN`, missing key가 모두 같은 기본값으로 바뀐다. M1 같은 data 계약 오류가 계산 중단이나 경고 없이 정상처럼 보인다.

**권고**

필드별 `Number.isFinite`와 허용 범위를 사용하고 fallback 사용 여부를 debug payload/telemetry에 기록한다.

### M4. 일반 item reinforce skill은 복수 스킬 중 최대 한 개만 반영함

**근거**

- 실제 ratio는 누적 스킬 공격력 전후비다.
  `avatar_skill_calculator.py::get_skill_attack_ratio` L147-L163.
- `get_item_reinforce_skill_effect`는 matching 스킬을 순회하면서 기존 best보다 큰 multiplier만 교체한다.
  `item_skill_option_service.py` L74-L112.
- 아바타 combo는 반대로 서로 다른 스킬 ratio를 곱한다.
  `server/avatar_skill_optimizer.py::evaluate_avatar_combo` L328-L367.

**영향**

하나의 item이 복수 관련 스킬을 올리더라도 일반 item effect는 가장 큰 한 스킬만 대표한다. 개발자가 아바타 규칙과 동일하다고 오해하면 재구현 결과가 달라진다.

**권고**

최대 하나 선택이 의도라면 함수명·payload에 `selectedReinforceSkill` 의미를 명시한다. 의도가 아니라면 복수 스킬의 전체 딜 기여 정의부터 별도 설계한다.

### M5. 플래티넘 제거 ratio 미계산 시 현재 효과 손실을 0으로 봄

**근거**

현재 플래티넘을 제거하는 음수 delta에서 역 ratio를 계산할 수 없으면 multiplier를 나누지 않고 계속한다. 코드 주석도 제거 손실 0 처리라고 명시한다.
`avatar_skill_calculator.py::get_avatar_platinum_skill_damage_multiplier` L232-L262.

**영향**

현재 플래티넘 효율은 미계산이고 후보 효율만 계산되면 교체 후보가 낙관 평가될 수 있다.

**권고**

미계산을 0효과가 아니라 unsupported로 전달하고 추천 제외 또는 명시적 경고를 사용한다.

### M6. exact buffer skill context 실패가 legacy 근사 또는 초기 점수로 후퇴함

**근거**

- legacy `getSkillValueDelta`는 현재 한 단계 차이에 level delta를 곱한다.
  `enchantView.js` L2032-L2037.
- exact resolver 예외 시 recommendation은 `baseCandidateScore`/`baseScore`로 fallback하고 simulator 지원을 false로 둔다.
  L2627-L2631.

**영향**

비선형 table, 복수 활성 source, 범위 밖 level에서 현재 상태 상호작용을 반영하지 못할 수 있다. 오류 원인이 사용자에게 충분히 노출되지 않는다.

**권고**

fallback 종류와 context key/requested level을 row metadata에 남기고 exact/근사 점수를 UI에서 구분한다.

### M7. 일반 단일 속성 옵션이 `elementAll`로 붕괴함

**근거**

`normalize_enchant_status`는 화/수/명/암 단일 속강도 `elementAll`에 넣는다.
`effects.py` L47-L50.

칭호·크리쳐 아티팩트만 별도 summary에서 identity를 복원한다.
`effects.py` L75-L145.

**영향**

다른 source의 단일 속성 옵션은 선호 속성/현재 최대 속성과 무관하게 모든 속성 유효처럼 평가될 수 있다.

**권고**

`elementFire/Water/Light/Dark`를 보존하고 공통 resolver에서 현재 최대 속성 변화로 환산한다.

### M8. status와 item effect의 중복 row 축약 규칙이 다름

**근거**

- status map은 동일 이름의 마지막 row가 이긴다.
  `character_equipment_service.py::status_rows_to_map` L496-L501.
- item effect normalizer는 같은 범주의 최댓값을 선택한다.
  `effects.py::normalize_enchant_status` L28-L72.

**영향**

중복 payload에서 순서와 source에 따라 의미가 달라지며 baseline과 candidate effect의 축약 정책이 불일치한다.

**권고**

API상 중복 불가 assertion 또는 필드별 명시적 sum/max/last 정책과 duplicate fixture를 둔다.

### M9. 기존 문서의 `floor`가 코드의 `Math.trunc`/`Math.round`와 충돌함

**근거**

- 유효 스탯 내부는 `Math.trunc`.
  `enchantView.js::getEquipmentScoreEffectiveStat` L983-L988.
- 예상 장비점수 최종은 `Math.round`.
  `getSimulatedEquipmentScore` L3795-L3800.
- 기존 문서는 두 곳을 `floor`로 서술한다.
  `EQUIPMENT_SCORE_REVERSE_ENGINE.md` L80-L89, L720-L729.

**영향**

독립 구현과 test oracle이 음수 및 .5 경계에서 달라진다.

**권고**

기존 문서를 본 문서로 대체하고 언어별 정확한 rounding 함수를 테스트명에 포함한다.

### M10. current buff amplification은 음수 허용, switching만 0 clamp

**근거**

`currentAmp`에는 clamp가 없고 `switchingAmp`만 `Math.max(0, ...)`를 거친다.
`enchantView.js::calculateBufferScore` L2101-L2107.

**영향**

malformed change나 중복 차감으로 current amplification이 음수가 되면 awakening 쪽이 비정상 값으로 계속 계산될 수 있다.

**권고**

비대칭 의도를 fixture로 고정하거나 양쪽에 동일 domain validation을 적용한다.

### M11. buff/awakening level guard가 음수를 차단하지 않음

**근거**

`if (!buffSkillLevel || !awakeningSkillLevel)`은 음수 level을 truthy로 통과시킨다.
`enchantView.js` L2109-L2111.

**영향**

잘못된 change map이 음수 기초 계수를 만들 수 있다.

**권고**

`Number.isFinite(level) && level > 0`을 명시적으로 검증한다.

### M12. server의 buffer context 도달 범위가 모든 contribution source를 포함하지 않음

**근거**

- context builder의 추천 범위 산정은 enchant/current creature·aura·title/switching title 등을 포함한다.
  `character_equipment_service.py` L1193-L1276.
- 현재·switching avatar platinum, switching creature 등 프런트 contribution source 일부는 이 목록에 직접 포함되지 않는다.
- frontend fallback context는 현재 ±1이고, 합산 contribution이 없는 absolute level을 요구하면 `RangeError`다.
  `enchantView.js::getBufferBaselineSkillContexts` L1227-L1264, `resolveBufferNetChanges` L1326-L1345.

**영향**

같은 context에 여러 source가 +1씩 누적되는 조합이 exact simulator 미지원 또는 적용 실패가 될 수 있다.

**권고**

모든 contribution-producing source에서 reachable net range를 수집하거나 requested absolute level을 동적으로 확장한다.

### M13. official score stale fallback이 semantic miss에는 적용되지 않음

**근거**

expired cache가 있어도 HTTP 200 응답에서 `body`가 비었거나 exact row를 못 찾거나 decode가 모두 `None`이면 즉시 null response를 반환한다. stale은 예외가 발생할 때만 사용한다.
`server/repositories/equipment_score_repository.py::load_official_equipment_score` L294-L311.

**영향**

공식 endpoint의 일시적인 shape 변경, 검색 반영 지연, decode 계약 변경은 network 장애보다 더 자주 보일 수 있는데도 기존 점수를 활용하지 못한다. UI가 갑자기 “확인 불가”가 된다.

**권고**

semantic miss를 종류별로 기록하고, 명백한 “캐릭터 없음”과 provider parse/decode 실패를 분리하여 후자에는 stale fallback을 고려한다.

### M14. official score provider는 비공개형 endpoint·하드코딩 decoder에 강하게 결합됨

**근거**

- `df.nexon.com/world/character/fetch`의 `body`, `equipmentPoint`, `buffPoint`, `obfuscateKey` shape를 직접 사용한다.
  `equipment_score_repository.py` L220-L284.
- decoder에 두 byte suffix가 하드코딩되어 있고 version negotiation이 없다.
  L203-L217.
- route의 예상치 못한 예외는 HTTP 오류가 아니라 null score JSON으로 축약된다.
  `neople_hell_api_server.py` L788-L801.

**영향**

홈페이지 구현 변경 시 점수가 조용히 null이 될 수 있고, 장애 원인이 client에서 구분되지 않는다.

**권고**

provider schema version/parse reason을 내부 telemetry에 남기고, raw fixture 기반 decoder contract test와 alert를 둔다.

## Low

### L1. `allStat: 0`이 유효한 `str`/`int`를 가릴 수 있음

**근거**

`getSelectedStatEffect`는 `allStat`이 finite이면 0도 즉시 반환한다.
`enchantView.js` L990-L997.

**영향**

payload에 `allStat: 0`과 실제 `str`/`int`가 함께 있으면 선택 스탯 효과가 0이 된다.

**권고**

normalizer에서 key 상호배타를 강제하거나 0 key의 존재 의미를 명시한다.

### L2. 공격력·스탯 replacement의 외부 기반값 guard가 약함

**근거**

공격력 증가·증폭은 `max(0, baseline-current)`를 사용하지만 attack/stat은 단순 차감이다.
`enchantView.js::getReplacementIncrementalDamagePercent` L6069-L6087.

**영향**

malformed source effect가 baseline보다 크면 비정상 분모/유효 스탯에 접근할 수 있다.

**권고**

모든 denominator에 finite/positive assertion을 두고 unsupported 후보로 처리한다.

### L3. 기존 버퍼 문서에 실행 코드가 아닌 추측·운영 규범이 섞여 있음

**근거**

`BUFFER_CALCULATION_NOTES.md`의 숨은 소수점 가능성 및 변경 금지 문장은 현재 코드가 강제하는 동작이 아니다.
L266, L286-L293.

**영향**

개발자/AI가 계산 계약과 팀 메모를 혼동할 수 있다.

**권고**

계산 참조, 운영 정책, 실험 가설을 분리하고 증거 수준을 표시한다.

### L4. skill detail cache는 무기한·무제한이며 waiter timeout이 없음

**근거**

process-global cache에 TTL·size cap·invalidation이 없고 waiter는 `Event.wait()`를 timeout 없이 호출한다.
`server/repositories/skill_repository.py` L8-L57.

**영향**

장기 process의 cache growth와, owner가 비정상 종료 경로에서 event를 set하지 못할 경우 wait hang 위험을 운영상 관측하기 어렵다. 정상 Python 예외는 `finally`가 처리한다.

**권고**

cache cardinality metric, bounded/TTL 정책, waiter timeout과 timeout error를 둔다.

### L5. character skill context에는 single-flight가 없음

**근거**

cache lock은 조회/저장에만 쓰고 `_build_character_skill_context`는 lock 밖에서 실행된다.
`item_skill_option_service.py` L42-L56.

**영향**

동일 캐릭터의 동시 cold request가 detail/style/job skill API fan-out을 중복 수행할 수 있다.

**권고**

skill detail repository와 같은 key별 single-flight를 적용하거나 중복 build 횟수를 계측한다.

### L6. character raw cache key에 endpoint `path`가 없음

**근거**

key는 `(serverId, characterId, resource)`이고 fetch path는 별도 인자다.
`server/repositories/character_repository.py` L41-L46, L212-L234.

**영향**

미래 caller가 같은 resource 문자열에 다른 path를 쓰면 기존 cache가 잘못 재사용된다. 현재 call-site가 일대일이면 발생하지 않는 latent risk다.

**권고**

key에 normalized path를 포함하거나 resource→path registry/assertion을 둔다.

### L7. `jobBaseStat` 파일 부재가 process 수명 동안 빈 cache로 고정됨

**근거**

첫 호출에서 `FileNotFoundError`가 나면 `_JOB_BASE_STAT_CACHE={}`가 되고 재시도하지 않는다.
`server/data_store.py` L20, L96-L104.

**영향**

배포 순서나 mount 지연으로 파일이 뒤늦게 생겨도 process restart 전에는 모든 lookup이 계속 miss다.

**권고**

필수 데이터로 startup validation을 하거나 file-missing cache에 짧은 retry/명시적 reload 정책을 둔다.
