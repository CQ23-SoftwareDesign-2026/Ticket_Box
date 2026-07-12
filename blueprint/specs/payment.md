# Đặc tả: Thanh toán, khả năng chịu lỗi và phát hành vé

## Mô tả

Tính năng payment xử lý quá trình chuyển order từ `PENDING` sang `PAID`, tạo phiên thanh toán PayOS, nhận webhook xác nhận và phát hành ticket. Bên cạnh luồng nghiệp vụ chính, module phải đáp ứng yêu cầu cổng thanh toán không ổn định mà không kéo sập toàn bộ dịch vụ và không tạo giao dịch thanh toán lặp.

Phạm vi hiện tại chỉ tích hợp PayOS. VNPAY và MoMo không nằm trong implementation của dự án.

Các yêu cầu được giải quyết:

- Khán giả vẫn xem được concert và số vé còn lại khi PayOS lỗi.
- Payment timeout không tạo payment session thứ hai cho cùng order.
- Request lặp được kiểm soát bằng `Idempotency-Key`.
- PayOS lỗi liên tục được cô lập bằng Circuit Breaker `CLOSED / OPEN / HALF_OPEN`.
- Khi circuit `OPEN`, hệ thống áp dụng Graceful Degradation: payment trả lỗi nhanh nhưng catalog và inventory vẫn hoạt động.
- Webhook retry không tạo vé trùng.
- Payment đến sau khi order hết hạn không phát hành vé và được đưa vào luồng refund.

### Thành phần chính

- `apps/backend-api/src/modules/payment/controllers/payment.controller.ts`
- `apps/backend-api/src/modules/payment/services/payment.service.ts`
- `apps/backend-api/src/modules/payment/services/gateway/payment-gateway.client.ts`
- `apps/backend-api/src/modules/payment/services/gateway/payos.strategy.ts`
- `apps/backend-api/src/modules/payment/interceptors/payment-idempotency.interceptor.ts`
- `apps/backend-api/src/modules/catalog/services/concert.service.ts`
- `apps/web-app/src/services/payment.service.ts`
- `apps/web-app/src/components/PayNowButton.tsx`
- `prisma/schema.prisma`

### API chính

- `POST /payments/process`
- `POST /payments/webhook`
- `PATCH /payments/transactions/:id/refund`
- `GET /concerts`
- `GET /concerts/:id`

## Luồng chính

### 1. Tạo phiên thanh toán

Client gửi:

```text
POST /payments/process
Authorization: Bearer <access-token>
Idempotency-Key: <uuid-v4>
Content-Type: application/json
```

```json
{
  "order_id": "order-uuid",
  "payment_method": "PAYOS"
}
```

Backend xử lý theo thứ tự:

1. `JwtAuthGuard` xác thực người dùng.
2. `PaymentIdempotencyInterceptor` kiểm tra `Idempotency-Key` là UUID v4.
3. Redis được kiểm tra để trả lại response `COMPLETED` nếu request đã được xử lý.
4. `PaymentService` atomic reserve key bằng `SET NX`, trạng thái `IN_PROGRESS`, TTL 24 giờ.
5. Tìm order theo `order_id` và `user_id`; chỉ xử lý order `PENDING`.
6. Kiểm tra transaction active của order với cùng payment method.
7. Nếu transaction cũ đã có checkout URL, trả lại transaction và checkout URL cũ, kể cả request mới dùng UUID khác.
8. Nếu transaction cũ là `INIT` nhưng chưa có checkout URL, trả `409 Conflict` vì request có thể còn đang xử lý.
9. Nếu transaction cũ là `UNKNOWN`, tra cứu PayOS bằng `provider_order_code`. Link `PENDING` chưa nhận tiền được hủy an toàn trước khi tạo session mới để lấy QR mới.
10. Kiểm tra Circuit Breaker. Nếu circuit `OPEN`, trả `503` trước khi tạo transaction.
11. Nếu circuit `CLOSED` hoặc `HALF_OPEN`, tạo `PaymentTransaction` trạng thái `INIT`.
12. PostgreSQL cấp `provider_order_code` duy nhất trước khi gọi PayOS.
13. Gọi PayOS qua `PaymentGatewayClient` để tạo payment session.
14. Khi thành công, lưu `paymentLinkId`, checkout URL và raw response.
15. Cache response trong Redis với trạng thái `COMPLETED`.

