# DunPilot Lightsail 배포 준비

이 문서는 현재 로컬에서 실행하던 DunPilot 백엔드 API를 AWS Lightsail 서울 리전 Ubuntu 서버로 옮기기 위한 배포 절차다. 실제 AWS 리소스 생성, Cloudflare DNS 변경, secret 입력은 수동으로 진행한다.

먼저 `api.dunpilot.com`을 바로 전환하지 말고 `api2.dunpilot.com` 같은 테스트 서브도메인으로 검증한다. 기존 로컬 Cloudflare Tunnel은 최종 전환 후 하루 정도 백업으로 유지한 뒤 수동 제거한다.

## 현재 레포 기준

- 백엔드 진입점: `neople_hell_api_server.py`
- 서버 실행 명령: `python3 neople_hell_api_server.py --host 127.0.0.1 --port 8787`
- 기존 Render 실행 명령: `python neople_hell_api_server.py --host 0.0.0.0`
- 로컬 시작 스크립트: `scripts/start_api_server.sh`
- 기본 host/port: `127.0.0.1:8787`
- 서버 포트 환경변수: `PORT`, 기본값 `8787`
- health check: `GET /api/health`
- Python 버전: 3.10 이상 필요. 코드가 `dict[str, Any]`, `str | None` 문법을 사용한다. Ubuntu 24.04 기본 Python 3.12 사용 권장.
- Python dependency: `requirements.txt`가 있지만 현재 백엔드 서버는 Python 표준 라이브러리만 사용한다.
- 필수 환경변수: `NEOPLE_API_KEY`
- 선택 환경변수: `PORT`, `API_SERVER_MODE`, `HEAVY_REQUEST_LIMIT`, `HEAVY_REQUEST_WAIT_SECONDS`
- 프론트 API 주소: `src/dnfHellTool/storageKeys.js`가 `VITE_API_BASE`를 우선 사용한다. 미설정 시 로컬에서는 `http://127.0.0.1:8787`, 배포된 웹에서는 같은 origin의 `/api`를 호출한다.
- GitHub Pages 빌드: `.github/workflows/pages.yml`에서 `VITE_API_BASE: ${{ vars.VITE_API_BASE }}`를 주입한다.
- Cloudflare Tunnel 전제: `scripts/start_api_with_tunnel.sh`, `scripts/start_cloudflare_tunnel.sh`가 로컬 API와 `cloudflared tunnel run`을 함께 실행하는 흐름이다.

## 1. Lightsail 인스턴스 생성

AWS Lightsail에서 다음 기준으로 인스턴스를 생성한다.

- Region: Seoul
- Platform: Linux/Unix
- Blueprint: Ubuntu 24.04 LTS 권장
- SSH key: 운영자가 관리하는 키 사용

생성 후 Lightsail Networking에서 방화벽 포트를 확인한다.

- 22/tcp: SSH
- 80/tcp: Cloudflare 또는 직접 HTTP 확인
- 443/tcp: nginx에서 TLS 종료를 할 경우 사용

## 2. Static IP 연결

Lightsail Static IP를 생성하고 인스턴스에 연결한다. 이후 Cloudflare DNS에는 이 Static IP를 사용한다.

```bash
# 로컬에서 확인
ssh ubuntu@<LIGHTSAIL_STATIC_IP>
```

## 3. 서버 패키지 설치

서버에 접속한 뒤 기본 패키지를 설치한다.

```bash
sudo apt update
sudo apt install -y git curl nginx python3 python3-venv
python3 --version
```

Python 버전은 3.10 이상이어야 한다.

## 4. git clone

예시는 `/opt/dunpilot` 아래에 배치한다. 다른 경로를 쓰면 systemd 템플릿의 `WorkingDirectory`, `EnvironmentFile`, `ExecStart` 경로를 함께 바꾼다.

```bash
sudo mkdir -p /opt/dunpilot
sudo chown ubuntu:ubuntu /opt/dunpilot
cd /opt/dunpilot
git clone <REPOSITORY_URL> dnf-hell-optimizer-react
cd /opt/dunpilot/dnf-hell-optimizer-react
```

## 5. Python venv와 dependencies

현재 서버는 표준 라이브러리만 사용하지만, `requirements.txt`를 기준으로 설치 절차를 유지한다.

