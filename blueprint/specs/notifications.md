# Đặc tả: Notifications

## Mô tả
Notifications cung cấp thông báo cho người dùng sau các sự kiện quan trọng như thanh toán thành công, phát hành vé hoặc các thông báo hệ thống. Module hỗ trợ danh sách notification, unread count, mark as read và stream realtime qua SSE.

Backend chính:

- `apps/backend-api/src/modules/notifications/notification.controller.ts`
- `apps/backend-api/src/modules/notifications/admin-notification.controller.ts`
- `apps/backend-api/src/modules/notifications/notification.service.ts`
- `apps/backend-api/src/modules/notifications/notification-stream.service.ts`

API user:

- `GET /notifications`
- `GET /notifications/unread-count`
- `GET /notifications/stream`
- `PATCH /notifications/read-all`
- `PATCH /notifications/:id/read`

API admin:

- `GET /admin/notifications`

## Luồng chính

### 1. User xem danh sách notification
Client gọi:

```txt
GET /notifications
```

Query:

```txt
page?: number
limit?: number
unreadOnly?: true | false
```

Backend chỉ trả notification của user hiện tại theo `req.user.sub`.

### 2. User xem unread count
Client gọi:

```txt
GET /notifications/unread-count
```

Mục đích:

- Hiển thị badge số thông báo chưa đọc trên frontend.
- Có thể gọi định kỳ hoặc sau khi nhận SSE event.

### 3. Stream realtime notification
Client mở kết nối:

```txt
GET /notifications/stream
```

Backend dùng SSE (`@Sse`) để stream notification mới cho user hiện tại.

Luồng:

1. User đăng nhập.
2. FE mở SSE connection.
3. Khi service phát notification mới, stream gửi event tới user tương ứng.
4. FE cập nhật UI/unread count.

### 4. Mark one notification as read
Client gọi:

```txt
PATCH /notifications/:id/read
```

Backend kiểm tra notification thuộc user hiện tại rồi đánh dấu đã đọc.

### 5. Mark all as read
Client gọi:

```txt
PATCH /notifications/read-all
```

Backend đánh dấu toàn bộ notification của user hiện tại là đã đọc.

### 6. Admin xem notification
Admin gọi:

```txt
GET /admin/notifications
```

API này dành cho quản trị, dùng `AdminNotificationQueryDto` để query danh sách notification toàn hệ thống.

## Kịch bản lỗi

- Thiếu JWT: `401 Unauthorized`.
- Notification không thuộc user hiện tại: request bị từ chối hoặc không tìm thấy.
- Notification ID không tồn tại: `404 Not Found`.
- SSE bị mất kết nối: client cần tự reconnect.
- User không phải admin gọi `/admin/notifications`: `403 Forbidden`.

## Ràng buộc

- User thường chỉ xem và update notification của chính mình.
- Admin mới được xem notification toàn hệ thống.
- SSE không thay thế lưu trữ bền vững; notification vẫn phải lưu DB để user xem lại.
- Notification dispatch không được làm rollback payment/order đã commit.

## Tiêu chí chấp nhận

- User xem được danh sách notification của mình.
- User xem được số notification chưa đọc.
- User mark một notification là read thành công.
- User mark all read thành công.
- User nhận được notification realtime qua SSE khi đang online.
- Admin xem được notification toàn hệ thống.
- User thường không truy cập được `/admin/notifications`.
## Phân tích trade-off

### SSE cho realtime notification
- Ưu điểm: đơn giản hơn WebSocket cho luồng server-to-client một chiều, dễ dùng cho notification.
- Nhược điểm: không phù hợp nếu cần chat hai chiều hoặc tương tác realtime phức tạp.
- Lý do phù hợp: notification chủ yếu là backend đẩy sự kiện mới xuống client.

### Vẫn lưu notification trong DB
- Ưu điểm: user offline vẫn xem lại được thông báo sau khi đăng nhập.
- Nhược điểm: cần dọn dẹp hoặc phân trang khi số lượng notification tăng.
- Lý do phù hợp: SSE có thể mất kết nối, DB là nguồn lưu trữ bền vững.

### Notification failure không rollback payment/order
- Ưu điểm: nghiệp vụ chính đã commit không bị hủy chỉ vì gửi thông báo lỗi.
- Nhược điểm: user có thể không nhận notification dù vé/order đã thành công.
- Lý do phù hợp: payment và ticket issuance quan trọng hơn notification; lỗi notification có thể retry hoặc hiển thị khi user mở trang vé.
