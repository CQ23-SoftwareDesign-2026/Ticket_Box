# Đặc tả: Kiểm soát tải đột biến bằng Token Bucket

## API/Phạm vi áp dụng
Rate limiting là cơ chế bảo vệ dùng chung cho các endpoint nóng, không phải một API nghiệp vụ riêng.

Hiện hệ thống áp dụng Token Bucket cho:

- `POST /tickets/reserve`: bảo vệ luồng đặt/giữ vé.
- `POST /auth/login`: bảo vệ luồng đăng nhập khỏi brute-force/spam.
- `GET /concerts/:id`: bảo vệ luồng xem chi tiết concert khi nhiều người cùng truy cập trước giờ mở bán.

## Mô tả
Khi mở bán vé, có thể có khoảng 80.000 người cùng truy cập trong phút đầu. Nếu mọi request đều đi vào backend xử lý nghiệp vụ, Redis inventory, RabbitMQ và PostgreSQL, hệ thống dễ bị quá tải hoặc phát sinh lỗi 5xx hàng loạt.

Nhóm chọn **Token Bucket Rate Limiting** để chặn request vượt ngưỡng sớm. Mỗi client/user/IP có một “bucket” chứa một số token. Mỗi request tiêu thụ một token. Token được tự động nạp lại theo thời gian. Nếu bucket hết token, backend trả `429 Too Many Requests` và không cho request đi tiếp vào logic nghiệp vụ.

Mục tiêu:

- Cho phép user thật có burst ngắn khi vừa mở bán.
- Giới hạn tốc độ request trung bình.
- Chặn sớm spam/bot trước khi vào luồng tốn tài nguyên.
- Giảm nguy cơ backend, Redis, RabbitMQ và database bị kéo sập.

## Luồng chính
### 1. Request đi vào endpoint nóng
1. Client gọi một endpoint được bảo vệ, ví dụ `POST /tickets/reserve`.
2. Request đi qua guard rate limit trước khi xử lý nghiệp vụ.
3. Guard xác định danh tính bucket:
   - Với reserve: theo `user_id` và IP.
   - Với login: theo IP và email.
   - Với concert detail: theo IP.
4. Guard gọi Redis để kiểm tra bucket.

### 2. Kiểm tra Token Bucket trong Redis
1. Backend tạo Redis key theo loại bucket, ví dụ:
   - `rate:reserve:user:<userId>`
   - `rate:reserve:ip:<ip>`
2. Redis Lua script đọc số token hiện có và thời điểm cập nhật gần nhất.
3. Script tính số token được refill dựa trên thời gian đã trôi qua.
4. Nếu số token sau refill lớn hơn hoặc bằng 1:
   - Trừ 1 token.
   - Cập nhật `updated_at`.
   - Cho request đi tiếp.
5. Nếu số token nhỏ hơn 1:
   - Script trả trạng thái reject.
   - Backend trả `429 Too Many Requests`.

### 3. Request hợp lệ tiếp tục xử lý
Nếu request còn token:

1. Với `POST /tickets/reserve`, request tiếp tục vào logic Redis inventory, per-user limit và RabbitMQ tạo order.
2. Với `POST /auth/login`, request tiếp tục kiểm tra email/password.
3. Với `GET /concerts/:id`, request tiếp tục lấy chi tiết concert.

### 4. Request vượt ngưỡng bị chặn
Nếu bucket hết token:

1. Backend trả `429 Too Many Requests`.
2. Request không đi vào nghiệp vụ chính.
3. Redis inventory, RabbitMQ và database không bị tiêu tốn tài nguyên bởi request đó.
4. Frontend có thể hiển thị thông báo yêu cầu người dùng thử lại sau.

## Kịch bản lỗi
- User hoặc IP gửi request quá nhanh: backend trả `429 Too Many Requests`.
- Bot spam nhiều request reserve: đa số request bị chặn trước khi vào Redis inventory.
- Nhiều user cùng NAT/IP: có thể bị ảnh hưởng bởi bucket theo IP nếu cấu hình quá thấp.
- Redis không khả dụng khi check rate limit: hệ thống hiện fail-open, cho request đi tiếp để tránh làm endpoint bị tê liệt hoàn toàn.
- Cấu hình bucket quá thấp: user thật bị chặn nhiều.
- Cấu hình bucket quá cao: backend chưa được bảo vệ đủ.
- Client không xử lý `429`: trải nghiệm người dùng có thể khó hiểu nếu không hiển thị thông báo phù hợp.

