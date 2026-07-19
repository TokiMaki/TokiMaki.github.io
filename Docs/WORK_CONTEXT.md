# WORK_CONTEXT

## Active Snapshot

- 현재 목표: DunPilot은 던전앤파이터 캐릭터의 현재 세팅을 분석해 마법부여, 증폭, 장비 조율, 서약 조율, 버프강화, 칭호, 크리쳐, 오라, 흑아 등 스펙업 후보의 골드 효율과 추천 순서를 비교한다.
- 현재 주요 파일: `neople_hell_api_server.py`, `server/character_equipment_service.py`, `server/enchant_service.py`, `server/repositories/*`, `server/candidates/*`, `server/calculators/*`, `server/presenters/*`, `src/dnfHellTool/enchantView.js`, `Docs/*.json`.
- 서버 구조 원칙: Route는 HTTP 요청/응답, Service는 orchestration, Repository/Cache는 캐시/TTL/single-flight/fallback, Candidate Resolver는 후보 탐색, Calculator는 수치 계산, Presenter는 프론트 payload 조립을 담당한다.
- 최근 구조 분리: Candidate Resolver, Repository/Cache, Calculator, Presenter 1차 분리를 완료했다. Route/Service 경계도 `/api/search`, `/api/summarize`, `/api/avatar-skill-efficiency`부터 얇게 정리했다.
- 최근 성능 구조: `/api/character-loadout`에는 origin 내부 15초 response cache와 같은 `(serverId, characterId)` 요청 single-flight가 있다. 성공 200 body만 최대 64개 메모리에 저장하고, cache hit/대기 요청은 heavy semaphore와 loadout 계산을 건너뛴다.
- 최근 성능 구조: `load_character_loadout()` 시작 시 현재 장비/오라/크리쳐/아티팩트/버프강화 장비·크리쳐 itemId를 모아 `fetch_item_details()`를 best-effort로 예열한다. 실패해도 본 계산 경로는 기존처럼 진행한다.
- 최근 성능 구조: `character_repository`는 캐릭터 원본 payload에 대해 기존 15초 메모리 TTL cache를 먼저 보고, miss 시 `cache/character-response-cache.sqlite`의 60초 SQLite cache를 확인한다. SQLite hit은 메모리 cache를 다시 채우며, API 성공 payload만 디스크에 저장한다.
- 최근 성능 구조: 서약 탭 표시용 `oathUpgrades` 조립 결과는 기존 `character-response-cache.sqlite`에 `resource="oathUpgrades"`로 저장한다. 기존 raw `oath`/`mist_assimilation` 캐시와 item detail memory cache를 재사용하며 새 SQLite 파일은 만들지 않는다.
- 최근 캐시 구조: `server/repositories/resolved_price_repository.py`는 300초 TTL, 최대 512개 memory-only resolved price cache를 제공한다. raw auction rows가 아니라 가격 후보로 해석 완료된 결과만 저장한다.
- resolved price cache 적용 domain: `avatar_emblem`, `platinum_emblem`, `black_fang_scroll`, `switching_fragment`, `aura`.
- 최근 계측 구조: `/api/character-loadout`의 `api_fanout_summary`는 API fan-out과 `resolvedPrice.total`, `resolvedPrice.byDomain`을 기록한다. domain별 hit/miss/store/skip/error만 남기고 itemName, skillName, scrollName 원문 key는 로그에 남기지 않는다.
- 최근 계측 구조: API 요청 종료 시 필요한 경우만 `[REQ]`/`[SLOW]` 요약 로그를 남긴다. route cache, character response cache(m/sql/api), Neople API, auction API, recommendation count를 짧게 기록하고 빠른 cache hit/보조 API 정상 응답은 기본 출력에서 숨긴다.
- 최근 부가 표시: `/api/equipment-score`는 공식 던파 캐릭터 검색 endpoint의 `equipmentPoint`를 복호화해 딜러 장비점수를 별도 조회한다. 추천 계산과 분리하며 `cache/character-response-cache.sqlite`의 `official_equipment_score_cache` 테이블에 60초 fresh/24시간 stale TTL로 저장한다.
- 최근 UI 정책: 스펙업 분석 검색 중에는 검색 패널을 제외한 결과 영역을 `분석중이에양...` 패널로 대체하고, character-loadout/추천/filter 준비가 끝난 뒤 캐릭터 정보·포함 항목·추천 목록을 한 번에 다시 표시한다.
- 최근 UI/API 정책: 서버 선택이 `전체`이면 `/api/search-all`로 서버 순서대로 캐릭터 후보만 가볍게 조회하고, 후보 카드를 클릭한 뒤에만 기존 `/api/search` → `/api/character-loadout` 분석 흐름을 실행한다. 후보 단계에서는 장비/서약/장비점수/추천 선조회 금지.
- 최근 캐시 구조: 전체 서버 후보 검색은 기존 `character-response-cache.sqlite`의 `character_search_candidate_cache` 테이블을 사용한다. 서버별로 `normalized_character_name + server_id` hit이면 검색 API를 건너뛰고, miss 서버만 API 검색 후 개별 후보 요약 row를 upsert하며 negative cache는 저장하지 않는다. 서버 선택의 `모험단`은 `normalized_adventure_name` exact match로 이 후보 요약 캐시만 조회하며 외부 API를 호출하지 않는다.
- 최근 UI 정책: 캐릭터 로드아웃 패널은 `장비`/`서약`/`아바타` 탭을 제공한다. 기본은 장비 탭이며, 서약 탭은 기존 `oathUpgrades.crystals` 배열과 setName/setPoint를 읽어 표시 전용 보드로 렌더링한다. 아바타 탭은 실제 payload 연결 전까지 캐릭터 프리뷰와 10개 아바타 슬롯을 `클론 레어` 상태로 읽기 전용 표시한다.
- 최근 버프강화 정책: `Docs/switching_avatar_db.json`은 클래스 단위 스위칭 상하의 레어 아바타 후보 DB다. 현재 경매장 매물 또는 최근 거래 이력이 확인된 itemId만 남긴다. 딜러는 버프강화 상의/하의 슬롯이 레어가 아닐 때 아바타+플티/플티 완성품 가격을 비교하며, 버프강화 아바타 슬롯이 비어 있으면 현재 착용 아바타를 fallback으로 현재 contribution에 반영한다. 버퍼는 `bufferBaseline.buffSkillName` 기준으로 상의/하의 아바타 매물을 플티와 주스탯 엠블렘 x2까지 채우는 총 비용으로 환산하되, 이미 레어 스위칭 상/하의 아바타가 있으면 합본 추천을 만들지 않고 기존 개별 플티/엠블렘 추천 흐름을 유지한다. 합본 추천의 버프 스킬 레벨 증가는 칭호처럼 해당 아바타 슬롯의 contribution 전후 차이로 계산한다. 장비 상의/아바타 상의가 모두 `slotId=JACKET`을 쓰므로 mixed switching rows에서는 `slotName`에 `아바타`가 있는 row만 아바타 교체 대상으로 삼는다. 경매장 row의 상의 옵션은 `avatar.ability`를 `optionAbility`로 정규화하고 nested emblems는 top-level로 올려 중복 카운트를 막는다. raw 버프강화 슬롯이 없어 현재 착용 아바타가 fallback으로 들어간 경우 `bufferStatGain`은 fallback/후보의 엠블렘 스탯 차이와 self-stat skill delta 차이만 반영하고, item detail 직접 스탯 차이는 제외한다.
- 최근 마부 정책: 업그레이드 가능한 마법부여 카드/보주는 효과를 max upgrade 기준으로 쓰므로 가격도 `upgrade == upgradeMax`인 풀업 경매장 row만 인정한다. 풀업 매물이 없으면 노업 가격으로 효율을 계산하지 않고 기존 가격 없음 흐름을 탄다. 같은 부위/효과 방향에서 가성비 또는 준종결 마부가 상위 tier보다 실제 효율이 낮으면 추천 row 후처리에서 제외한다.
- 최근 강화/증폭 정책: 무기 강화/증폭 추천은 현재 공격력 기준이 독립공격력이고 무기 재련이 있으면 115레벨 재련 독공 표를 반영한다. 독공 실효 증가는 `max(강화/증폭 독공, 현재 재련 독공)` 전후 차이만 인정하고, 12강 이상 최종 데미지 보너스는 기존처럼 별도 반영한다. 독공 비증폭 무기는 안전강화와 무기 증폭 후보를 비교해 효율 좋은 1개만 남긴다.
- 최근 버프강화 정책: 딜러 스위칭 칭호/크리쳐 contribution 계산은 `buffSkillName`과 `equivalentSwitchingPlatinumSkills`를 함께 인정한다. 레벨 범위형 효과는 target skill별 requiredLevel을 독립 합산하고, 추천 실효 상승량은 스위칭 레벨 cap 7을 적용한다.
- 최근 버프강화 UI: `buffLoadout` 슬롯에는 기존 판별 helper로 계산한 선택적 `buffContribution` 요약만 추가하며, 프론트 툴팁은 원본 enchant/emblems/detail 없이 해당 표시값을 그대로 사용한다.
- 최근 서약 정책: `서약 결정 초월`/`서약 정가` 추천은 각각 `oathTranscendRecommendations`/`oathCraftRecommendations` 별도 필드와 `oathTranscend`/`oathCraft` sourceType으로 기존 `oathUpgrades`/서약 조율과 분리한다. 장비 세트포인트 2550 미만 또는 미확인 캐릭터는 초월/정가 추천을 생성하지 않는다. target 서약 결정은 exact item search/detail 검증 후 생성하고, 딜러/버퍼별 유효 옵션과 세트포인트 교체 효과를 반영하며, 에픽/태초 추천은 rarity별 최상위 1개와 일반 에픽 8칸/태초 3칸 cap을 반영한다. 고유 current는 허용하되 target 고유는 제외하고, target set은 고유 이름이 아니라 다른 일반 서약 결정의 단일 family context로만 정한다. `창조의 안개 결정 - 반지`는 딜러 current 최종 데미지 19%로 계산한다.
- 운영 주의사항: 운영 서버 포트 `8787`은 임의 종료/재시작하지 않는다. 검증 서버는 `8799`만 사용한다. `pkill -f neople_hell_api_server.py`는 금지한다.
- 운영 주의사항: 8799 검증 서버를 종료해야 하면 먼저 해당 PID가 8799를 점유하는지 확인하고 그 PID만 종료한다. 8787 재시작/종료가 필요하면 실행하지 말고 먼저 보고한다.
- Docs 주의사항: `Docs/*.json`, `Docs/*.tsv`, `Docs/*.txt` 중 일부는 서버/스크립트가 직접 읽는 기준 데이터다. 문서 정리 중 이동하거나 수정하지 않는다.
- 문서 관리: 과거 작업 로그와 일회성 질문 기록은 공식 Active Snapshot에 누적하지 않는다. 필요한 결정만 짧게 남기고, 개인 세션 로그는 별도 로컬 문서로 관리한다.
- 공개 콘텐츠 결정: `Docs/PUBLIC_CONTENT_PLAN.md`에 던파일럿 갱신 캐릭터 기반 세팅 추정 가치, 주간 성장·큰손·가성비 랭킹, 공식 장비점수·버프점수 구간별 세팅 현황 방향을 기록했다. 실제 지출액이 아닌 현재가 기준 추정 가치로 표현한다.
- 최근 프론트 구조: `enchantEfficiencyScale.js`, `enchantEfficiencyLegend.js`, `enchantRecommendationControls.js`, `enchantRecommendationLayout.js` 등 표시 보조 모듈은 기존 책임을 유지한다. `enchantEquipmentProgression.js`는 강화·안전강화·증폭·증폭 전환의 누적 효과·비용·추천 row·시뮬레이터 identity를 소유하는 응집된 장비 성장 도메인이다.
- 최근 경계 교정: 추천 eligibility 초기화, 적용 상태 장식, 편집 중 표시 순서 고정은 서로 다른 view 수명주기라서 세 소형 모듈로 유지하지 않고 `enchantView.js` 로컬 함수로 복원했다. 호출·정렬·state mutation·event 순서는 유지했고, 해당 이동 전용 source/hash 테스트 3개는 삭제했다.
- 다음 작업: 서약 조율의 set-state 계산·조율 계획·효과·추천 row·identity를 첫 substantive 서약 도메인으로 분리한다. 서약 초월·정가 획득 정책과 simulator apply/remove/rollback·DOM 이벤트는 별도 경계로 남긴다.
