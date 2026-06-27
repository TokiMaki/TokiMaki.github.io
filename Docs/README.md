# DunPilot Docs

이 폴더는 DunPilot 운영, 개발, 계산 기준, 후보 DB를 보관한다.

## 현재 핵심 문서

- `WORK_CONTEXT.md`: 현재 작업자가 먼저 확인하는 짧은 Active Snapshot.
- `architecture/ARCHITECTURE.md`: 현재 서버/프론트 레이어와 작업 원칙 요약.
- `operations/DEPLOY_LIGHTSAIL.md`: Lightsail 배포와 운영 전환 절차.
- `architecture/DUNPILOT_CODE_REVIEW.md`: 레포지토리 구조 리뷰 기준.
- `flows/ENCHANT_RECOMMEND_FLOW.md`: 스펙업 순서 탭의 요청/응답 흐름.
- `flows/BUFFER_CALCULATION_NOTES.md`: 버퍼 점수와 스위칭 계산 기준.

## 운영/배포 문서

- `operations/DEPLOY_LIGHTSAIL.md`는 서버 배포, systemd, nginx, Cloudflare 전환 절차를 다룬다.
- 실제 secret, API key, cloudflared token, 개인 경로는 문서에 기록하지 않는다.
- 로컬 실행용 shell/batch 파일은 git 관리 대상이 아니다.

## 계산/추천 흐름 문서

- `flows/ENCHANT_RECOMMEND_FLOW.md`: 현재 스펙업 추천 화면과 서버 호출 흐름.
- `flows/BUFFER_CALCULATION_NOTES.md`: 버퍼 계산에서 보존해야 하는 공식과 예외.
- `architecture/DUNPILOT_CODE_REVIEW.md`: Route, Service, Repository, Candidate, Calculator, Presenter 책임 경계.

## 연구/legacy 문서

다음 문서는 현재 운영 기능의 직접 문서라기보다 과거 설계나 역산 연구 자료다.

- `legacy/DNF_HELL_OPTIMIZER_SPEC.md`
- `research/EQUIPMENT_SCORE_REVERSE_ENGINE.md`
- `research/equipment_score_reverse_notes.md`
- `research/OATH_VALUE_REVERSE_TABLE.md`
- `research/OATH_VALUE_REVERSE_TABLE_WITH_FORMULAS.xlsx`
- `OATH_VALUE_REVERSE_TABLE.xlsx`
- `equipment_score_*`

정리 시 삭제하지 말고 `legacy/` 또는 `research/` 이동 대상으로 먼저 검토한다.

## 데이터 파일 주의

`Docs/*.json`, `Docs/*.tsv`, `Docs/*.txt` 중 일부는 서버나 생성 스크립트가 직접 읽는 기준 데이터다. 1차 정리에서는 코드 참조 가능성이 있는 JSON/TSV/TXT 데이터 파일을 이동하지 않는다.

- 임의 이동 금지
- 임의 수정 금지
- schemaVersion 변경 시 서버 캐시/로더 영향 확인

대표 데이터 파일:

- `enchant_card_db.json`
- `creature_upgrade_db.json`
- `title_upgrade_db.json`
- `aura_upgrade_db.json`
- `avatar_option_db.json`
- `creature_artifact_db.json`
- `jobBaseStat.json`
- `amplification_expected_db.json`
- `reinforcement_expected_db.json`
- `oath_tune_stage_db.json`
- `dealer_switching_*.json`

## 런타임 캐시

`Docs/.price_cache/`는 런타임 시세 캐시이며 git 관리 대상이 아니다. 캐시 파일은 서버 실행 중 재생성될 수 있다.
