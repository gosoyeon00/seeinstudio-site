# 시인 스튜디오 홈페이지 (seeinstudio.co.kr)

## 포트폴리오 수정 요청하는 법 (폰에서 Claude에게)

영상 포트폴리오는 `index.html` 안에 **영상 하나가 한 줄**로 정리돼 있어요.
아래처럼 말하면 됩니다.

- **추가**: "포트폴리오에 이 영상 추가해줘. https://youtu.be/XXXX / 제목: 2026 OO포럼 행사 스케치 / 분류: 행사 스케치"
- **순서**: "이 영상을 행사 스케치 맨 앞으로 올려줘."
- **삭제**: "포트폴리오에서 'OO 공연' 영상 빼줘."
- **제목 수정**: "'OO 포럼' 영상 제목을 '△△'로 바꿔줘."

분류는 둘 중 하나예요.
- **행사 스케치** (위쪽 '행사 스케치' 버튼에 나옴)
- **행사 기록 / 공연 기록** (위쪽 '행사·공연 기록' 버튼에 나옴)

유튜브 주소는 어떤 형태든 그대로 붙여 넣으면 돼요 (youtu.be, watch?v=, shorts 모두 가능).

## 견적 문의 메일 읽는 법

Netlify 메일·Forms 화면에는 항목 이름이 영어로 나와요.

| 영어 이름 | 뜻 |
|---|---|
| name | 이름 또는 회사명 |
| contact | 연락처 (전화번호 또는 이메일) |
| deliverables | 원하는 결과물 |
| event_type | 행사 종류 |
| event_date | 행사 날짜 |
| event_time | 행사 시간 |
| location / location_detail | 장소 / 지방일 때 지역 |
| crew | 촬영 규모 |
| delivery_date | 희망 납품일 |
| message | 요청사항 |
| consent | 개인정보 동의 |

## 견적 문의 디스코드 알림

견적 문의가 접수되면 디스코드 채널로 바로 알림이 가요 (`netlify/functions/submission-created.mjs`).
넷리파이가 스팸이 아니라고 확인한 문의만 오고, 알림이 실패해도 문의는 넷리파이 Forms와 메일에 그대로 남아요.

- 디스코드 웹후크 주소는 **넷리파이 환경 변수 `DISCORD_WEBHOOK_URL`** 에 넣어요. 이 저장소는 공개라서 코드에 적으면 안 돼요.
- 주소를 바꾸거나 처음 넣은 뒤에는 넷리파이 Deploys → Trigger deploy → Deploy project 를 한 번 눌러야 적용돼요.
- 알림이 안 오면: 넷리파이 → Logs → Functions → `submission-created` 에서 이유가 한국어로 찍혀 있어요.

## 구글 애널리틱스에 남는 기록

- `generate_lead` : 견적 문의가 접수될 때 (이름·연락처는 기록하지 않음)
- `contact_click` : 전화·메일·카톡 버튼을 누를 때 (`method`에 phone / email / kakao)

## 사이트에 반영하는 법

이 저장소는 Netlify와 연결돼 있어요. `main`에 합치면 1~2분 뒤 seeinstudio.co.kr에 자동으로 반영돼요.
사이트 파일은 `site` 폴더에 있어요. 영상 포트폴리오 목록은 `site/index.html`의 `portfolio-grid` 부분이에요.
연결한 뒤에는 Netlify Deploys 화면에 파일을 직접 끌어다 놓지 마세요. 다음 자동 반영 때 덮어써져요.
