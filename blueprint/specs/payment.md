# Đặc tả: Thanh toán và phát hành vé

## Mô tả
Tính năng payment xử lý bước chuyển từ order `PENDING` sang order `PAID`, tạo phiên thanh toán với cổng thanh toán, nhận webhook xác nhận kết quả và phát hành ticket thật cho người dùng.

Backend chính:

- `apps/backend-api/src/modules/payment/controllers/payment.controller.ts`
- `apps/backend-api/src/modules/payment/services/payment.service.ts`

Các API chính:

- `POST /payments/process`
- `POST /payments/webhook`
- `PATCH /payments/transactions/:id/refund`

## Luồng chính

### 1. Tạo phiên thanh toán
Client gọi:

```txt
POST /payments/process
Header: Idempotency-Key: <uuid-v4>
Authorization: Bearer <access_token>
```

Body:

```json
{
  "order_id": "order-uuid",
  "payment_method": "PAYOS"
}
```

Backend xử lý:

1. Kiểm tra JWT hợp lệ.
2. Kiểm tra header `Idempotency-Key`.
3. Tạo Redis key `payments:idempotency:<key>` với trạng thái `IN_PROGRESS`.
4. Tìm order theo `order_id` và `user_id`.
5. Chỉ cho thanh toán order đang `PENDING`.
6. Nếu order đã có transaction active cùng payment method, trả lại thông tin checkout cũ.
7. Nếu chưa có, tạo `PaymentTransaction` trạng thái `INIT`.
8. Gọi payment gateway để tạo payment session.
9. Lưu `transaction_id_3rd_party`, `checkout_url`, `qr_code` vào transaction/raw response.
10. Cache response idempotency trạng thái `COMPLETED` trong Redis.

Response gồm:

- `payment_transaction_id`
- `order_id`
- `payment_method`
- `status`
- `gateway_status`
- `checkout_url`
- `qr_code`
- `account_name`
- `idempotency_key`
- `circuit_breaker_state`

### 2. Chống request thanh toán trùng
Payment dùng idempotency theo header `Idempotency-Key`.

Trường hợp xử lý:

- Nếu key đã `COMPLETED`, backend trả lại response cũ.
- Nếu key đang `IN_PROGRESS`, backend trả `409 Conflict`.
- Nếu transaction đã tồn tại với idempotency key đó, backend map lại transaction và cache response.
- Nếu gọi gateway lỗi, backend đánh dấu transaction `FAILED`, cache trạng thái `FAILED`, và trả `503 Service Unavailable`.

Cơ chế này giúp người dùng bấm thanh toán nhiều lần hoặc frontend retry không tạo nhiều payment session không kiểm soát.

### 3. Nhận webhook thanh toán
Payment provider gọi:

```txt
POST /payments/webhook
```

Payload dạng PayOS:

```json
{
  "code": "00",
  "desc": "success",
  "success": true,
  "data": {
    "paymentLinkId": "provider-payment-id",
    "amount": 1720000,
    "ticket_breakdown": [
      {
        "category_id": "category-uuid",
        "quantity": 2
      }
    ]
  },
  "signature": "provider-signature"
}
```

Backend xử lý:

1. Bỏ qua webhook rỗng hoặc webhook confirm/ping.
2. Verify chữ ký webhook.
3. Tìm `PaymentTransaction` theo `paymentLinkId`.
4. Nếu không tìm thấy transaction, trả response ignored.
5. Nếu `code != "00"`, đánh dấu transaction `FAILED`, hủy order pending và rollback inventory.
6. Nếu order đã `CANCELLED`, lưu transaction success nhưng không tạo ticket, trả thông báo cần refund.
7. Nếu order đã `PAID` và đã có ticket, chỉ cập nhật transaction success và trả danh sách ticket hiện có.
8. Nếu order còn `PENDING`, trong transaction DB:
   - update payment transaction thành `SUCCESS`
   - update order thành `PAID`
   - merge `ticket_breakdown` vào `ticket_metadata`
   - tạo ticket theo từng category/quantity
   - cập nhật ticket category thành `sold_out` nếu đã bán hết
9. Sau khi commit, gửi notification xác nhận vé.

### 4. Phát hành ticket sau khi thanh toán
Ticket chỉ được tạo sau webhook success.

Với mỗi item trong `ticket_breakdown`, backend tạo `quantity` dòng ticket:

- `order_id`
- `category_id`
- `qr_code_hash`
- `is_scanned = false` mặc định

