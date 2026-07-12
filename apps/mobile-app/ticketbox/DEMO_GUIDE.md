# TicketBox Staff Mobile App Demo Guide

This document is a step-by-step demo script for presenting the mobile app and covering the most important business flows.

## 1. Demo Goal

The demo should show that the mobile app can:

- login with a staff account
- require concert and gate setup before scanning
- scan tickets in online mode
- detect duplicate, invalid, and missing tickets
- continue working in offline mode
- queue offline scans
- auto sync when network comes back
- warn the user before logout if unsynced scans still exist

## 2. Equipment Setup

Recommended setup:

- `iPhone 13` running the mobile app
- `Windows PC` with `3uTools`
- `QR codes` shown on another device, or printed on paper
- optional second device or Swagger/Postman for conflict testing

## 3. Show iPhone Screen on PC With 3uTools

### Steps

1. Open `3uTools` on Windows.
2. Connect the iPhone to the PC with a cable.
3. Unlock the iPhone.
4. If prompted, tap `Trust This Computer`.
5. In `3uTools`, open `Toolbox`.
6. Select `Realtime Screen`.
7. Start screen mirroring.

### Recording recommendation

For the clearest demo:

- record the screen on the `iPhone` itself for final video quality
- use `3uTools` only to see and present the phone on the PC screen

Alternative:

- use `OBS` on PC and record the `Realtime Screen` window from `3uTools`

## 4. App Setup Before Demo

Make sure:

- `apps/mobile-app/ticketbox/.env` exists
- `EXPO_PUBLIC_API_BASE_URL` is correct
- the app starts successfully
- camera permission is granted

If using deployed backend:

```env
EXPO_PUBLIC_API_BASE_URL=https://api.ticketbox.retrobit.io.vn
```

If using local backend:

- Android emulator: `http://10.0.2.2:3000`
- iOS simulator: `http://localhost:3000`
- physical iPhone: `http://<your-lan-ip>:3000`

## 5. Account For Demo

If local backend has seeded data:

- Email: `quang.checker@ticketbox.local`
- Password: `123456`

Optional admin account:

- Email: `vy.admin@ticketbox.local`
- Password: `123456`

## 6. Tickets And QR Codes To Prepare

To cover all important scan cases, prepare these QR codes:

### Required

1. `Ticket A`
- paid
- correct concert
- correct gate

Used for:

- `ACCEPTED`
- `DUPLICATE`

2. `Ticket B`
- paid
- correct concert
- correct gate

Used for:

- `OFFLINE_ACCEPTED`
- `SYNCED`

3. `Ticket C`
- paid
- correct concert
- correct gate

Used for:

- `OFFLINE_ACCEPTED`
- `SYNC_CONFLICT`

4. `Ticket D`
- paid
- correct concert
- wrong gate

Used for:

- `INVALID_GATE`

5. `QR E`
- random QR not found in the system

Used for:

- `NOT_FOUND`

### Optional but recommended

6. `Ticket F`
- unpaid
- correct concert
- correct gate

Used for:

- `UNPAID`

Note:

- `UNPAID` can only be shown if you can access the QR of an unpaid ticket
- if that is difficult in your current UI flow, you may skip it and explain that the backend supports it

## 7. Important Note About Offline Scan

Offline scan only works with tickets that are:

- prefetched
- paid
- not scanned yet
- in the selected gate

Because of that:

- `INVALID_GATE`
- `UNPAID`
- `NOT_FOUND`

should mainly be demonstrated in `online mode`.

## 8. Full Demo Script

## Part 1 - App Launch And Login

### What to do

1. Open the app.
2. Show that the app starts normally.
3. Login with the staff account.

### What to say

- "This is the TicketBox staff mobile app for gate check-in."
- "I will demonstrate login, session setup, online scanning, offline queueing, auto sync, and logout protection."

### Expected result

- login succeeds
- user enters staff flow

## Part 2 - Session Setup

### What to do

1. Open scanner flow.
2. If there is no session yet, show that scanner cannot proceed directly.
3. Select a concert.
4. Select a gate.
5. Wait for prefetch to finish.

### What to say

- "The scanner requires an active session."
- "Staff must select the concert and the assigned gate before scanning."
- "The app prefetches valid ticket hashes for this gate to support offline operation."

### Expected result

- scanner session is created
- concert and gate are visible
- scanner is ready

## Part 3 - Show Scanner Status UI

### What to show

- `Online` or `Offline`
- current concert
- current gate
- pending sync count
- latest scans section

### What to say

- "The scanner screen shows operational status, current session, pending queue, and the latest scan history."

## Part 4 - Online Scan Cases

### Case 1: Accepted

Use `Ticket A`.

