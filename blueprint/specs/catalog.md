# Đặc tả: Catalog và concert

## Tổng quan
Catalog cung cấp dữ liệu concert cho người dùng xem danh sách, xem chi tiết, chọn ticket tier trước khi đặt vé. Cùng module này cũng phục vụ admin/organizer tạo, cập nhật và xóa mềm concert.

Backend liên quan:

- `apps/backend-api/src/modules/catalog/controllers/concert.controller.ts`
- `apps/backend-api/src/modules/catalog/services/concert.service.ts`
- `apps/backend-api/src/modules/catalog/repositories/concert.repository.ts`
- `apps/backend-api/src/modules/catalog/guards/concert-detail-rate-limit.guard.ts`

## API: `GET /concerts`

### Mô tả
Lấy danh sách concert có phân trang, lọc trạng thái và tìm kiếm theo tên concert.

### Luồng chính
1. Client gọi `GET /concerts` với query tùy chọn `page`, `limit`, `status`, `search`.
2. `ValidationPipe` transform và whitelist query.
3. Service tạo cache key theo format `concerts:list:{page}:{limit}:{status}:{search}`.
4. Backend kiểm tra Redis cache.
5. Nếu cache hit, trả dữ liệu từ Redis.
6. Nếu cache miss, repository query PostgreSQL với pagination, status và search.
7. Service build response gồm `data` và `meta`.
8. Response được lưu vào Redis với TTL 24 giờ.
9. Client nhận danh sách concert.

### Kịch bản lỗi
- Query sai kiểu dữ liệu: `400 Bad Request`.
- Redis lỗi: API có thể fallback query DB tùy hành vi `RedisService`; hệ thống cần log để vận hành biết cache đang lỗi.
- Database lỗi: trả lỗi server tương ứng.

### Ràng buộc
- Public user được xem danh sách concert.
- Concert có status `CANCELLED` bị loại khỏi danh sách mặc định nếu không filter trực tiếp.
- Response phải có pagination metadata.
- Cache list phải bị invalidate khi tạo/cập nhật/xóa concert.

### Tiêu chí chấp nhận
- User xem được danh sách concert có phân trang.
- Query `status` lọc đúng trạng thái.
- Query `search` tìm đúng theo tên concert.
- Lần gọi sau với cùng query có thể lấy từ Redis cache.
- Sau khi admin thay đổi concert, danh sách public không trả dữ liệu cũ quá lâu vì cache list được invalidate.

## API: `GET /concerts/:id`

### Mô tả
Lấy chi tiết concert và danh sách ticket tier. Endpoint này có rate limit theo IP vì thường bị spam/F5 trước giờ mở bán.

### Luồng chính
1. Client gọi `GET /concerts/:id`.
2. Request đi qua `ConcertDetailRateLimitGuard`.
3. Guard dùng Token Bucket trên Redis theo IP; nếu vượt ngưỡng thì trả `429 Too Many Requests`.
4. Service tạo cache key `concerts:detail:{id}`.
5. Backend kiểm tra Redis cache.
6. Nếu cache hit, lấy thông tin concert từ cache.
7. Nếu cache miss, query PostgreSQL theo concert id, bỏ qua concert `CANCELLED`.
8. Nếu không tìm thấy concert, trả `404`.
9. Service lưu concert detail vào Redis với TTL 24 giờ.
10. Với từng ticket tier, service gọi `ticketingService.getOrSeedInventory(tier.id)` để lấy số vé còn lại realtime từ Redis inventory.
11. Service overlay `remaining_quantity` và set `status = sold_out` nếu số vé còn lại <= 0.
12. Client nhận chi tiết concert, ticket tier và số vé còn lại gần realtime.

### Kịch bản lỗi
- Concert không tồn tại hoặc đã bị xóa mềm: `404 Not Found`.
- Vượt rate limit: `429 Too Many Requests`.
- Redis cache lỗi: hệ thống có thể fallback DB cho phần thông tin concert.
- Redis inventory lỗi khi lấy số vé còn lại: service log lỗi, không làm hỏng toàn bộ response nếu vẫn có dữ liệu concert.
- Database lỗi: trả lỗi server tương ứng.

### Ràng buộc
- Detail public không yêu cầu đăng nhập, nhưng phải có rate limit.
- Dữ liệu tĩnh của concert có thể cache lâu hơn.
- Số vé còn lại không được chỉ lấy từ cache detail vì có thể stale; phải overlay từ Redis inventory/counter.
- Ticket tier cần có `max_per_user`, `total_quantity`, `gate_number`, `sales_start_at` để phục vụ ticketing và check-in.

### Tiêu chí chấp nhận
- User xem được chi tiết concert và ticket tier.
- Spam detail vượt ngưỡng bị trả `429`.
- Detail cache hit không cần query DB lại cho phần thông tin tĩnh.
- `remaining_quantity` phản ánh Redis inventory gần realtime.
- Ticket tier hết vé được trả trạng thái `sold_out`.

