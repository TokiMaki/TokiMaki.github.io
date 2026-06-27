# ENCHANT_RECOMMEND_FLOW

## 범위

이 문서는 `스펙업 순서` 탭이 현재 어떻게 동작하는지 설명한다.

설명 대상:

- 프론트 검색 UI
- 캐릭터 현재 세팅 조회
- 시세/추천 데이터 조회
- 추천 렌더
- 현재 느린 이유

---

## 관련 파일

- 프론트 마크업: `src/components/DnfHellToolMarkup.jsx`
- 프론트 DOM 참조: `src/dnfHellTool/domRefs.js`
- 프론트 로직: `src/dnfHellTool/enchantView.js`
- 캐릭터 portrait 공용 마크업: `src/dnfHellTool/characterPresentation.js`
- API 서버 라우팅: `neople_hell_api_server.py`
- 캐릭터 장비/세팅 로딩: `server/character_equipment_service.py`
- 시세/추천 캐시 로딩: `server/enchant_service.py`
- 네오플 API 클라이언트: `server/neople_client.py`

---

## 1. 화면 구조

`src/components/DnfHellToolMarkup.jsx`

`스펙업 순서` 탭에는 현재 큰 블록이 3개 있다.

1. 검색 패널
   - 서버 선택
   - 캐릭터명 입력
   - 검색 버튼

2. 포함 항목 패널
   - 마법부여 / 증폭 / 칭호 / 크리쳐 / 오라 / 아바타 등 포함 여부 체크박스

3. 추천 영역
   - 왼쪽: 캐릭터 카드
   - 오른쪽: 스펙업 순서 추천 카드 목록

---

## 2. 프론트 초기 상태

`src/dnfHellTool/enchantView.js`

탭 로직이 초기화될 때 아래 상태를 들고 시작한다.

- `state.enchantTargetCharacter`
  - 현재 검색한 캐릭터
- `state.currentEnchants`
  - 현재 장비 마부
- `state.currentEquipmentUpgrades`
  - 현재 강화/증폭 정보
- `state.currentCreature`
  - 현재 크리쳐
- `state.currentTitle`
  - 현재 칭호
- `state.currentAura`
  - 현재 오라
- `state.currentAvatar`
  - 현재 아바타/플티 계산용 데이터
- `state.currentDamageBaseline`
  - 속강/공증/최종뎀 비교 계산 기준이 되는 캐릭터 총합값
- `state.enchantCards`
  - 마법부여 시세 DB
- `state.creatureUpgradeGroups`
  - 크리쳐 시세/추천 DB
- `state.creatureArtifactGroups`
  - 크리쳐 아티팩트 시세/추천 DB
- `state.titleUpgradeGroups`
  - 칭호 시세/추천 DB
- `state.auraUpgradeGroups`
  - 오라 시세/추천 DB
- `state.enchantPriceLoaded`
  - 시세 DB를 이미 한 번 불러왔는지 여부

즉 현재 구조는:

- 캐릭터 현재 세팅 데이터
- 추천 후보 시세 데이터

이 둘을 따로 들고 있다가 마지막에 합쳐서 추천을 만든다.

---

## 3. 검색 버튼을 누르면 일어나는 일

핵심 함수: `searchEnchantCharacter()`

### 3-1. 캐릭터 검색

먼저 프론트가 아래 API를 호출한다.

- `GET /api/search?serverId=...&characterName=...`

이 응답에서 받아오는 값:

- `serverId`
- `characterId`
- `characterName`
- `fame`
- `jobGrowName`

이 값으로 `state.enchantTargetCharacter`를 만든 뒤 portrait를 한 번 먼저 그린다.

이 시점에는 아직 장비/칭호/크리쳐 슬롯 데이터가 없어서 기본 카드만 뜬다.

### 3-2. 현재 캐릭터 세팅 조회

현재는 프론트가 아래 통합 API 1개를 호출한다.

- `GET /api/character-loadout`

이 응답 안에 아래 정보가 한 번에 들어 있다.

- 장비 마부
- 강화/증폭
- 흑아 추천용 현재 장비 상태
- `damageBaseline`
- 현재 크리쳐
- 현재 칭호
- 현재 오라
- 현재 아바타

이 중에서 추천 계산에 제일 중요한 건 `damageBaseline + 현재 마부/강화/증폭` 묶음이다.

이유:

- 현재 마부와 후보 마부 차이를 계산해야 하고
- 현재 강화/증폭과 후보 누적값 차이를 계산해야 하고
- `damageBaseline`이 있어야 속강/공증/최종뎀/공격력 증폭 효율 계산이 가능하기 때문이다.

### 3-3. 시세/추천 DB 조회

현재 캐릭터 세팅 5개가 끝난 뒤에야 프론트가 아래 4개를 부른다.

- `GET /api/enchant-cards`
- `GET /api/creature-upgrades`
- `GET /api/title-upgrades`
- `GET /api/aura-upgrades`

이 응답은 서버가 미리 정리해 둔 추천 후보 목록과 시세 캐시다.

이 데이터는 캐릭터별이 아니라 공용 DB 성격이다.

### 3-4. 추천 렌더

마지막에 `renderEnchantTable()`이 다음 데이터를 합친다.

- 카드 마부 후보
- 크리쳐 후보
- 크리쳐 아티팩트 후보
- 칭호 후보
- 오라 후보
- 아바타/플래티넘 후보
- 강화/증폭 후보
- 흑아 후보

그 뒤:

1. 포함 항목 필터 적용
2. 가격/효율 계산
3. 가성비 기준 정렬
4. 추천 카드 렌더

---

## 4. portrait 카드가 채워지는 방식

핵심 함수: `renderEnchantCharacterPortrait()`

현재 portrait는 검색 직후 한 번 뜨고, 이후 데이터가 들어올 때마다 다시 그린다.

- `loadCurrentEnchants()` 완료 후 다시 그림
- `loadCurrentCreature()` 완료 후 다시 그림
- `loadCurrentTitle()` 완료 후 다시 그림
- `loadCurrentAura()` 완료 후 다시 그림

즉 portrait는 한 번에 완성되는 구조가 아니라 점진적으로 채워진다.

---

## 5. 서버 구조

### 5-1. 라우팅

`neople_hell_api_server.py`

프론트 호출은 여기서 받아 각 서비스 함수로 넘긴다.

- `/api/search`
- `/api/character-enchants`
- `/api/character-creature`
- `/api/character-title`
- `/api/character-aura`
- `/api/character-avatar`
- `/api/enchant-cards`
- `/api/creature-upgrades`
- `/api/title-upgrades`
- `/api/aura-upgrades`

### 5-2. 캐릭터 현재 세팅 로딩

`server/character_equipment_service.py`

현재 프론트는 `load_character_loadout()`를 호출하고, 이 함수 안에서 기존 개별 로더들을 조합한다.

- `load_character_enchants()`
  - `equip/equipment`
  - `status`
- `load_character_creature()`
  - `equip/creature`
  - 필요 시 아이템 상세 조회
- `load_character_title()`
  - 다시 `equip/equipment`
  - 필요 시 아이템 상세 조회
- `load_character_aura()`
  - `equip/avatar`
  - 필요 시 아이템 상세 조회
- `load_character_avatar()`
  - 아바타 세팅 비교용 데이터 조립

추가로 같은 검색 묶음 안에서는 아래 원본 네오플 응답을 15초 TTL 메모리 캐시로 재사용한다.

- `equip/equipment`
- `equip/avatar`
- `equip/creature`
- `status`

### 5-3. 시세/추천 DB 로딩

`server/enchant_service.py`

이쪽은 캐릭터별 요청이 아니라 공용 시세 캐시다.

- 디스크 캐시 사용
- stale 데이터 즉시 반환 가능
- 백그라운드 갱신 가능

즉 시세 쪽은 이미 어느 정도 캐시가 있다.

반대로 캐릭터 현재 세팅 쪽은 매 검색마다 네오플 API를 다시 타는 구조다.

---

## 6. 지금 느린 이유

현재 느린 이유는 크게 4개다.

### 6-1. 프론트가 두 묶음을 순차 대기함

현재 검색 흐름은 사실상 아래 순서다.

1. `/api/search`
2. `/api/character-loadout` 완료 대기
3. `*-upgrades`, `enchant-cards` 4개 완료 대기
4. 추천 렌더

즉 예전의 `5 + 4` 구조보다는 줄었지만, 아직도 `현재 세팅 묶음`과 `시세 묶음`을 직렬로 기다린다.

### 6-2. 서버가 같은 캐릭터 데이터를 중복 조회함

예를 들면:

- `character-enchants`가 `equip/equipment` 조회
- `character-title`도 다시 `equip/equipment` 조회

이 부분은 현재 `character-loadout` 도입과 15초 TTL 캐시로 많이 줄었다. 다만 개별 로더 내부의 아이템 상세 조회까지 완전히 합쳐 놓은 상태는 아니다.

### 6-3. `character-enchants` 자체가 무거움

이 API는 단순 마부만 읽는 게 아니라:

- 장비 목록
- 강화/증폭
- 흑아 대상 확인
- 장비 자체 속강 누락분 계산용 정보
- `status`
- `damageBaseline`

까지 같이 만든다.

즉 추천 정확도에 필요한 핵심 API지만, 제일 무거운 축이다.

### 6-4. 배포 경로가 길다

현재 배포 구조가:

- 브라우저
- GitHub Pages
- Cloudflare Tunnel
- 로컬 API 서버
- Neople API

이기 때문에 로컬 개발 환경보다 기본 지연이 더 있다.

---

## 7. 지금 구조에서 가장 먼저 손대면 효과 큰 부분

### 7-1. 프론트 요청 순서

현재는 `character-*` 5개를 다 기다린 다음 `시세/추천` 4개를 시작한다.

이건 개선 여지가 크다.

가능한 방향:

- 검색 성공 직후 `character-enchants`와 시세 4개를 더 일찍 병렬 시작
- 크리쳐/칭호/오라/아바타는 portrait 보강용으로 뒤따라와도 됨

### 7-2. 서버 캐릭터 API 통합

현재는 같은 캐릭터에 대해:

- 장비
- 칭호
- 오라
- 아바타
- 크리쳐

를 여러 엔드포인트로 쪼개서 다시 읽는다.

효율을 높이려면:

- 장비/아바타/크리쳐를 한 번 읽고
- 거기서 title/aura/avatar 정보를 분리 추출하거나
- 아예 `character-summary` 같은 통합 엔드포인트를 두는 방식

이 더 낫다.

---

## 8. 한 줄 요약

현재 구조는:

- `캐릭터 현재 세팅 조회`
- `공용 추천 시세 조회`

를 합쳐서 추천을 만드는 구조다.

정확도는 높은 편인데, 첫 검색 시:

- 프론트가 순차 대기하고
- 서버가 네오플 API를 중복 호출해서

체감 속도가 느리다.
