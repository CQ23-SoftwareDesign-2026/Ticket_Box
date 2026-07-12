# Đặc tả: Ticketing và giữ vé

## Mô tả
Tính năng ticketing chịu trách nhiệm giữ vé tạm thời trong thời gian người dùng checkout, đảm bảo không bán vượt tồn kho và không cho một tài khoản vượt quá giới hạn mua vé.

Luồng ticketing của TicketBox tách thành hai giai đoạn:

- `Reserve`: giữ vé tạm thời bằng Redis, trả về `order_id` để người dùng tiếp tục thanh toán.
- `Order creation`: tạo order `PENDING` bất đồng bộ qua RabbitMQ.

Ticket thật chưa được tạo ở bước reserve. Ticket chỉ được phát hành sau khi thanh toán thành công trong module payment.

## Luồng chính

### 1. Khởi tạo inventory vào Redis
Inventory của từng hạng vé được lưu trong Redis theo key:

```txt
category:{category_id}
```

Các field chính:

- `available`: số vé còn có thể giữ.
- `max_per_user`: số vé tối đa một user được mua ở hạng vé này.
- `sales_start_at`: thời điểm mở bán.

Inventory có thể được khởi tạo theo ba cách:

1. Warm-up khi backend khởi động.
2. Admin gọi `POST /tickets/init` để seed thủ công khi test.
3. Lazy seeding khi user reserve nhưng Redis chưa có category.

Khi warm-up hoặc lazy seed, số vé còn lại được tính từ database:

```txt
available = total_quantity - sold_tickets - pending_unexpired_tickets
```

Trong đó:

- `sold_tickets`: số dòng `Ticket` đã tạo cho category.
- `pending_unexpired_tickets`: số vé đang nằm trong order `PENDING` chưa hết hạn.

### 2. Giữ vé
1. User đã đăng nhập gọi `POST /tickets/reserve`.
2. Request đi qua `JwtAuthGuard` và `RolesGuard`.
3. Request tiếp tục đi qua `TicketReserveRateLimitGuard`.
4. Backend kiểm tra `sales_start_at` của từng category.
5. Backend gọi Redis Lua script để reserve atomic.
6. Nếu Redis chưa có inventory, backend lazy seed category từ DB rồi retry.
7. Nếu Redis trả `OK`, backend tạo `order_id`.
8. Backend publish message vào RabbitMQ `order.exchange`.
9. API trả về:
   - `status = SUCCESS`
   - `order_id`
   - danh sách item đã giữ
   - số vé còn lại sau khi giữ

### 3. Redis Lua script reserve
Reserve được xử lý trong một Lua script để đảm bảo atomic. Script có hai phase:

#### Validation phase
Với mỗi item:

1. Kiểm tra key `category:{category_id}` tồn tại.
2. Kiểm tra `available >= quantity`.
3. Đọc số lượng user hiện đã giữ trong `user:{user_id}:reservations`.
4. Kiểm tra `current_reserved + quantity <= max_per_user`.

Nếu bất kỳ điều kiện nào không đạt, script dừng và không trừ vé.

#### Execution phase
Nếu tất cả item hợp lệ:

1. Giảm `available` của từng category.
2. Tăng số lượng user đã giữ ở từng category.
3. Trả về số vé còn lại sau khi trừ.

Vì toàn bộ script chạy atomic trên Redis, hai request đồng thời không thể cùng giữ thành công một vé cuối cùng.

### 4. Tạo order PENDING bất đồng bộ
Sau khi Redis reserve thành công, backend publish message:

```txt
exchange: order.exchange
queue: order.create.queue
```

`OrderCreateConsumer` xử lý message:

1. Kiểm tra `order_id` đã tồn tại chưa để đảm bảo idempotency.
2. Chuẩn hóa danh sách item.
3. Lấy giá từng ticket category từ DB.
4. Tính `total_amount`.
5. Tạo order trạng thái `PENDING`.
6. Lưu `ticket_metadata.ticket_breakdown`.
7. Gán `expires_at = now + 10 phút`.

Order `PENDING` chưa có dòng `Ticket`.

### 5. Rollback khi RabbitMQ lỗi
Nếu Redis đã giữ vé thành công nhưng publish RabbitMQ thất bại:

1. Backend gọi rollback Lua script.
2. Redis tăng lại `available`.
3. Redis giảm số vé user đã giữ trong `user:{user_id}:reservations`.
4. API trả `503 Service Unavailable`.

Điều này tránh tình trạng Redis đã trừ vé nhưng không có order tương ứng.

### 6. Hủy order PENDING hết hạn
`PendingOrderCleanupService` chạy mỗi phút:

1. Tìm các order `PENDING` có `expires_at < now`.
2. Update order sang `CANCELLED` bằng `updateMany` với điều kiện `status = PENDING`.
3. Trích xuất danh sách vé từ `ticket_metadata`.
4. Rollback Redis inventory và user reservation.

Cơ chế `updateMany` theo điều kiện trạng thái giúp tránh hủy nhầm order đã được thanh toán.

## Kịch bản lỗi

### Chưa đăng nhập hoặc token không hợp lệ
- `POST /tickets/reserve` và `POST /tickets/init` nằm sau `JwtAuthGuard`.
- Nếu thiếu `Authorization: Bearer <token>`, API trả `401 Unauthorized`.
- Nếu token hết hạn hoặc sai chữ ký, API trả `401 Unauthorized`.

### Dữ liệu request không hợp lệ
- DTO được validate bằng `ValidationPipe`.
- `concert_id` và `category_id` phải là UUID hợp lệ.
- `items` phải có ít nhất 1 item và tối đa 10 item.
- `quantity` phải là số nguyên từ 1 đến 20.
- Nếu vi phạm validation, API trả `400 Bad Request`.

### Vượt rate limit reserve
- `POST /tickets/reserve` đi qua `TicketReserveRateLimitGuard`.
- Guard kiểm tra Token Bucket theo user và IP.
- Nếu vượt ngưỡng, API trả `429 Too Many Requests`.
- Message hiện tại: `Too many ticket reservation requests. Please try again shortly.`

### Category chưa có trong Redis
- Redis Lua trả `ERR_NOT_INITIALIZED`.
- Backend lazy seed category từ DB.
- Backend retry reserve.
- Nếu vẫn chưa seed được, API trả `400 Bad Request`.
- Nếu category không tồn tại trong DB khi lazy seed, API trả `400 Bad Request`.

### Không đủ vé
- Redis Lua trả `ERR_NO_TICKET`.
- API trả `400 Bad Request`.
- Không có order được tạo.
- Redis không trừ thêm vé.

### Vượt giới hạn mỗi user
- Redis Lua trả `ERR_LIMIT_EXCEEDED`.
- API trả `400 Bad Request`.
- Redis không trừ vé.
- User không thể vượt `max_per_user` bằng cách gửi nhiều request đồng thời.

### Chưa tới thời điểm mở bán
- Backend kiểm tra `sales_start_at` trước khi reserve.
- Nếu hiện tại nhỏ hơn `sales_start_at`, API trả `400 Bad Request`.

### Redis lỗi
- Nếu Redis không chạy hoặc Lua script lỗi ngoài dự kiến, API trả `503 Service Unavailable`.
- Không publish message tạo order khi reserve chưa chắc chắn thành công.
- Với API admin `POST /tickets/init`, nếu Redis không khả dụng thì service ném lỗi `Redis is not available`; endpoint không bắt lỗi riêng nên có thể trả lỗi server.

### RabbitMQ publish lỗi
- Redis đã trừ vé nhưng message tạo order không publish được.
- Backend rollback Redis.
- API trả `503 Service Unavailable`.

### Order create consumer nhận message trùng
- Consumer kiểm tra order theo `order_id`.
- Nếu order đã tồn tại, consumer skip để tránh tạo trùng order.

### Order create consumer không tìm thấy ticket category
- Consumer lấy giá từng category từ DB trước khi tạo order.
- Nếu category không còn tồn tại, consumer ghi log lỗi và không tạo order.
- Đây là lỗi bất đồng bộ sau khi API reserve đã trả response; trong production nên có cơ chế bù/rollback hoặc cảnh báo vận hành để tránh reservation bị treo.

### Order hết hạn nhưng vừa được thanh toán
- Cleanup chỉ update order khi `status = PENDING`.
- Nếu order đã `PAID`, update không có tác dụng và không rollback vé.

## Ràng buộc

- Chỉ user đã đăng nhập mới được reserve.
- API reserve phải đi qua rate limit để tránh burst traffic đẩy quá nhiều request vào Redis/RabbitMQ.
- Tồn kho khi reserve phải được xử lý atomic, không dùng read-then-write tách rời.
- Không tạo dòng `Ticket` ở bước reserve.
- Order PENDING phải hết hạn sau 10 phút nếu không thanh toán.
- Khi order hết hạn hoặc bị hủy, inventory đã giữ phải được hoàn lại.
- Redis inventory phải tính cả vé đã bán và vé đang giữ trong order PENDING chưa hết hạn.
- Lazy seeding phải dùng lock ngắn hạn để tránh nhiều request cùng seed một category.
- `ticket_metadata.ticket_breakdown` là nguồn dữ liệu chính để rollback nhiều hạng vé.
- Rollback phải hỗ trợ cả metadata legacy (`category_id`, `quantity`) và `ticket_breakdown`.

