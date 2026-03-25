# KMS 서버 이관 안내

## 서버 접속 정보

| 항목 | 값 |
|------|-----|
| **IP** | `130.162.139.142` |
| **SSH 포트** | `22022` (기본 22가 아님, 주의) |
| **사용자** | `ubuntu` |
| **SSH 키** | 첨부된 `deploy-key-infra-kms` 파일 |
| **앱 디렉토리** | `/opt/neolab-kms` |

## 서버에 이미 설치된 것

- Ubuntu 22.04 (ARM)
- Node.js 20
- PM2 (프로세스 매니저)
- neolab-kms 코드 (git clone + npm install 완료)

## 배포 방법

자세한 절차는 첨부된 **앱-배포-가이드.md**를 참고해주세요.

요약하면:

```bash
# 1. SSH 키 파일을 ~/.ssh/ 에 저장
# 2. 서버 접속
ssh -i ~/.ssh/deploy-key-infra-kms -p 22022 ubuntu@130.162.139.142

# 3. .env 와 service-account.json 을 서버에 전송
scp -i ~/.ssh/deploy-key-infra-kms -P 22022 ./.env ubuntu@130.162.139.142:/opt/neolab-kms/
scp -i ~/.ssh/deploy-key-infra-kms -P 22022 ./service-account.json ubuntu@130.162.139.142:/opt/neolab-kms/

# 4. 앱 실행
ssh -i ~/.ssh/deploy-key-infra-kms -p 22022 ubuntu@130.162.139.142
cd /opt/neolab-kms
pm2 start server.js --name kms
```

## 확인

```
http://130.162.139.142:3000
```

## 코드 업데이트 시

```bash
ssh -i ~/.ssh/deploy-key-infra-kms -p 22022 ubuntu@130.162.139.142
cd /opt/neolab-kms
git pull
npm install
pm2 restart kms
```

## 문의

서버/네트워크 관련 문제는 인프라 담당자(swh1182@neolab.net)에게 연락해주세요.
