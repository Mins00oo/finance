## Finance Viz (OpenDART + Gemini)

회사명 검색 → `corp_code` 조회 → OpenDART “단일회사 주요계정” 시각화 → Gemini로 쉬운 한국어 요약을 제공하는 Next.js 앱입니다.

## Getting Started

### 1) 환경변수 설정

`.env.local`을 만들고 아래를 채웁니다(예시는 `.env.local.example` 참고).

- `OPENDART_API_KEY`: OpenDART 인증키
- `GEMINI_API_KEY`: Gemini API 키
- `CORP_XML_PATH`: 로컬 `corp.xml` 경로

### 2) corp.xml 경로만 맞추기

`CORP_XML_PATH`가 실제 `corp.xml`이 있는 경로를 가리키면 됩니다.

### 3) 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`을 열고 회사명을 검색합니다.

## 주요 엔드포인트

- `GET /api/corps?query=삼성`: 회사명 검색( DB `corp` )
- `GET /api/opendart/single-account?corpCode=00126380&years=5`: OpenDART 주요계정(캐시 포함)
- `POST /api/ai/analyze`: Gemini 요약(캐시 포함)

## 배포/보안 메모

- API 키는 **클라이언트에 절대 노출하지 않고**, 서버 라우트에서만 사용합니다.
- 키 미설정 시 API는 500이 아니라 **503(안내 메시지)** 로 응답하도록 처리했습니다.

