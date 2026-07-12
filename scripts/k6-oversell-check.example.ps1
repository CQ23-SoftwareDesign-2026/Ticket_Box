$ErrorActionPreference = "Stop"

# ==============================================================================
# Kịch bản test đặt vé đồng thời chống bán lố (k6 Concurrency / Oversell Check)
# Hướng dẫn: Copy file này thành scripts/k6-oversell-check.local.ps1 để chạy local.
# ==============================================================================

$env:BASE_URL = "http://localhost:3000"

$env:SEED_USER_COUNT = "30"
$env:SEED_PASSWORD = "123456"

# Điền ID Concert và Hạng vé cần chạy test tranh chấp (Bắt buộc phải điền ID thật từ DB của bạn)
# Note: Xem ID trong database sau khi chạy seed.
$env:CONCERT_ID = ""
$env:CATEGORY_ID = ""

# Số lượng vé tồn thực tế còn lại của hạng vé trên DB (Để đối chiếu k6 hiển thị PASS/FAIL)
# Ví dụ: Nếu hạng vé còn đúng 10 vé tồn kho, set số này là 10.
$env:EXPECTED_MAX_SUCCESS = "10"

# 30 users fire 30 reserve attempts as concurrently as k6 can schedule locally.
$env:VUS = "30"
$env:ITERATIONS = "30"
$env:QUANTITY = "1"

$env:SETUP_TIMEOUT = "240s"
$env:REQUEST_TIMEOUT = "15s"
$env:MAX_DURATION = "30s"

# Keep true for this test so IP rate limit does not hide inventory contention.
$env:FAKE_IPS = "true"

Write-Host "Running TicketBox k6 oversell/concurrency check..."
Write-Host "BASE_URL=$env:BASE_URL"
Write-Host "SEED_USER_COUNT=$env:SEED_USER_COUNT"
Write-Host "VUS=$env:VUS ITERATIONS=$env:ITERATIONS"
Write-Host "CONCERT_ID=$env:CONCERT_ID"
Write-Host "CATEGORY_ID=$env:CATEGORY_ID"
Write-Host "EXPECTED_MAX_SUCCESS=$env:EXPECTED_MAX_SUCCESS"

k6 run scripts/k6-oversell-check.js