```bash
cd /opt/dunpilot/dnf-hell-optimizer-react
python3 -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

## 6. 환경변수 파일 작성

systemd에서 읽을 env 파일을 작성한다. 실제 secret은 서버에서 직접 입력하고 레포에 커밋하지 않는다.

```bash
sudo tee /opt/dunpilot/dunpilot-api.env >/dev/null <<'EOF'
NEOPLE_API_KEY=replace_with_real_neople_api_key
PORT=8787
API_SERVER_MODE=prod
HEAVY_REQUEST_LIMIT=8
HEAVY_REQUEST_WAIT_SECONDS=15
EOF
sudo chmod 600 /opt/dunpilot/dunpilot-api.env
sudo chown ubuntu:ubuntu /opt/dunpilot/dunpilot-api.env
```

`NEOPLE_API_KEY` 외 값은 현재 코드 기본값과 같다. 필요할 때만 조정한다.

## 7. 백엔드 수동 실행

먼저 nginx/systemd 없이 로컬 loopback에서 서버가 뜨는지 확인한다.

```bash
cd /opt/dunpilot/dnf-hell-optimizer-react
. .venv/bin/activate
set -a
. /opt/dunpilot/dunpilot-api.env
set +a
python neople_hell_api_server.py --host 127.0.0.1 --port 8787
```

다른 SSH 세션에서 확인한다.

```bash
curl -s http://127.0.0.1:8787/api/health
```

정상 응답 예시는 다음과 같다.

```json
{
  "ok": true,
  "service": "dnf-hell-api",
  "mode": "prod",
  "port": 8787
}
```

## 8. systemd 등록

레포의 예시 파일을 복사하고 경로/user/port를 확인한다.

```bash
sudo cp /opt/dunpilot/dnf-hell-optimizer-react/deploy/lightsail/dunpilot-api.service.example /etc/systemd/system/dunpilot-api.service
sudo systemctl daemon-reload
sudo systemctl enable --now dunpilot-api
sudo systemctl status dunpilot-api
curl -s http://127.0.0.1:8787/api/health
```

로그 확인:

```bash
journalctl -u dunpilot-api -f
```

## 9. nginx reverse proxy 설정

`api2.dunpilot.com` 테스트 서브도메인 기준 예시를 복사한다.

```bash
sudo cp /opt/dunpilot/dnf-hell-optimizer-react/deploy/lightsail/nginx-api.conf.example /etc/nginx/sites-available/dunpilot-api
sudo ln -s /etc/nginx/sites-available/dunpilot-api /etc/nginx/sites-enabled/dunpilot-api
sudo nginx -t
sudo systemctl reload nginx
```

서버 내부에서 nginx 경유 확인:

```bash
curl -s -H 'Host: api2.dunpilot.com' http://127.0.0.1/api/health
```

Cloudflare에서 origin으로 HTTP 연결을 허용하는 구성이라면 이 상태로 `https://api2.dunpilot.com/api/health`를 테스트할 수 있다. nginx에서 직접 TLS를 종료할 경우에는 `api2.dunpilot.com` 인증서를 발급하거나 Cloudflare Origin Certificate를 설치한 뒤 443 server block을 추가한다.

## 10. Cloudflare DNS 연결

Cloudflare에서 실제 전환 전에 테스트 레코드를 추가한다.

- Type: `A`
- Name: `api2`
- IPv4 address: Lightsail Static IP
- Proxy status: Proxied 권장

DNS 전파 후 확인한다.

```bash
curl -s https://api2.dunpilot.com/api/health
```

정상 확인 후 실제 캐릭터 조회도 테스트한다.

```bash
curl -s 'https://api2.dunpilot.com/api/search?serverId=cain&characterName=<CHARACTER_NAME>'
```

## 11. 프론트 API 주소 확인

GitHub Pages 프론트가 별도 API 도메인을 바라봐야 한다면 GitHub Actions 변수 `VITE_API_BASE`를 테스트 중에는 다음처럼 설정해 빌드한다.

```text
VITE_API_BASE=https://api2.dunpilot.com
```

검증 후 운영 전환 시에만 `https://api.dunpilot.com` 또는 기존 운영 API 도메인으로 바꾼다. 이번 배포 준비 작업에서는 프론트 코드를 수정하지 않는다.

## 12. 배포 후 확인 절차

1. `systemctl status dunpilot-api`가 active인지 확인
2. `curl -s http://127.0.0.1:8787/api/health` 확인
3. `curl -s -H 'Host: api2.dunpilot.com' http://127.0.0.1/api/health` 확인
4. `curl -s https://api2.dunpilot.com/api/health` 확인
5. `/api/search`로 실제 캐릭터 조회 확인
6. 프론트 빌드의 `VITE_API_BASE`가 테스트 API 도메인인지 확인
7. 브라우저에서 캐릭터 검색, 세팅 조회, 추천 row 로딩 확인

## 13. 운영 전환

테스트 서브도메인에서 문제가 없으면 Cloudflare DNS 또는 GitHub Actions 변수의 운영 API 주소를 전환한다. `api.dunpilot.com`을 바로 바꾸기 전에 TTL, SSL mode, 캐시 영향을 확인한다.

기존 로컬 Cloudflare Tunnel은 전환 직후 바로 제거하지 말고 하루 정도 백업으로 유지한다. 문제가 없으면 `cloudflared` tunnel 설정과 로컬 시작 스크립트 사용을 수동으로 중단한다.

## 14. 롤백 방법

문제가 생기면 DNS 또는 프론트 API base를 기존 로컬 Cloudflare Tunnel 도메인으로 되돌린다.

서버 프로세스 롤백:

```bash
sudo systemctl stop dunpilot-api
sudo systemctl disable dunpilot-api
```

nginx 설정 비활성화:

```bash
sudo rm /etc/nginx/sites-enabled/dunpilot-api
sudo nginx -t
sudo systemctl reload nginx
```

코드 버전 롤백이 필요하면 서버의 repo에서 이전 커밋으로 checkout 후 service를 재시작한다.

```bash
cd /opt/dunpilot/dnf-hell-optimizer-react
git fetch
git checkout <KNOWN_GOOD_COMMIT>
sudo systemctl restart dunpilot-api
curl -s http://127.0.0.1:8787/api/health
```

## 15. 확인 필요

- Lightsail에 사용할 실제 Ubuntu 버전과 OS user
- 레포 clone URL과 배포 경로
- Cloudflare SSL mode. 가능하면 Full 또는 Full strict 구성을 확인한다.
- GitHub Pages 운영 빌드의 `VITE_API_BASE` 값을 언제 `api2`에서 운영 도메인으로 바꿀지
- 실제 캐릭터 조회 테스트에 사용할 캐릭터명
