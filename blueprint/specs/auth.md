# Đặc tả: Xác thực và phân quyền

## Mô tả
Tính năng xác thực và phân quyền chịu trách nhiệm định danh người dùng, cấp phiên đăng nhập an toàn và kiểm soát quyền truy cập vào các nhóm chức năng của TicketBox.

Hệ thống hỗ trợ các nhóm người dùng chính:

- `Audience`: khán giả đăng ký tài khoản, đăng nhập, mua vé, xem vé đã mua.
- `ADMIN`: quản trị viên quản lý sự kiện, người dùng, doanh thu và vận hành hệ thống.
- `Checker`: nhân sự soát vé được phân công theo concert/gate.

Authentication được triển khai bằng JWT access token và refresh token. Authorization được kiểm soát bằng guard theo role/permission trên backend API.

## Luồng chính

### 1. Đăng ký tài khoản khán giả
1. Người dùng gửi thông tin đăng ký tới `POST /auth/register`.
2. Backend kiểm tra email đã tồn tại hay chưa.
3. Backend hash mật khẩu bằng bcrypt với `BCRYPT_ROUNDS = 10`.
4. Backend tạo user trạng thái `PENDING`.
5. Backend gán role mặc định `Audience`.
6. Backend tạo email verification token có thời hạn 1 giờ.
7. Backend gửi email xác thực cho người dùng.
8. API trả về thông tin user cơ bản và trạng thái `PENDING`.

### 2. Xác thực email
1. Người dùng mở link xác thực, gọi `GET /auth/verify?token=...`.
2. Backend verify token bằng `JWT_SECRET`.
3. Nếu token hợp lệ, backend cập nhật user sang trạng thái `ACTIVE`.
4. Backend redirect người dùng về frontend.

### 3. Đăng nhập
1. Người dùng gửi email/password tới `POST /auth/login`.
2. `AuthLoginRateLimitGuard` kiểm tra token bucket theo IP và email.
3. Backend tìm user theo email, kèm role và permission.
4. Backend từ chối user chưa kích hoạt hoặc không hợp lệ.
5. Backend so khớp mật khẩu bằng bcrypt.
6. Backend tạo access token và refresh token.
7. Refresh token được hash và lưu vào database.
8. API trả về:
   - `accessToken`
   - `refreshToken`
   - thông tin user
   - danh sách roles
   - danh sách permissions

Access token có thời hạn 15 phút. Refresh token có thời hạn 7 ngày.

### 4. Khôi phục phiên đăng nhập
1. Frontend gọi `GET /auth/me` với header `Authorization: Bearer <accessToken>`.
2. `JwtAuthGuard` verify access token.
3. Backend lấy user hiện tại và trả về profile, roles, permissions.

Luồng này dùng để phục hồi trạng thái đăng nhập khi người dùng refresh trang.

### 5. Refresh token
1. Frontend gửi refresh token tới `POST /auth/refresh`.
2. Backend verify chữ ký và thời hạn refresh token.
3. Backend kiểm tra user còn `ACTIVE`.
4. Backend so khớp refresh token với bản hash trong database.
5. Nếu hợp lệ, backend cấp access token và refresh token mới.
6. Refresh token mới tiếp tục được hash và lưu lại.

### 6. Logout
1. Người dùng gọi `POST /auth/logout`.
2. `JwtAuthGuard` xác thực access token.
3. Backend xóa `refresh_token` trong database.
4. Các lần refresh token sau đó sẽ bị từ chối.

### 7. Đổi mật khẩu
1. Người dùng gọi `POST /auth/change-password`.
2. `JwtAuthGuard` xác thực access token.
3. Backend kiểm tra mật khẩu hiện tại.
4. Backend hash mật khẩu mới bằng bcrypt.
5. Backend cập nhật `password_hash`.

