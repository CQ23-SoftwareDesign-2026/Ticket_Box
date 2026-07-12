import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

export const options = {
  vus: Number(__ENV.VUS || 20),
  duration: __ENV.DURATION || '20s',
  setupTimeout: __ENV.SETUP_TIMEOUT || '120s',
  thresholds: {
    system_available: ['rate>0.95'],
  },
};

const status200 = new Counter('status_200');
const status201 = new Counter('status_201');
const status400 = new Counter('status_400');
const status401 = new Counter('status_401');
const status404 = new Counter('status_404');
const status429 = new Counter('status_429');
const reserveSuccess = new Counter('reserve_success');
const reserveRateLimited = new Counter('reserve_rate_limited');
const reserveBusinessRejected = new Counter('reserve_business_rejected');
const systemAvailable = new Rate('system_available');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const EMAIL = __ENV.EMAIL;
const PASSWORD = __ENV.PASSWORD || '123456';
const TOKENS = (__ENV.TOKENS || '')
  .split(',')
  .map((token) => token.trim())
  .filter(Boolean);
const USE_SEED_USERS = (__ENV.USE_SEED_USERS || 'true').toLowerCase() === 'true';
const SEED_USER_COUNT = Number(__ENV.SEED_USER_COUNT || 40);
const SEED_EMAIL_PREFIX = __ENV.SEED_EMAIL_PREFIX || 'audience';
const SEED_EMAIL_DOMAIN = __ENV.SEED_EMAIL_DOMAIN || 'ticketbox.local';
const SEED_PASSWORD = __ENV.SEED_PASSWORD || '123456';
const SEED_LOGIN_FAKE_IPS = (__ENV.SEED_LOGIN_FAKE_IPS || 'true').toLowerCase() === 'true';
const CONCERT_ID = __ENV.CONCERT_ID;
const CATEGORY_ID = __ENV.CATEGORY_ID;
const QUANTITY = Number(__ENV.QUANTITY || 1);
const LOGIN_EACH_ITER = (__ENV.LOGIN_EACH_ITER || 'false').toLowerCase() === 'true';
const FAKE_IPS = (__ENV.FAKE_IPS || 'true').toLowerCase() === 'true';
const REQUEST_TIMEOUT = __ENV.REQUEST_TIMEOUT || '5s';

function requestHeaders(token, fakeIp) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (fakeIp) {
    headers['x-forwarded-for'] = fakeIp;
  }

  return { headers, timeout: REQUEST_TIMEOUT };
}

function vuFakeIp() {
  return FAKE_IPS ? `10.10.${__VU % 255}.${(__ITER % 250) + 1}` : null;
}

function seedFakeIp(index) {
  return SEED_LOGIN_FAKE_IPS ? `10.20.${Math.floor(index / 250)}.${(index % 250) + 1}` : null;
}

function recordStatus(response) {
  systemAvailable.add(response.status < 500);
  if (response.status === 200) status200.add(1);
  if (response.status === 201) status201.add(1);
  if (response.status === 400) status400.add(1);
  if (response.status === 401) status401.add(1);
  if (response.status === 404) status404.add(1);
  if (response.status === 429) status429.add(1);
}

function login(email, password, fakeIp) {
  const response = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    requestHeaders(null, fakeIp),
  );
  recordStatus(response);

  check(response, {
    'login status is 200 or protected': (res) => [200, 401, 429].includes(res.status),
  });

  if (response.status !== 200) {
    return null;
  }

  return response.json('accessToken');
}

function loginSeedUsers() {
  const tokens = [];
  for (let index = 0; index < SEED_USER_COUNT; index += 1) {
    const email = `${SEED_EMAIL_PREFIX}${index + 1}@${SEED_EMAIL_DOMAIN}`;
    const token = login(email, SEED_PASSWORD, seedFakeIp(index));
    if (token) {
      tokens.push(token);
    }
  }
  return tokens;
}

function resolveConcertId() {
  if (CONCERT_ID) {
    return CONCERT_ID;
  }

  const response = http.get(`${BASE_URL}/concerts?limit=20`);
  recordStatus(response);
  const concerts = response.json('data') || [];
  if (!Array.isArray(concerts) || concerts.length === 0) {
    throw new Error('No concerts found. Set CONCERT_ID manually or run seed first.');
  }

  return concerts[0].id;
}

