# EmailJS 설정 가이드

실제 이메일 발송을 활성화하려면 EmailJS를 설정해야 합니다.

## 1. EmailJS 계정 생성

1. [EmailJS 웹사이트](https://www.emailjs.com/)에 접속
2. "Sign Up" 클릭하여 무료 계정 생성
3. 이메일 인증 완료

## 2. 이메일 서비스 연결

1. EmailJS 대시보드에서 "Email Services" 클릭
2. "Add New Service" 버튼 클릭
3. Gmail 선택 (또는 원하는 이메일 서비스)
4. Gmail 계정으로 로그인하여 연동
5. Service ID 복사 (예: `service_xxxxx`)

## 3. 이메일 템플릿 생성

1. EmailJS 대시보드에서 "Email Templates" 클릭
2. "Create New Template" 버튼 클릭
3. 다음 내용으로 템플릿 작성:

```
제목: {{app_name}}에 초대되었습니다

본문:
안녕하세요 {{to_name}}님,

{{app_name}}팀에 초대되었습니다!

아래 링크를 클릭하여 팀에 참여하세요:
{{invite_link}}

감사합니다.
```

4. Template ID 복사 (예: `template_xxxxx`)

## 4. Public Key 확인

1. EmailJS 대시보드에서 "Account" 클릭
2. "API Keys" 섹션에서 Public Key 복사 (예: `xxxxxxxxxxxxx`)

## 5. 환경 변수 설정

`.env.local` 파일을 열고 다음 값을 입력:

```env
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_xxxxx
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=template_xxxxx
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxx
```

## 6. 서버 재시작

```bash
# 개발 서버 중지 (Ctrl+C)
# 다시 시작
npm run dev
```

## 7. 테스트

1. 애플리케이션에서 "팀원 초대" 버튼 클릭
2. 이메일 주소 입력
3. "초대 보내기" 클릭
4. 실제 이메일이 발송되는지 확인

## 무료 플랜 제한

- 월 200통까지 무료
- 초과 시 유료 플랜으로 업그레이드 필요

## 문제 해결

### 이메일이 발송되지 않는 경우

1. `.env.local` 파일의 값이 올바른지 확인
2. EmailJS 대시보드에서 Service가 활성화되어 있는지 확인
3. 브라우저 콘솔에서 에러 메시지 확인
4. Gmail의 경우 "보안 수준이 낮은 앱" 설정 확인

### 스팸함으로 가는 경우

1. EmailJS의 발신자 설정에서 도메인 인증 추가
2. SPF, DKIM 레코드 설정 (유료 플랜)

## 참고 자료

- [EmailJS 공식 문서](https://www.emailjs.com/docs/)
- [React 통합 가이드](https://www.emailjs.com/docs/examples/reactjs/)
