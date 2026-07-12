# Đặc tả: Auth APIs

## API: `POST /auth/register`

### Mô tả
API đăng ký tài khoản audience mới bằng email, mật khẩu và họ tên. User mới được tạo ở trạng thái `PENDING` và cần xác thực email trước khi đăng nhập.

### Luồng chính
1. Client gửi email, password và full name.
2. Backend kiểm tra email đã tồn tại chưa.
3. Backend hash password bằng bcrypt.
4. Backend tạo user trạng thái `PENDING`.
5. Backend gán role mặc định `Audience`.
6. Backend tạo verification token và gửi email xác thực.
7. API trả thông tin đăng ký thành công.

### Kịch bản lỗi
- Email đã tồn tại: request bị từ chối.
- Email sai định dạng: `400 Bad Request`.
- Password không đạt yêu cầu tối thiểu: `400 Bad Request`.
- Gửi email xác thực thất bại: backend log lỗi hoặc trả lỗi tùy cấu hình.
- Database lỗi: API trả lỗi server.

### Ràng buộc
- Không lưu password plain text.
- User mới không được `ACTIVE` trước khi xác thực email.
- Role mặc định phải là role người mua vé, không phải admin/checker.
- Không trả password hash trong response.

### Tiêu chí chấp nhận
- Email mới tạo được user `PENDING`.
- Email trùng không tạo user mới.
- Password trong DB là hash.
- User mới có role `Audience`.
- Verification token được tạo để xác thực email.

## API: `GET /auth/verify`

### Mô tả
API xác thực email bằng token được gửi cho user sau khi đăng ký.

### Luồng chính
1. User mở link xác thực email.
2. Client/backend gửi token lên `GET /auth/verify`.
3. Backend kiểm tra token tồn tại, đúng user và còn hạn.
4. Backend chuyển user từ `PENDING` sang `ACTIVE`.
5. Token đã dùng không được dùng lại.

### Kịch bản lỗi
- Thiếu token: `400 Bad Request`.
- Token sai hoặc hết hạn: request bị từ chối.
- User không tồn tại: request bị từ chối.
- User đã active: có thể trả thành công idempotent hoặc thông báo đã xác thực.

### Ràng buộc
- Token xác thực phải có thời hạn.
- Token đã dùng không nên dùng lại.
- Chỉ user xác thực email mới được đăng nhập.

### Tiêu chí chấp nhận
- Token hợp lệ chuyển user sang `ACTIVE`.
- Token sai/hết hạn không active user.
- User active có thể đăng nhập.

## API: `POST /auth/resend-verification`

### Mô tả
API gửi lại email xác thực cho user chưa active.

### Luồng chính
1. Client gửi email.
2. Backend tìm user theo email.
3. Backend kiểm tra user chưa `ACTIVE`.
4. Backend tạo verification token mới.
5. Backend gửi lại email xác thực.

### Kịch bản lỗi
- Email không tồn tại: request bị từ chối hoặc trả thông báo chung để tránh lộ user.
- User đã active: không cần gửi lại verification.
- Gửi email lỗi: backend trả/log lỗi.

### Ràng buộc
- Không nên tiết lộ quá nhiều về việc email có tồn tại hay không.
- Token cũ nên hết hiệu lực hoặc không còn được ưu tiên.
- Có thể cần rate limit nếu endpoint bị spam.

### Tiêu chí chấp nhận
- User `PENDING` nhận được verification mới.
- User `ACTIVE` không cần resend.
- Token mới xác thực được email.

## API: `POST /auth/login`

### Mô tả
API đăng nhập bằng email/password. API trả access token, refresh token, thông tin user, roles và permissions nếu credential hợp lệ.

### Luồng chính
1. Client gửi email và password.
2. Request đi qua Token Bucket login rate limit.
3. Backend tìm user theo email.
4. Backend kiểm tra user `ACTIVE`.
5. Backend so sánh password bằng bcrypt.
6. Backend lấy roles và permissions của user.
7. Backend tạo access token và refresh token.
8. API trả token và profile.

### Kịch bản lỗi
- Email/password sai: `401 Unauthorized`.
- User chưa verify email: request bị từ chối.
- User bị inactive/banned: request bị từ chối.
- Spam login vượt ngưỡng: `429 Too Many Requests`.
- Redis rate limit lỗi: hệ thống ưu tiên cho request đi tiếp để tránh tê liệt login.

### Ràng buộc
- Password compare phải dùng bcrypt.
- Access token nên có TTL ngắn.
- Refresh token có TTL dài hơn nhưng phải có thể vô hiệu hóa.
- Login phải có rate limit để giảm brute-force.
- Không trả password hash.
- Trade-off: Token Bucket bảo vệ login tốt hơn fixed window ở burst nhỏ, nhưng cần cấu hình hợp lý để không chặn user thật.

### Tiêu chí chấp nhận
- User `ACTIVE` đăng nhập đúng nhận token.
- User chưa verify không đăng nhập được.
- Password sai trả `401`.
- Spam login trả `429`.
- Response có roles và permissions đúng.

## API: `GET /auth/me`

### Mô tả
API trả profile của user hiện tại dựa trên access token.

### Luồng chính
1. Client gửi request kèm access token.
2. `JwtAuthGuard` xác minh token.
3. Backend lấy user id từ token.
4. Backend trả thông tin profile, roles và permissions.

### Kịch bản lỗi
- Thiếu token: `401 Unauthorized`.
- Token sai/hết hạn: `401 Unauthorized`.
- User không tồn tại: request bị từ chối.

