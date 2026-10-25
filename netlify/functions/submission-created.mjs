// 홈페이지 견적 문의가 접수되면 디스코드 채널로 알림을 보내는 기능
//
// - 파일 이름 'submission-created'는 넷리파이가 "폼 접수(스팸 검사 통과)" 때 자동으로 실행하는 이름이라 바꾸면 안 돼요.
// - 디스코드 웹후크 주소는 넷리파이 환경 변수 DISCORD_WEBHOOK_URL에 넣어요.
//   (이 저장소는 공개라서 주소를 코드에 적으면 누구나 그 채널에 글을 올릴 수 있어요)
// - 알림이 실패해도 문의 접수 자체에는 영향이 없어요. 문의는 넷리파이 Forms와 메일에 그대로 남아요.

const ACCENT = 0xe8a33d; // 홈페이지 포인트 색
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 디스코드에 보여줄 순서와 이름 (inline: true면 두 칸씩 나란히)
const FIELDS = [
  ['name', '이름·회사', true],
  ['contact', '연락처', true],
  ['deliverables', '원하는 결과물', false],
  ['event_type', '행사 종류', true],
  ['event_date', '행사 날짜', true],
  ['event_time', '행사 시간', true],
  ['location', '장소', true],
  ['crew', '촬영 규모', true],
  ['delivery_date', '희망 납품일', true],
  ['message', '요청사항', false],
];

function clean(v) {
  if (v === undefined || v === null) return '';
  if (Array.isArray(v)) v = v.join(', ');
  return String(v).trim();
}

// 손님이 쓴 글자가 디스코드에서 굵게·취소선 등으로 바뀌지 않게
// (연락처는 복사할 때 기호가 섞이지 않도록 손대지 않아요)
function escapeMd(s) {
  return s
    .replace(/([\\`*_~|])/g, '\\$1')
    .replace(/^(\s*)([>#-])/gm, '$1\\$2');
}

function cut(s, max) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

// "2026-11-14" → "2026-11-14 (토)"
function withWeekday(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return s;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return `${s} (${WEEKDAYS[d.getUTCDay()]})`;
}

export function buildMessage(data, createdAt) {
  const v = {};
  for (const [key] of FIELDS) v[key] = clean(data[key]);
  if (v.event_date) v.event_date = withWeekday(v.event_date);
  if (v.delivery_date) v.delivery_date = withWeekday(v.delivery_date);
  const detail = clean(data.location_detail);
  if (v.location === '지방' && detail) v.location = `지방 · ${detail}`;

  const fields = [];
  for (const [key, label, inline] of FIELDS) {
    if (!v[key]) continue;
    const max = key === 'message' ? 1000 : 300;
    const text = key === 'contact' ? v[key] : escapeMd(v[key]);
    fields.push({ name: label, value: cut(text, max), inline });
  }
  if (clean(data.message).length > 1000) {
    fields.push({ name: '​', value: '요청사항이 길어서 잘렸어요. 전체 내용은 넷리파이 Forms나 메일에서 보세요.', inline: false });
  }

  // 폰 푸시 알림에는 이 첫 줄이 보여요
  const summary = [v.name || '이름 없음', v.event_date || '날짜 미정', v.deliverables].filter(Boolean).join(' · ');

  let ts = new Date(createdAt || Date.now());
  if (isNaN(ts.getTime())) ts = new Date();

  return {
    username: '홈페이지 문의',
    content: cut(`📩 새 견적 문의 — ${summary}`, 1900),
    allowed_mentions: { parse: [] }, // 손님이 @everyone 등을 써도 아무도 호출되지 않게
    embeds: [
      {
        title: '견적 문의 내용',
        url: 'https://seeinstudio.co.kr/#contact',
        color: ACCENT,
        fields: fields.length ? fields : [{ name: '내용', value: '(비어 있음)', inline: false }],
        footer: { text: 'seeinstudio.co.kr 견적 문의 폼' },
        timestamp: ts.toISOString(),
      },
    ],
  };
}

function isDiscordWebhook(url) {
  return /^https:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+/.test(url || '');
}

async function postToDiscord(url, body) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      });
    } catch (err) {
      console.log(`디스코드 전송 실패 (${attempt}번째): ${err.message}`);
      if (attempt === 2) return false;
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }
    if (res.ok) return true;
    const text = await res.text().catch(() => '');
    console.log(`디스코드 응답 오류 ${res.status} (${attempt}번째): ${text.slice(0, 300)}`);
    if (res.status === 429 || res.status >= 500) {
      let wait = 1000;
      try {
        const after = JSON.parse(text).retry_after;
        if (after) wait = Math.min(Math.ceil(after * 1000), 5000);
      } catch {}
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    return false; // 주소가 틀렸거나 웹후크가 삭제된 경우 등
  }
  return false;
}

export default async (req) => {
  const webhook = (process.env.DISCORD_WEBHOOK_URL || '').trim();
  if (!isDiscordWebhook(webhook)) {
    console.log('DISCORD_WEBHOOK_URL이 없거나 디스코드 웹후크 주소가 아니라서 알림을 건너뛰어요.');
    return new Response('skipped');
  }

  let body = {};
  try {
    body = await req.json();
  } catch {
    console.log('접수 데이터를 읽지 못했어요.');
    return new Response('bad payload');
  }
  const payload = body.payload || body;
  const formName = payload.form_name || (payload.data && payload.data['form-name']);
  if (formName && formName !== 'contact') {
    return new Response('other form');
  }

  const ok = await postToDiscord(webhook, buildMessage(payload.data || {}, payload.created_at));
  console.log(ok ? '디스코드 알림 보냄' : '디스코드 알림 실패');
  return new Response(ok ? 'sent' : 'failed');
};