## API: `POST /concerts`

### Mô tả
Admin/Organizer tạo concert mới cùng danh sách ticket tier.

### Luồng chính
1. Client gửi request kèm JWT.
2. `JwtAuthGuard` xác thực user.
3. `RolesGuard` kiểm tra role `ADMIN` hoặc `ORGANIZER`.
4. Permission guard kiểm tra quyền `CREATE_CONCERT`.
5. `ValidationPipe` validate body `CreateConcertDto`.
6. Repository tạo concert và các `ticket_categories` trong PostgreSQL.
7. Service invalidate cache list `concerts:list:*`.
8. Service set cache detail `concerts:detail:{id}` với TTL 24 giờ.
9. Nếu concert ở trạng thái `PUBLISHED`, service warm up Redis inventory cho từng ticket tier mới theo key `category:{tierId}` gồm `available` và `max_per_user`.
10. Response trả concert vừa tạo.

### Kịch bản lỗi
- Thiếu hoặc sai JWT: `401 Unauthorized`.
- User không có role phù hợp: `403 Forbidden`.
- User thiếu permission `CREATE_CONCERT`: `403 Forbidden`.
- Body sai validation: `400 Bad Request`.
- Database lỗi hoặc constraint lỗi: trả lỗi server tương ứng.
- Redis warm-up lỗi: cần log để xử lý vận hành; concert đã tạo trong DB vẫn là nguồn dữ liệu chính.

### Ràng buộc
- Chỉ admin/organizer có quyền mới được tạo concert.
- Concert nên có ít nhất một ticket tier để có thể mở bán.
- Mỗi ticket tier cần `total_quantity` và `max_per_user` hợp lệ.
- Nếu tạo concert published, inventory Redis nên được khởi tạo trước để luồng mua vé không phải seed lần đầu dưới tải cao.

### Tiêu chí chấp nhận
- Admin/Organizer tạo được concert hợp lệ.
- User thường không tạo được concert.
- Cache list bị invalidate sau khi tạo.
- Detail cache có dữ liệu concert mới.
- Inventory Redis được warm up cho concert published.

## API: `PATCH /concerts/:id`

### Mô tả
Admin/Organizer cập nhật thông tin concert và ticket tier.

### Luồng chính
1. Client gửi request kèm JWT và concert id.
2. `JwtAuthGuard` xác thực user.
3. `RolesGuard` kiểm tra role `ADMIN` hoặc `ORGANIZER`.
4. Permission guard kiểm tra quyền `UPDATE_CONCERT`.
5. Service tìm concert hiện tại bằng `includeDeleted = true`.
6. Nếu concert không tồn tại, trả `404`.
7. Repository cập nhật thông tin concert.
8. Nếu có `ticketTiers`, repository match tier theo `id` hoặc theo `name` không phân biệt hoa thường.
9. Tier match được update, tier mới được create, tier không còn trong payload bị delete.
10. Service cập nhật cache detail `concerts:detail:{id}`.
11. Service invalidate cache list `concerts:list:*`.
12. Nếu concert published, service cập nhật Redis inventory theo hướng in-place: tier đã có key thì điều chỉnh `available` bằng chênh lệch `total_quantity` mới - cũ và update `max_per_user`; tier chưa có Redis key thì để lazy seeding xử lý khi cần.
13. Response trả concert sau cập nhật.

### Kịch bản lỗi
- Thiếu hoặc sai JWT: `401 Unauthorized`.
- User không có role/permission phù hợp: `403 Forbidden`.
- Concert không tồn tại: `404 Not Found`.
- Body sai validation: `400 Bad Request`.
- Xóa hoặc sửa ticket tier đã có order/ticket có thể gặp constraint DB tùy trạng thái dữ liệu.
- Redis update inventory lỗi: cần log và có thể xử lý lại bằng warm-up/lazy seeding.

### Ràng buộc
- Không được reset Redis inventory về `total_quantity` khi update concert cũ, vì có thể làm mất các reservation đang bay.
- Cập nhật số lượng vé phải tính chênh lệch thay vì ghi đè mù.
- Thay đổi `gate_number` cần nhất quán với phân công checker/check-in.
- Payload ticket tier phải được kiểm soát kỹ vì ảnh hưởng trực tiếp đến bán vé.

### Tiêu chí chấp nhận
- Admin/Organizer cập nhật concert hợp lệ.
- Cache detail và cache list được cập nhật/invalidate đúng.
- Update `total_quantity` không làm mất vé đã reserve/sold trong Redis inventory.
- User thiếu quyền không cập nhật được concert.

## API: `DELETE /concerts/:id`

### Mô tả
Xóa mềm concert bằng cách đổi status sang `CANCELLED`, giúp giữ dữ liệu lịch sử order/ticket/revenue.