Response thành công gồm:

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

### 2. Idempotency và chống request lặp

FE sinh UUID v4 cho mỗi payment attempt:

```ts
export async function processPayment(
  input: ProcessPaymentInput,
  idempotencyKey?: string,
): Promise<ProcessPaymentResponse> {
  const key = idempotencyKey || generateUUID();

  return fetchClient<ProcessPaymentResponse>("/payments/process", {
    method: "POST",
    headers: { "Idempotency-Key": key },
    body: JSON.stringify(input),
  });
}
```

FE còn chặn double-click trong thời gian request đang chạy:

```ts
if (loading) return;
setLoading(true);
```

Backend mới là lớp bảo đảm correctness. Redis reserve key theo kiểu atomic:

```ts
const reserved = await this.redisService.setIfAbsentJson(
  cacheKey,
  {
    state: 'IN_PROGRESS',
    order_id: dto.order_id,
    payment_method: dto.payment_method,
    created_at: new Date().toISOString(),
  },
  this.idempotencyTtlSeconds,
);
```

Hai lớp lưu trữ được sử dụng:

| Lớp | Vai trò |
|---|---|
| Redis | Atomic reservation, cache response, TTL 24 giờ |
| PostgreSQL | Unique constraint trên `idempotency_key`, chốt chặn cuối |

Schema liên quan:

```prisma
model PaymentTransaction {
  id                       String @id @default(uuid()) @db.Uuid
  order_id                 String @db.Uuid
  payment_method           String @db.VarChar(50)
  provider_order_code      BigInt @unique @default(autoincrement())
  transaction_id_3rd_party String? @db.VarChar(255)
  status                   String @db.VarChar(50)
  idempotency_key          String @unique @db.VarChar(255)
}
```

Các mã không thay thế nhau:

| Trường | Kiểu | Mục đích |
|---|---|---|
| `PaymentTransaction.id` | UUID | Định danh nội bộ |
| `idempotency_key` | UUID v4 | Chống request lặp |
| `provider_order_code` | Số nguyên unique | `orderCode` PayOS yêu cầu |
| `transaction_id_3rd_party` | Hex 32 ký tự | `paymentLinkId` PayOS trả về |

### 3. Xử lý timeout và kết quả chưa xác định

Timeout không chứng minh PayOS chưa nhận hoặc chưa xử lý request. Vì vậy, timeout được phân loại là kết quả chưa xác định thay vì lỗi chắc chắn.

```ts
private isGatewayTimeout(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const candidate = error as Error & { code?: string };
  return candidate.code === 'ETIMEDOUT'
    || candidate.name === 'TimeoutError'
    || /timed?\s*out|timeout/i.test(candidate.message);
}
```

Khi timeout:

```ts
status: timedOut ? 'UNKNOWN' : 'FAILED',
raw_response: {
  phase: timedOut ? 'PROCESS_TIMEOUT_UNKNOWN' : 'PROCESS_FAILED',
  message: error instanceof Error ? error.message : 'Unknown gateway error',
  requires_reconciliation: timedOut,
}
```

Quy tắc retry:

| Trạng thái transaction | Ý nghĩa | Tạo attempt mới? |
|---|---|---|
| `INIT` | Đã ghi nhận attempt, chưa có kết quả chắc chắn | Không |
| `UNKNOWN` | Gateway timeout, cần tra cứu PayOS/webhook | Không tạo mới trước khi đối soát |
| `FAILED` | Có lỗi xác định | Có thể |
| `SUCCESS` | Thanh toán thành công | Không |

Nếu retry khi order có transaction `INIT`, hoặc reconciliation của `UNKNOWN` vẫn chưa cho kết quả, Backend có thể trả:

```json
{
  "message": "Payment status is being confirmed. Do not retry yet.",
  "error": "Conflict",
  "statusCode": 409
}
```

Với transaction `UNKNOWN`, Backend gọi `paymentRequests.get(provider_order_code)`:

- `PENDING` và `amountPaid = 0`: hủy link cũ; sau khi PayOS xác nhận `CANCELLED`, tạo transaction/session mới và trả QR mới.
- `PROCESSING/UNDERPAID` hoặc đã có tiền: không hủy và không tạo session mới; chờ xác nhận.
- `PAID`: không tạo session/vé mới; chờ webhook đã ký để hoàn tất.
- `CANCELLED/EXPIRED/FAILED`: đóng attempt cũ rồi cho phép tạo session mới.
- PayOS tiếp tục timeout hoặc circuit `OPEN`: giữ `UNKNOWN` và trả lỗi tạm thời.

