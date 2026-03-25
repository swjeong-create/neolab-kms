# NeoLab KMS 설정 가이드

## 1단계: Google Cloud Console 설정 (OAuth)

### 1-1. 프로젝트 생성
1. https://console.cloud.google.com 접속
2. 새 프로젝트 생성 (예: `neolab-kms`)

### 1-2. OAuth 동의 화면 설정
1. API 및 서비스 > OAuth 동의 화면
2. 사용자 유형: **내부** (Google Workspace 사용자만)
3. 앱 이름: `NeoLab KMS`
4. 범위 추가: `email`, `profile`
5. 저장

### 1-3. OAuth 클라이언트 ID 생성
1. API 및 서비스 > 사용자 인증 정보 > + 사용자 인증 정보 만들기 > OAuth 클라이언트 ID
2. 애플리케이션 유형: **웹 애플리케이션**
3. 이름: `KMS Web Client`
4. 승인된 리디렉션 URI 추가:
   - `http://localhost:3000/auth/google/callback` (개발용)
   - `https://kms.neolab.net/auth/google/callback` (운영용, Cloudflare Tunnel 사용 시)
5. 만들기 → **클라이언트 ID**와 **클라이언트 보안 비밀번호** 복사
6. `.env` 파일에 입력:
   ```
   GOOGLE_CLIENT_ID=복사한_클라이언트_ID
   GOOGLE_CLIENT_SECRET=복사한_보안_비밀번호
   ```

## 2단계: Google Sheets 서비스 계정 설정

### 2-1. 서비스 계정 생성
1. Google Cloud Console > IAM 및 관리 > 서비스 계정
2. + 서비스 계정 만들기
3. 이름: `kms-sheets-service`
4. 역할: 없음 (기본)
5. 완료

### 2-2. 키 파일 다운로드
1. 생성된 서비스 계정 클릭
2. 키 탭 > 키 추가 > 새 키 만들기 > JSON
3. 다운로드된 파일을 프로젝트 폴더에 `service-account.json`으로 저장
4. `.env` 파일 확인:
   ```
   GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./service-account.json
   ```

### 2-3. Google Sheets API 활성화
1. Google Cloud Console > API 및 서비스 > 라이브러리
2. "Google Sheets API" 검색 > 사용 설정

### 2-4. 스프레드시트 생성 및 공유
1. https://sheets.google.com 에서 새 스프레드시트 생성
2. URL에서 스프레드시트 ID 복사: `https://docs.google.com/spreadsheets/d/여기가_ID/edit`
3. `.env`에 입력:
   ```
   GOOGLE_SHEET_ID=복사한_스프레드시트_ID
   ```
4. **중요**: 스프레드시트 공유 > 서비스 계정 이메일 추가 (편집자 권한)
   - 서비스 계정 이메일: `service-account.json` 파일 안의 `client_email` 값

## 3단계: 서버 실행

```bash
# 의존성 설치
npm install

# 서버 시작
npm start

# 브라우저에서 접속
# http://localhost:3000
```

## 4단계: 기존 데이터 마이그레이션 (선택)

기존 localStorage 기반 KMS에서 데이터를 가져오려면:

1. 기존 KMS 접속 > 관리자 모드 > 백업/복원 > 💾 다운로드
2. 다운로드된 `kms_backup.json`을 프로젝트 폴더에 복사
3. 마이그레이션 실행:
   ```bash
   npm run migrate -- kms_backup.json
   ```
4. Base64 PDF 파일은 자동으로 `uploads/` 폴더에 추출됩니다

## 5단계: Cloudflare Tunnel 설정 (지사 접속용)

### 5-1. cloudflared 설치
```bash
# Windows (winget)
winget install Cloudflare.cloudflared

# 또는 공식 사이트에서 다운로드
# https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
```

### 5-2. 인증 및 터널 생성
```bash
cloudflared tunnel login
cloudflared tunnel create kms-tunnel
```

### 5-3. 설정 파일 생성
`%USERPROFILE%\.cloudflared\config.yml` 파일 생성:
```yaml
tunnel: kms-tunnel
credentials-file: C:\Users\사용자이름\.cloudflared\TUNNEL_ID.json

ingress:
  - hostname: kms.neolab.net
    service: http://localhost:3000
  - service: http_status:404
```

### 5-4. DNS 라우팅 설정
```bash
cloudflared tunnel route dns kms-tunnel kms.neolab.net
```

### 5-5. 터널 실행
```bash
cloudflared tunnel run kms-tunnel
```

### 5-6. Windows 서비스로 등록 (자동 시작)
```bash
cloudflared service install
```

### 5-7. Cloudflare Access 정책 설정 (선택)
1. https://one.dash.cloudflare.com 접속
2. Access > Applications > Add an application
3. Type: Self-hosted
4. Application domain: `kms.neolab.net`
5. Policy: Allow > Include > Emails ending in `@neolab.net`

## 6단계: .env 최종 확인

```env
# Google OAuth
GOOGLE_CLIENT_ID=1234567890-abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# 접근 제어
ALLOWED_DOMAIN=neolab.net
ADMIN_EMAILS=admin@neolab.net

# Google Sheets
GOOGLE_SHEET_ID=1AbCdEfGhIjKlMnOpQrStUvWxYz
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./service-account.json

# 서버
PORT=3000
SESSION_SECRET=최소32자이상의랜덤문자열을입력하세요
```

## 운영 팁

### Node.js 서버를 Windows 서비스로 등록
`node-windows` 패키지 또는 `pm2`를 사용하면 PC 부팅 시 자동 시작:
```bash
npm install -g pm2
pm2 start server.js --name kms
pm2 save
pm2 startup
```

### 관리자 추가
`.env`의 `ADMIN_EMAILS`에 쉼표로 구분하여 추가:
```
ADMIN_EMAILS=admin1@neolab.net,admin2@neolab.net
```

### Cloudflare Tunnel 사용 시 콜백 URL 변경
`.env`에서:
```
GOOGLE_CALLBACK_URL=https://kms.neolab.net/auth/google/callback
```
Google Cloud Console OAuth 설정에서도 동일하게 리디렉션 URI 추가 필요