### Luồng chính
1. Client gửi request kèm JWT và concert id.
2. `JwtAuthGuard` xác thực user.
3. `RolesGuard` kiểm tra role `ADMIN` hoặc `ORGANIZER`.
4. Permission guard kiểm tra quyền `DELETE_CONCERT`.
5. Service tìm concert hiện tại bằng `includeDeleted = true`.
6. Nếu không tồn tại, trả `404`.
7. Nếu concert đã `CANCELLED`, trả lại concert hiện tại.
8. Repository update status concert sang `CANCELLED`.
9. Service cập nhật cache detail.
10. Service invalidate cache list `concerts:list:*`.
11. Response trả concert đã xóa mềm.

### Kịch bản lỗi
- Thiếu hoặc sai JWT: `401 Unauthorized`.
- User không có role/permission phù hợp: `403 Forbidden`.
- Concert không tồn tại: `404 Not Found`.
- Database lỗi: trả lỗi server tương ứng.

### Ràng buộc
- Không hard delete concert để tránh mất lịch sử giao dịch.
- Public list/detail mặc định không hiển thị concert `CANCELLED`.
- Các order/ticket/revenue cũ vẫn phải giữ được tham chiếu.

### Tiêu chí chấp nhận
- Admin/Organizer xóa mềm concert thành công.
- Concert `CANCELLED` không xuất hiện ở public list mặc định.
- Dữ liệu order/ticket/revenue lịch sử không bị xóa.
- User thường không xóa được concert.

## Cơ chế caching trong Catalog

### Vấn đề
Trong giờ mở bán, phần lớn request ban đầu là đọc danh sách concert và chi tiết concert. Nếu mọi request đều query PostgreSQL, DB dễ bị nghẽn connection pool trước cả khi user bấm mua vé. Riêng số vé còn lại lại thay đổi liên tục, nếu cache chung trong concert detail quá lâu thì FE sẽ hiển thị sai tồn kho.

### Giải pháp đang sử dụng
Catalog dùng Redis theo hướng cache-aside cho dữ liệu đọc nhiều:

- List concert cache key: `concerts:list:{page}:{limit}:{status}:{search}`.
- Detail concert cache key: `concerts:detail:{id}`.
- TTL cache: 24 giờ.
- Khi tạo/cập nhật/xóa concert, service xóa cache list theo pattern `concerts:list:*`.
- Khi tạo/cập nhật concert, service set lại cache detail tương ứng.
- Khi đọc detail, dữ liệu tĩnh lấy từ Redis/DB, còn `remaining_quantity` được overlay từ Redis inventory bằng `ticketingService.getOrSeedInventory`.

### Trade-off
- Cache-aside đơn giản, dễ triển khai trong NestJS và giảm tải DB tốt cho read-heavy endpoint.
- TTL 24 giờ giúp cache ổn định trong giờ mở bán, nhưng nếu không invalidate đúng khi admin sửa concert thì có thể stale.
- Pattern delete `concerts:list:*` đơn giản nhưng có thể tốn chi phí nếu số lượng cache key rất lớn; với phạm vi đồ án và traffic demo thì phù hợp.
- Không cache cứng `remaining_quantity` trong detail giúp số vé hiển thị gần realtime hơn, nhưng mỗi request detail cần thêm bước đọc Redis inventory cho từng ticket tier.
- Warm-up inventory khi concert published giúp giảm rủi ro request mua vé đầu tiên phải seed dưới tải cao. Tuy nhiên, nếu Redis key chưa tồn tại, lazy seeding vẫn là fallback để hệ thống ổn định hơn.

## Phân tích trade-off tổng quát

### Concert detail public nhưng có rate limit
- Ưu điểm: user không cần đăng nhập vẫn xem được thông tin sự kiện, đồng thời backend được bảo vệ khỏi spam detail.
- Nhược điểm: nhiều user thật cùng NAT/IP có thể bị ảnh hưởng nếu cấu hình limit quá thấp.
- Lý do phù hợp: detail là endpoint nóng trước giờ mở bán, cần bảo vệ nhẹ mà không làm rào cản đăng nhập.

### Ticket tier nằm trong concert detail
- Ưu điểm: FE có đủ giá, số lượng, giới hạn mua và gate trong một request.
- Nhược điểm: payload detail lớn hơn và update tier cần cẩn thận vì ảnh hưởng ticketing/check-in.
- Lý do phù hợp: trải nghiệm mua vé cần ticket tier ngay trên trang chi tiết concert.

### Soft delete concert
- Ưu điểm: giữ lịch sử order, ticket, revenue.
- Nhược điểm: mọi API public phải filter status `CANCELLED`.
- Lý do phù hợp: concert đã có giao dịch không nên bị xóa cứng khỏi hệ thống.
