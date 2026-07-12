# Đặc tả: Order lifecycle

## Mô tả
Order là bản ghi trung gian giữa luồng giữ vé và luồng thanh toán. Khi người dùng reserve vé thành công, hệ thống tạo order `PENDING`. Sau đó order có thể chuyển sang `PAID` khi thanh toán thành công, hoặc `CANCELLED` khi người dùng hủy, payment fail, hoặc order hết hạn.

Backend chính:

- `apps/backend-api/src/modules/payment/controllers/orders.controller.ts`
- `apps/backend-api/src/modules/payment/services/orders.service.ts`
- `apps/backend-api/src/modules/ticketing/consumers/order.consumer.ts`
- `apps/backend-api/src/modules/ticketing/services/pending-order-cleanup.service.ts`

## Luồng chính

### 1. Tạo order pending
Order được tạo bất đồng bộ sau khi reserve ticket thành công.

Luồng:

```txt
POST /tickets/reserve
  -> reserve inventory trong Redis
  -> publish message order.create.queue
  -> OrderCreateConsumer tạo Order PENDING
```

Order ban đầu:

- `status = PENDING`
- Có `expires_at`
- Lưu `ticket_metadata` hoặc `ticket_breakdown` để biết category/quantity đã giữ.
- Chưa tạo dòng `Ticket` thật.

### 2. User xem lịch sử order
Client gọi:

```txt
GET /orders
```

Query:

```txt
page?: number
limit?: number
status?: PENDING | PAID | CANCELLED
```

Backend chỉ trả order của `req.user.sub`.

### 3. User xem chi tiết order
Client gọi:

```txt
GET /orders/:id
```

Backend kiểm tra order thuộc user hiện tại. Response gồm thông tin order, concert, payment transactions và tickets nếu đã thanh toán.

### 4. Admin xem order
Admin dùng:

```txt
GET /orders/admin
GET /orders/admin/:id
```

`GET /orders/admin` hỗ trợ search/filter:

```txt
page?: number
limit?: number
status?: PENDING | PAID | CANCELLED
search?: order id | concert name | user email | user name
payment_method?: string
user_id?: string
concert_id?: string
```

Admin detail không bị giới hạn theo user sở hữu order.

### 5. Hủy order pending
User gọi:

```txt
POST /orders/:id/cancel
```

Backend xử lý:

1. Kiểm tra order thuộc user.
2. Chỉ cho hủy order đang `PENDING`.
3. Cập nhật order thành `CANCELLED`.
4. Rollback inventory Redis theo `ticket_breakdown`.
5. Trả lại order detail sau khi hủy.

### 6. Cleanup order hết hạn
`PendingOrderCleanupService` chạy cron mỗi phút.

Luồng:

1. Tìm order `PENDING` có `expires_at` nhỏ hơn hiện tại.
2. Chuyển order sang `CANCELLED`.
3. Rollback inventory cho từng category/quantity.
4. Không đụng tới order đã `PAID`.

## Kịch bản lỗi

- User chưa đăng nhập: `401 Unauthorized`.
- Order không tồn tại hoặc không thuộc user: `404 Not Found`.
- Hủy order đã `PAID`: `400 Bad Request`.
- Hủy order đã `CANCELLED`: `400 Bad Request`.
- Consumer tạo order nhận concert/category không tồn tại: lỗi foreign key, cần kiểm tra seed/database.
- Cleanup không kết nối được DB: log lỗi, lần cron sau sẽ retry.

## Ràng buộc

- User thường chỉ được xem order của chính mình.
- Admin mới được xem tất cả order.
- Ticket thật chỉ xuất hiện sau payment success.
- Hủy order pending phải rollback inventory đúng category/quantity.
- Cleanup order hết hạn phải idempotent, không rollback nhiều lần cùng một order.
- `ticket_breakdown` là nguồn ưu tiên để biết số lượng vé cần rollback.

## Tiêu chí chấp nhận

- Reserve thành công tạo order `PENDING`.
- User xem được lịch sử order của mình.
- User không xem được order của người khác.
- Admin xem được danh sách và chi tiết mọi order.
- Hủy order pending chuyển status sang `CANCELLED` và trả lại inventory.
- Order hết hạn được cron hủy tự động.
- Order đã thanh toán không bị cleanup/hủy nhầm.
## Phân tích trade-off

### Order `PENDING` có thời hạn
- Ưu điểm: người dùng có thời gian thanh toán nhưng vé không bị giữ vô hạn.
- Nhược điểm: nếu thời hạn quá ngắn sẽ làm user thật bị mất vé; quá dài sẽ làm inventory bị khóa lâu.
- Lý do phù hợp: ticketing cần cân bằng giữa trải nghiệm thanh toán và việc trả vé về pool cho người khác.

### Cleanup bằng cron mỗi phút
- Ưu điểm: đơn giản, dễ quan sát, không cần scheduler phức tạp cho từng order.
- Nhược điểm: order có thể hết hạn nhưng được cleanup trễ tối đa khoảng một phút hoặc hơn nếu DB lỗi.
- Lý do phù hợp: độ trễ nhỏ này chấp nhận được và giảm độ phức tạp vận hành.

### Order tạo bất đồng bộ qua RabbitMQ
- Ưu điểm: giảm thời gian xử lý trong request reserve, giúp chịu burst tốt hơn.
- Nhược điểm: có eventual consistency; FE có thể thấy order 404 trong thời gian ngắn sau reserve.
- Lý do phù hợp: khi mở bán, giữ vé là đường nóng cần nhanh, còn tạo order có thể xử lý qua queue.
