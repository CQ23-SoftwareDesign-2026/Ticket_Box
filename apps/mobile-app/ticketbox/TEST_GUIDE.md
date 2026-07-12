# TicketBox Staff Mobile App Test Guide

This guide helps an evaluator test the main business flows of the mobile app from start to finish.

## 1. Prerequisites

Before testing, make sure:

- the mobile app can start successfully
- the app has camera permission
- `apps/mobile-app/ticketbox/.env` exists
- `EXPO_PUBLIC_API_BASE_URL` points to either:
  - deployed backend: `https://api.ticketbox.retrobit.io.vn`
  - or local backend: `http://10.0.2.2:3000`, `http://localhost:3000`, or `http://<LAN-IP>:3000`

If testing with local backend and seeded data, use:

- Email: `quang.checker@ticketbox.local`
- Password: `123456`

Optional admin account:

- Email: `vy.admin@ticketbox.local`
- Password: `123456`

## 2. Recommended Test Order

Run the test cases in this order:

1. App startup and environment
2. Login flow
3. Session setup
4. Online scanning
5. Offline queue
6. Auto sync
7. Latest scans and status UI
8. Logout rules

## 3. Test Cases

### TC01 - App starts with valid environment

Steps:

1. Start the app with `npm run start`.
2. Open it on a device or emulator.

Expected result:

- app opens normally
- no crash on startup
- no missing environment variable error

### TC02 - App fails clearly when API URL is missing

Steps:

1. Remove `EXPO_PUBLIC_API_BASE_URL` from `.env`.
2. Restart the app.

Expected result:

- app shows a clear configuration error
- error mentions missing `EXPO_PUBLIC_API_BASE_URL`

### TC03 - Staff login succeeds

Steps:

1. Open login screen.
2. Enter a valid staff account.
3. Submit login.

Expected result:

- login succeeds
- app navigates into the staff flow

### TC04 - Invalid login is rejected

Steps:

1. Enter wrong email or password.
2. Submit login.

Expected result:

- login fails
- user stays on login screen
- app shows an error message

### TC05 - Scanner cannot be used without a valid session

Steps:

1. Open the app after login.
2. Try to use scanner without selecting concert and gate first.

Expected result:

- scanner is blocked or redirected
- app asks the user to set up a session first

### TC06 - Session setup works

Steps:

1. Open scanner flow.
2. Select a concert.
3. Select a gate.
4. Wait for prefetch to finish.

Expected result:

- session is created successfully
- current concert is shown
- current gate is shown
- scanner becomes usable

### TC07 - Online status is shown clearly

Steps:

1. Keep device connected to the Internet.
2. Open scanner screen.

Expected result:

- screen clearly shows `Online`
- pending sync count is visible
- current session info is visible

### TC08 - Online scan success

Steps:

1. Use a valid QR code.
2. Scan while online.

Expected result:

- ticket is accepted
- result appears immediately
- latest scan section updates

### TC09 - Duplicate scan is detected

Steps:

1. Scan the same valid QR code again.

Expected result:

- app marks it as duplicate
- latest scan section updates with duplicate status

### TC10 - Invalid QR is rejected

Steps:

1. Scan an invalid or unrelated QR code.

Expected result:

- app rejects the QR
- app shows an invalid or not found result

### TC11 - Wrong gate QR is rejected

Steps:

1. Use a QR code that does not belong to the selected gate.
2. Scan it.

Expected result:

- app rejects the scan
- result clearly indicates gate mismatch

### TC12 - Offline status is shown clearly

Steps:

1. Turn off Wi-Fi and mobile data, or disable network on emulator.
2. Return to scanner screen.

Expected result:

- screen clearly shows `Offline`
- session info is still visible
- pending sync count remains visible

### TC13 - Offline scan is queued

Steps:

1. While offline, scan a valid QR code that belongs to the current prefetched session.

Expected result:

- app accepts the scan locally
- scan is added to offline queue
- pending sync count increases
- latest scan shows offline accepted status

### TC14 - Offline duplicate is rejected locally

Steps:

1. While still offline, scan the same QR again.

Expected result:

- app detects local duplicate
- pending sync count does not increase again

### TC15 - Offline scan is blocked when session is invalid

Steps:

1. Try to scan offline without a valid prefetched session.
2. Or use a stale/incorrect session if available.

Expected result:

- app does not allow offline scan
- app asks user to set up a valid session again

### TC16 - Auto sync runs when network returns

Steps:

1. Perform at least one valid offline scan.
2. Turn network back on.
3. Wait on the scanner screen.

Expected result:

- app automatically attempts sync
- pending sync count decreases after successful sync
- latest scans update to synced state when applicable

### TC17 - Sync updates recent history correctly

Steps:

1. Perform several scans: online, duplicate, offline accepted.
2. Restore network and let sync finish.

Expected result:

- latest scans list reflects the final statuses
- synced items are updated properly
- duplicate/conflict states remain visible when relevant

### TC18 - Latest scans shows enough history

Steps:

1. Perform at least 10 scans or scan attempts.

Expected result:

- latest scans list shows up to 10 most recent entries
- statuses are readable and not visually broken

### TC19 - Logout warns when unsynced scans exist

Steps:

1. Perform one or more offline scans.
2. Keep them unsynced.
3. Try to logout.

Expected result:

- app shows a clear warning
- warning explains there are unsynced offline scans

### TC20 - Logout works normally when queue is empty

Steps:

1. Ensure pending sync count is `0`.
2. Logout.

Expected result:

- logout succeeds
- user is returned to login screen

## 4. What The Evaluator Should Confirm

At the end of testing, confirm that:

- staff can login successfully
- scanner requires a valid session
- current concert and gate are clearly shown
- online/offline status is clearly shown
- online scan works
- duplicate and invalid scans are handled
- offline scans are queued correctly
- auto sync works when network returns
- pending sync count updates correctly
- latest scans history updates correctly
- logout warns when unsynced scans still exist

## 5. Common Testing Notes

- For physical phones, do not use `localhost` as API URL.
- For Android emulator, use `http://10.0.2.2:3000` for local backend.
- For iOS simulator, use `http://localhost:3000`.
- If scan does not work, check camera permission first.
- If offline scan fails unexpectedly, verify that session prefetch completed before going offline.
