# DunPilot Code Review Implementation Plan

이 문서는 ChatGPT 코드 리뷰 대화를 항목별로 구현하는 동안 컨텍스트 압축이나
세션 변경으로 작업 목적과 절차를 잃지 않기 위한 실행 기준이다.

## Review Source

- ChatGPT conversation:
  `https://chatgpt.com/c/6a622b74-5d84-83ea-bbed-4e49be0d1462`
- Review title: `던파일럿 1차 시니어 코드 리뷰 결과`
- Review base: `refactor/aiRefactor` 브랜치의 당시 working tree
- Review scope: 운영 안정성, 보안, 테스트 가능성, 구조
- Excluded from the review: 던파 계산 공식의 공식 수치 일치 여부

리뷰의 파일 줄 번호와 파일 크기는 리뷰 당시 값이다. 각 항목을 시작할 때 현재
코드에서 함수와 호출 경로를 다시 찾아야 하며, 과거 줄 번호를 그대로 신뢰하지 않는다.

## Execution Contract

1. 아래 항목을 기본적으로 `1 -> 2 -> 3 -> 4 -> 5 -> 6` 순서로 하나씩 처리한다.
2. 한 번에 하나의 항목만 ChatGPT 대화에 지시한다.
3. ChatGPT는 `high` 모델을 사용하고 CodexPro로 현재 프로젝트 디렉터리를 직접 읽는다.
4. 파일 ZIP이나 코드 전체를 다시 업로드하지 않는다.
5. ChatGPT/CodexPro가 분석, 구현, 관련 테스트를 수행한다.
6. 이 세션의 Codex는 지시 범위, 실제 diff, 테스트 결과, 회귀 위험을 감독한다.
7. 결과가 불완전하면 같은 ChatGPT 대화에서 보완을 요청한다.
8. 항목 하나가 검증되면 변경 내용과 테스트 결과만 사용자에게 보고한다.
9. 이 작업을 진행하는 Codex는 커밋하지 않는다. 커밋 여부와 시점은 사용자가 직접 결정한다.
10. 사용자가 명시적으로 시작을 지시하기 전에는 메시지 전송, 코드 수정, 테스트,
    커밋을 시작하지 않는다.

## Change Rules

- 기존 미커밋 변경을 되돌리거나 덮어쓰지 않는다.
- 해당 리뷰 항목에 필요한 최소 범위만 수정한다.
- 계산식, 추천 정책, payload 계약은 해당 항목이 직접 요구하지 않으면 변경하지 않는다.
- 구현 전 현재 코드가 이미 문제를 해결했는지 먼저 확인한다.
- 이미 해결된 항목은 불필요하게 다시 구현하지 않고 근거와 검증 결과만 보고한다.
- 테스트를 실행했다고 주장하려면 실제 명령과 결과를 확인한다.
- 실패한 테스트와 확인하지 못한 범위를 숨기지 않는다.
- 운영 중인 `8787` 서버를 임의로 종료하거나 재시작하지 않는다.
- 커밋 전 `git diff --check`와 변경 범위에 맞는 문법·테스트·빌드를 확인한다.

## Progress

| No. | Finding | Severity | Status | Commit |
| --- | --- | --- | --- | --- |
| 1 | Neople API 키의 외부 오류 응답 노출 가능성 | P1 | 완료 | `fix(security): Neople API 키 노출 방지` |
| 2 | TTL 캐시의 만료 데이터 및 크기 정리 누락 | P1 | 완료 | `fix(cache): 만료 데이터와 캐시 크기 정리` |
| 3 | 공개 응답 캐시의 키별 Lock 무제한 증가 | P2 | 완료 | - |
| 4 | 테스트가 배포 게이트에 연결되지 않음 | P1 | 보류 | - |
| 5 | React 언마운트 후 이벤트 리스너 미정리 | P2 | 완료 | - |
| 6 | 백엔드·프런트엔드 거대 컨트롤러 구조 | 구조적 부채 | 대기 | - |

상태는 `대기`, `진행 중`, `검증 중`, `완료`, `보류` 중 하나를 사용한다.
항목을 시작할 때와 커밋한 뒤에만 이 표를 갱신한다.

## Completion And Retirement

리뷰 1~6번이 모두 완료되면 이 문서는 작업 기록으로만 남긴다.

