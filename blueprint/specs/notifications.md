# Đặc tả: Notifications

## Tổng quan
Notifications cung cấp thông báo trong hệ thống cho người dùng và admin. Module hiện hỗ trợ danh sách thông báo, số lượng chưa đọc, đánh dấu đã đọc, stream realtime bằng SSE và màn hình admin xem toàn bộ notification.

Backend liên quan:

- `apps/backend-api/src/modules/notifications/notification.controller.ts`
- `apps/backend-api/src/modules/notifications/admin-notification.controller.ts`
- `apps/backend-api/src/modules/notifications/notification.service.ts`
- `apps/backend-api/src/modules/notifications/notification-stream.service.ts`

## API: `GET /notifications`

### Mô tả
Lấy danh sách notification của user đang đăng nhập. API dùng cho màn hình thông báo cá nhân trên web/mobile.

### Luồng chính
1. Client gửi request kèm JWT.
2. `JwtAuthGuard` xác thực user và lấy `req.user.sub`.
3. Backend đọc query `page`, `limit`, `unreadOnly`.
4. Service giới hạn `page >= 1`, `limit` trong khoảng `1..100`.
5. Backend query notification theo `user_id`, nếu `unreadOnly=true` thì chỉ lấy bản ghi có `read_at = null`.
6. Response trả về `data` và `meta` gồm `page`, `limit`, `total`, `totalPages`.

### Kịch bản lỗi
- Thiếu hoặc sai JWT: `401 Unauthorized`.
- Query `page`, `limit` không hợp lệ: service tự đưa về giá trị an toàn.
- Database lỗi: trả lỗi server tương ứng.

### Ràng buộc
- User chỉ được xem notification của chính mình.
- Danh sách phải phân trang để tránh tải quá nhiều bản ghi.
- Notification cần sắp xếp mới nhất trước theo `created_at desc`.

### Tiêu chí chấp nhận
- User đăng nhập xem được danh sách notification của mình.
- `unreadOnly=true` chỉ trả notification chưa đọc.
- User A không thấy notification của user B.
- Response luôn có metadata phân trang.

## API: `GET /notifications/unread-count`

### Mô tả
Lấy số notification chưa đọc của user hiện tại để hiển thị badge trên giao diện.

### Luồng chính
1. Client gửi request kèm JWT.
2. Backend lấy `user_id` từ token.
3. Service count notification với `user_id` hiện tại và `read_at = null`.
4. Response trả về `{ count }`.

### Kịch bản lỗi
- Thiếu hoặc sai JWT: `401 Unauthorized`.
- Database lỗi: trả lỗi server tương ứng.

### Ràng buộc
- Chỉ count notification của user hiện tại.
- API nên nhẹ vì FE có thể gọi sau khi nhận SSE hoặc khi mở dropdown notification.

### Tiêu chí chấp nhận
- Count đúng số notification chưa đọc.
- Sau khi mark read/mark all read, count giảm tương ứng.

## API: `GET /notifications/stream`

### Mô tả
Mở kết nối SSE để backend đẩy notification mới theo thời gian thực cho user đang online.

### Luồng chính
1. Client đăng nhập và mở SSE connection tới `/notifications/stream`.
2. `JwtAuthGuard` xác thực user.
3. `NotificationStreamService.connect(userId)` đăng ký stream riêng cho user.
4. Khi có notification mới, service phát event tới stream của user tương ứng.
5. FE nhận event, cập nhật UI và có thể gọi lại unread count.

### Kịch bản lỗi
- Thiếu hoặc sai JWT: `401 Unauthorized`.
- Mất mạng hoặc browser đóng tab: SSE connection bị ngắt.
- SSE không nhận được event: notification vẫn được lưu DB, user có thể xem lại qua `GET /notifications`.

### Ràng buộc
- SSE chỉ phù hợp luồng server đẩy một chiều.
- SSE không thay thế lưu trữ bền vững; notification vẫn phải ghi DB.
- Client cần tự reconnect khi mất kết nối.

### Tiêu chí chấp nhận
- User online nhận được notification mới qua SSE.
- Khi SSE mất kết nối, user vẫn xem được notification đã lưu qua API danh sách.
- Notification chỉ được gửi tới đúng user nhận.

## API: `PATCH /notifications/:id/read`

### Mô tả
Đánh dấu một notification của user hiện tại là đã đọc.

