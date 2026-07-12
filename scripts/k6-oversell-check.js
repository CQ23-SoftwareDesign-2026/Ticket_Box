import http from 'k6/http';
import { check } from 'k6';
import { Counter, Rate } from 'k6/metrics';

const VUS = Number(__ENV.VUS || 20);
const ITERATIONS = Number(__ENV.ITERATIONS || VUS);

export const options = {
  setupTimeout: __ENV.SETUP_TIMEOUT || '240s',
  scenarios: {
    concurrent_reserve: {
      executor: 'shared-iterations',
      vus: VUS,
      iterations: ITERATIONS,
      maxDuration: __ENV.MAX_DURATION || '30s',
    },
  },
  thresholds: {
    system_available: ['rate>0.95'],
  },
};

const reserveSuccess = new Counter('reserve_success');
const reserveRejected = new Counter('reserve_rejected');
const reserveRateLimited = new Counter('reserve_rate_limited');
const status400 = new Counter('status_400');
const status429 = new Counter('status_429');
const status5xx = new Counter('status_5xx');
const systemAvailable = new Rate('system_available');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const SEED_USER_COUNT = Number(__ENV.SEED_USER_COUNT || VUS);
const SEED_EMAIL_PREFIX = __ENV.SEED_EMAIL_PREFIX || 'audience';
const SEED_EMAIL_DOMAIN = __ENV.SEED_EMAIL_DOMAIN || 'ticketbox.local';
const SEED_PASSWORD = __ENV.SEED_PASSWORD || '123456';
const CONCERT_ID = __ENV.CONCERT_ID;
const CATEGORY_ID = __ENV.CATEGORY_ID;
const QUANTITY = Number(__ENV.QUANTITY || 1);
const EXPECTED_MAX_SUCCESS = Number(__ENV.EXPECTED_MAX_SUCCESS || 0);
const REQUEST_TIMEOUT = __ENV.REQUEST_TIMEOUT || '15s';
const FAKE_IPS = (__ENV.FAKE_IPS || 'true').toLowerCase() === 'true';

function requestOptions(token, fakeIp) {
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

function seedFakeIp(index) {
  return `10.40.${Math.floor(index / 250)}.${(index % 250) + 1}`;
}

function vuFakeIp() {
  return FAKE_IPS ? `10.50.${__VU % 250}.${(__ITER % 250) + 1}` : null;
}

function recordStatus(response) {
  systemAvailable.add(response.status < 500);
  if (response.status === 400) status400.add(1);
  if (response.status === 429) status429.add(1);
  if (response.status >= 500) status5xx.add(1);
}

function login(email, index) {
  const response = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password: SEED_PASSWORD }),
    requestOptions(null, seedFakeIp(index)),
  );

  recordStatus(response);

  check(response, {
    'login succeeded': (res) => res.status === 200,
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
    const token = login(email, index);
    if (token) {
      tokens.push(token);
    }
  }
  return tokens;
}

export function setup() {
  if (!CONCERT_ID || !CATEGORY_ID) {
    throw new Error('Set CONCERT_ID and CATEGORY_ID before running oversell check.');
  }

  const tokens = loginSeedUsers();
  if (tokens.length === 0) {
    throw new Error('No seed users could login. Check seed accounts and password.');
  }

  console.log('');
  console.log('='.repeat(72));
  console.log('TicketBox k6 oversell/concurrency check');
  console.log(`BASE_URL            : ${BASE_URL}`);
  console.log(`Concert             : ${CONCERT_ID}`);
  console.log(`Category            : ${CATEGORY_ID}`);
  console.log(`Tokens              : ${tokens.length}`);
  console.log(`VUs / Iterations    : ${VUS} / ${ITERATIONS}`);
  console.log(`Quantity per request: ${QUANTITY}`);
  console.log(`Expected max success: ${EXPECTED_MAX_SUCCESS || '(set manually if known)'}`);
  console.log(`Fake IPs            : ${FAKE_IPS}`);
  console.log('='.repeat(72));
  console.log('');

  return { tokens };
}

export default function (data) {
  const token = data.tokens[(__VU - 1) % data.tokens.length];
  const response = http.post(
    `${BASE_URL}/tickets/reserve`,
    JSON.stringify({
      concert_id: CONCERT_ID,
      items: [
        {
          category_id: CATEGORY_ID,
          quantity: QUANTITY,
        },
      ],
    }),
    requestOptions(token, vuFakeIp()),
  );

  recordStatus(response);

  if (response.status === 200 || response.status === 201) {
    reserveSuccess.add(1);
  } else if (response.status === 429) {
    reserveRateLimited.add(1);
  } else {
    reserveRejected.add(1);
  }

  check(response, {
    'reserve has no server error': (res) => res.status < 500,
    'reserve result is expected': (res) => [200, 201, 400, 409, 429, 503].includes(res.status),
  });
}

export function handleSummary(data) {
  const success = data.metrics.reserve_success?.values?.count || 0;
  const rejected = data.metrics.reserve_rejected?.values?.count || 0;
  const rateLimited = data.metrics.reserve_rate_limited?.values?.count || 0;
  const all429 = data.metrics.status_429?.values?.count || 0;
  const all400 = data.metrics.status_400?.values?.count || 0;
  const all5xx = data.metrics.status_5xx?.values?.count || 0;
  const totalReqs = data.metrics.http_reqs?.values?.count || 0;
  const expectedLine = EXPECTED_MAX_SUCCESS
    ? `Expected max reserve success : ${EXPECTED_MAX_SUCCESS}\nOversell check              : ${success <= EXPECTED_MAX_SUCCESS ? 'PASS' : 'FAIL'}`
    : 'Expected max reserve success : not set';

  const summary = `
${'='.repeat(72)}
TicketBox oversell/concurrency summary
${'='.repeat(72)}
Total HTTP requests         : ${totalReqs}
Reserve success             : ${success}
Reserve rejected            : ${rejected}
Reserve rate limited        : ${rateLimited}
All 400 responses           : ${all400}
All 429 responses           : ${all429}
All 5xx responses           : ${all5xx}
${expectedLine}

Interpretation:
- Reserve success must not exceed the remaining inventory you prepared.
- Rejected requests are expected after inventory/user limit is exhausted.
- 5xx should stay near zero; inventory protection should reject cleanly.
${'='.repeat(72)}
`;

  return {
    stdout: summary,
    'k6-oversell-summary.json': JSON.stringify(data, null, 2),
  };
}