- `Docs/WORK_CONTEXT.md`의 `현재 진행 목표`에서 이 문서와 ChatGPT 대화 포인터를 제거한다.
- 이 문서를 `AGENTS.md`의 필수 선행 문서나 다음 작업 목록에 추가하지 않는다.
- 완료 후에는 새 작업을 시작할 때 이 문서를 자동으로 읽거나 진행 상태를 갱신하지 않는다.
- 사용자가 이 코드 리뷰 기록을 명시적으로 요청할 때만 다시 연다.
- 완료된 구현의 지속적인 구조·운영 원칙만 기존 공식 문서에 필요한 만큼 반영한다.
- 기록 보존을 위해 파일 자체는 삭제하거나 다른 위치로 이동하지 않는다.

## Finding 1: API Key Exposure

### Review Evidence

- `server/neople_client.py`
- `neople_hell_api_server.py`
- `server/candidates/aura.py`
- `server/enchant_service.py`

일부 Neople API URL은 `apikey`를 query string으로 포함한다. 최종 요청 실패 시
원본 URL을 포함한 예외 문자열이 생성되고, 상위 경로가 `str(exc)`를 HTTP 오류
응답이나 성공 응답의 `errors` 배열에 넣을 수 있다. 로그 URL 일부는 정제하지만
예외 객체와 공개 응답 전체가 동일하게 정제된다는 보장이 없다.

### Intended Direction

- 예외 생성 시에도 API 키를 포함한 원본 URL을 사용하지 않는다.
- 내부 upstream 오류와 사용자 공개 오류를 분리한다.
- 공개 응답과 후보 `errors`에는 안전한 오류 코드와 문구만 제공한다.
- 예외, JSON 공개 응답, 로그에 secret이 포함되지 않는 회귀 테스트를 추가한다.
- 운영 키 교체는 코드 수정과 별개의 운영 작업으로 보고한다.

## Finding 2: Expired Cache Retention

### Review Evidence

- `server/repositories/character_repository.py`
- `server/item_skill_option_service.py`

캐릭터 응답 메모리 캐시와 스킬 컨텍스트 캐시는 TTL이 지나면 hit로 사용하지 않지만,
만료 entry 삭제와 최대 크기 제한이 부족할 수 있다. SQLite 캐시도 조회 시
`expires_at_ms`를 확인하지만 만료 row를 주기적으로 제거하지 않으면 파일이 계속
커질 수 있다.

### Intended Direction

- 조회 중 발견한 만료 메모리 entry를 제거한다.
- 메모리 캐시에 명시적인 최대 entry 수와 opportunistic pruning을 둔다.
- SQLite 만료 row는 저장 횟수 또는 제한된 주기에 맞춰 정리한다.
- 요청마다 `VACUUM`하지 않는다.
- 캐시 hit, TTL, single-flight, 실패 미캐시 등 기존 계약을 유지한다.

## Finding 3: Public Response Lock Retention

### Review Evidence

- `neople_hell_api_server.py`
- `_PUBLIC_RESPONSE_CACHE`
- `_PUBLIC_RESPONSE_LOCKS`
- `_LOADOUT_RESPONSE_INFLIGHT`

공개 응답 캐시는 최대 크기가 있지만 cache key별 `Lock` 저장소가 캐시 축출과 함께
정리되지 않아 서로 다른 요청 키 수만큼 계속 증가할 수 있다. 단순히 사용 직후 lock을
삭제하면 대기 스레드가 서로 다른 lock을 사용할 수 있으므로 안전하지 않다.

### Intended Direction

- 공개 응답 중복 계산 방지를 owner/waiter 수명주기를 갖는 in-flight entry로 바꾼다.
- 기존 loadout single-flight의 `Event`, result/error, `finally` cleanup 패턴을 우선
  재사용한다.
- 완료와 실패 모두에서 in-flight entry가 제거되는 회귀 테스트를 추가한다.
- 공개 응답 캐시의 기존 key, TTL, 성공 응답 저장 정책을 유지한다.

## Finding 4: Missing Test and Deployment Gate

### Review Evidence

- `package.json`
- `.github/workflows/pages.yml`
- `tests/`

JS/Python 테스트 파일은 다수 존재하지만 표준 `npm test` 또는 통합 `check` 명령이
없고, Pages workflow는 `npm ci`와 `npm run build`만 실행한다. 계산·추천 테스트가
깨져도 Vite build가 성공하면 배포될 수 있다.