## Tiêu chí chấp nhận

- Reserve thành công trả `status = SUCCESS` và `order_id`.
- Reserve thành công làm `available` trong Redis giảm đúng số lượng.
- Reserve thành công làm `user:{user_id}:reservations` tăng đúng số lượng.
- Khi inventory còn 1 vé, nhiều request đồng thời chỉ tối đa 1 request reserve thành công.
- Tổng số vé reserve thành công không vượt quá `available`.
- Một user không thể reserve vượt `max_per_user`, kể cả khi gửi nhiều request song song.
- Category chưa seed Redis vẫn có thể reserve được nhờ lazy seeding nếu DB có dữ liệu hợp lệ.
- Nếu RabbitMQ publish thất bại, Redis inventory được rollback.
- Consumer không tạo order trùng khi nhận lại cùng `order_id`.
- Order PENDING hết hạn bị chuyển sang `CANCELLED` và vé được hoàn lại.
- Order đã `PAID` không bị cleanup rollback.

## Kiểm thử đề xuất

### Manual test
- Đăng nhập bằng user hợp lệ.
- Chọn concert và ticket category đang mở bán.
- Gọi `POST /tickets/reserve` với `quantity = 1`.
- Kiểm tra response có `order_id`.
- Kiểm tra order `PENDING` được tạo sau khi consumer xử lý message.
- Kiểm tra Redis key:

```txt
category:{category_id}
user:{user_id}:reservations
```

- Hủy hoặc để order hết hạn, kiểm tra inventory được hoàn lại.

### K6 test chống oversell
Chạy script:

```powershell
.\scripts\k6-oversell-check.local.ps1
```

Cấu hình chính:

```powershell
$env:SEED_USER_COUNT = "30"
$env:VUS = "30"
$env:ITERATIONS = "30"
$env:QUANTITY = "1"
$env:EXPECTED_MAX_SUCCESS = "10"
$env:FAKE_IPS = "true"
```

Kỳ vọng:

```txt
Reserve success <= EXPECTED_MAX_SUCCESS
Oversell check = PASS
All 5xx = 0
```

### Unit test hiện có
Các test trong `apps/backend-api/tests/ticketing.unit.ts` kiểm tra:

- Reserve thành công khi Lua trả `OK`.
- Rollback Redis khi RabbitMQ publish thất bại.
- Lỗi khi inventory chưa khởi tạo.
- Lỗi khi hết vé.
- Lỗi khi vượt user limit.
- Lazy seeding khi Redis chưa có category.
- Rollback một hoặc nhiều category.
- Tính inventory từ `sold + pending`.
- Lỗi khi Redis mất kết nối.
- Lỗi khi `sales_start_at` ở tương lai.
## Phân tích trade-off

### Redis inventory thay vì trừ trực tiếp DB trên mỗi request
- Ưu điểm: giữ vé nhanh, atomic, giảm tải database khi có burst lớn.
- Nhược điểm: cần đồng bộ đúng giữa Redis và DB, đặc biệt khi order bị hủy hoặc payment fail.
- Lý do phù hợp: bài toán mở bán vé có nhiều request đồng thời, Redis phù hợp làm lớp điều phối inventory trước khi tạo order.

### Token Bucket rate limit
- Ưu điểm: cho phép burst ngắn nhưng vẫn giới hạn tốc độ trung bình, phù hợp cảnh mở bán dồn request ở phút đầu.
- Nhược điểm: nếu cấu hình quá thấp sẽ chặn user thật; nếu quá cao thì chưa bảo vệ đủ backend.
- Lý do phù hợp: so với fixed window, token bucket tránh hiện tượng request dồn cục ở ranh giới reset cửa sổ.

### Reserve trước, tạo order bất đồng bộ
- Ưu điểm: API đặt vé phản hồi nhanh hơn, phần tạo order được đẩy qua queue để giảm áp lực request path.
- Nhược điểm: FE có thể cần poll order vì order chưa xuất hiện ngay lập tức.
- Lý do phù hợp: khi tải cao, đường nóng giữ vé cần ngắn và ít phụ thuộc DB nhất có thể.

### Per-user limit trong Redis
- Ưu điểm: chống một user gửi nhiều request đồng thời để vượt giới hạn vé.
- Nhược điểm: rollback sai có thể làm user bị giữ quota hoặc được trả quota quá nhiều.
- Lý do phù hợp: giới hạn per-user cũng là bài toán cạnh tranh đồng thời, cần atomic counter gần inventory.