### 8. Quên mật khẩu và đặt lại mật khẩu
1. Người dùng gửi email tới `POST /auth/forgot-password`.
2. Backend tạo reset token có thời hạn 15 phút.
3. Reset token được ký bằng `JWT_SECRET + password_hash` hiện tại.
4. Người dùng gửi token và mật khẩu mới tới `POST /auth/reset-password`.
5. Backend verify token.
6. Backend cập nhật mật khẩu mới.
7. Backend xóa refresh token để buộc đăng nhập lại trên các phiên cũ.

### 9. Phân quyền truy cập API
1. API yêu cầu đăng nhập sử dụng `JwtAuthGuard`.
2. API yêu cầu quyền quản trị sử dụng `RolesGuard` kết hợp decorator role/permission.
3. `RolesGuard` đọc roles/permissions từ JWT payload.
4. Request chỉ được đi tiếp khi user có role hoặc permission phù hợp.

## Kịch bản lỗi

### Đăng ký
- Email đã tồn tại: trả `400 Bad Request`.
- Thiếu role mặc định `Audience` trong database: trả `400 Bad Request`.
- Dữ liệu đầu vào không hợp lệ: trả `400 Bad Request`.

### Xác thực email
- Token không hợp lệ hoặc hết hạn: trả `400 Bad Request`.
- User không tồn tại: trả `400 Bad Request`.
- User đã `ACTIVE`: trả thông báo tài khoản đã được kích hoạt trước đó.

### Đăng nhập
- Email không tồn tại hoặc mật khẩu sai: trả `401 Unauthorized`.
- User còn `PENDING`: trả `401 Unauthorized`.
- Request login vượt token bucket: trả `429 Too Many Requests`.
- Redis rate-limit tạm thời lỗi: hệ thống fail-open để không làm gián đoạn hoàn toàn đăng nhập.

### JWT access token
- Không có header `Authorization`: trả `401 Unauthorized`.
- Header không bắt đầu bằng `Bearer`: trả `401 Unauthorized`.
- Token hết hạn hoặc sai chữ ký: trả `401 Unauthorized`.
- `JWT_SECRET` chưa cấu hình: trả `401 Unauthorized`.

### Refresh token
- Refresh token hết hạn hoặc sai chữ ký: trả `401 Unauthorized`.
- User không còn `ACTIVE`: trả `401 Unauthorized`.
- Refresh token không khớp bản hash đã lưu: trả `401 Unauthorized`.
- User đã logout nên `refresh_token` trong database bị xóa: trả `401 Unauthorized`.

### Quên mật khẩu
- Email không tồn tại: trả `400 Bad Request`.
- Reset token hết hạn hoặc không hợp lệ: trả `400 Bad Request`.
- Sau khi mật khẩu đổi, reset token cũ không còn hợp lệ vì secret phụ thuộc vào `password_hash` cũ.

### Phân quyền
- User không có role/permission phù hợp: request bị từ chối bởi guard.
- API không khai báo role/permission thì `RolesGuard` cho qua sau khi JWT hợp lệ.

## Ràng buộc

- Mật khẩu không được lưu dạng plain text.
- Mật khẩu và refresh token phải được hash bằng bcrypt.
- Access token phải có thời hạn ngắn để giảm rủi ro khi bị lộ.
- Refresh token phải được lưu dạng hash trong database, không lưu token gốc.
- User đăng ký mới phải ở trạng thái `PENDING` cho đến khi xác thực email.
- User `PENDING`, `INACTIVE` hoặc không hợp lệ không được đăng nhập.
- JWT payload phải chứa thông tin đủ để phân quyền: `sub`, `email`, `fullName`, `roles`, `permissions`.
- Login phải được rate limit theo cả IP và email để giảm brute force và bot traffic.
- Rate limit login dùng Redis Token Bucket:
  - `AUTH_LOGIN_IP_BUCKET_CAPACITY`, mặc định `10`.
  - `AUTH_LOGIN_IP_REFILL_SECONDS`, mặc định `60`.
  - `AUTH_LOGIN_EMAIL_BUCKET_CAPACITY`, mặc định `5`.
  - `AUTH_LOGIN_EMAIL_REFILL_SECONDS`, mặc định `60`.