### Intended Direction

- 기존 JS 테스트를 실행하는 표준 script를 추가한다.
- 기존 Python 테스트를 실행하는 표준 script를 추가한다.
- JS, Python, build를 묶는 검증 명령을 추가한다.
- GitHub Actions에서 검증 통과 후에만 배포하도록 한다.
- 현재 테스트 러너와 파일 구성을 확인하고 새 프레임워크를 불필요하게 도입하지 않는다.

## Finding 5: Frontend Event Cleanup

### Review Evidence

- `src/components/DnfHellTool.jsx`
- `src/dnfHellTool/initDnfHellTool.js`
- `src/dnfHellTool/eventBindings.js`
- `src/dnfHellTool/enchantView.js`

`initDnfHellTool()`의 cleanup이 실질적으로 비어 있는 반면, window, document, DOM
element에 직접 등록한 이벤트와 timer가 존재한다. 언마운트 후 재마운트하면 이전
context와 listener가 남아 중복 처리와 메모리 유지가 발생할 수 있다.

### Intended Direction

- 이벤트 등록 경로가 disposer 또는 `AbortController` 기반 cleanup을 반환하게 한다.
- `bindToolEvents()`와 `installEnchantView()`의 실제 현재 반환 계약부터 확인한다.
- `initDnfHellTool()`이 disposer와 timer cleanup을 합쳐 React effect cleanup으로
  반환하게 한다.
- HMR, mount/unmount, 재마운트에서 listener와 요청이 중복되지 않는 검증을 추가한다.
- 전체 프런트엔드를 React로 재작성하지 않는다.

## Finding 6: Large Controller Boundaries

### Review Evidence

- `server/character_equipment_service.py`
- `src/dnfHellTool/enchantView.js`
- `src/dnfHellTool/eventBindings.js`
- `src/components/DnfHellToolMarkup.jsx`

리뷰 당시 백엔드 service와 프런트 명령형 controller가 여러 레이어의 세부 책임을
동시에 알고 있었다. 다만 현재 저장소는 리뷰 이후 이미 여러 계산·identity·display
모듈을 분리했을 수 있으므로, 과거 파일 길이 자체를 문제로 보고 다시 쪼개면 안 된다.

### Intended Direction

- 먼저 현재 구조와 `Docs/WORK_CONTEXT.md`의 완료된 분리를 다시 평가한다.
- 응집된 코드를 줄 수만 보고 분리하지 않는다.
- 잘못된 책임 경계만 한 도메인씩 교정한다.
- 백엔드는 API client, repository/cache, candidate, calculator, presenter, route
  경계를 따른다.
- 프런트는 순수 계산과 identity는 모듈에 두고 simulator transaction, 권위 state,
  DOM/event 수명주기는 명확한 소유자에 둔다.
- 대규모 재작성, 일괄 파일 이동, 계산식 재구현은 하지 않는다.

## Per-Item Prompt Requirements

ChatGPT에 각 항목을 지시할 때 다음 내용을 포함한다.

- 현재 처리할 리뷰 번호와 제목
- 같은 대화의 기존 리뷰 근거를 다시 읽을 것
- 현재 코드에서 문제가 여전히 존재하는지 먼저 재검증할 것
- 이미 해결되었다면 코드 변경 없이 근거를 보고할 것
- 필요한 최소 변경만 구현할 것
- 기존 미커밋 변경을 보존할 것
- 변경 파일, 핵심 diff, 테스트 명령과 결과, 남은 위험을 보고할 것
- 커밋은 하지 말 것

## Supervisor Checklist

Codex는 ChatGPT/CodexPro 응답 후 다음을 직접 확인한다.

1. 실제 `git status`와 항목 관련 diff
2. 요청 범위를 벗어난 파일 변경
3. 기존 사용자 변경의 삭제 또는 대량 포맷 변경
4. 리뷰 finding의 원인이 실제로 제거됐는지
5. 테스트가 구현을 검증하며 단순 source 문자열 검사에 그치지 않는지
6. 실패·누락 검증과 운영 위험
7. 커밋에 해당 항목의 파일만 포함되는지

문제가 없을 때만 항목 상태를 `완료`로 바꾸고 항목별 커밋을 만든다.
