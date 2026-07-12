# Đặc tả: Ticketing APIs

## API: `POST /tickets/reserve`

### Mô tả
API giữ vé cho user đã đăng nhập. Đây là endpoint chịu tải cao nhất trong lúc mở bán, dùng Redis để kiểm tra tồn kho, giới hạn vé per-user và trừ vé theo cách atomic trước khi tạo order bất đồng bộ.

### Luồng chính
Quy trình bắt đầu sau khi user đã đăng nhập, đang ở trang chi tiết concert và chọn số lượng vé muốn mua.

1. Frontend lấy `concert_id`, `category_id` và `quantity` từ lựa chọn của user.
2. Frontend gửi request reserve kèm access token.
3. Backend xác thực user bằng JWT để biết `user_id`.
4. Backend áp dụng `TicketReserveRateLimitGuard` trước khi xử lý nghiệp vụ. Nếu bucket hết token, request bị dừng sớm bằng `429`.
5. Backend validate payload:
   - `concert_id` đúng định dạng.
   - Mỗi item có `category_id` hợp lệ.
   - `quantity` là số dương.
   - Không gửi danh sách vé rỗng.
6. Backend đọc thông tin ticket category từ database khi cần để kiểm tra:
   - category có tồn tại không.
   - category có thuộc concert hiện tại không.
   - category đã đến giờ mở bán chưa.
   - category có `total_quantity` và `max_per_user` hợp lệ không.
7. Backend kiểm tra Redis đã có inventory cho category chưa.
8. Nếu Redis chưa có dữ liệu, backend lazy seed:
   - Đếm số ticket đã bán (`PAID`) trong database.
   - Đếm số order `PENDING` còn hiệu lực nếu có.
   - Tính số vé còn lại từ `total_quantity - sold - pending`.
   - Ghi số còn lại và `max_per_user` vào Redis.
9. Backend gửi yêu cầu reserve vào Redis bằng thao tác atomic. Trong cùng một thao tác, Redis kiểm tra:
   - Còn đủ vé cho quantity user yêu cầu.
   - Tổng vé user đã giữ/mua chưa vượt `max_per_user`.
   - Nếu hợp lệ thì trừ inventory.
   - Nếu hợp lệ thì tăng counter per-user.
10. Nếu Redis trả lỗi nghiệp vụ như sold out hoặc vượt limit, backend trả lỗi cho frontend và không tạo order.
11. Nếu Redis reserve thành công, backend tính tổng tiền dựa trên category price và quantity.
12. Backend publish message vào RabbitMQ để tạo order `PENDING`. Message chứa:
   - `user_id`
   - `concert_id`
   - danh sách category/quantity
   - tổng tiền
   - metadata cần rollback nếu order thất bại
13. Nếu publish RabbitMQ thành công, API trả kết quả reserve thành công cho frontend.
14. Frontend chuyển user sang bước chờ/tạo order hoặc trang thanh toán. Vì order được tạo bất đồng bộ, frontend có thể cần poll order trong vài giây đầu.
15. `OrderCreateConsumer` nhận message từ RabbitMQ và tạo order `PENDING` trong PostgreSQL.
16. Order `PENDING` có `expires_at`. Nếu user không thanh toán trước thời hạn, cleanup job sẽ hủy order và rollback vé.

### Kịch bản lỗi
- Thiếu/sai JWT: `401 Unauthorized`.
- Body thiếu category hoặc quantity không hợp lệ: `400 Bad Request`.
- Chưa đến giờ mở bán: request bị từ chối.
- Category không tồn tại hoặc không thể lazy seed: request bị từ chối.
- Hết vé hoặc không đủ vé: request bị từ chối.
- User vượt `max_per_user`: request bị từ chối.
- Vượt rate limit: `429 Too Many Requests`.
- Redis lỗi: request thất bại, không fallback sang trừ DB trực tiếp.
- RabbitMQ publish fail sau khi Redis đã trừ vé: backend rollback inventory và user counter.

### Ràng buộc
- Kiểm tra tồn kho, per-user limit và trừ vé phải atomic.
- Không được bán vượt `total_quantity`.
- Không được cho user vượt `max_per_user`.
- Không tạo `Ticket` thật ở bước reserve; ticket chỉ tạo sau payment success.
- Order được tạo bất đồng bộ nên frontend phải chịu được việc order chưa xuất hiện ngay.
- Trade-off: Redis nhanh và phù hợp burst nhưng yêu cầu rollback/đối soát chính xác với DB.

### Tiêu chí chấp nhận
- Reserve thành công khi còn vé và user chưa vượt limit.
- Inventory Redis giảm đúng số lượng.
- Counter per-user tăng đúng số lượng.
- Hết vé không tạo order và không làm inventory âm.
- Nhiều request đồng thời không làm tổng vé giữ vượt số vé còn lại.
- RabbitMQ lỗi thì inventory được rollback.
- K6 oversell test có `Reserve success <= EXPECTED_MAX_SUCCESS`.
- K6 rate limit test có `429` khi vượt bucket và 5xx gần 0.

## API: `POST /tickets/init`

### Mô tả
API admin dùng để khởi tạo hoặc prewarm inventory của một ticket category vào Redis. API này phục vụ test/demo hoặc chuẩn bị trước khi mở bán.

### Luồng chính
Quy trình này thường dùng trước demo hoặc trước thời điểm mở bán nếu admin muốn chủ động đưa inventory vào Redis.

1. Admin đăng nhập vào hệ thống.
2. Admin xác định ticket category cần warm up.
3. Admin kiểm tra số vé còn lại hợp lý của category. Số này nên dựa trên:
   - `total_quantity` của category.
   - số ticket đã bán trong DB.
   - số order pending còn hiệu lực nếu đang có dữ liệu thật.
4. Client/admin tool gửi `category_id`, `available`, `max_per_user` lên `POST /tickets/init`.
5. Backend xác thực JWT.
6. Backend kiểm tra role `ADMIN`.
7. Backend validate body:
   - `category_id` đúng định dạng.
   - `available` là số không âm.
   - `max_per_user` là số dương.
8. Backend ghi inventory của category vào Redis.
9. Backend ghi cấu hình `max_per_user` vào Redis.
10. Backend reset hoặc thiết lập counter liên quan theo logic seed hiện có.
11. API trả `{ status: "SUCCESS", message: "Category inventory initialized" }`.
12. Sau bước này, các request `POST /tickets/reserve` có thể dùng ngay inventory trong Redis mà không cần lazy seed.

### Kịch bản lỗi
- Thiếu/sai JWT: `401 Unauthorized`.
- User không phải admin: `403 Forbidden`.
- Body thiếu `category_id`, `available` hoặc `max_per_user`: `400 Bad Request`.
- Redis lỗi: API trả lỗi.
- `available` không khớp DB seed: có thể làm demo sai số vé còn lại.

### Ràng buộc
- Chỉ admin được gọi API này.
- `available` nên phản ánh số vé còn lại thực tế của category.
- Production nên ưu tiên lazy seed/đối soát DB thay vì phụ thuộc hoàn toàn vào manual warmup.
- API này không tạo order hoặc ticket.

### Tiêu chí chấp nhận
- Admin init category thành công và Redis có inventory tương ứng.
- User thường không gọi được API.
- Reserve sau init dùng đúng `available` và `max_per_user`.
- Init sai dữ liệu được phát hiện khi test inventory/reserve.