`qr_code_hash` được sinh bằng SHA-256 từ order, transaction, category, index và random UUID để hạn chế đoán hash.

### 5. Chống webhook trùng
Nếu webhook success bị gửi lại:

- Backend kiểm tra order đã `PAID` và đã có ticket.
- Không tạo thêm ticket mới.
- Trả lại `ticket_count` và `ticket_ids` hiện có.

Cơ chế này giúp tránh lỗi “trừ tiền một lần nhưng tạo vé nhiều lần” khi payment provider retry webhook.

### 6. Late payment và refund
Nếu webhook success đến sau khi order đã `CANCELLED` hoặc hết hạn:

- Backend cập nhật transaction thành `SUCCESS`.
- Không tạo ticket.
- Giữ order ở `CANCELLED`.
- Ghi metadata cảnh báo refund required.
- Trả message yêu cầu refund.

Admin xử lý refund qua:

```txt
PATCH /payments/transactions/:id/refund
```

Body:

```json
{
  "refund_tx_id": "REF123456",
  "refund_note": "Refunded via bank transfer because user paid after expiration"
}
```

Backend cập nhật transaction thành `REFUNDED` và lưu `refund_info` vào `raw_response`.

## Kịch bản lỗi

- Thiếu JWT khi process payment: `401 Unauthorized`.
- Thiếu `Idempotency-Key`: `400 Bad Request`.
- Order không tồn tại hoặc không thuộc user: `404 Not Found`.
- Order không còn `PENDING`: `400 Bad Request`.
- Payment request cùng idempotency key đang xử lý: `409 Conflict`.
- Payment gateway lỗi: transaction `FAILED`, API trả `503 Service Unavailable`.
- Webhook sai signature: `400 Bad Request`.
- Webhook fail từ provider: transaction `FAILED`, order pending bị hủy và rollback inventory.
- Refund transaction không tồn tại: `404 Not Found`.
- Refund transaction đã `REFUNDED`: `400 Bad Request`.

## Ràng buộc

- Payment process phải idempotent theo `Idempotency-Key`.
- Ticket chỉ được tạo khi webhook success hợp lệ.
- Webhook replay không được tạo ticket trùng.
- Late payment không được phát hành vé nếu order đã bị hủy.
- Notification lỗi không được rollback payment đã commit.
- Transaction payment cần lưu raw telemetry để audit.

## Tiêu chí chấp nhận

- User có order `PENDING` tạo được payment session.
- Gửi lại cùng `Idempotency-Key` trả cùng kết quả, không tạo transaction mới.
- Webhook success chuyển order sang `PAID` và tạo đúng số ticket theo breakdown.
- Webhook success replay không tạo ticket trùng.
- Webhook fail hủy order pending và rollback inventory.
- Payment đến sau khi order cancelled không tạo ticket và có thể refund.
- Admin có thể đánh dấu transaction là `REFUNDED`.
## Phân tích trade-off

### Idempotency-Key cho payment process
- Ưu điểm: frontend retry hoặc user bấm nhiều lần không tạo nhiều payment session ngoài ý muốn.
- Nhược điểm: client phải tạo và gửi key đúng; backend cần Redis để cache trạng thái.
- Lý do phù hợp: payment là luồng nhạy cảm, idempotency giúp giảm rủi ro double charge hoặc double session.

### Phát hành ticket bằng webhook
- Ưu điểm: chỉ tạo vé khi có xác nhận chính thức từ payment provider.
- Nhược điểm: user có thể phải chờ webhook, frontend cần trạng thái pending hoặc poll order.
- Lý do phù hợp: tránh tạo vé khi người dùng chưa thanh toán thành công.

### Chống webhook replay bằng kiểm tra order/ticket hiện có
- Ưu điểm: payment provider retry webhook không tạo thêm vé trùng.
- Nhược điểm: cần transaction DB và logic idempotent cẩn thận.
- Lý do phù hợp: webhook retry là hành vi bình thường của payment provider, hệ thống bắt buộc phải chịu được.

### Late payment chuyển sang refund thay vì tạo ticket
- Ưu điểm: không phá inventory khi order đã hết hạn và vé có thể đã bán cho người khác.
- Nhược điểm: cần quy trình admin xử lý hoàn tiền thủ công hoặc bán tự động.
- Lý do phù hợp: tính đúng inventory quan trọng hơn việc cố phát hành vé cho một order đã expired.
