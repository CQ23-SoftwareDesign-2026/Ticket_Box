# TicketBox Staff Mobile App

Mobile app for staff ticket check-in.

Main features:

- staff login
- concert and gate selection
- QR ticket scanning
- offline scan queue
- auto sync when network is back

## Requirements

- Node.js `20+`
- `npm`
- `Expo Go` on a phone, or Android/iOS emulator
- camera permission

## Environment Setup

Create `.env` from `.env.example` inside `apps/mobile-app/ticketbox`.

```bash
cd apps/mobile-app/ticketbox
copy .env.example .env
```

On macOS/Linux:

```bash
cd apps/mobile-app/ticketbox
cp .env.example .env
```

## Run With Deployed Backend

This is the recommended way for demo or grading.

Set this in `apps/mobile-app/ticketbox/.env`:

```env
EXPO_PUBLIC_API_BASE_URL=https://api.ticketbox.retrobit.io.vn
```

Run:

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

## Run With Local Backend

If the backend is already running locally, you only need to change the mobile app API URL in `.env`.

Set `EXPO_PUBLIC_API_BASE_URL` to one of these:

- Android emulator: `http://10.0.2.2:3000`
- iOS simulator: `http://localhost:3000`
- Physical phone: `http://<your-lan-ip>:3000`

Example:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:3000
```

Then run:

```bash
git clone <repo-url>
cd Ticket_Box
npm install
cd apps/mobile-app/ticketbox
npm run start
```

## Local Test Account

If the local backend has seeded data, use:

- Email: `quang.checker@ticketbox.local`
- Password: `123456`

Optional admin account:

- Email: `vy.admin@ticketbox.local`
- Password: `123456`

## Quick Demo Flow

1. Login with a staff account.
2. Open the scanner flow.
3. Select a concert.
4. Select a gate.
5. Wait for prefetch to complete.
6. Scan tickets.
7. Turn off the network to test offline queueing.
8. Turn the network back on to test auto sync.

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
