# Railway 배포 가이드

## 1. Railway 계정 생성
- [railway.app](https://railway.app)에서 GitHub 계정으로 로그인

## 2. 새 프로젝트 생성
- "Start a New Project" 클릭
- "Deploy from GitHub repo" 선택
- `hwangseungbo/KMCP_IoT-main` 저장소 선택

## 3. 환경 변수 설정
Railway 대시보드에서 다음 환경 변수들을 설정:

```
NODE_ENV=production
PORT=3000
Soket_IO_Port=3000
```

## 4. 배포 자동화
- GitHub에 푸시하면 자동으로 배포됨
- `railway.json` 설정에 따라 `npm start` 명령어로 서버 시작

## 5. 도메인 확인
- Railway에서 제공하는 도메인으로 접속
- WebSocket, RTSP 스트림 등 모든 기능 사용 가능

## 주의사항
- Railway는 WebSocket과 포트 바인딩을 완전히 지원
- RTSP 스트림도 정상 작동
- Socket.IO 서버도 온전히 동작
