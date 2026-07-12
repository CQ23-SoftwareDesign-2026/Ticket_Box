$ErrorActionPreference = "Stop"

# ==============================================================================
# Kịch bản test đặt vé đồng thời chống bán lố (k6 Concurrency / Oversell Check)
# Hướng dẫn: Copy file này thành scripts/k6-oversell-check.local.ps1 để chạy local.
# ==============================================================================

# Địa chỉ Backend API
$env:BASE_URL = "http://localhost:3000"

# Số lượng tài khoản seeding sử dụng đồng thời
$env:SEED_USER_COUNT = "30"
$env:SEED_PASSWORD = "123456"

# ID Concert và Hạng vé cần chạy test tranh chấp (Bắt buộc phải điền ID thật từ DB)
# Mẹo test: Chọn một hạng vé còn cực kỳ ít vé tồn kho (ví dụ: 10 vé) để test tranh chấp.
$env:CONCERT_ID = "your-concert-uuid"
$env:CATEGORY_ID = "your-category-uuid"

# Số lượng vé tồn thực tế còn lại của hạng vé trên DB (Để đối chiếu k6 hiển thị PASS/FAIL)
$env:EXPECTED_MAX_SUCCESS = "10"

# --- CẤU HÌNH TẢI TRANH CHẤP ĐỒNG THỜI ---
# 30 người dùng ảo đồng thời thực hiện đúng 30 lượt đặt vé song song tức thì.
$env:VUS = "30"
$env:ITERATIONS = "30"
$env:QUANTITY = "1"

$env:SETUP_TIMEOUT = "240s"
$env:REQUEST_TIMEOUT = "15s"
$env:MAX_DURATION = "30s"

# Giả lập IP ảo khi tranh chấp (Bắt buộc là true để IP Rate Limit không chặn trước khi kiểm tra tranh chấp kho vé)
$env:FAKE_IPS = "true"

Write-Host "========================================================"
Write-Host "Khởi chạy k6 Oversell/Concurrency Check..."
Write-Host "BASE_URL             : $env:BASE_URL"
Write-Host "SEED_USER_COUNT      : $env:SEED_USER_COUNT"
Write-Host "VUS / ITERATIONS     : $env:VUS / $env:ITERATIONS"
Write-Host "CONCERT_ID           : $env:CONCERT_ID"
Write-Host "CATEGORY_ID          : $env:CATEGORY_ID"
Write-Host "EXPECTED_MAX_SUCCESS : $env:EXPECTED_MAX_SUCCESS"
Write-Host "========================================================"

k6 run scripts/k6-oversell-check.js