- Khi Redis rate-limit không khả dụng, guard cho request đi tiếp để tránh làm hệ thống mất khả năng đăng nhập hoàn toàn.
- Các API quản trị phải luôn đi qua JWT authentication và role/permission authorization.

## Tiêu chí chấp nhận

- Người dùng đăng ký bằng email mới được tạo với trạng thái `PENDING` và role `Audience`.
- Email trùng không tạo user mới.
- Link xác thực hợp lệ chuyển user từ `PENDING` sang `ACTIVE`.
- User chưa xác thực email không đăng nhập được.
- User `ACTIVE` đăng nhập đúng email/password nhận được access token, refresh token, roles và permissions.
- Spam login vượt ngưỡng bị trả `429 Too Many Requests`.
- `GET /auth/me` trả đúng profile khi access token hợp lệ.
- Access token thiếu, sai hoặc hết hạn bị từ chối.
- Refresh token hợp lệ cấp token paicòn dùng được.
- Đổi mật khẩu yêu cầu mật khẩu hiện tại đúngr mới.
- Logout làm refresh token cũ không .
- Reset password thành công làm refresh token cũ mất hiệu lực.
- API dành cho admin không thể truy cập bằng user không có role/permission phù hợp.

## Kiểm thử đề xuất

### Manual test
- Đăng ký tài khoản mới, kiểm tra user ở trạng thái `PENDING`.
- Xác thực email, kiểm tra user chuyển sang `ACTIVE`.
- Đăng nhập bằng tài khoản `ACTIVE`, kiểm tra response có token và roles.
- Đăng nhập sai mật khẩu, kiểm tra `401`.
- Gửi nhiều request login liên tục, kiểm tra `429`.
- Gọi `/auth/me` với token hợp lệ, kiểm tra trả profile.
- Gọi `/auth/me` không token, kiểm tra `401`.
- Logout rồi gọi refresh bằng refresh token cũ, kiểm tra `401`.
- Đổi mật khẩu, sau đó đăng nhập bằng mật khẩu mới.

### Automated test
- Unit test cho login thành công/thất bại.
- Unit test cho refresh token hợp lệ/không hợp lệ.
- Unit test cho `JwtAuthGuard` với token thiếu, sai và hợp lệ.
- Unit test cho `RolesGuard` với role/permission đủ và thiếu.
- Load test nhẹ cho login để kiểm tra Token Bucket trả `429` khi vượt ngưỡng.
## Phân tích trade-off

### JWT access token + refresh token
- Ưu điểm: backend stateless cho access token, dễ scale nhiều instance và phù hợp môi trường container.
- Nhược điểm: access token đã phát ra không thể bị thu hồi ngay lập tức nếu không có blacklist/token version.
- Lý do phù hợp: hệ thống cần bảo vệ nhiều API bằng JWT, trong khi yêu cầu logout tức thời trên mọi thiết bị chưa phải ưu tiên chính.

### Role/permission guard ở backend
- Ưu điểm: quyền được enforce ở server, không phụ thuộc vào việc frontend có ẩn nút hay không.
- Nhược điểm: cần duy trì mapping role/permission nhất quán trong database và code.
- Lý do phù hợp: admin, organizer, checker và audience có quyền khác nhau rõ ràng nên kiểm soát tập trung bằng guard là hợp lý.

### Token Bucket cho login
- Ưu điểm: giảm brute force/spam login nhưng vẫn cho phép một lượng retry ngắn.
- Nhược điểm: nếu cấu hình quá thấp có thể ảnh hưởng người dùng thật khi nhập sai nhiều lần.
- Lý do phù hợp: login là endpoint dễ bị spam, cần bảo vệ riêng nhưng không nên làm hệ thống mất khả năng đăng nhập hoàn toàn khi Redis lỗi.