### Luồng chính
1. Client gửi request kèm JWT và `notification id`.
2. Backend tìm notification theo `id` và `user_id`.
3. Nếu không tồn tại, trả `404`.
4. Nếu đã có `read_at`, trả lại notification hiện tại.
5. Nếu chưa đọc, cập nhật `read_at = now`.
6. Response trả notification sau cập nhật.

### Kịch bản lỗi
- Thiếu hoặc sai JWT: `401 Unauthorized`.
- Notification không tồn tại hoặc không thuộc user hiện tại: `404 Not Found`.
- Database lỗi: trả lỗi server tương ứng.

### Ràng buộc
- Không cho user đánh dấu notification của người khác.
- API phải idempotent: gọi lại với notification đã đọc không tạo lỗi nghiệp vụ.

### Tiêu chí chấp nhận
- Notification chưa đọc chuyển sang đã đọc.
- Gọi lại API với cùng notification không làm sai dữ liệu.
- User không thể mark read notification của user khác.

## API: `PATCH /notifications/read-all`

### Mô tả
Đánh dấu toàn bộ notification chưa đọc của user hiện tại là đã đọc.

### Luồng chính
1. Client gửi request kèm JWT.
2. Backend update nhiều notification theo `user_id` và `read_at = null`.
3. Service set `read_at = now`.
4. Response trả `{ updated }`, là số notification đã được cập nhật.

### Kịch bản lỗi
- Thiếu hoặc sai JWT: `401 Unauthorized`.
- Database lỗi: trả lỗi server tương ứng.

### Ràng buộc
- Chỉ update notification của user hiện tại.
- Không cần update lại notification đã đọc.

### Tiêu chí chấp nhận
- Tất cả notification chưa đọc của user được đánh dấu đã đọc.
- `unread-count` trả về `0` nếu không còn notification chưa đọc.
- Notification của user khác không bị ảnh hưởng.

## API: `GET /admin/notifications`

### Mô tả
Admin xem danh sách notification toàn hệ thống để kiểm tra thông báo đã gửi, trạng thái đọc và dữ liệu liên quan tới user/concert/order.

### Luồng chính
1. Admin gửi request kèm JWT.
2. `JwtAuthGuard` xác thực user.
3. `RolesGuard` kiểm tra role `ADMIN`.
4. Backend đọc query `page`, `limit`, `type`, `read`, `search`.
5. Service query notification, include thông tin user, concert và order.
6. Response trả `data` và `meta` phân trang.

### Kịch bản lỗi
- Thiếu hoặc sai JWT: `401 Unauthorized`.
- User không có role `ADMIN`: `403 Forbidden`.
- Query sai kiểu dữ liệu: `400 Bad Request` do validation pipe.
- Database lỗi: trả lỗi server tương ứng.

### Ràng buộc
- Chỉ admin được xem notification toàn hệ thống.
- API cần phân trang vì dữ liệu notification tăng theo thời gian.
- Search chỉ nên dùng cho thông tin hỗ trợ vận hành như title, message, tên/email user.

### Tiêu chí chấp nhận
- Admin xem được notification toàn hệ thống.
- Admin lọc được theo type/read/search.
- User thường không truy cập được endpoint admin.

## Phân tích trade-off

### Vấn đề
Notification cần realtime để user biết vé/thanh toán đã hoàn tất, nhưng vẫn phải xem lại được nếu user offline hoặc SSE bị mất kết nối.

### Giải pháp đang sử dụng
Hệ thống kết hợp DB persistent notification với SSE:

- DB là nguồn dữ liệu bền vững.
- SSE dùng để đẩy notification mới khi user đang online.
- Lỗi ở một notification channel được log lại nhưng không rollback nghiệp vụ chính như payment hoặc ticket issuance.

### Trade-off
- SSE đơn giản hơn WebSocket cho luồng một chiều từ server xuống client, nhưng không phù hợp nếu sau này cần chat hai chiều hoặc tương tác realtime phức tạp.
- Lưu DB giúp user offline xem lại notification, nhưng cần phân trang/dọn dẹp khi dữ liệu tăng.
- Không rollback payment/order khi gửi notification lỗi giúp nghiệp vụ chính ổn định hơn, đổi lại user có thể phải xem trạng thái trong trang order/ticket nếu notification bị chậm.
