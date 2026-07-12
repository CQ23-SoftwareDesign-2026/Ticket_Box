# TicketBox Staff Mobile App

Mobile app for staff ticket check-in. The app supports:

- staff login
- concert and gate selection
- QR ticket scanning
- offline scan queue
- auto sync when network is back

This guide is written for evaluators who need to clone the repository and run the app without extra instructions.

## Quick Start

Use this path if you only need to run the mobile app for demo or grading.

### Requirements

- Node.js `20+`
- `npm`
- `Expo Go` on a phone, or Android/iOS emulator
- Internet access
- Camera permission

### Steps

```bash
git clone <repo-url>
cd Ticket_Box
npm install
cd apps/mobile-app/ticketbox
npm run start
```

Then:

- scan the QR code with `Expo Go`, or
- press `a` for Android emulator, or
- press `i` for iOS simulator on macOS

### Important

The mobile app already uses the deployed backend:

`apps/mobile-app/ticketbox/src/constants/app-config.ts`

```ts
apiBaseUrl: 'https://api.ticketbox.retrobit.io.vn'
```

So in the normal grading flow, the evaluator does not need to run the backend locally.

## Run With Local Backend

Only use this path if you want to run the full system locally.

### 1. Start Redis and RabbitMQ

```bash
cd infrastructure
docker compose up -d
cd ..
```

Services:

- Redis: `localhost:6379`
- RabbitMQ: `localhost:5672`
- RabbitMQ UI: `http://localhost:15672`

### 2. Create backend environment file

Windows:

```bash
copy .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Check these values in `.env`:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `REDIS_URL`
- `RABBITMQ_URL`

Note: PostgreSQL is not included in `docker-compose.yml`, so you must prepare a database yourself.

### 3. Start the backend

From the repository root:

```bash
npm install
npm run prisma:generate
npm run db:migrate:deploy
npm run db:seed
npm run start:api
```

Backend URL:

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api/docs`

### 4. Point mobile app to local API

Edit:

`apps/mobile-app/ticketbox/src/constants/app-config.ts`

Use one of these values:

- Android emulator: `http://10.0.2.2:3000`
- iOS simulator: `http://localhost:3000`
- Physical phone: `http://<your-lan-ip>:3000`

Example:

```ts
apiBaseUrl: 'http://192.168.1.10:3000'
```

Then restart the mobile app:

```bash
cd apps/mobile-app/ticketbox
npm run start
```

## Test Account For Local Seed

After running:

```bash
npm run db:seed
```

Use this staff account:

- Email: `quang.checker@ticketbox.local`
- Password: `123456`

Optional admin account:

- Email: `vy.admin@ticketbox.local`
- Password: `123456`

## Recommended Demo Flow

1. Login with the staff account.
2. Open the scanner flow.
3. Select a concert.
4. Select a gate.
5. Wait for prefetch to complete.
6. Scan tickets online.
7. Turn off the network and scan again to test offline queueing.
8. Turn the network back on and verify auto sync.

## What The Evaluator Should Verify

- Scanner is blocked when there is no valid session.
- The app clearly shows `Online` or `Offline`.
- The current concert and gate are visible.
- Pending sync count updates correctly.
- Latest scan history is shown.
- Logout shows a warning if there are unsynced offline scans.

## Common Issues

### QR scanner does not work

Check:

- camera permission
- concert and gate selected
- prefetch finished

### Phone cannot reach local backend

Check:

- do not use `localhost` on a physical phone
- phone and computer must be on the same Wi-Fi
- firewall must allow port `3000`

### Offline scans do not sync

Check:

- backend is running
- `apiBaseUrl` is correct
- Redis and RabbitMQ are running
- device is online again