function resolveCategoryId(concertId, token) {
  if (CATEGORY_ID) {
    return CATEGORY_ID;
  }

  const response = http.get(`${BASE_URL}/concerts/${concertId}`, requestHeaders(token, '10.30.0.1'));
  recordStatus(response);
  if (response.status !== 200) {
    throw new Error(`Cannot load concert detail ${concertId}. Status=${response.status}`);
  }

  const tiers = response.json('ticketTiers') || [];
  const now = Date.now();
  const activeTier = tiers.find((tier) => {
    const saleStarted = !tier.sales_start_at || new Date(tier.sales_start_at).getTime() <= now;
    const hasRemaining = tier.remaining_quantity === undefined || tier.remaining_quantity > 0;
    return saleStarted && hasRemaining && tier.status !== 'sold_out' && tier.status !== 'sale_closed';
  });

  if (!activeTier) {
    throw new Error('No reservable ticket tier found. Set CATEGORY_ID manually.');
  }

  return activeTier.id;
}

export function setup() {
  let tokens = [...TOKENS];

  if (tokens.length === 0 && USE_SEED_USERS) {
    tokens = loginSeedUsers();
  }

  if (tokens.length === 0 && EMAIL) {
    const token = login(EMAIL, PASSWORD, '10.20.255.1');
    if (token) {
      tokens.push(token);
    }
  }

  if (tokens.length === 0 && !LOGIN_EACH_ITER) {
    throw new Error('No access tokens available. Provide TOKENS, seed users, or EMAIL/PASSWORD.');
  }

  const concertId = resolveConcertId();
  const categoryId = resolveCategoryId(concertId, tokens[0] || null);

  console.log('');
  console.log('='.repeat(70));
  console.log('TicketBox k6 ticketing flow');
  console.log(`BASE_URL       : ${BASE_URL}`);
  console.log(`Concert        : ${concertId}`);
  console.log(`Category       : ${categoryId}`);
  console.log(`Tokens         : ${tokens.length}`);
  console.log(`VUS/Duration   : ${options.vus}/${options.duration}`);
  console.log(`Fake IPs       : ${FAKE_IPS}`);
  console.log('='.repeat(70));
  console.log('');

  return { tokens, concertId, categoryId };
}

export default function (data) {
  const fakeIp = vuFakeIp();
  const token = data.tokens.length > 0
    ? data.tokens[(__VU - 1) % data.tokens.length]
    : LOGIN_EACH_ITER
      ? login(EMAIL, PASSWORD, fakeIp)
      : null;

  const concertResponse = http.get(
    `${BASE_URL}/concerts/${data.concertId}`,
    requestHeaders(token, fakeIp),
  );
  recordStatus(concertResponse);
  check(concertResponse, {
    'concert detail status is expected': (res) => [200, 404, 429].includes(res.status),
  });

  if (!token || concertResponse.status === 429) {
    sleep(0.2);
    return;
  }

  const reserveResponse = http.post(
    `${BASE_URL}/tickets/reserve`,
    JSON.stringify({
      concert_id: data.concertId,
      items: [
        {
          category_id: data.categoryId,
          quantity: QUANTITY,
        },
      ],
    }),
    requestHeaders(token, fakeIp),
  );
  recordStatus(reserveResponse);

  if (reserveResponse.status === 200 || reserveResponse.status === 201) {
    reserveSuccess.add(1);
  } else if (reserveResponse.status === 429) {
    reserveRateLimited.add(1);
  } else if (reserveResponse.status === 400) {
    reserveBusinessRejected.add(1);
  }

  check(reserveResponse, {
    'reserve status is expected': (res) => [200, 201, 400, 401, 429].includes(res.status),
    'reserve protected from server errors': (res) => res.status < 500,
  });

  sleep(0.2);
}

export function handleSummary(data) {
  const success = data.metrics.reserve_success?.values?.count || 0;
  const rateLimited = data.metrics.reserve_rate_limited?.values?.count || 0;
  const businessRejected = data.metrics.reserve_business_rejected?.values?.count || 0;
  const status429Count = data.metrics.status_429?.values?.count || 0;
  const totalReqs = data.metrics.http_reqs?.values?.count || 0;

  const summary = `
${'='.repeat(70)}
TicketBox k6 summary
${'='.repeat(70)}
Total HTTP requests      : ${totalReqs}
Reserve success          : ${success}
Reserve rate limited     : ${rateLimited}
Reserve business rejected: ${businessRejected}
All 429 responses        : ${status429Count}

Interpretation:
- 429 is expected when token buckets are exhausted.
- 400 can be valid business rejection: sold out, per-user limit, sale not started.
- 5xx should stay near zero; that proves the backend is protected under burst.
${'='.repeat(70)}
`;

  return {
    stdout: summary,
    'k6-ticketing-summary.json': JSON.stringify(data, null, 2),
  };
}