Steps:

1. Keep the phone online.
2. Scan `Ticket A`.

Expected:

- status `ACCEPTED`
- success feedback shown
- latest scans updated

Suggested narration:

- "This is a valid paid ticket for the current concert and gate, so it is accepted."

### Case 2: Duplicate

Use `Ticket A` again.

Steps:

1. Scan `Ticket A` a second time.

Expected:

- status `DUPLICATE`

Suggested narration:

- "Scanning the same ticket again is blocked as a duplicate."

### Case 3: Invalid Gate

Use `Ticket D`.

Steps:

1. Scan the ticket that belongs to another gate.

Expected:

- status `INVALID_GATE`

Suggested narration:

- "This ticket belongs to a different gate, so the app rejects it."

### Case 4: Not Found

Use `QR E`.

Steps:

1. Scan a QR that does not exist in the system.

Expected:

- status `NOT_FOUND`

Suggested narration:

- "A QR that does not exist in the backend is rejected as not found."

### Case 5: Unpaid

Use `Ticket F` if available.

Steps:

1. Scan an unpaid ticket QR.

Expected:

- status `UNPAID`

Suggested narration:

- "The backend also rejects unpaid tickets."

## Part 5 - Offline Queue Demo

### Case 6: Offline accepted

Use `Ticket B`.

Steps:

1. Turn off network on the iPhone.
2. Show that scanner status changes to `Offline`.
3. Scan `Ticket B`.

Expected:

- status `OFFLINE_ACCEPTED`
- pending sync count increases
- latest scans updated

Suggested narration:

- "When offline, the app validates against the prefetched gate set and stores the scan in a local queue."

### Case 7: Offline duplicate

Use `Ticket B` again.

Steps:

1. While still offline, scan `Ticket B` again.

Expected:

- local duplicate is detected
- pending sync count does not increase again

Suggested narration:

- "The app still prevents duplicate acceptance on the same device while offline."

### Case 8: Another offline accepted scan

Use `Ticket C`.

Steps:

1. Still offline, scan `Ticket C`.

Expected:

- another `OFFLINE_ACCEPTED`
- pending sync count increases again

## Part 6 - Logout Warning

### Steps

1. While there are still pending offline scans, try to logout.

### Expected

- app shows a warning about unsynced scans

### Suggested narration

- "Before logout, the app warns the user if there are unsynced offline scans."

## Part 7 - Auto Sync Demo

### Case 9: Successful sync

Use the offline scan from `Ticket B`.

Steps:

1. Turn network back on.
2. Stay on the scanner screen.
3. Wait for auto sync.

Expected:

- sync starts automatically
- `Ticket B` becomes `SYNCED`
- pending sync count decreases

### Suggested narration

- "When connectivity returns, the app automatically syncs queued offline scans to the backend."

## Part 8 - Sync Conflict Demo

### Best way

This needs:

- a second device, or
- Swagger/Postman access to backend

### Use `Ticket C`

Steps:

1. Keep the main phone offline.
2. Scan `Ticket C` on the main phone so it becomes queued offline.
3. Before bringing the main phone online again, scan `Ticket C` online from:
   - another checker device, or
   - Swagger/Postman calling backend check-in API
4. Turn network back on for the main phone.
5. Let auto sync run.

Expected:

- the queued offline scan for `Ticket C` cannot be applied anymore
- history shows `SYNC_CONFLICT`

### Suggested narration

- "This demonstrates conflict handling: the offline device queued the scan first locally, but another source scanned the ticket online before synchronization happened."

## 9. Statuses You Should Cover In The Video

Try to show as many of these as possible:

- `ACCEPTED`
- `DUPLICATE`
- `INVALID_GATE`
- `NOT_FOUND`
- `UNPAID`
- `OFFLINE_ACCEPTED`
- `SYNCED`
- `SYNC_CONFLICT`

## 10. Minimum Ticket Set For A Good Demo

If you want the smallest practical set, prepare:

- `3 paid tickets` for the correct gate: `A`, `B`, `C`
- `1 paid ticket` for a different gate: `D`
- `1 random QR`: `E`
- `1 unpaid ticket`: `F` if available

## 11. Final Checklist Before Recording

- phone is fully charged
- `Do Not Disturb` is enabled
- brightness is high enough
- app is already installed and working
- `.env` is correct
- backend is reachable
- QR codes are ready on another device or paper
- `3uTools` mirroring is working
- optional second device or Swagger/Postman is ready for conflict test

## 12. Short Closing For The Demo

Suggested closing:

- "This demo shows the complete mobile check-in flow: session setup, online validation, offline queueing, automatic synchronization, conflict handling, and operator safeguards such as duplicate detection and logout warning."