## Ràng buộc
- Rate limit phải chạy trước logic nghiệp vụ tốn tài nguyên.
- Endpoint đặt vé phải có bucket theo user để chống một tài khoản spam mua vé.
- Endpoint đặt vé cũng cần bucket theo IP để giảm bot/spam từ cùng nguồn mạng.
- Login nên có bucket theo IP và email để giảm brute-force.
- Concert detail nên có bucket theo IP vì endpoint public không yêu cầu đăng nhập.
- Redis key cần TTL để không giữ state rate limit mãi mãi.
- `429` là phản hồi hợp lệ trong kịch bản tải cao, không phải lỗi hệ thống.
- Rate limiting không thay thế chống oversell; chống oversell vẫn cần Redis inventory atomic.
- Rate limiting không thay thế hạ tầng production như load balancer/CDN/edge queue.

## Tiêu chí chấp nhận
- Request bình thường dưới ngưỡng vẫn được xử lý thành công.
- Request vượt bucket trả `429 Too Many Requests`.
- `POST /tickets/reserve` bị rate limit trước khi vào reserve inventory.
- `POST /auth/login` bị rate limit khi spam login.
- `GET /concerts/:id` bị rate limit khi spam xem chi tiết concert.
- Khi chạy k6, hệ thống xuất hiện `429` ở request vượt ngưỡng nhưng 5xx gần 0.
- Khi Redis rate limit lỗi, request không làm endpoint chết hoàn toàn; hệ thống log cảnh báo.

## Phân tích phương án và trade-off

### Vấn đề cần giải quyết
Backend cần không bị quá tải khi lượng request tăng đột biến trong phút đầu mở bán. Mục tiêu không phải cho tất cả request đi qua, mà là bảo vệ hệ thống bằng cách nhận phần request trong khả năng xử lý và từ chối phần vượt ngưỡng bằng `429`.

### Các phương án cân nhắc
| Phương án | Cách hoạt động | Ưu điểm | Nhược điểm |
| --- | --- | --- | --- |
| Fixed Window | Đếm request theo từng cửa sổ thời gian cố định | Dễ cài, dễ giải thích | Dễ bị burst ở ranh giới cửa sổ; cuối phút + đầu phút sau có thể nhận gấp đôi |
| Sliding Window | Đếm request trong cửa sổ trượt gần thời gian thực | Công bằng hơn Fixed Window | Tốn storage/tính toán hơn, cài phức tạp hơn |
| Leaky Bucket | Request chảy ra với tốc độ cố định | Làm phẳng lưu lượng tốt | Có thể tạo hàng chờ và tăng độ trễ; không phù hợp nếu muốn fail-fast |
| Token Bucket | Bucket có token, request tiêu thụ token, token refill theo thời gian | Cho phép burst ngắn nhưng giới hạn tốc độ trung bình | Cần cấu hình capacity/refill hợp lý |
| Waiting Room | Đưa user vào hàng chờ trước khi vào backend | Bảo vệ production tốt nhất ở tầng trước API | Cần thêm màn hình chờ, session queue, edge/CDN/gateway |

### Giải pháp nhóm chọn
Nhóm chọn **Token Bucket** cho backend hiện tại.

Lý do:

- Phù hợp hành vi mở bán vé: user thật có thể bấm nhanh vài lần trong thời gian ngắn.
- Vẫn giới hạn tốc độ trung bình để backend không bị ngập.
- Dễ demo bằng k6 vì có thể thấy request thành công, request bị `429`, và backend không phát sinh 5xx hàng loạt.
- Có thể áp dụng ngay trong NestJS guard mà không cần xây waiting room hoặc edge gateway.
- Phù hợp với hạ tầng hiện tại khi backend deploy trên Railway và chưa có CDN/edge layer riêng.

### Vì sao không chọn Fixed Window
Fixed Window đơn giản nhưng có điểm yếu ở ranh giới cửa sổ. Ví dụ nếu giới hạn 60 request/phút, client có thể gửi 60 request ở giây 59 và 60 request ở giây 60, khiến backend nhận 120 request trong thời gian rất ngắn. Với bài toán mở bán vé, spike kiểu này là rủi ro lớn.

### Vì sao không chọn Sliding Window
Sliding Window chính xác hơn nhưng cần lưu nhiều timestamp/counter hơn. Với deadline hiện tại, Token Bucket đủ để chứng minh kiểm soát burst mà đơn giản hơn.

### Vì sao không chọn Leaky Bucket
Leaky Bucket làm phẳng request tốt nhưng thiên về xếp hàng request. Trong bài toán mua vé, nhóm muốn fail-fast bằng `429` để backend không giữ quá nhiều request đang chờ.

### Vì sao chưa làm Waiting Room
Waiting Room là hướng production tốt, nhưng cần thêm màn hình chờ, queue token, cơ chế cấp lượt vào mua và thường đặt ở edge/API gateway. Với phạm vi đồ án và hạ tầng Railway hiện tại, nhóm chọn Token Bucket để minh chứng cơ chế bảo vệ ở tầng backend trước.

