$ErrorActionPreference = "Stop"

# ==============================================================================
# Kịch bản test luồng bán vé thông thường (k6 Ticketing Flow)
# Hướng dẫn: Copy file này thành scripts/k6-ticketing-flow.local.ps1 để chạy local.
# ==============================================================================

# Địa chỉ Backend API
$env:BASE_URL = "http://localhost:3000"

# Chế độ sử dụng danh sách tài khoản seeding sẵn: audience1@ticketbox.local ... N
$env:USE_SEED_USERS = "true"
$env:SEED_USER_COUNT = "80"
$env:SEED_PASSWORD = "123456"
$env:SEED_LOGIN_FAKE_IPS = "true"

# Thông tin Concert và Hạng vé cần test (Đại diện lấy từ database)
# Mẹo test: Để trống k6 sẽ tự động tìm kiếm Concert & Category còn hoạt động đầu tiên.
$env:CONCERT_ID = ""
$env:CATEGORY_ID = ""

# --- THÔNG SỐ TẢI (LOAD PROFILE) ---
$env:VUS = "20"            # Số lượng người dùng ảo đồng thời (Virtual Users)
$env:DURATION = "15s"       # Thời gian chạy test
$env:SETUP_TIMEOUT = "240s" # Giới hạn thời gian chuẩn bị login (khuyên dùng > 120s khi tải cao)
$env:REQUEST_TIMEOUT = "15s"# Giới hạn thời gian phản hồi của mỗi request

# Số lượng vé mua trên mỗi request đặt vé
$env:QUANTITY = "1"

# --- CẤU HÌNH ĐỂ DEMO RATE LIMIT ---

# 1. Đăng nhập mỗi lần lặp (Đăng nhập liên tục để test AuthLoginRateLimitGuard)
# - "true"  => Đăng nhập lại trên mỗi lượt gọi để kích hoạt rate limit của endpoint Login.
# - "false" => Chỉ đăng nhập một lần ở phase setup, tái sử dụng token (mặc định để test mua vé).
$env:LOGIN_EACH_ITER = "false"

# 2. Giả lập nhiều IP khác nhau (Để test IP Rate Limit / ConcertDetailRateLimitGuard)
# - "true"  => Sinh địa chỉ IP ảo ngẫu nhiên gửi kèm header x-forwarded-for để bỏ qua IP Rate Limit.
# - "false" => Tất cả traffic chạy chung IP local để dễ dàng kích hoạt chặn Rate Limit của IP (429).
$env:FAKE_IPS = "false"

Write-Host "========================================================"
Write-Host "Khởi chạy k6 Ticketing Flow..."
Write-Host "BASE_URL        : $env:BASE_URL"
Write-Host "SEED_USER_COUNT : $env:SEED_USER_COUNT"
Write-Host "VUS             : $env:VUS"
Write-Host "DURATION        : $env:DURATION"
Write-Host "CONCERT_ID      : $env:CONCERT_ID"
Write-Host "CATEGORY_ID     : $env:CATEGORY_ID"
Write-Host "FAKE_IPS (Rate Limit test) : $env:FAKE_IPS"
Write-Host "========================================================"

k6 run scripts/k6-ticketing-flow.js