### Ràng buộc
- Không trả password hash hoặc thông tin nhạy cảm.
- Chỉ trả profile của user trong token.
- API phải hoạt động thống nhất cho web/mobile.

### Tiêu chí chấp nhận
- Token hợp lệ trả đúng profile.
- Token thiếu/sai trả `401`.
- Response không chứa password hash.

## API: `POST /auth/refresh`

### Mô tả
API cấp access token mới khi access token cũ hết hạn, dựa trên refresh token hợp lệ.

### Luồng chính
1. Client gửi refresh token.
2. Backend kiểm tra refresh token tồn tại, còn hạn và chưa bị vô hiệu hóa.
3. Backend xác định user tương ứng.
4. Backend phát hành access token mới.
5. API trả token mới cho client.

### Kịch bản lỗi
- Thiếu refresh token: `401 Unauthorized`.
- Refresh token sai/hết hạn: `401 Unauthorized`.
- Refresh token đã logout/reset password: `401 Unauthorized`.
- User không còn active: request bị từ chối.

### Ràng buộc
- Refresh token phải có thể bị revoke.
- Reset password/logout phải làm refresh token cũ mất hiệu lực.
- Không dùng refresh token để truy cập API nghiệp vụ trực tiếp.

### Tiêu chí chấp nhận
- Refresh token hợp lệ cấp access token mới.
- Refresh token cũ sau logout không dùng được.
- Refresh token cũ sau reset password không dùng được.

## API: `POST /auth/logout`

### Mô tả
API đăng xuất user bằng cách làm mất hiệu lực refresh token hiện tại.

### Luồng chính
1. Client gọi logout.
2. Backend xác định refresh token/session hiện tại.
3. Backend revoke refresh token.
4. Client xóa token local.
5. Các request refresh sau đó bằng token cũ bị từ chối.

### Kịch bản lỗi
- Thiếu/sai token: `401 Unauthorized`.
- Refresh token đã logout: có thể trả thành công idempotent hoặc từ chối.
- Database/session store lỗi: API trả lỗi server.

### Ràng buộc
- Logout phải làm refresh token cũ mất hiệu lực.
- Access token có thể vẫn sống đến khi hết TTL nếu không có blacklist.
- Client phải xóa token local sau logout.

### Tiêu chí chấp nhận
- Logout thành công.
- Refresh token cũ không refresh được nữa.
- Client quay lại trạng thái chưa đăng nhập.

## API: `POST /auth/change-password`

### Mô tả
API cho user đã đăng nhập đổi mật khẩu.

### Luồng chính
1. User gửi mật khẩu hiện tại và mật khẩu mới.
2. Backend xác minh access token.
3. Backend so sánh mật khẩu hiện tại bằng bcrypt.
4. Backend hash mật khẩu mới.
5. Backend cập nhật password hash.
6. Backend vô hiệu hóa refresh token cũ.

### Kịch bản lỗi
- Thiếu/sai access token: `401 Unauthorized`.
- Mật khẩu hiện tại sai: request bị từ chối.
- Mật khẩu mới không đạt yêu cầu: `400 Bad Request`.
- DB lỗi: API trả lỗi server.

### Ràng buộc
- Mật khẩu mới phải được hash.
- Không cho đổi mật khẩu nếu không biết mật khẩu hiện tại.
- Refresh token cũ nên mất hiệu lực sau đổi mật khẩu.

### Tiêu chí chấp nhận
- Đổi mật khẩu với mật khẩu hiện tại đúng thành công.
- Đăng nhập bằng mật khẩu mới thành công.
- Mật khẩu cũ không còn đăng nhập được.
- Refresh token cũ bị vô hiệu hóa.

## API: `POST /auth/forgot-password`

### Mô tả
API yêu cầu gửi link reset password cho email của user.

### Luồng chính
1. Client gửi email.
2. Backend tìm user theo email.
3. Backend tạo reset password token.
4. Backend gửi email reset password.
5. API trả thông báo đã xử lý.

### Kịch bản lỗi
- Email không tồn tại: nên trả thông báo chung để tránh lộ user.
- Gửi email lỗi: backend log/trả lỗi tùy cấu hình.
- User bị khóa: có thể từ chối reset.

### Ràng buộc
- Reset token phải có thời hạn.
- Không nên tiết lộ email có tồn tại hay không.
- Có thể cần rate limit để tránh spam email.

### Tiêu chí chấp nhận
- Email hợp lệ nhận reset token/link.
- Token được lưu với hạn dùng.
- API không lộ thông tin nhạy cảm.

## API: `POST /auth/reset-password`

### Mô tả
API đặt lại mật khẩu bằng reset token từ email.

### Luồng chính
1. User gửi reset token và mật khẩu mới.
2. Backend kiểm tra token tồn tại và còn hạn.
3. Backend hash mật khẩu mới.
4. Backend cập nhật password hash.
5. Backend vô hiệu hóa reset token.
6. Backend vô hiệu hóa refresh token cũ.

### Kịch bản lỗi
- Token sai/hết hạn: request bị từ chối.
- Mật khẩu mới không hợp lệ: `400 Bad Request`.
- User không tồn tại: request bị từ chối.
- Token đã dùng: request bị từ chối.

### Ràng buộc
- Reset token chỉ dùng một lần.
- Password mới phải hash bằng bcrypt.
- Refresh token cũ phải mất hiệu lực sau reset.
- Không tự động đăng nhập nếu hệ thống không chủ đích làm vậy.

### Tiêu chí chấp nhận
- Token hợp lệ reset password thành công.
- Đăng nhập bằng password mới thành công.
- Token reset không dùng lại được.
- Refresh token cũ không dùng được sau reset.