### 4. Circuit Breaker

`PaymentGatewayClient` sử dụng `opossum`:

```ts
const breaker = new CircuitBreaker(
  async (input: PaymentGatewaySessionInput) =>
    strategy.createPaymentSession(input),
  {
    errorThresholdPercentage: 50,
    resetTimeout: 60_000,
    rollingCountTimeout: 10_000,
    rollingCountBuckets: 10,
    volumeThreshold: 4,
    timeout: Number(process.env.PAYMENT_GATEWAY_TIMEOUT_MS ?? 3_000),
  },
);
```

| Trạng thái | Hành vi |
|---|---|
| `CLOSED` | Cho phép gọi PayOS và ghi nhận success/failure |
| `OPEN` | Từ chối nhanh, không gọi PayOS |
| `HALF_OPEN` | Sau 60 giây cho request probe đi qua |

Điều kiện mở circuit là có tối thiểu 4 request trong cửa sổ 10 giây và tỷ lệ lỗi đạt từ 50%. Việc tạo nhiều order chậm qua UI không nhất thiết mở circuit nếu các failure không nằm trong cùng cửa sổ này.

Khi circuit đã `OPEN`, `PaymentService` kiểm tra trước khi tạo transaction:

```ts
const circuitState = this.paymentGatewayClient.getCircuitState(dto.payment_method);
if (circuitState === 'OPEN') {
  await this.persistIdempotencyFailure(cacheKey, normalizedKey, {
    order_id: order.id,
    payment_method: dto.payment_method,
    message: `${dto.payment_method} payment gateway is temporarily unavailable`,
    circuit_breaker_state: circuitState,
  });
  throw new ServiceUnavailableException({
    message: `${dto.payment_method} payment gateway is temporarily unavailable`,
    circuit_breaker_state: circuitState,
  });
}
```

Do đó, request khi `OPEN` không gọi PayOS và không tạo thêm row `FAILED` chỉ mang lỗi “Breaker is open”. `HALF_OPEN` không bị chặn ở bước này vì Opossum cần request probe để kiểm tra phục hồi.

### 5. Graceful Degradation

Graceful Degradation là suy giảm có kiểm soát: khi PayOS lỗi, hệ thống chỉ tạm ngừng phần thanh toán thay vì ngừng toàn bộ TicketBox.

| Thành phần | Khi PayOS bình thường | Khi circuit `OPEN` |
|---|---|---|
| Tạo payment session | Gọi PayOS, trả checkout URL | Trả `503` nhanh |
| Network call PayOS | Có | Không |
| Payment transaction mới | Tạo trước gateway call | Không tạo |
| Danh sách concert | Hoạt động | Vẫn hoạt động |
| Chi tiết concert | Hoạt động | Vẫn hoạt động |
| Tồn vé | Đọc từ `TicketingService` | Vẫn đọc từ `TicketingService` |

Ranh giới module:

```text
POST /payments/process
        └── PaymentGatewayClient ── Circuit Breaker ── PayOS

GET /concerts, GET /concerts/:id
        └── ConcertService ── Redis/PostgreSQL ── TicketingService
```

Catalog không gọi `PaymentGatewayClient`. `ConcertService` overlay tồn vé theo từng tier:

```ts
for (const tier of concert.ticketTiers) {
  try {
    const remaining = await this.ticketingService.getOrSeedInventory(tier.id);
    tier.remaining_quantity = remaining;
    if (remaining <= 0) tier.status = 'sold_out';
  } catch (err) {
    this.logger.error(
      `Failed to resolve real-time inventory for category ${tier.id}`,
      err,
    );
  }
}
```

FE nhận diện response `503` có circuit `OPEN` và hiển thị:

> Cổng PayOS đang tạm thời gián đoạn, vui lòng thử lại sau.

```ts
const message = isPayOsCircuitOpen(err)
  ? PAYOS_UNAVAILABLE_MESSAGE
  : err instanceof Error
    ? err.message
    : "Unexpected error. Please retry.";
```

FE không disable nút lâu dài vì chưa có health endpoint để biết circuit đã chuyển `HALF_OPEN/CLOSED`; nút chỉ disable trong lúc request đang chạy.