## Cấu hình hiện tại
Các biến dưới đây là đúng với code hiện tại. Khi chạy local để demo hoặc để thầy kiểm tra, có thể copy nguyên block này vào `.env`. Trên Railway có thể không set các biến này vì backend đã có cùng giá trị default trong code; chỉ cần set khi muốn siết/nới ngưỡng theo môi trường deploy.

### Ticket reserve
Default trong code:

```txt
TICKET_RESERVE_USER_BUCKET_CAPACITY=3
TICKET_RESERVE_USER_REFILL_SECONDS=20
TICKET_RESERVE_IP_BUCKET_CAPACITY=60
TICKET_RESERVE_IP_REFILL_SECONDS=1
```

Ý nghĩa:

- Mỗi user có thể burst tối đa 3 request reserve.
- Token user refill theo chu kỳ 20 giây.
- Mỗi IP có bucket riêng để chặn spam theo nguồn mạng.

### Login
Login có bucket theo IP và email. Mục tiêu là giảm brute-force và spam credential.

```txt
AUTH_LOGIN_IP_BUCKET_CAPACITY=10
AUTH_LOGIN_IP_REFILL_SECONDS=60
AUTH_LOGIN_EMAIL_BUCKET_CAPACITY=5
AUTH_LOGIN_EMAIL_REFILL_SECONDS=60
```

Ý nghĩa:

- Mỗi IP có thể burst tối đa 10 request login trong chu kỳ 60 giây.
- Mỗi email có thể burst tối đa 5 request login trong chu kỳ 60 giây.
- Bucket theo email giúp chặn brute-force vào một tài khoản ngay cả khi attacker đổi IP.

### Concert detail
Concert detail có bucket theo IP. Mục tiêu là giảm spam/F5 trang chi tiết concert trong thời điểm mở bán.

```txt
CONCERT_DETAIL_IP_BUCKET_CAPACITY=120
CONCERT_DETAIL_IP_REFILL_SECONDS=60
```

Ý nghĩa:

- Mỗi IP có thể burst tối đa 120 request xem chi tiết concert trong chu kỳ 60 giây.
- Ngưỡng này rộng hơn reserve để người dùng vẫn xem được thông tin sự kiện, trong khi endpoint mua vé được siết chặt hơn.

## Bằng chứng kiểm thử/demo
### Unit test
`apps/backend-api/tests/ticket-rate-limit.unit.ts` kiểm tra:

- Request được cho qua khi bucket còn token.
- Request bị `429` khi bucket hết token.
- Guard dùng `x-forwarded-for` để lấy IP client khi có proxy.
- Redis không khả dụng thì guard fail-open và log cảnh báo.

### K6 test
Script liên quan:

- `scripts/k6-ticketing-flow.js`
- `scripts/k6-ticketing-flow.local.ps1`

Kết quả demo đã ghi nhận:

```txt
Total HTTP requests : 1680
Reserve success     : 60
All 429 responses   : 1420
5xx                 : gần 0
```

Diễn giải:

- `429` là kỳ vọng khi Token Bucket cạn.
- Request bị chặn sớm, không đi sâu vào reserve/order/payment.
- Việc 5xx gần 0 chứng minh backend được bảo vệ trong kịch bản burst local.

## Giới hạn production
Cơ chế hiện tại đáp ứng ở tầng backend application, nhưng để thật sự phục vụ 80.000 người/phút trong production cần bổ sung:

- Load balancer/API gateway phía trước backend.
- Scale nhiều backend instances.
- Redis managed instance riêng, đủ CPU/RAM/network.
- CDN/object storage cho poster, SVG map và static assets.
- Cache dữ liệu concert public.
- Monitoring cho latency p95, error rate, Redis, DB connection pool và RabbitMQ queue depth.
- Có thể bổ sung Waiting Room nếu sự kiện cực lớn và cần kiểm soát lượt vào mua vé công bằng hơn.

## Kết luận
Yêu cầu “backend API không bị quá tải khi 80.000 người cùng truy cập mua vé trong phút đầu” đã được nhóm giải quyết ở mức ứng dụng bằng Token Bucket Rate Limiting kết hợp Redis inventory và xử lý order bất đồng bộ.

Token Bucket là lựa chọn phù hợp với nhóm vì cân bằng được ba yếu tố:

- Có thể chịu burst ngắn của user thật.
- Chặn request vượt ngưỡng bằng `429`.
- Dễ triển khai, dễ kiểm thử, phù hợp hạ tầng hiện tại.

Tuy nhiên, khi trình bày production, cần nói rõ đây là lớp bảo vệ backend; để đạt quy mô 80.000 người/phút thật sự cần thêm các lớp hạ tầng phía trước như load balancer, CDN/cache và autoscaling.
