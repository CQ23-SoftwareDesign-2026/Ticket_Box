$ErrorActionPreference = "Stop"

# Copy this file to scripts/k6-ticketing-flow.local.ps1 and fill in real values.
# Do not commit the local file if it contains a real password or token.

$env:BASE_URL = "http://localhost:3000"

# Seed-user mode: uses audience1@ticketbox.local ... audienceN@ticketbox.local.
# These users are created by prisma/seeds/auth.seed.ts with password 123456.
$env:USE_SEED_USERS = "true"
$env:SEED_USER_COUNT = "40"
$env:SEED_PASSWORD = "123456"
$env:SEED_LOGIN_FAKE_IPS = "true"

# Single-account fallback mode. Used only when USE_SEED_USERS=false.
$env:EMAIL = ""
$env:PASSWORD = ""

# Optional IDs from your local database/API.
# Leave blank to let the k6 script pick the first available concert/category.
$env:CONCERT_ID = ""
$env:CATEGORY_ID = ""

# Load profile.
$env:VUS = "5"
$env:DURATION = "10s"
$env:QUANTITY = "1"

# Optional modes.
# true  = login on every iteration to demo login rate limit.
# false = login once in setup and reuse the token.
$env:LOGIN_EACH_ITER = "false"

# true  = send a fake x-forwarded-for per VU/iteration to simulate many IPs locally.
# false = all traffic uses the same local IP.
$env:FAKE_IPS = "false"

Write-Host "Running k6 ticketing flow..."
Write-Host "BASE_URL=$env:BASE_URL"
Write-Host "CONCERT_ID=$env:CONCERT_ID"
Write-Host "CATEGORY_ID=$env:CATEGORY_ID"
Write-Host "VUS=$env:VUS DURATION=$env:DURATION LOGIN_EACH_ITER=$env:LOGIN_EACH_ITER FAKE_IPS=$env:FAKE_IPS"

k6 run scripts/k6-ticketing-flow.js