### 6. Nhận webhook PayOS

PayOS gọi:

```text
POST /payments/webhook
```

Payload có các trường chính:

```json
{
  "code": "00",
  "desc": "success",
  "success": true,
  "data": {
    "orderCode": 100001,
    "paymentLinkId": "554c0aeaf819472888692f2a5aa8cf88",
    "amount": 1720000
  },
  "signature": "provider-signature"
}
```

Backend:

1. Trả success cho webhook rỗng hoặc confirm/ping theo quy ước PayOS.
2. Verify chữ ký bằng PayOS SDK.
3. Tìm transaction bằng `paymentLinkId`.
4. Nếu Backend timeout trước khi lưu `paymentLinkId`, fallback bằng `orderCode → provider_order_code`.
5. Nếu `code != "00"`, đánh dấu transaction `FAILED`, hủy order pending và rollback inventory.
6. Nếu order đã `CANCELLED`, ghi nhận payment success nhưng không phát hành vé; đánh dấu cần refund.
7. Nếu order đã `PAID` và có ticket, trả kết quả hiện có, không tạo lại vé.
8. Nếu order `PENDING`, trong DB transaction: cập nhật payment `SUCCESS`, order `PAID`, tạo ticket và cập nhật sold-out status.
9. Sau commit, gửi notification; notification lỗi không rollback payment.

Fallback webhook:

```ts
const providerOrderCode = dto.data.orderCode !== undefined
  ? BigInt(dto.data.orderCode)
  : undefined;

const transaction = await this.prisma.paymentTransaction.findFirst({
  where: {
    payment_method: PaymentMethod.PAYOS,
    OR: [
      { transaction_id_3rd_party: String(dto.data.paymentLinkId) },
      ...(providerOrderCode !== undefined
        ? [{ provider_order_code: providerOrderCode }]
        : []),
    ],
  },
});
```

### 7. Phát hành ticket và chống webhook replay

Ticket chỉ được tạo sau webhook success hợp lệ. Mỗi ticket có:

- `order_id`
- `category_id`
- `qr_code_hash`
- `is_scanned = false`

`qr_code_hash` được sinh từ order, transaction, category, index và random UUID rồi băm SHA-256.

Webhook replay được xử lý bằng cách kiểm tra order đã `PAID` và có ticket:

```ts
if (transaction.order.status === 'PAID'
    && transaction.order.tickets.length > 0) {
  return new PaymentWebhookResponseDto({
    order_status: 'PAID',
    payment_status: 'SUCCESS',
    ticket_count: transaction.order.tickets.length,
    message: 'payment webhook processed',
  });
}
```

### 8. Late payment và refund

Nếu webhook success đến sau khi order `CANCELLED/EXPIRED`:

- transaction được ghi nhận `SUCCESS`;
- order giữ trạng thái đã hủy;
- không tạo ticket;
- lưu cảnh báo `Paid after order expiration/cancellation`;
- trả thông báo cần refund.

Admin xử lý qua:

```text
PATCH /payments/transactions/:id/refund
```

```json
{
  "refund_tx_id": "REF123456",
  "refund_note": "Refunded because payment arrived after expiration"
}
```

Transaction được cập nhật `REFUNDED` và lưu `refund_info` trong `raw_response`.

## Kịch bản lỗi

- Thiếu JWT: `401 Unauthorized`.
- Thiếu hoặc sai UUID v4 trong `Idempotency-Key`: `400 Bad Request`.
- Order không tồn tại/không thuộc user: `404 Not Found`.
- Order không còn `PENDING`: `400 Bad Request`.
- Cùng key đang xử lý: `409 Conflict`.
- Order có transaction `INIT`: `409 Conflict`, không gọi PayOS lần hai.
- Order có transaction `UNKNOWN`: reconciliation bằng `provider_order_code`; chỉ thay session khi link `PENDING` chưa nhận tiền đã được hủy thành công.
- PayOS timeout: transaction `UNKNOWN`, `requires_reconciliation = true`, API trả `503`.
- PayOS trả lỗi xác định: transaction `FAILED`, API trả `503`.
- Circuit `OPEN`: trả `503` trước khi tạo transaction và không gọi PayOS.
- Webhook sai signature: `400 Bad Request`.
- Webhook không tìm thấy transaction: ignored response, không tạo ticket.
- Webhook failure: transaction `FAILED`, order pending bị hủy, inventory rollback.
- Webhook success replay: trả ticket hiện có, không tạo ticket trùng.
- Late payment: không tạo ticket, chuyển sang xử lý refund.
- Refund transaction không tồn tại: `404 Not Found`.
- Transaction đã refund: `400 Bad Request`.

## Ràng buộc

- Payment method hiện chỉ hỗ trợ `PAYOS`.
- `Idempotency-Key` bắt buộc là UUID v4 và Redis TTL là 24 giờ.
- DB phải có unique constraint cho `idempotency_key` và `provider_order_code`.
- Timeout mặc định là 3 giây, cấu hình bằng `PAYMENT_GATEWAY_TIMEOUT_MS`.
- Timeout phải được coi là `UNKNOWN`, không phải `FAILED`.
- Không tạo attempt mới khi transaction `INIT` hoặc khi reconciliation của `UNKNOWN` chưa xác nhận link cũ đã đóng.
- Circuit Breaker chỉ bao quanh PayOS, không áp dụng toàn cục.
- Circuit `OPEN` không được tạo transaction thất bại mới.
- Catalog không phụ thuộc `PaymentGatewayClient`.
- Ticket chỉ được tạo sau webhook success đã verify signature.
- Webhook replay không được tạo ticket trùng.
- Late payment không được phát hành vé khi inventory đã được giải phóng.
- Notification failure không được rollback payment đã commit.
- Raw gateway/webhook telemetry phải được lưu để audit.
- Circuit state hiện nằm trong memory từng Backend process, không đồng bộ giữa replica.

## Tiêu chí chấp nhận

- User có order `PENDING` tạo được payment session PayOS.
- Retry bằng cùng key trả kết quả cũ, không tạo transaction mới.
- Retry bằng key mới khi checkout URL đã tồn tại trả transaction/link cũ.
- Timeout tạo transaction `UNKNOWN`; retry hủy an toàn link `PENDING` chưa nhận tiền và trả QR từ session mới.
- Webhook có thể tìm transaction timeout bằng `provider_order_code`.
- Bốn failure trong cửa sổ 10 giây mở circuit theo cấu hình hiện tại.
- Khi circuit `OPEN`, request mới trả nhanh `503`, không gọi PayOS và không tạo row `FAILED`.
- FE hiển thị “Cổng PayOS đang tạm thời gián đoạn, vui lòng thử lại sau.”
- Trong lúc circuit `OPEN`, danh sách concert, chi tiết concert và tồn vé vẫn hoạt động.
- Webhook success chuyển order sang `PAID` và tạo đúng số ticket.
- Webhook replay không tạo ticket trùng.
- Late payment không phát hành vé và có thể được refund.
- API build, Web build, lint và các payment unit test chạy thành công.

## Kiểm thử

### Unit test

Các file:

- `apps/backend-api/tests/payment-timeout.unit.ts`
- `apps/backend-api/tests/payment-circuit-breaker.unit.ts`
- `apps/backend-api/tests/payment-duplicate.unit.ts`
- `apps/backend-api/tests/concert-cache-aside.unit.ts`

Các trường hợp đã kiểm tra:

1. Timeout chuyển transaction sang `UNKNOWN`.
2. Retry bằng key khác đối soát transaction `UNKNOWN`, không tạo session thứ hai khi kết quả chưa xác định.
3. Transaction `UNKNOWN + PENDING + amountPaid=0` được hủy và thay bằng session có QR mới.
4. Key mới trả transaction và checkout URL cũ khi session đã tồn tại.
5. Circuit `OPEN` chặn trước khi tạo transaction.
6. Đủ failure làm circuit chuyển `OPEN`; request tiếp theo không gọi PayOS mock.
7. Catalog và tồn vé vẫn hoạt động khi payment circuit mở.
8. Webhook replay không tạo ticket trùng.
9. Webhook lookup sử dụng cả `paymentLinkId` và `provider_order_code`.

Chạy payment tests:

```powershell
node --test --import tsx `
  apps/backend-api/tests/payment-timeout.unit.ts `
  apps/backend-api/tests/payment-circuit-breaker.unit.ts `
  apps/backend-api/tests/payment-duplicate.unit.ts
```

Chạy toàn bộ Backend tests:

```powershell
npm run test:api:unit
```

### Test thực tế trên app

#### Payment bình thường

1. Tạo order có phí và vào checkout.
2. Bấm Pay Now và xác nhận redirect sang PayOS.
3. Thanh toán sandbox.
4. Xác nhận order `PAID` và ticket xuất hiện.

#### Idempotency

1. Copy request `/payments/process` từ DevTools.
2. Gửi lại cùng `Idempotency-Key`.
3. Xác nhận chỉ có một transaction cho key và PayOS link không đổi.
4. Gửi key mới cho cùng order đã có checkout URL; xác nhận trả transaction cũ.

#### Timeout

1. Chỉ trong môi trường test, đặt `PAYMENT_GATEWAY_TIMEOUT_MS=1` và restart Backend.
2. Tạo order mới, gọi payment một lần.
3. Xác nhận transaction `UNKNOWN`, phase `PROCESS_TIMEOUT_UNKNOWN`.
4. Retry cùng order sau khi PayOS phục hồi; xác nhận link cũ bị hủy và response chứa QR của session mới.

#### Circuit Breaker và Graceful Degradation

1. Chuẩn bị tối thiểu 5 order `PENDING` khác nhau.
2. Gửi payment cho ít nhất 4 order trong vòng 10 giây.
3. Xác nhận log `PAYOS circuit breaker opened`.
4. Gửi order tiếp theo; xác nhận `503`, không có transaction mới.
5. Mở `/concerts` và `/concerts/:id`; xác nhận thông tin và tồn vé vẫn hiển thị.
6. Trên FE, xác nhận thông báo PayOS gián đoạn được hiển thị.
7. Sau khi test, trả timeout về `3000` và restart Backend.

#### Half-Open

1. Khi circuit `OPEN`, khôi phục cấu hình/kết nối PayOS.
2. Chờ hơn 60 giây.
3. Gửi payment cho order mới để tạo probe.
4. Xác nhận log `HALF_OPEN`, sau đó `CLOSED` nếu probe thành công.

### Minh chứng cần chụp

1. Header `Idempotency-Key` trong DevTools.
2. Transaction `UNKNOWN` sau timeout.
3. Response reconciliation chứa QR mới sau khi hủy link cũ, hoặc lỗi tạm thời nếu PayOS vẫn chưa xác định.
4. Log circuit chuyển `OPEN`.
5. Response `503` và thông báo tiếng Việt trên FE.
6. DB không tăng transaction khi circuit đã `OPEN`.
7. Trang concert và số vé vẫn hoạt động khi PayOS lỗi.
8. Kết quả payment unit tests.

## Phân tích trade-off

### Idempotency Redis kết hợp unique constraint DB

- Ưu điểm: Redis xử lý concurrent request nhanh; DB bảo vệ khi cache mất.
- Nhược điểm: cần duy trì hai lớp trạng thái và TTL.
- Lý do lựa chọn: payment cần defense in depth thay vì phụ thuộc một storage.

### Timeout chuyển sang UNKNOWN

- Ưu điểm: không tạo payment session thứ hai khi PayOS có thể đã nhận request.
- Nhược điểm: người dùng không thể retry ngay và cần chờ webhook/đối soát.
- Lý do lựa chọn: tính nhất quán tài chính quan trọng hơn khả năng retry tức thời.

### Provider order code dạng sequence

- Ưu điểm: đúng kiểu số PayOS yêu cầu, unique trong DB và cho phép webhook fallback.
- Nhược điểm: cần migration/sequence và phải đồng bộ seed.
- Lý do lựa chọn: UUID không thể truyền trực tiếp vào trường `orderCode` dạng số.

### Circuit Breaker in-memory

- Ưu điểm: đơn giản, fast-fail ngay trong process, không phụ thuộc thêm hạ tầng.
- Nhược điểm: nhiều replica có circuit state riêng.
- Lý do lựa chọn: phù hợp phạm vi hiện tại; production nhiều replica cần monitoring tập trung.

### Phát hành vé bằng webhook

- Ưu điểm: chỉ tạo vé khi có xác nhận chính thức từ PayOS.
- Nhược điểm: người dùng có thể chờ webhook; FE phải poll trạng thái order.
- Lý do lựa chọn: không phát hành vé dựa trên redirect phía client.

### Late payment chuyển sang refund

- Ưu điểm: không phá inventory khi order đã hết hạn.
- Nhược điểm: cần thao tác hoàn tiền.
- Lý do lựa chọn: đảm bảo inventory không bị bán vượt quá số lượng.
